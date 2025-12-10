import { Module } from '@nestjs/common';
import { MonthlySummaryService } from './monthly-summary.service';

@Module({
  providers: [MonthlySummaryService],
  exports: [MonthlySummaryService],
})
export class MonthlySummaryModule {}
