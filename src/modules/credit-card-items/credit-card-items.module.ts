import { Module } from '@nestjs/common';
import { CreditCardItemsController } from './credit-card-items.controller';
import { CreditCardItemsService } from './credit-card-items.service';

@Module({
  controllers: [CreditCardItemsController],
  providers: [CreditCardItemsService],
  exports: [CreditCardItemsService],
})
export class CreditCardItemsModule {}

