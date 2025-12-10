import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AccountsModule } from './accounts/accounts.module';
import { InstallmentsModule } from './installments/installments.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MonthlySummaryModule } from './monthly-summary/monthly-summary.module';
import { PluggyModule } from './pluggy/pluggy.module';

@Module({
  imports: [
    PrismaModule,
    AccountsModule,
    InstallmentsModule,
    TransactionsModule,
    MonthlySummaryModule,
    PluggyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
