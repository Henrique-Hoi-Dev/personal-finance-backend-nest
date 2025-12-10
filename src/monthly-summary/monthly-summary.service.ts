import { Injectable } from '@nestjs/common';
import { MonthlySummary, MonthlySummaryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MonthlySummaryUpsertInput } from './types/monthly-summary.types';

@Injectable()
export class MonthlySummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find monthly summary by user and period
   */
  async findByUserAndPeriod(
    userId: string,
    month: number,
    year: number,
  ): Promise<MonthlySummary | null> {
    return this.prisma.monthlySummary.findUnique({
      where: {
        userId_referenceYear_referenceMonth: {
          userId,
          referenceYear: year,
          referenceMonth: month,
        },
      },
    });
  }

  /**
   * Upsert monthly summary with calculated values
   */
  async upsertMonthlySummary(
    input: MonthlySummaryUpsertInput,
  ): Promise<MonthlySummary> {
    // Calculate totalBalance in cents
    const totalBalance = input.totalIncome - input.totalExpenses;

    // Derive status based on thresholds
    const status = this.calculateStatus(totalBalance, input.billsToPay);

    // Convert all monetary values to BigInt
    const data = {
      userId: input.userId,
      referenceMonth: input.referenceMonth,
      referenceYear: input.referenceYear,
      totalIncome: BigInt(input.totalIncome),
      totalExpenses: BigInt(input.totalExpenses),
      totalBalance: BigInt(totalBalance),
      billsToPay: BigInt(input.billsToPay),
      billsCount: input.billsCount,
      status,
      lastCalculatedAt: new Date(),
    };

    return this.prisma.monthlySummary.upsert({
      where: {
        userId_referenceYear_referenceMonth: {
          userId: input.userId,
          referenceYear: input.referenceYear,
          referenceMonth: input.referenceMonth,
        },
      },
      update: data,
      create: data,
    });
  }

  /**
   * Calculate monthly summary (legacy method for compatibility)
   */
  async calculateMonthlySummary(
    userId: string,
    referenceMonth: number,
    referenceYear: number,
    forceRecalculate = false,
  ): Promise<void> {
    // TODO: implement real summary calculation
    // For now, this is a stub that doesn't throw
    console.log(
      `Calculating monthly summary for user ${userId}, ${referenceMonth}/${referenceYear}, forceRecalculate: ${forceRecalculate}`,
    );
    return Promise.resolve();
  }

  /**
   * Generate summaries for account (legacy method for compatibility)
   */
  async generateSummariesForAccount(
    _accountId: string,
    _months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // TODO: Implementar quando o modelo MonthlySummary estiver disponível no Prisma
    return Promise.reject(
      new Error('Not implemented yet - MonthlySummary model not available'),
    );
  }

  /**
   * Recalculate summaries for months (legacy method for compatibility)
   */
  async recalculateSummariesForMonths(
    _userId: string,
    _months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // TODO: Implementar quando o modelo MonthlySummary estiver disponível no Prisma
    return Promise.reject(
      new Error('Not implemented yet - MonthlySummary model not available'),
    );
  }

  /**
   * Calculate status based on balance and bills to pay
   * EXCELLENT: balance ≥ 0 and billsToPay == 0
   * GOOD: balance ≥ 0 and billsToPay > 0
   * WARNING: balance < 0 but >= -50_000 (-500 reais)
   * CRITICAL: balance < -50_000
   */
  private calculateStatus(
    totalBalance: number,
    billsToPay: number,
  ): MonthlySummaryStatus {
    if (totalBalance >= 0 && billsToPay === 0) {
      return MonthlySummaryStatus.EXCELLENT;
    }

    if (totalBalance >= 0 && billsToPay > 0) {
      return MonthlySummaryStatus.GOOD;
    }

    if (totalBalance < 0 && totalBalance >= -50_000) {
      return MonthlySummaryStatus.WARNING;
    }

    // totalBalance < -50_000
    return MonthlySummaryStatus.CRITICAL;
  }
}
