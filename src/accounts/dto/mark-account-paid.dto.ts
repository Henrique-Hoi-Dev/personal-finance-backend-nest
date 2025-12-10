import { IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class MarkAccountPaidDto {
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmount?: number;
}
