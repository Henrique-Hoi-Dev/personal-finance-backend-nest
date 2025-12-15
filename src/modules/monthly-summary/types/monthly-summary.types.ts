import { MonthlySummary, MonthlySummaryStatus } from '@prisma/client';
import { MoneyCents } from '../../../shared/types/common.types';

/**
 * Input for upserting a monthly summary
 */
export type MonthlySummaryUpsertInput = {
  userId: string;
  referenceMonth: number; // 1-12
  referenceYear: number; // e.g. 2025
  totalIncome: MoneyCents;
  totalExpenses: MoneyCents;
  billsToPay: MoneyCents;
  billsCount: number;
};

/**
 * Monthly summary with computed fields (future extension)
 */
export type MonthlySummaryWithComputed = MonthlySummary & {
  // future extra computed fields if needed
};

/**
 * Status rule definition for monthly summary
 */
export type MonthlySummaryStatusRule = {
  status: MonthlySummaryStatus;
  description: string;
};
