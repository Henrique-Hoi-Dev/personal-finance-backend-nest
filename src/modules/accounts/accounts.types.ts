import { Account } from '@prisma/client';

// Extended account with installments and related data
export interface AccountWithInstallmentsAndExtras extends Account {
  installmentList?: Array<{
    id: string;
    accountId: string;
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    isPaid: boolean;
    paidAt?: Date | null;
    breakdown?: Record<string, unknown> | null;
  }>;
  amountPaid?: number;
  remainingAmount?: number;
}

// Result for list queries with pagination
export interface AccountListResult {
  accounts: Account[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Result for period-based queries
export interface AccountsByPeriodResult {
  accounts: Account[];
  total: number;
  referenceMonth: number;
  referenceYear: number;
}

// Statistics for a period
export interface PeriodStatisticsResult {
  referenceMonth: number;
  referenceYear: number;
  totalAccounts: number;
  paidAccounts: number;
  unpaidAccounts: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

// Result for fixed accounts check/update
export interface FixedAccountsCheckResult {
  updated: number;
  accounts: Account[];
}

// Result for loan calculations
export interface LoanCalculationResult {
  totalAmount: number;
  monthlyPayment: number;
  totalInterest: number;
  monthlyInterestRate: number;
}

// Result for marking account as paid
// Transaction type is inferred from TransactionsService.createAccountPayment return type
export interface MarkAccountPaidResult {
  account: Account;
  // Transaction type from Prisma - using any to avoid type inference issues, can be null

  transaction: any;
}
