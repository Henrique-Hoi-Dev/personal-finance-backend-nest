import { CreditCardItem, Account } from '@prisma/client';

/**
 * CreditCardItem with related accounts
 */
export type CreditCardItemWithAccounts = CreditCardItem & {
  creditCard: Account;
  linkedAccount: Account;
};

/**
 * Result for linking an account to a credit card
 */
export type LinkAccountToCreditCardResult = {
  creditCardItem: CreditCardItem;
  creditCard: Account;
  linkedAccount: Account;
};

/**
 * Result for getting linked accounts
 */
export type GetLinkedAccountsResult = {
  creditCard: Account;
  linkedAccounts: Account[];
  total: number;
};

