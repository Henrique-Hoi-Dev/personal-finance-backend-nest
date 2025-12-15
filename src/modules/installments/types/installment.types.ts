import { Installment, Transaction } from '@prisma/client';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../../shared/types/pagination.types';

/**
 * Pagination options for installments queries
 */
export type InstallmentPaginationOptions = PaginationOptions & {
  accountId?: string;
};

/**
 * Paginated result for installments
 */
export type InstallmentsPaginatedResult = PaginatedResult<Installment>;

/**
 * Result of marking an installment as paid
 */
export type InstallmentMarkPaidResult = {
  installment: Installment;
  transaction: Transaction;
};

/**
 * Input for creating installments
 */
export type CreateInstallmentsInput = {
  accountId: string;
  totalAmount: number; // cents
  installments: number;
  startDate: Date | string;
  dueDay: number;
};

/**
 * Input for creating installments from installment amount
 */
export type CreateInstallmentsFromAmountInput = {
  accountId: string;
  installmentAmount: number; // cents
  installments: number;
  startDate: Date | string;
  dueDay: number;
};
