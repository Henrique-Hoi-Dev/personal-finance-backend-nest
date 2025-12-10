import { Installment, Account } from '@prisma/client';
import { InstallmentDto } from './installment.dto';

export class InstallmentWithAccountDto extends InstallmentDto {
  account: {
    id: string;
    userId: string;
    name: string;
    type: string;
    isPaid: boolean;
    totalAmount: string | null;
    installments: number | null;
    startDate: string;
    dueDay: number;
    isPreview: boolean;
    referenceMonth: number | null;
    referenceYear: number | null;
    creditLimit: string | null;
    creditCardId: string | null;
    createdAt: string;
    updatedAt: string;
  };

  static fromPrisma(
    entity: Installment & { account: Account },
  ): InstallmentWithAccountDto {
    const dto = new InstallmentWithAccountDto();
    // Copy base InstallmentDto fields
    Object.assign(dto, InstallmentDto.fromPrisma(entity));
    // Add account data
    dto.account = {
      id: entity.account.id,
      userId: entity.account.userId,
      name: entity.account.name,
      type: entity.account.type,
      isPaid: entity.account.isPaid,
      totalAmount: entity.account.totalAmount?.toString() ?? null,
      installments: entity.account.installments,
      startDate: entity.account.startDate.toISOString().slice(0, 10),
      dueDay: entity.account.dueDay,
      isPreview: entity.account.isPreview,
      referenceMonth: entity.account.referenceMonth,
      referenceYear: entity.account.referenceYear,
      creditLimit: entity.account.creditLimit?.toString() ?? null,
      creditCardId: entity.account.creditCardId,
      createdAt: entity.account.createdAt.toISOString(),
      updatedAt: entity.account.updatedAt.toISOString(),
    };
    return dto;
  }
}
