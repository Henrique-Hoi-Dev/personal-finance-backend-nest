import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AccountsModule } from './accounts/accounts.module';
import { InstallmentsModule } from './installments/installments.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MonthlySummaryModule } from './monthly-summary/monthly-summary.module';
import { PluggyModule } from './pluggy/pluggy.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AccountsModule,
    InstallmentsModule,
    TransactionsModule,
    MonthlySummaryModule,
    PluggyModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
