import { Installment } from '@prisma/client';

export class InstallmentDto {
  id: string;
  accountId: string;
  number: number;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  amount: number; // Converted from BigInt to number (cents)
  isPaid: boolean;
  paidAt: string | null;
  referenceMonth: number | null;
  referenceYear: number | null;
  createdAt: string;
  updatedAt: string;

  static fromPrisma(entity: Installment): InstallmentDto {
    const dto = new InstallmentDto();
    dto.id = entity.id;
    dto.accountId = entity.accountId;
    dto.number = entity.number;
    dto.dueDate = entity.dueDate.toISOString().slice(0, 10);
    dto.amount = Number(entity.amount); // BigInt → number (cents)
    dto.isPaid = entity.isPaid;
    dto.paidAt = entity.paidAt ? entity.paidAt.toISOString() : null;
    dto.referenceMonth = entity.referenceMonth ?? null;
    dto.referenceYear = entity.referenceYear ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}

