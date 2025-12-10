import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GetPluggyAccountsDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  connectorId?: string;
}
