import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Installment, Account, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InstallmentDto } from './dto/installment.dto';
import { InstallmentWithAccountDto } from './dto/installment-with-account.dto';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find installment by id with related account
   */
  async findById(
    id: string,
  ): Promise<Installment & { account: Account }> {
    const installment = await this.prisma.installment.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!installment) {
      throw new NotFoundException(`Installment with id ${id} not found`);
    }

    return installment;
  }

  /**
   * Find all installments for an account
   */
  async findByAccount(accountId: string): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      where: { accountId },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Find unpaid installments for an account
   */
  async findUnpaidByAccount(accountId: string): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      where: {
        accountId,
        isPaid: false,
      },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Find overdue installments for an account
   */
  async findOverdueByAccount(
    accountId: string,
    referenceDate: Date = new Date(),
  ): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      where: {
        accountId,
        isPaid: false,
        dueDate: {
          lt: referenceDate,
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  /**
   * Internal helper to update paid status with hook logic
   * Implements the Sequelize beforeUpdate hook behavior
   */
  private async updatePaidStatus(
    id: string,
    isPaid: boolean,
  ): Promise<Installment> {
    const existing = await this.prisma.installment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Installment with id ${id} not found`);
    }

    const wasPaid = existing.isPaid;
    let paidAt: Date | null = existing.paidAt;

    // Hook logic: set paidAt when marking as paid, clear when marking as unpaid
    if (isPaid && !wasPaid) {
      paidAt = new Date();
    } else if (!isPaid && wasPaid) {
      paidAt = null;
    }

    return this.prisma.installment.update({
      where: { id },
      data: { isPaid, paidAt },
    });
  }

  /**
   * Mark installment as paid
   */
  async markAsPaid(id: string): Promise<Installment> {
    return this.updatePaidStatus(id, true);
  }

  /**
   * Mark installment as unpaid
   */
  async markAsUnpaid(id: string): Promise<Installment> {
    return this.updatePaidStatus(id, false);
  }
}
