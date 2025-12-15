import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  installmentId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsString()
  @MaxLength(255)
  description: string;

  @IsInt()
  @Min(1)
  value: number;

  @IsDateString()
  date: string;
}
