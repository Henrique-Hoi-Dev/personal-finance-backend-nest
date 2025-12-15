import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AccountType, Account, CreditCardItem } from '@prisma/client';
import {
  LinkAccountToCreditCardResult,
  GetLinkedAccountsResult,
  CreditCardItemWithAccounts,
} from './types/credit-card-item.types';

@Injectable()
export class CreditCardItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Link an account to a credit card
   * Validates that creditCardId points to an account with type CREDIT_CARD
   * Validates that accountId exists and is not already linked to this card
   */
  async linkAccountToCreditCard(
    creditCardId: string,
    accountId: string,
  ): Promise<LinkAccountToCreditCardResult> {
    // Validate credit card exists and is of type CREDIT_CARD
    const creditCard = await this.prisma.account.findUnique({
      where: { id: creditCardId },
    });

    if (!creditCard) {
      throw new NotFoundException(
        `Credit card with ID ${creditCardId} not found`,
      );
    }

    if (creditCard.type !== AccountType.CREDIT_CARD) {
      throw new BadRequestException(
        `Account with ID ${creditCardId} is not a credit card (type: ${creditCard.type})`,
      );
    }

    // Validate linked account exists
    const linkedAccount = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!linkedAccount) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }

    // Validate that the account is not already linked to this credit card
    const existingLink = await this.prisma.creditCardItem.findUnique({
      where: {
        creditCardId_accountId: {
          creditCardId,
          accountId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException(
        `Account ${accountId} is already linked to credit card ${creditCardId}`,
      );
    }

    // Create the link
    const creditCardItem = await this.prisma.creditCardItem.create({
      data: {
        creditCardId,
        accountId,
      },
    });

    return {
      creditCardItem,
      creditCard,
      linkedAccount,
    };
  }

  /**
   * Unlink an account from a credit card
   */
  async unlinkAccountFromCreditCard(
    creditCardId: string,
    accountId: string,
  ): Promise<void> {
    // Validate the link exists
    const creditCardItem = await this.prisma.creditCardItem.findUnique({
      where: {
        creditCardId_accountId: {
          creditCardId,
          accountId,
        },
      },
    });

    if (!creditCardItem) {
      throw new NotFoundException(
        `Account ${accountId} is not linked to credit card ${creditCardId}`,
      );
    }

    // Delete the link
    await this.prisma.creditCardItem.delete({
      where: {
        id: creditCardItem.id,
      },
    });
  }

  /**
   * Get all accounts linked to a credit card
   */
  async getCreditCardLinkedAccounts(
    creditCardId: string,
  ): Promise<GetLinkedAccountsResult> {
    // Validate credit card exists
    const creditCard = await this.prisma.account.findUnique({
      where: { id: creditCardId },
    });

    if (!creditCard) {
      throw new NotFoundException(
        `Credit card with ID ${creditCardId} not found`,
      );
    }

    if (creditCard.type !== AccountType.CREDIT_CARD) {
      throw new BadRequestException(
        `Account with ID ${creditCardId} is not a credit card (type: ${creditCard.type})`,
      );
    }

    // Get all linked accounts
    const creditCardItems = await this.prisma.creditCardItem.findMany({
      where: { creditCardId },
      include: {
        linkedAccount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const linkedAccounts = creditCardItems.map((item) => item.linkedAccount);

    return {
      creditCard,
      linkedAccounts,
      total: linkedAccounts.length,
    };
  }

  /**
   * Get credit card item by ID with related accounts
   */
  async getById(id: string): Promise<CreditCardItemWithAccounts> {
    const creditCardItem = await this.prisma.creditCardItem.findUnique({
      where: { id },
      include: {
        creditCard: true,
        linkedAccount: true,
      },
    });

    if (!creditCardItem) {
      throw new NotFoundException(`Credit card item with ID ${id} not found`);
    }

    return creditCardItem;
  }

  /**
   * Get all credit card items for a specific account (as linked account)
   */
  async getByLinkedAccount(accountId: string): Promise<CreditCardItem[]> {
    return this.prisma.creditCardItem.findMany({
      where: { accountId },
      include: {
        creditCard: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if an account is linked to a credit card
   */
  async isAccountLinkedToCreditCard(
    creditCardId: string,
    accountId: string,
  ): Promise<boolean> {
    const creditCardItem = await this.prisma.creditCardItem.findUnique({
      where: {
        creditCardId_accountId: {
          creditCardId,
          accountId,
        },
      },
    });

    return creditCardItem !== null;
  }

  /**
   * Delete all links for a credit card (useful when deleting a credit card)
   */
  async deleteAllByCreditCard(creditCardId: string): Promise<number> {
    const result = await this.prisma.creditCardItem.deleteMany({
      where: { creditCardId },
    });

    return result.count;
  }

  /**
   * Delete all links for an account (useful when deleting an account)
   */
  async deleteAllByAccount(accountId: string): Promise<number> {
    const result = await this.prisma.creditCardItem.deleteMany({
      where: { accountId },
    });

    return result.count;
  }
}
