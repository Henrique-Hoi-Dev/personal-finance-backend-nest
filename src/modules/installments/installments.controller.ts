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
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<
    | InstallmentDto[]
    | {
        docs: InstallmentDto[];
        total: number;
        page: number;
        limit: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      }
  > {
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    if (pageNum !== undefined || limitNum !== undefined) {
      // Return paginated result
      const result = await this.installmentsService.findByAccount(accountId, {
        page: pageNum,
        limit: limitNum,
      });
      return {
        docs: result.docs.map((installment) =>
          InstallmentDto.fromPrisma(installment),
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      };
    }

    // Return simple array (no pagination)
    const installments =
      await this.installmentsService.findByAccountSimple(accountId);
    return installments.map((installment) =>
      InstallmentDto.fromPrisma(installment),
    );
  }

  @Patch(':id/pay')
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId') userId?: string,
  ): Promise<InstallmentDto> {
    if (userId) {
      // Full functionality with transaction and monthly summary
      const result = await this.installmentsService.markAsPaid(id, userId);
      return InstallmentDto.fromPrisma(result.installment);
    }
    // Simple version (for compatibility)
    const installment = await this.installmentsService.markAsPaidSimple(id);
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
