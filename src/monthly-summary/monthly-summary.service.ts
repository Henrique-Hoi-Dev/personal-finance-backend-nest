import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MonthlySummary {
  id: string;
  userId: string;
  referenceMonth: number;
  referenceYear: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

@Injectable()
export class MonthlySummaryService {
  constructor(private readonly prisma: PrismaService) {}

  calculateMonthlySummary(
    _userId: string,
    _referenceMonth: number,
    _referenceYear: number,
  ): Promise<MonthlySummary> {
    // TODO: Implementar quando o modelo MonthlySummary estiver disponível no Prisma
    return Promise.reject(
      new Error('Not implemented yet - MonthlySummary model not available'),
    );
  }

  generateSummariesForAccount(
    _accountId: string,
    _months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // TODO: Implementar quando o modelo MonthlySummary estiver disponível no Prisma
    return Promise.reject(
      new Error('Not implemented yet - MonthlySummary model not available'),
    );
  }

  recalculateSummariesForMonths(
    _userId: string,
    _months: Array<{ month: number; year: number }>,
  ): Promise<void> {
    // TODO: Implementar quando o modelo MonthlySummary estiver disponível no Prisma
    return Promise.reject(
      new Error('Not implemented yet - MonthlySummary model not available'),
    );
  }
}
