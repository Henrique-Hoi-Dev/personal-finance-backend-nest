import { CreditCardItem, Account } from '@prisma/client';
import { AccountDto } from './account.dto';

export class CreditCardItemDto {
  id: string;
  creditCardId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;

  static fromPrisma(entity: CreditCardItem): CreditCardItemDto {
    const dto = new CreditCardItemDto();
    dto.id = entity.id;
    dto.creditCardId = entity.creditCardId;
    dto.accountId = entity.accountId;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}

export class CreditCardItemWithAccountsDto {
  id: string;
  creditCardId: string;
  accountId: string;
  creditCard: AccountDto;
  linkedAccount: AccountDto;
  createdAt: string;
  updatedAt: string;

  static fromPrisma(
    entity: CreditCardItem & {
      creditCard: Account;
      linkedAccount: Account;
    },
  ): CreditCardItemWithAccountsDto {
    const dto = new CreditCardItemWithAccountsDto();
    dto.id = entity.id;
    dto.creditCardId = entity.creditCardId;
    dto.accountId = entity.accountId;
    dto.creditCard = AccountDto.fromPrisma(entity.creditCard);
    dto.linkedAccount = AccountDto.fromPrisma(entity.linkedAccount);
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
