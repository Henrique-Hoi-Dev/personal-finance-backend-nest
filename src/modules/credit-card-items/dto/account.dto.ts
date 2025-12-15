import { Account } from '@prisma/client';

export class AccountDto {
  id: string;
  userId: string;
  name: string;
  type: string;
  isPaid: boolean;
  totalAmount: number | null;
  installments: number | null;
  startDate: string;
  dueDay: number;
  isPreview: boolean;
  referenceMonth: number | null;
  referenceYear: number | null;
  creditLimit: number | null;
  creditCardId: string | null;
  createdAt: string;
  updatedAt: string;

  static fromPrisma(entity: Account): AccountDto {
    const dto = new AccountDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.isPaid = entity.isPaid;
    dto.totalAmount = entity.totalAmount
      ? Number(entity.totalAmount)
      : null;
    dto.installments = entity.installments;
    dto.startDate = entity.startDate.toISOString().slice(0, 10);
    dto.dueDay = entity.dueDay;
    dto.isPreview = entity.isPreview;
    dto.referenceMonth = entity.referenceMonth;
    dto.referenceYear = entity.referenceYear;
    dto.creditLimit = entity.creditLimit
      ? Number(entity.creditLimit)
      : null;
    dto.creditCardId = entity.creditCardId;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}

