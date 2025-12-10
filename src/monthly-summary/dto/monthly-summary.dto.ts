// Temporary types until Prisma Client is regenerated
type MonthlySummaryStatus = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';

interface MonthlySummaryEntity {
  id: string;
  userId: string;
  referenceMonth: number;
  referenceYear: number;
  totalIncome: bigint;
  totalExpenses: bigint;
  totalBalance: bigint;
  billsToPay: bigint;
  billsCount: number;
  status: MonthlySummaryStatus;
  lastCalculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class MonthlySummaryDto {
  id: string;
  userId: string;
  referenceMonth: number;
  referenceYear: number;
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  billsToPay: number;
  billsCount: number;
  status: MonthlySummaryStatus;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: MonthlySummaryEntity): MonthlySummaryDto {
    const dto = new MonthlySummaryDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.referenceMonth = entity.referenceMonth;
    dto.referenceYear = entity.referenceYear;
    dto.totalIncome = Number(entity.totalIncome);
    dto.totalExpenses = Number(entity.totalExpenses);
    dto.totalBalance = Number(entity.totalBalance);
    dto.billsToPay = Number(entity.billsToPay);
    dto.billsCount = entity.billsCount;
    dto.status = entity.status;
    dto.lastCalculatedAt = entity.lastCalculatedAt.toISOString();
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
