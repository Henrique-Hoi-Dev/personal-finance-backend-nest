import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { Account } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { GetAccountsQueryDto } from './dto/get-accounts-query.dto';
import { MarkAccountPaidDto } from './dto/mark-account-paid.dto';
import { UpdateTemporalReferenceDto } from './dto/update-temporal-reference.dto';
import { AssociateAccountToCreditCardDto } from './dto/associate-account-to-credit-card.dto';
import { GetCreditCardAssociatedAccountsDto } from './dto/get-credit-card-associated-accounts.dto';
import { GetPluggyAccountsDto } from './dto/get-pluggy-accounts.dto';
import { InstallmentDto } from '../installments/dto/installment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<Account> {
    return this.accountsService.update(id, dto);
  }

  @Get()
  getAll(@Query() query: GetAccountsQueryDto): Promise<Account[]> {
    return this.accountsService.findAll(query);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountsService.getById(id);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<Account> {
    return this.accountsService.delete(id);
  }

  @Patch(':id/pay')
  markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAccountPaidDto,
    // TODO: Extract userId from JWT token in production
    @Param('userId') userId?: string,
  ) {
    // For now, use a placeholder userId - should come from JWT in production
    const actualUserId = userId ?? 'placeholder-user-id';
    return this.accountsService.markAsPaid(id, actualUserId, dto);
  }

  @Get(':id/installments')
  async getInstallments(
    @Param('id', ParseUUIDPipe) accountId: string,
  ): Promise<InstallmentDto[]> {
    const installments = await this.accountsService.getInstallments(accountId);
    return installments.map((installment) =>
      InstallmentDto.fromPrisma(installment),
    );
  }

  @Get('dashboard/all')
  getDashboardData(@Query() query: GetAccountsQueryDto): Promise<unknown> {
    return this.accountsService.getDashboardData(query);
  }

  @Get('reports/monthly-summary')
  getMonthlySummary(@Query() query: GetAccountsQueryDto): Promise<unknown> {
    return this.accountsService.getMonthlySummary(query);
  }

  @Get('period/accounts')
  getAccountsByPeriod(@Query() query: GetAccountsQueryDto): Promise<Account[]> {
    return this.accountsService.getAccountsByPeriod(query);
  }

  @Get('period/unpaid-accounts')
  getUnpaidAccountsByPeriod(
    @Query() query: GetAccountsQueryDto,
  ): Promise<Account[]> {
    return this.accountsService.getUnpaidAccountsByPeriod(query);
  }

  @Get('period/statistics')
  getPeriodStatistics(@Query() query: GetAccountsQueryDto): Promise<unknown> {
    return this.accountsService.getPeriodStatistics(query);
  }

  @Put(':id/temporal-reference')
  updateTemporalReference(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemporalReferenceDto,
  ): Promise<Account> {
    return this.accountsService.updateTemporalReference(id, dto);
  }

  @Post(':creditCardId/credit-card/associate')
  associateAccountToCreditCard(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Body() dto: AssociateAccountToCreditCardDto,
    // TODO: Extract userId from JWT token in production
    @Param('userId') userId?: string,
  ) {
    // For now, use a placeholder userId - should come from JWT in production
    const actualUserId = userId ?? 'placeholder-user-id';
    return this.accountsService.associateAccountToCreditCard(
      actualUserId,
      creditCardId,
      dto.accountId,
    );
  }

  @Delete(':creditCardId/credit-card/associate/:accountId')
  disassociateAccountFromCreditCard(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<Account> {
    return this.accountsService.disassociateAccountFromCreditCard(
      creditCardId,
      accountId,
    );
  }

  @Get(':creditCardId/credit-card/associated-accounts')
  getCreditCardAssociatedAccounts(
    @Param('creditCardId', ParseUUIDPipe) creditCardId: string,
    @Query() query: GetCreditCardAssociatedAccountsDto,
    // TODO: Extract userId from JWT token in production
    @Param('userId') userId?: string,
  ) {
    // For now, use a placeholder userId - should come from JWT in production
    const actualUserId = userId ?? 'placeholder-user-id';
    return this.accountsService.getCreditCardAssociatedAccounts(
      actualUserId,
      creditCardId,
    );
  }

  @Get('pluggy/accounts')
  getPluggyAccounts(@Query() query: GetPluggyAccountsDto) {
    if (!query.itemId) {
      throw new BadRequestException('itemId is required');
    }
    return this.accountsService.getPluggyAccounts(query.itemId);
  }
}
