import { Account, AccountType, Installment } from '@prisma/client';
import { MoneyCents, YearMonth } from '../../../shared/types/common.types';
import { PaginatedResult } from '../../../shared/types/pagination.types';

/**
 * Input for creating an account (domain level)
 */
export type AccountCreateInput = {
  userId: string;
  name: string;
  type: AccountType;
  totalAmount?: MoneyCents;
  installments?: number;
  startDate: Date | string;
  dueDay: number;
  isPreview?: boolean;
  referenceMonth?: number;
  referenceYear?: number;
  creditLimit?: MoneyCents;
  creditCardId?: string;
};

/**
 * Input for updating an account
 */
export type AccountUpdateInput = Partial<AccountCreateInput>;

/**
 * Filters for listing accounts
 */
export type AccountListFilters = YearMonth & {
  userId?: string;
  type?: AccountType;
  isPaid?: boolean;
  name?: string;
};

/**
 * Account with installments list
 */
export type AccountWithInstallments = Account & {
  installmentList?: Installment[];
};

/**
 * Paginated result for accounts
 */
export type AccountPaginatedResult = PaginatedResult<AccountWithInstallments>;

/**
 * Result for period-based queries
 */
export type AccountsByPeriodResult = {
  accounts: Account[];
  total: number;
  referenceMonth: number;
  referenceYear: number;
};

/**
 * Statistics for a period
 */
export type PeriodStatisticsResult = {
  referenceMonth: number;
  referenceYear: number;
  totalAccounts: number;
  paidAccounts: number;
  unpaidAccounts: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
};

/**
 * Result for fixed accounts check/update
 */
export type FixedAccountsCheckResult = {
  updated: number;
  accounts: Account[];
};

/**
 * Result for loan calculations
 */
export type LoanCalculationResult = {
  totalAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  monthlyInterestRate: number;
};
