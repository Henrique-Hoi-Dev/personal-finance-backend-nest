import { IsOptional, IsString } from 'class-validator';

export class CreatePluggyConnectTokenDto {
  @IsString()
  @IsOptional()
  itemId?: string;
}

