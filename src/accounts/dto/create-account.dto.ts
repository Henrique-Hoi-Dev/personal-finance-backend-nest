import {
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Length,
  IsNumber,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @IsUUID()
  userId: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsDateString()
  startDate: string;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  referenceMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  referenceYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsUUID()
  creditCardId?: string;
}
