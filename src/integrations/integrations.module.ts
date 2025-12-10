import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PluggyIntegrationService } from './pluggy/pluggy-integration.service';

@Module({
  imports: [HttpModule],
  providers: [PluggyIntegrationService],
  exports: [PluggyIntegrationService],
})
export class IntegrationsModule {}
