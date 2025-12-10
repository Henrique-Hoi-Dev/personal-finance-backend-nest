import { Module } from '@nestjs/common';
import { InstallmentsController } from './installments.controller';
import { InstallmentsService } from './installments.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { MonthlySummaryModule } from '../monthly-summary/monthly-summary.module';

@Module({
  imports: [TransactionsModule, MonthlySummaryModule],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
  exports: [InstallmentsService],
})
export class InstallmentsModule {}
