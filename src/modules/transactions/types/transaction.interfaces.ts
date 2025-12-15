import { TransactionType } from '@prisma/client';

export interface TransactionListFilters {
  userId: string;
  limit?: number;
  page?: number;
  type?: TransactionType;
  category?: string;
  accountId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UserBalanceOptions {
  year?: number;
  month?: number; // 1-12
}

export interface UserBalancePeriodInfo {
  year: number;
  month: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
}

export interface UserBalanceResult {
  income: number;
  expense: number;
  linkedExpenses: number;
  standaloneExpenses: number;
  balance: number;
  fixedAccountsTotal: number;
  loanAccountsTotal: number;
  totalAccounts: number;
  period: UserBalancePeriodInfo;
}

export interface ExpensesByCategoryOptions {
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number; // 1-12
}

export interface ExpenseCategoryItem {
  category: string;
  name: string;
  nameEn: string;
  value: number;
  percentage: number;
  color: string;
  type: 'account' | 'transaction';
}

export interface ExpensesByCategoryResult {
  categories: ExpenseCategoryItem[];
}
