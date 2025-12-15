import { IsUUID } from 'class-validator';

export class AssociateAccountToCreditCardDto {
  @IsUUID()
  accountId: string;
}
