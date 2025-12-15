import { Injectable } from '@nestjs/common';
import { Installment, Account, Transaction } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { MonthlySummaryService } from '../monthly-summary/monthly-summary.service';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../shared/types/pagination.types';
import {
  InstallmentsPaginatedResult,
  InstallmentMarkPaidResult,
  CreateInstallmentsInput,
  CreateInstallmentsFromAmountInput,
} from './types/installment.types';

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
    private readonly monthlySummaryService: MonthlySummaryService,
  ) {}

  /**
   * Get installment by id
   * Ported from legacy: getById
   */
  async getById(id: string): Promise<Installment> {
    try {
      const installment = await this.prisma.installment.findUnique({
        where: { id },
      });

      if (!installment) {
        throw new Error('INSTALLMENT_NOT_FOUND');
      }

      return installment;
    } catch (error) {
      if (error instanceof Error && error.message === 'INSTALLMENT_NOT_FOUND') {
        throw error;
      }
      throw new Error('INSTALLMENT_FETCH_ERROR');
    }
  }

  /**
   * Get installment by id with account (for compatibility)
   */
  async findById(id: string): Promise<Installment & { account: Account }> {
    try {
      const installment = await this.prisma.installment.findUnique({
        where: { id },
        include: { account: true },
      });

      if (!installment) {
        throw new Error('INSTALLMENT_NOT_FOUND');
      }

      return installment;
    } catch (error) {
      if (error instanceof Error && error.message === 'INSTALLMENT_NOT_FOUND') {
        throw error;
      }
      throw new Error('INSTALLMENT_FETCH_ERROR');
    }
  }

  /**
   * Delete installment - always throws error (legacy behavior)
   * Ported from legacy: delete
   */
  delete(_id: string): Promise<never> {
    return Promise.reject(
      new Error('INSTALLMENT_INDIVIDUAL_DELETION_NOT_ALLOWED'),
    );
  }

  /**
   * Find installments by account with pagination
   * Ported from legacy: findByAccount
   */
  async findByAccount(
    accountId: string,
    options?: PaginationOptions,
  ): Promise<InstallmentsPaginatedResult> {
    try {
      const limit = options?.limit ?? 10;
      const page = options?.page ?? 1;
      const offset = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        this.prisma.installment.findMany({
          where: { accountId },
          orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
          skip: offset,
          take: limit,
        }),
        this.prisma.installment.count({
          where: { accountId },
        }),
      ]);

      return this.buildPaginatedResult(docs, total, limit, page, offset);
    } catch {
      throw new Error('INSTALLMENT_FETCH_ERROR');
    }
  }

  /**
   * Find installments by account (simple array, for compatibility)
   * Returns all installments without pagination
   */
  async findByAccountSimple(accountId: string): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      where: { accountId },
      orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Find unpaid installments by account with pagination
   * Ported from legacy: findUnpaidByAccount
   */
  async findUnpaidByAccount(
    accountId: string,
    options?: PaginationOptions,
  ): Promise<InstallmentsPaginatedResult> {
    try {
      const limit = options?.limit ?? 10;
      const page = options?.page ?? 1;
      const offset = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        this.prisma.installment.findMany({
          where: {
            accountId,
            isPaid: false,
          },
          orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
          skip: offset,
          take: limit,
        }),
        this.prisma.installment.count({
          where: {
            accountId,
            isPaid: false,
          },
        }),
      ]);

      return this.buildPaginatedResult(docs, total, limit, page, offset);
    } catch {
      throw new Error('INSTALLMENT_FETCH_ERROR');
    }
  }

  /**
   * Find overdue installments with pagination
   * Ported from legacy: findOverdue
   */
  async findOverdue(
    accountId?: string,
    options?: PaginationOptions,
  ): Promise<InstallmentsPaginatedResult> {
    try {
      const limit = options?.limit ?? 10;
      const page = options?.page ?? 1;
      const offset = (page - 1) * limit;
      const now = new Date();

      const whereClause: {
        isPaid: boolean;
        dueDate: { lt: Date };
        accountId?: string;
      } = {
        isPaid: false,
        dueDate: { lt: now },
      };

      if (accountId) {
        whereClause.accountId = accountId;
      }

      const [docs, total] = await Promise.all([
        this.prisma.installment.findMany({
          where: whereClause,
          orderBy: [{ dueDate: 'asc' }],
          skip: offset,
          take: limit,
        }),
        this.prisma.installment.count({
          where: whereClause,
        }),
      ]);

      return this.buildPaginatedResult(docs, total, limit, page, offset);
    } catch {
      throw new Error('INSTALLMENT_FETCH_ERROR');
    }
  }

  /**
   * Create installments from totalAmount (with DTO for compatibility)
   */
  async createInstallments(
    dto: CreateInstallmentsInput,
  ): Promise<Installment[]> {
    return this.createInstallmentsFromTotalAmount(
      dto.accountId,
      dto.totalAmount,
      dto.installments,
      dto.startDate,
      dto.dueDay,
    );
  }

  /**
   * Create installments from totalAmount
   * Ported from legacy: createInstallments
   */
  async createInstallmentsFromTotalAmount(
    accountId: string,
    totalAmount: number, // cents
    installments: number,
    startDate: string | Date,
    dueDay: number,
  ): Promise<Installment[]> {
    try {
      // Normalize startDate to UTC base date
      const baseDate = this.normalizeStartDate(startDate);

      // Calculate installment amount in cents
      const installmentAmountCents = Math.round(totalAmount / installments);
      const totalCents = installmentAmountCents * installments;
      // Adjust last installment if there's a rounding difference
      const lastInstallmentAdjustment = totalAmount - totalCents;

      const installmentsToCreate: Array<{
        accountId: string;
        number: number;
        dueDate: Date;
        amount: bigint;
        referenceMonth: number | null;
        referenceYear: number | null;
      }> = [];

      for (let i = 1; i <= installments; i++) {
        const { dueDate, referenceMonth, referenceYear } =
          this.calculateDueDate(baseDate, i, dueDay);

        // Last installment gets the adjustment
        const amount =
          i === installments
            ? BigInt(installmentAmountCents + lastInstallmentAdjustment)
            : BigInt(installmentAmountCents);

        installmentsToCreate.push({
          accountId,
          number: i,
          dueDate,
          amount,
          referenceMonth,
          referenceYear,
        });
      }

      // Use createMany for better performance
      await this.prisma.installment.createMany({
        data: installmentsToCreate,
      });

      // Return created installments
      return this.prisma.installment.findMany({
        where: { accountId },
        orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
      });
    } catch {
      throw new Error('INSTALLMENT_CREATION_ERROR');
    }
  }

  /**
   * Create installments from installmentAmount
   * Each installment gets the exact installmentAmount (no division)
   * Used for FIXED and LOAN accounts
   */
  async createInstallmentsFromAmount(
    input: CreateInstallmentsFromAmountInput,
  ): Promise<Installment[]> {
    try {
      // Normalize startDate to UTC base date
      const baseDate = this.normalizeStartDate(input.startDate);

      const installmentsToCreate: Array<{
        accountId: string;
        number: number;
        dueDate: Date;
        amount: bigint;
        referenceMonth: number | null;
        referenceYear: number | null;
      }> = [];

      // Use exact installmentAmount for each installment (no division)
      const installmentAmountCents = Math.round(input.installmentAmount);

      for (let i = 1; i <= input.installments; i++) {
        const { dueDate, referenceMonth, referenceYear } =
          this.calculateDueDate(baseDate, i, input.dueDay);

        installmentsToCreate.push({
          accountId: input.accountId,
          number: i,
          dueDate,
          amount: BigInt(installmentAmountCents),
          referenceMonth,
          referenceYear,
        });
      }

      // Use createMany for better performance
      await this.prisma.installment.createMany({
        data: installmentsToCreate,
      });

      // Return created installments
      return this.prisma.installment.findMany({
        where: { accountId: input.accountId },
        orderBy: [{ number: 'asc' }, { createdAt: 'asc' }],
      });
    } catch {
      throw new Error('INSTALLMENT_CREATION_ERROR');
    }
  }

  /**
   * Mark installment as paid with transaction and monthly summary update
   * Ported from legacy: markAsPaid
   */
  async markAsPaid(
    installmentId: string,
    userId: string,
  ): Promise<InstallmentMarkPaidResult> {
    try {
      // Load the installment
      const installment = await this.getById(installmentId);

      // Check if already paid
      if (installment.isPaid) {
        throw new Error('INSTALLMENT_ALREADY_PAID');
      }

      // Create transaction
      let transaction: Transaction;
      try {
        transaction = await this.transactionsService.createInstallmentPayment(
          installment.id,
          userId,
        );
      } catch {
        throw new Error('INSTALLMENT_PAYMENT_ERROR');
      }

      // Update installment status
      const updatedInstallment = await this.updatePaidStatus(installment, true);

      // Recalculate monthly summary
      if (
        installment.referenceMonth !== null &&
        installment.referenceYear !== null
      ) {
        try {
          await this.monthlySummaryService.calculateMonthlySummary(
            userId,
            installment.referenceMonth,
            installment.referenceYear,
            true, // forceRecalculate
          );
        } catch (error) {
          // Log but don't fail the payment
          console.error('Error recalculating monthly summary:', error);
        }
      }

      return {
        installment: updatedInstallment,
        transaction,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'INSTALLMENT_NOT_FOUND' ||
          error.message === 'INSTALLMENT_ALREADY_PAID' ||
          error.message === 'INSTALLMENT_PAYMENT_ERROR')
      ) {
        throw error;
      }
      throw new Error('INSTALLMENT_PAYMENT_ERROR');
    }
  }

  /**
   * Mark installment as paid (instance method)
   * Ported from legacy: markAsPaidInstance
   */
  async markAsPaidInstance(installment: Installment): Promise<Installment> {
    return this.updatePaidStatus(installment, true);
  }

  /**
   * Mark installment as unpaid (instance method)
   * Ported from legacy: markAsUnpaidInstance
   */
  async markAsUnpaidInstance(installment: Installment): Promise<Installment> {
    return this.updatePaidStatus(installment, false);
  }

  /**
   * Mark installment as unpaid by id (for compatibility)
   */
  async markAsUnpaid(id: string): Promise<Installment> {
    const installment = await this.getById(id);
    return this.updatePaidStatus(installment, false);
  }

  /**
   * Mark installment as paid by id (simple version, for compatibility)
   * Note: This does NOT create transaction or update monthly summary
   * Use markAsPaid(installmentId, userId) for full functionality
   */
  async markAsPaidSimple(id: string): Promise<Installment> {
    const installment = await this.getById(id);
    return this.updatePaidStatus(installment, true);
  }

  /**
   * Mark all unpaid installments of an account as paid
   */
  async markAllUnpaidAsPaid(accountId: string): Promise<void> {
    const now = new Date();

    // Update all unpaid installments in a single transaction
    await this.prisma.installment.updateMany({
      where: {
        accountId,
        isPaid: false,
      },
      data: {
        isPaid: true,
        paidAt: now,
      },
    });
  }

  /**
   * Private helper to update paid status with hook logic
   * Implements the Sequelize beforeUpdate hook behavior
   */
  private async updatePaidStatus(
    installment: Installment,
    isPaid: boolean,
  ): Promise<Installment> {
    let paidAt: Date | null = installment.paidAt;

    // Hook logic: set paidAt when marking as paid, clear when marking as unpaid
    if (isPaid && !installment.isPaid) {
      paidAt = new Date();
    } else if (!isPaid && installment.isPaid) {
      paidAt = null;
    }

    return this.prisma.installment.update({
      where: { id: installment.id },
      data: { isPaid, paidAt },
    });
  }

  /**
   * Normalize startDate to UTC base date
   * Helper to parse YYYY-MM-DD string or Date to UTC Date
   */
  private normalizeStartDate(startDate: string | Date): Date {
    if (typeof startDate === 'string') {
      // Parse YYYY-MM-DD format
      const [year, month, day] = startDate.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    // If already a Date, convert to UTC
    return new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
  }

  /**
   * Calculate due date, referenceMonth and referenceYear for an installment
   * Helper that increments month and sets dueDay
   */
  private calculateDueDate(
    baseDate: Date,
    installmentNumber: number,
    dueDay: number,
  ): {
    dueDate: Date;
    referenceMonth: number;
    referenceYear: number;
  } {
    // Start from baseDate, add (installmentNumber - 1) months
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const newMonth = month + (installmentNumber - 1);

    // Create UTC date with the calculated month/year and dueDay
    const dueDate = new Date(Date.UTC(year, newMonth, dueDay));

    // Get reference month/year from due date
    const referenceMonth = dueDate.getUTCMonth() + 1; // 1-12
    const referenceYear = dueDate.getUTCFullYear();

    return {
      dueDate,
      referenceMonth,
      referenceYear,
    };
  }

  /**
   * Build paginated result structure
   * Helper to create consistent pagination response
   */
  private buildPaginatedResult<T>(
    docs: T[],
    total: number,
    limit: number,
    page: number,
    offset: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      docs,
      total,
      limit,
      page,
      offset,
      hasNextPage,
      hasPrevPage,
    };
  }
}
