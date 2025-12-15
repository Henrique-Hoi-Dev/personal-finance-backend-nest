import {
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Length,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { AccountType } from '@prisma/client';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDate?: number; // Day of month when credit card closes (1-31)
}
