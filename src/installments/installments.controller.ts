import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { InstallmentDto } from './dto/installment.dto';
import { InstallmentWithAccountDto } from './dto/installment-with-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('accounts/installments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstallmentWithAccountDto> {
    const installment = await this.installmentsService.findById(id);
    return InstallmentWithAccountDto.fromPrisma(installment);
  }

  @Get()
  async getByAccount(
    @Query('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<InstallmentDto[]> {
    const installments = await this.installmentsService.findByAccount(accountId);
    return installments.map((installment) =>
      InstallmentDto.fromPrisma(installment),
    );
  }

  @Patch(':id/pay')
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstallmentDto> {
    const installment = await this.installmentsService.markAsPaid(id);
    return InstallmentDto.fromPrisma(installment);
  }

  @Patch(':id/unpay')
  async markAsUnpaid(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InstallmentDto> {
    const installment = await this.installmentsService.markAsUnpaid(id);
    return InstallmentDto.fromPrisma(installment);
  }
}
