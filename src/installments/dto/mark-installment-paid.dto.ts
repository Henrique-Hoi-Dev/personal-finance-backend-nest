import { IsOptional, IsBoolean } from 'class-validator';

export class MarkInstallmentPaidDto {
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}
