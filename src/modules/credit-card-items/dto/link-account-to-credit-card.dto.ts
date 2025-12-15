import { IsUUID } from 'class-validator';

export class LinkAccountToCreditCardDto {
  @IsUUID()
  accountId: string;
}

