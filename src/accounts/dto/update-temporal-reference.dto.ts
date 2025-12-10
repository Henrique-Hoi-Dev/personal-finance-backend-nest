import { IsInt, Min, Max } from 'class-validator';

export class UpdateTemporalReferenceDto {
  @IsInt()
  @Min(1)
  @Max(12)
  referenceMonth: number;

  @IsInt()
  @Min(2020)
  @Max(2100)
  referenceYear: number;
}
