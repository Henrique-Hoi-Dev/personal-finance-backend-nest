import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { InstallmentsModule } from './modules/installments/installments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { MonthlySummaryModule } from './modules/monthly-summary/monthly-summary.module';
import { PluggyModule } from './modules/pluggy/pluggy.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

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
