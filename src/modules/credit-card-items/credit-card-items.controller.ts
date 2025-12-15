import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CreditCardItemsService } from './credit-card-items.service';
import { LinkAccountToCreditCardDto } from './dto/link-account-to-credit-card.dto';
import {
  CreditCardItemDto,
  CreditCardItemWithAccountsDto,
} from './dto/credit-card-item.dto';
import { AccountDto } from './dto/account.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Controller('credit-card-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditCardItemsController {
  constructor(
    private readonly creditCardItemsService: CreditCardItemsService,
  ) {}

  /**
   * Link an account to a credit card
   * POST /credit-card-items/:creditCardId/link
   */
  @Post(':creditCardId/link')
  async linkAccountToCreditCard(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() dto: LinkAccountToCreditCardDto,
  ): Promise<CreditCardItemWithAccountsDto> {
    const result = await this.creditCardItemsService.linkAccountToCreditCard(
      creditCardId,
      dto.accountId,
    );

    return CreditCardItemWithAccountsDto.fromPrisma({
      ...result.creditCardItem,
      creditCard: result.creditCard,
      linkedAccount: result.linkedAccount,
    });
  }

  /**
   * Unlink an account from a credit card
   * DELETE /credit-card-items/:creditCardId/unlink/:accountId
   */
  @Delete(':creditCardId/unlink/:accountId')
  async unlinkAccountFromCreditCard(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ message: string }> {
    await this.creditCardItemsService.unlinkAccountFromCreditCard(
      creditCardId,
      accountId,
    );

    return {
      message: `Account ${accountId} unlinked from credit card ${creditCardId}`,
    };
  }

  /**
   * Get all accounts linked to a credit card
   * GET /credit-card-items/:creditCardId/linked-accounts
   */
  @Get(':creditCardId/linked-accounts')
  async getCreditCardLinkedAccounts(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
  ): Promise<{
    creditCard: AccountDto;
    linkedAccounts: AccountDto[];
    total: number;
  }> {
    const result =
      await this.creditCardItemsService.getCreditCardLinkedAccounts(
        creditCardId,
      );

    return {
      creditCard: AccountDto.fromPrisma(result.creditCard),
      linkedAccounts: result.linkedAccounts.map((account) =>
        AccountDto.fromPrisma(account),
      ),
      total: result.total,
    };
  }

  /**
   * Get credit card item by ID
   * GET /credit-card-items/:id
   */
  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreditCardItemWithAccountsDto> {
    const creditCardItem = await this.creditCardItemsService.getById(id);
    return CreditCardItemWithAccountsDto.fromPrisma(creditCardItem);
  }

  /**
   * Get all credit card items for a specific account (as linked account)
   * GET /credit-card-items/account/:accountId
   */
  @Get('account/:accountId')
  async getByLinkedAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<CreditCardItemDto[]> {
    const creditCardItems =
      await this.creditCardItemsService.getByLinkedAccount(accountId);

    return creditCardItems.map((item) => CreditCardItemDto.fromPrisma(item));
  }
}
