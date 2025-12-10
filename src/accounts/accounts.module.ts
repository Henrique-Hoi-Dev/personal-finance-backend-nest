import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { InstallmentsModule } from '../installments/installments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { MonthlySummaryModule } from '../monthly-summary/monthly-summary.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    InstallmentsModule,
    TransactionsModule,
    MonthlySummaryModule,
    IntegrationsModule,
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
