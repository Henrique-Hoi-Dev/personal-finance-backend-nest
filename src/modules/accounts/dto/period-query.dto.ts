import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PeriodQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  referenceMonth: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2100)
  referenceYear: number;
}
