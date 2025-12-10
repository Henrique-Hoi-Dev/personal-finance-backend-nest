import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateIncomeDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  installmentId?: string;

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

  @IsOptional()
  @IsDateString()
  date?: string;
}

