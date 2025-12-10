import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { MonthlySummaryModule } from '../monthly-summary/monthly-summary.module';
import { AccountsModule } from '../accounts/accounts.module';
import { InstallmentsModule } from '../installments/installments.module';
import { CategoriesService } from '../shared/services/categories.service';

@Module({
  imports: [
    PrismaModule,
    MonthlySummaryModule,
    forwardRef(() => AccountsModule),
    forwardRef(() => InstallmentsModule),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    {
      provide: 'ICategoriesService',
      useClass: CategoriesService,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
