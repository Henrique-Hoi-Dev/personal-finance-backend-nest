import { Module } from '@nestjs/common';
import { PluggyService } from './pluggy.service';

@Module({
  providers: [PluggyService],
  exports: [PluggyService],
})
export class PluggyModule {}
