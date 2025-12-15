import { Injectable } from '@nestjs/common';
import {
  MonthlySummary,
  MonthlySummaryStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
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
   * Recalcula os resumos mensais para o usuário da conta nos meses especificados
   */
  async generateSummariesForAccount(
    accountId: string,
    months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // Busca a conta para obter o userId
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    const userId = account.userId;

    // Para cada mês, recalcula o resumo completo do usuário
    for (const { month, year } of months) {
      await this.recalculateSummaryForMonth(userId, month, year);
    }
  }

  /**
   * Recalcula o resumo mensal completo para um usuário em um mês específico
   */
  private async recalculateSummaryForMonth(
    userId: string,
    month: number,
    year: number,
  ): Promise<void> {
    // Calcula as datas do período
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Busca todas as transações do usuário no período
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calcula totalIncome e totalExpenses
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const transaction of transactions) {
      const value = Number(transaction.value);
      if (transaction.type === TransactionType.INCOME) {
        totalIncome += value;
      } else {
        totalExpenses += value;
      }
    }

    // Busca todas as parcelas não pagas que vencem no mês
    const installments = await this.prisma.installment.findMany({
      where: {
        account: {
          userId,
        },
        isPaid: false,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calcula billsToPay e billsCount
    let billsToPay = 0;
    for (const installment of installments) {
      billsToPay += Number(installment.amount);
    }
    const billsCount = installments.length;

    // Cria ou atualiza o resumo mensal
    await this.upsertMonthlySummary({
      userId,
      referenceMonth: month,
      referenceYear: year,
      totalIncome,
      totalExpenses,
      billsToPay,
      billsCount,
    });
  }

  /**
   * Recalculate summaries for months (legacy method for compatibility)
   */
  async recalculateSummariesForMonths(
    userId: string,
    months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // Para cada mês, recalcula o resumo completo do usuário
    for (const { month, year } of months) {
      await this.recalculateSummaryForMonth(userId, month, year);
    }
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
