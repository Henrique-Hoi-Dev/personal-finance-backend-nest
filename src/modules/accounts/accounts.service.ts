import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Account,
  AccountType,
  Installment,
  Prisma,
  PrismaClient,
  Transaction,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InstallmentsService } from '../installments/installments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { MonthlySummaryService } from '../monthly-summary/monthly-summary.service';
import { PluggyIntegrationService } from '../integrations/pluggy/pluggy-integration.service';
import { CreditCardItemsService } from '../credit-card-items/credit-card-items.service';
import { PluggyAccountResponse } from '../integrations/pluggy/pluggy.types';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { GetAccountsQueryDto } from './dto/get-accounts-query.dto';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto';
import { PeriodQueryDto } from './dto/period-query.dto';
import { MarkAccountPaidDto } from './dto/mark-account-paid.dto';
import { UpdateTemporalReferenceDto } from './dto/update-temporal-reference.dto';
import { AssociateAccountToCreditCardDto } from './dto/associate-account-to-credit-card.dto';
import { GetCreditCardAssociatedAccountsDto } from './dto/get-credit-card-associated-accounts.dto';
import { GetPluggyAccountsDto } from './dto/get-pluggy-accounts.dto';
import {
  AccountWithInstallmentsAndExtras,
  AccountListResult,
  AccountsByPeriodResult,
  PeriodStatisticsResult,
  FixedAccountsCheckResult,
  LoanCalculationResult,
  MarkAccountPaidResult,
} from './accounts.types';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly installmentsService: InstallmentsService,
    private readonly transactionsService: TransactionsService,
    private readonly monthlySummaryService: MonthlySummaryService,
    private readonly pluggyIntegration: PluggyIntegrationService,
    private readonly creditCardItemsService: CreditCardItemsService,
  ) {}

  // ========== Core CRUD ==========

  async create(
    dto: CreateAccountDto,
  ): Promise<AccountWithInstallmentsAndExtras> {
    const startDate = new Date(dto.startDate);

    // Calculate referenceMonth/referenceYear
    // For CREDIT_CARD, consider closingDate
    let referenceMonth = dto.referenceMonth;
    let referenceYear = dto.referenceYear;

    if (!referenceMonth || !referenceYear) {
      if (dto.type === AccountType.CREDIT_CARD && dto.closingDate) {
        // For credit cards, calculate based on closingDate
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (currentDay <= dto.closingDate) {
          // Current month
          referenceMonth = currentMonth;
          referenceYear = currentYear;
        } else {
          // Next month
          referenceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          referenceYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        }
      } else {
        // Default: use startDate
        referenceMonth = startDate.getMonth() + 1;
        referenceYear = startDate.getFullYear();
      }
    }

    // Validate and calculate amounts based on account type
    let totalAmount = dto.totalAmount ?? null;
    let installmentAmount = dto.installmentAmount ?? null;

    // Validate FIXED accounts with installments
    if (dto.type === AccountType.FIXED && dto.installments) {
      if (!dto.installmentAmount) {
        throw new BadRequestException(
          'FIXED accounts with installments require installmentAmount',
        );
      }
      // Calculate totalAmount from installmentAmount
      totalAmount = dto.installmentAmount * dto.installments;
    }

    // Validate and calculate LOAN accounts
    if (dto.type === AccountType.LOAN) {
      if (!dto.totalAmount || !dto.installments || !dto.installmentAmount) {
        throw new BadRequestException(
          'LOAN accounts require totalAmount, installments, and installmentAmount',
        );
      }

      // Calculate loan values
      const loanCalc = this.calculateLoanAmounts(
        dto.totalAmount,
        dto.installments,
        dto.installmentAmount,
      );

      totalAmount = loanCalc.totalAmount;
      installmentAmount = dto.installmentAmount;
      // Note: totalWithInterest, interestRate, monthlyInterestRate
      // would be stored if these fields existed in the schema
    }

    // For other types with installments: if only totalAmount is provided, divide equally
    if (
      dto.type !== AccountType.FIXED &&
      dto.type !== AccountType.LOAN &&
      dto.installments &&
      dto.totalAmount &&
      !dto.installmentAmount
    ) {
      // Will be divided equally in createInstallments
      totalAmount = dto.totalAmount;
    }

    const payload: Prisma.AccountUncheckedCreateInput = {
      userId: dto.userId,
      name: dto.name,
      type: dto.type,
      isPaid: dto.isPaid ?? false,
      totalAmount: totalAmount,
      installments: dto.installments ?? null,
      startDate,
      dueDay: dto.dueDay,
      isPreview: dto.isPreview ?? false,
      referenceMonth,
      referenceYear,
      creditLimit: dto.creditLimit ?? null,
      creditCardId: dto.creditCardId ?? null,
    };

    const account = await this.prisma.account.create({ data: payload });

    // Generate installments if needed
    if (account.installments) {
      try {
        // FIXED and LOAN: use installmentAmount (createInstallmentsFromAmount)
        if (
          (dto.type === AccountType.FIXED || dto.type === AccountType.LOAN) &&
          installmentAmount
        ) {
          await this.installmentsService.createInstallmentsFromAmount({
            accountId: account.id,
            installmentAmount: installmentAmount,
            installments: account.installments,
            startDate: account.startDate,
            dueDay: account.dueDay,
          });
        } else if (totalAmount) {
          // Other types: divide totalAmount equally (createInstallments)
          await this.installmentsService.createInstallments({
            accountId: account.id,
            totalAmount: Number(totalAmount),
            installments: account.installments,
            startDate: account.startDate,
            dueDay: account.dueDay,
          });
        }
      } catch (error) {
        // Log error but don't fail account creation
        console.error('Error creating installments:', error);
      }
    }

    // Generate monthly summaries
    try {
      await this.monthlySummaryService.generateSummariesForAccount(account.id, [
        { month: referenceMonth, year: referenceYear },
      ]);
    } catch (error) {
      // Log error but don't fail account creation
      console.error('Error generating monthly summaries:', error);
    }

    return this.getById(account.id);
  }

  async update(
    id: string,
    data: UpdateAccountDto,
  ): Promise<AccountWithInstallmentsAndExtras> {
    const existing = await this.prisma.account.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    // Determine final account type (use updated or existing)
    const accountType = data.type ?? existing.type;

    // Calculate referenceMonth/referenceYear if needed
    let referenceMonth = data.referenceMonth ?? existing.referenceMonth;
    let referenceYear = data.referenceYear ?? existing.referenceYear;

    if (!referenceMonth || !referenceYear) {
      const startDate = data.startDate
        ? new Date(data.startDate)
        : existing.startDate;

      if (accountType === AccountType.CREDIT_CARD && data.closingDate) {
        // For credit cards, calculate based on closingDate
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (currentDay <= data.closingDate) {
          referenceMonth = currentMonth;
          referenceYear = currentYear;
        } else {
          referenceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          referenceYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        }
      } else {
        referenceMonth = startDate.getMonth() + 1;
        referenceYear = startDate.getFullYear();
      }
    }

    // Calculate amounts based on account type
    let totalAmount = data.totalAmount ?? Number(existing.totalAmount ?? 0);
    let installmentAmount = data.installmentAmount ?? null;

    // Validate and calculate FIXED accounts with installments
    if (accountType === AccountType.FIXED && data.installments) {
      if (!data.installmentAmount && !existing.totalAmount) {
        throw new BadRequestException(
          'FIXED accounts with installments require installmentAmount',
        );
      }
      if (data.installmentAmount) {
        installmentAmount = data.installmentAmount;
        totalAmount = data.installmentAmount * data.installments;
      }
    }

    // Validate and calculate LOAN accounts
    if (accountType === AccountType.LOAN) {
      const finalTotalAmount =
        data.totalAmount ?? Number(existing.totalAmount ?? 0);
      const finalInstallments = data.installments ?? existing.installments ?? 0;
      const finalInstallmentAmount = data.installmentAmount ?? null;

      if (!finalTotalAmount || !finalInstallments || !finalInstallmentAmount) {
        throw new BadRequestException(
          'LOAN accounts require totalAmount, installments, and installmentAmount',
        );
      }

      // Calculate loan values
      const loanCalc = this.calculateLoanAmounts(
        finalTotalAmount,
        finalInstallments,
        finalInstallmentAmount,
      );

      totalAmount = loanCalc.totalAmount;
      installmentAmount = finalInstallmentAmount;
    }

    const updateData: Prisma.AccountUncheckedUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.startDate !== undefined)
      updateData.startDate = new Date(data.startDate);
    if (data.dueDay !== undefined) updateData.dueDay = data.dueDay;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (data.installments !== undefined)
      updateData.installments = data.installments;
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid;
    if (data.isPreview !== undefined) updateData.isPreview = data.isPreview;
    if (referenceMonth !== undefined)
      updateData.referenceMonth = referenceMonth;
    if (referenceYear !== undefined) updateData.referenceYear = referenceYear;
    if (data.creditLimit !== undefined)
      updateData.creditLimit = data.creditLimit;
    if (data.creditCardId !== undefined)
      updateData.creditCardId = data.creditCardId;

    const updated = await this.prisma.account.update({
      where: { id },
      data: updateData,
    });

    // Recreate installments if relevant fields changed
    const shouldRecreateInstallments =
      (data.installments !== undefined ||
        data.totalAmount !== undefined ||
        data.installmentAmount !== undefined ||
        data.startDate !== undefined ||
        data.dueDay !== undefined) &&
      updated.installments;

    if (shouldRecreateInstallments) {
      try {
        // Delete existing installments first
        await this.prisma.installment.deleteMany({
          where: { accountId: id },
        });

        // Recreate installments with correct method
        if (
          (accountType === AccountType.FIXED ||
            accountType === AccountType.LOAN) &&
          installmentAmount &&
          updated.installments
        ) {
          await this.installmentsService.createInstallmentsFromAmount({
            accountId: id,
            installmentAmount: installmentAmount,
            installments: updated.installments,
            startDate: updated.startDate,
            dueDay: updated.dueDay,
          });
        } else if (totalAmount && updated.installments) {
          await this.installmentsService.createInstallments({
            accountId: id,
            totalAmount: Number(totalAmount),
            installments: updated.installments,
            startDate: updated.startDate,
            dueDay: updated.dueDay,
          });
        }
      } catch (error) {
        console.error('Error recreating installments:', error);
      }
    }

    // Recalculate monthly summaries for affected months
    const affectedMonths: Array<{ month: number; year: number }> = [];

    // Add current reference month
    if (referenceMonth && referenceYear) {
      affectedMonths.push({ month: referenceMonth, year: referenceYear });
    }

    // Add previous reference month if changed
    if (
      existing.referenceMonth &&
      existing.referenceYear &&
      (referenceMonth !== existing.referenceMonth ||
        referenceYear !== existing.referenceYear)
    ) {
      affectedMonths.push({
        month: existing.referenceMonth,
        year: existing.referenceYear,
      });
    }

    if (affectedMonths.length > 0) {
      try {
        await this.monthlySummaryService.recalculateSummariesForMonths(
          updated.userId,
          affectedMonths,
        );
      } catch (error) {
        console.error('Error recalculating monthly summaries:', error);
      }
    }

    return this.getById(id);
  }

  async delete(id: string): Promise<Account> {
    const account = await this.findOne(id);
    await this.deleteAccount(id);
    return account;
  }

  private async deleteAccount(id: string): Promise<void> {
    const account = await this.findOne(id);

    // Collect affected months
    const affectedMonths: Array<{ month: number; year: number }> = [];
    if (account.referenceMonth && account.referenceYear) {
      affectedMonths.push({
        month: account.referenceMonth,
        year: account.referenceYear,
      });
    }

    // Get all installments for this account to delete their transactions
    const installments = await this.prisma.installment.findMany({
      where: { accountId: id },
      select: { id: true },
    });

    const installmentIds = installments.map((i) => i.id);

    // Delete credit card items if this is a credit card or linked account
    try {
      if (account.type === AccountType.CREDIT_CARD) {
        // Delete all links where this account is the credit card
        await this.creditCardItemsService.deleteAllByCreditCard(id);
      } else {
        // Delete all links where this account is linked
        await this.creditCardItemsService.deleteAllByAccount(id);
      }
    } catch (error) {
      console.error('Error deleting credit card items:', error);
    }

    await this.prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          | '$connect'
          | '$disconnect'
          | '$on'
          | '$transaction'
          | '$use'
          | '$extends'
        >,
      ) => {
        if (installmentIds.length > 0) {
          await tx.transaction.deleteMany({
            where: { installmentId: { in: installmentIds } },
          });
        }

        await tx.transaction.deleteMany({
          where: { accountId: id },
        });

        await tx.installment.deleteMany({
          where: { accountId: id },
        });

        await tx.account.delete({
          where: { id },
        });
      },
    );

    // Recalculate monthly summaries for affected months
    if (affectedMonths.length > 0) {
      try {
        await this.monthlySummaryService.recalculateSummariesForMonths(
          account.userId,
          affectedMonths,
        );
      } catch (error) {
        console.error('Error recalculating monthly summaries:', error);
      }
    }
  }

  async getById(id: string): Promise<AccountWithInstallmentsAndExtras> {
    return this.getByIdFull(id);
  }

  async getByIdFull(id: string): Promise<AccountWithInstallmentsAndExtras> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    const result: AccountWithInstallmentsAndExtras = {
      ...account,
      installmentList: [],
      amountPaid: 0,
      remainingAmount: Number(account.totalAmount ?? 0),
    };

    // Load installments
    try {
      const installments =
        await this.installmentsService.findByAccountSimple(id);
      result.installmentList = installments.map((inst) => ({
        id: inst.id,
        accountId: inst.accountId,
        installmentNumber: inst.number,
        dueDate: inst.dueDate,
        amount: Number(inst.amount), // Convert BigInt to number (cents)
        isPaid: inst.isPaid,
        paidAt: inst.paidAt,
        breakdown: null,
      }));
    } catch (error) {
      // Installments not available yet, leave empty
      console.error('Error loading installments:', error);
    }

    // For LOAN accounts: compute amountPaid from paid installments
    if (account.type === AccountType.LOAN && result.installmentList) {
      result.amountPaid = result.installmentList
        .filter((inst) => inst.isPaid)
        .reduce((sum, inst) => sum + inst.amount, 0);
      result.remainingAmount =
        Number(account.totalAmount ?? 0) - result.amountPaid;
    }

    // For CREDIT_CARD accounts: add breakdown to installments
    if (account.type === AccountType.CREDIT_CARD && result.installmentList) {
      try {
        this.addBreakdownToInstallments(account.id, result.installmentList);
      } catch (error) {
        console.error('Error adding breakdown to installments:', error);
      }
    }

    return result;
  }

  async list(query: ListAccountsQueryDto): Promise<AccountListResult> {
    const where: Prisma.AccountWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.isPaid !== undefined) {
      where.isPaid = query.isPaid;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count({ where }),
    ]);

    return {
      accounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========== Filters / Reporting ==========

  async findByUser(userId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findInstallmentAccounts(userId?: string): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      installments: { not: null },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFixedAccounts(userId?: string): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      type: AccountType.FIXED,
    };

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPeriod(
    userId: string,
    query: PeriodQueryDto,
  ): Promise<AccountsByPeriodResult> {
    const where: Prisma.AccountWhereInput = {
      userId,
      referenceMonth: query.referenceMonth,
      referenceYear: query.referenceYear,
    };

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: { dueDay: 'asc' },
    });

    return {
      accounts,
      total: accounts.length,
      referenceMonth: query.referenceMonth,
      referenceYear: query.referenceYear,
    };
  }

  async findUnpaidByPeriod(
    userId: string,
    query: PeriodQueryDto,
  ): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      userId,
      referenceMonth: query.referenceMonth,
      referenceYear: query.referenceYear,
      isPaid: false,
    };

    return this.prisma.account.findMany({
      where,
      orderBy: { dueDay: 'asc' },
    });
  }

  async getPeriodStatisticsTyped(
    userId: string,
    query: PeriodQueryDto,
  ): Promise<PeriodStatisticsResult> {
    const where: Prisma.AccountWhereInput = {
      userId,
      referenceMonth: query.referenceMonth,
      referenceYear: query.referenceYear,
    };

    const accounts = await this.prisma.account.findMany({ where });

    const totalAccounts = accounts.length;
    const paidAccounts = accounts.filter((a) => a.isPaid).length;
    const unpaidAccounts = totalAccounts - paidAccounts;

    const totalAmount = accounts.reduce(
      (sum, a) => sum + Number(a.totalAmount ?? 0),
      0,
    );
    const paidAmount = accounts
      .filter((a) => a.isPaid)
      .reduce((sum, a) => sum + Number(a.totalAmount ?? 0), 0);
    const unpaidAmount = totalAmount - paidAmount;

    return {
      referenceMonth: query.referenceMonth,
      referenceYear: query.referenceYear,
      totalAccounts,
      paidAccounts,
      unpaidAccounts,
      totalAmount,
      paidAmount,
      unpaidAmount,
    };
  }

  // ========== Status / Behavior ==========

  async checkAndUpdateFixedAccounts(
    userId?: string,
  ): Promise<FixedAccountsCheckResult> {
    // TODO: Implement logic to check and update fixed accounts
    // This should:
    // 1. Find all FIXED accounts for the user
    // 2. Check if they need to be updated (e.g., new month)
    // 3. Create new accounts or update existing ones
    // 4. Return the result

    const where: Prisma.AccountWhereInput = {
      type: AccountType.FIXED,
    };

    if (userId) {
      where.userId = userId;
    }

    const accounts = await this.prisma.account.findMany({ where });

    // TODO: Implement actual update logic
    return {
      updated: 0,
      accounts,
    };
  }

  async markAsPaid(
    accountId: string,
    userIdOrDto: string | MarkAccountPaidDto,
    dto?: MarkAccountPaidDto,
  ): Promise<Account | { account: Account; transaction: Transaction }> {
    // Legacy signature: markAsPaid(id, dto) - extract userId from dto or use default
    if (typeof userIdOrDto === 'string') {
      const userId = userIdOrDto;
      const paymentDto = dto ?? {};
      const result = await this.markAsPaidFull(accountId, userId, paymentDto);
      return result.account;
    } else {
      // New signature: markAsPaid(id, userId, dto)
      throw new BadRequestException(
        'markAsPaid requires userId as second parameter',
      );
    }
  }

  async markAsPaidFull(
    accountId: string,
    userId: string,
    dto: MarkAccountPaidDto,
  ): Promise<MarkAccountPaidResult> {
    const account = await this.findOne(accountId);

    if (account.userId !== userId) {
      throw new NotFoundException(
        `Account with ID ${accountId} not found for user ${userId}`,
      );
    }

    if (account.isPaid) {
      throw new BadRequestException('Account is already paid');
    }

    const paymentAmount = dto.paymentAmount ?? Number(account.totalAmount ?? 0);

    if (paymentAmount < Number(account.totalAmount ?? 0)) {
      throw new BadRequestException(
        'Payment amount is less than account total amount',
      );
    }

    // For installment accounts: update all unpaid installments
    if (account.installments) {
      try {
        await this.installmentsService.markAllUnpaidAsPaid(accountId);
      } catch (error) {
        console.error('Error marking installments as paid:', error);
      }
    }

    // Update account
    const updated = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        isPaid: true,
        isPreview: false,
      },
    });

    // Create transaction
    // Note: TypeScript has issues inferring Prisma Transaction type
    let transaction: ReturnType<
      typeof this.transactionsService.createAccountPayment
    > extends Promise<infer T>
      ? T | null
      : null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      transaction = await this.transactionsService.createAccountPayment(
        accountId,
        userId,
        paymentAmount,
      );
    } catch (error) {
      console.error('Error creating transaction:', error);
      // Transaction creation failed, but account is marked as paid
      // In production, you might want to rollback or handle this differently
    }

    return { account: updated, transaction };
  }

  async updateTemporalReference(
    accountId: string,
    dto: UpdateTemporalReferenceDto,
  ): Promise<Account> {
    return this.update(accountId, {
      referenceMonth: dto.referenceMonth,
      referenceYear: dto.referenceYear,
    });
  }

  // ========== Credit Card Specific ==========

  async associateAccountToCreditCard(
    creditCardIdOrUserId: string,
    dtoOrCreditCardId?: AssociateAccountToCreditCardDto | string,
    accountId?: string,
  ): Promise<Account> {
    // Legacy signature: associateAccountToCreditCard(creditCardId, dto)
    if (
      dtoOrCreditCardId &&
      typeof dtoOrCreditCardId === 'object' &&
      'accountId' in dtoOrCreditCardId
    ) {
      const dto = dtoOrCreditCardId;
      const creditCardId = creditCardIdOrUserId;
      return this.update(dto.accountId, { creditCardId });
    }
    // New signature: associateAccountToCreditCard(userId, creditCardId, accountId)
    if (typeof dtoOrCreditCardId === 'string' && accountId) {
      const userId = creditCardIdOrUserId;
      const creditCardId = dtoOrCreditCardId;
      await this.associateAccountToCreditCardFull(
        userId,
        creditCardId,
        accountId,
      );
      // Return Account for backward compatibility
      return this.findOne(accountId);
    }
    throw new BadRequestException('Invalid parameters');
  }

  async associateAccountToCreditCardFull(
    userId: string,
    creditCardId: string,
    accountId: string,
  ): Promise<{ creditCardId: string; accountId: string }> {
    const account = await this.findOne(accountId);

    if (account.userId !== userId) {
      throw new NotFoundException(
        `Account with ID ${accountId} not found for user ${userId}`,
      );
    }

    // Use CreditCardItemsService to create the link
    await this.creditCardItemsService.linkAccountToCreditCard(
      creditCardId,
      accountId,
    );

    // Update account with creditCardId (for backward compatibility)
    await this.update(accountId, { creditCardId });

    // Recalculate credit card installments
    try {
      await this.recalculateCreditCardInstallments(creditCardId);
    } catch (error) {
      console.error('Error recalculating credit card installments:', error);
      throw new Error('CREDIT_CARD_INSTALLMENTS_RECALCULATION_ERROR');
    }

    return { creditCardId, accountId };
  }

  async disassociateAccountFromCreditCard(
    creditCardId: string,
    accountId: string,
  ): Promise<Account> {
    await this.disassociateAccountFromCreditCardFull(creditCardId, accountId);
    return this.findOne(accountId);
  }

  private async disassociateAccountFromCreditCardFull(
    creditCardId: string,
    accountId: string,
  ): Promise<boolean> {
    const account = await this.findOne(accountId);

    if (account.creditCardId !== creditCardId) {
      throw new NotFoundException(
        `Account ${accountId} is not associated with credit card ${creditCardId}`,
      );
    }

    // Use CreditCardItemsService to remove the link
    await this.creditCardItemsService.unlinkAccountFromCreditCard(
      creditCardId,
      accountId,
    );

    // Update account to remove creditCardId (for backward compatibility)
    await this.update(accountId, { creditCardId: undefined });

    // Recalculate credit card installments
    try {
      await this.recalculateCreditCardInstallments(creditCardId);
    } catch (error) {
      console.error('Error recalculating credit card installments:', error);
      throw new Error('CREDIT_CARD_INSTALLMENTS_RECALCULATION_ERROR');
    }

    return true;
  }

  async getCreditCardAssociatedAccounts(
    creditCardIdOrUserId: string,
    queryOrCreditCardId?: GetCreditCardAssociatedAccountsDto | string,
  ): Promise<Account[]> {
    // Legacy signature: getCreditCardAssociatedAccounts(creditCardId, query)
    if (
      queryOrCreditCardId &&
      typeof queryOrCreditCardId === 'object' &&
      'page' in queryOrCreditCardId
    ) {
      const query = queryOrCreditCardId;
      const creditCardId = creditCardIdOrUserId;
      return this.getCreditCardAssociatedAccountsLegacy(creditCardId, query);
    }
    // New signature: getCreditCardAssociatedAccounts(userId, creditCardId)
    if (typeof queryOrCreditCardId === 'string') {
      const userId = creditCardIdOrUserId;
      const creditCardId = queryOrCreditCardId;
      return this.getCreditCardAssociatedAccountsFull(userId, creditCardId);
    }
    throw new BadRequestException('Invalid parameters');
  }

  async getCreditCardAssociatedAccountsFull(
    userId: string,
    creditCardId: string,
  ): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      userId,
      creditCardId,
    };

    return this.prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== Pluggy Integration ==========

  async getPluggyAccounts(
    itemIdOrQuery: string | GetPluggyAccountsDto,
  ): Promise<PluggyAccountResponse> {
    // Legacy signature: getPluggyAccounts(query)
    if (
      itemIdOrQuery &&
      typeof itemIdOrQuery === 'object' &&
      'itemId' in itemIdOrQuery
    ) {
      const query = itemIdOrQuery;
      if (query.itemId) {
        return this.getPluggyAccountsFull(query.itemId);
      }
      throw new BadRequestException('itemId is required');
    }
    // New signature: getPluggyAccounts(itemId)
    if (typeof itemIdOrQuery === 'string') {
      return this.getPluggyAccountsFull(itemIdOrQuery);
    }
    throw new BadRequestException('Invalid parameters');
  }

  private async getPluggyAccountsFull(
    itemId: string,
  ): Promise<PluggyAccountResponse> {
    return this.pluggyIntegration.getAccounts(itemId);
  }

  // ========== Private Helper Methods ==========

  private async findOne(id: string): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  /**
   * Calculate loan amounts based on principal, installments, and installmentAmount
   * Uses the Price formula: PMT = (P * i) / (1 - (1 + i) ^ -n)
   * Where: PMT = installmentAmount, P = principal, n = installments, i = monthlyInterestRate
   * Solves for i using Newton-Raphson method
   */
  private calculateLoanAmounts(
    principal: number,
    installments: number,
    installmentAmount: number,
  ): LoanCalculationResult {
    // Calculate totalWithInterest
    const totalWithInterest = installmentAmount * installments;

    // Calculate interestRate (absolute value in cents)
    const interestRate = totalWithInterest - principal;

    // Calculate monthlyInterestRate using Newton-Raphson method
    // Formula: PMT = (P * i) / (1 - (1 + i) ^ -n)
    // We need to solve for i given PMT, P, and n
    const monthlyInterestRate = this.calculateMonthlyInterestRate(
      principal,
      installments,
      installmentAmount,
    );

    return {
      totalAmount: principal, // Keep original principal
      monthlyPayment: installmentAmount,
      totalInterest: interestRate,
      monthlyInterestRate,
    };
  }

  /**
   * Calculate monthly interest rate using Newton-Raphson method
   * Solves: PMT = (P * i) / (1 - (1 + i) ^ -n) for i
   */
  private calculateMonthlyInterestRate(
    principal: number,
    installments: number,
    installmentAmount: number,
  ): number {
    // If installmentAmount equals principal/installments, rate is 0
    if (installmentAmount * installments === principal) {
      return 0;
    }

    // Initial guess: use approximation formula
    // i ≈ (PMT * n - P) / (P * n)
    let rate =
      (installmentAmount * installments - principal) /
      (principal * installments);

    // Newton-Raphson iteration
    const maxIterations = 100;
    const tolerance = 1e-10;

    for (let i = 0; i < maxIterations; i++) {
      // Calculate f(i) = PMT - (P * i) / (1 - (1 + i) ^ -n)
      const onePlusRate = 1 + rate;
      const denominator = 1 - Math.pow(onePlusRate, -installments);

      // Avoid division by zero
      if (Math.abs(denominator) < 1e-15) {
        break;
      }

      const f = installmentAmount - (principal * rate) / denominator;

      // Calculate f'(i) = derivative
      const numeratorDerivative =
        principal *
        (denominator -
          rate * installments * Math.pow(onePlusRate, -installments - 1));
      const denominatorDerivative = Math.pow(denominator, 2);
      const fPrime = -numeratorDerivative / denominatorDerivative;

      // Avoid division by zero
      if (Math.abs(fPrime) < 1e-15) {
        break;
      }

      // Newton-Raphson: i_new = i_old - f(i) / f'(i)
      const newRate = rate - f / fPrime;

      // Check convergence
      if (Math.abs(newRate - rate) < tolerance) {
        rate = newRate;
        break;
      }

      // Ensure rate stays positive and reasonable
      if (newRate < 0 || newRate > 1) {
        break;
      }

      rate = newRate;
    }

    // Convert to percentage (0.0215 = 2.15%)
    return rate * 100;
  }

  private getCurrentCreditCardMonth(): { month: number; year: number } {
    const now = new Date();
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }

  private getDueMonth(
    startDate: Date,
    dueDay: number,
  ): { month: number; year: number } {
    const dueDate = new Date(startDate);
    dueDate.setDate(dueDay);

    // If dueDay is before the start date's day, move to next month
    if (dueDate.getDate() < dueDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    return {
      month: dueDate.getMonth() + 1,
      year: dueDate.getFullYear(),
    };
  }

  private formatDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private addBreakdownToInstallments(
    _accountId: string,
    installments: Array<{
      id: string;
      breakdown?: Record<string, unknown> | null;
    }>,
  ): void {
    // TODO: Implement breakdown logic for credit card installments
    // This should:
    // 1. Load CreditCardItem records for this account
    // 2. Distribute items across installments
    // 3. Update each installment's breakdown field
    // 4. Serialize breakdown as JSON

    for (const installment of installments) {
      if (!installment.breakdown) {
        // TODO: Calculate breakdown from CreditCardItems
        const _breakdown = {
          items: [],
          total: 0,
        };

        // TODO: Update installment with breakdown
        // await this.prisma.installment.update({
        //   where: { id: installment.id },
        //   data: { breakdown: _breakdown },
        // });
      }
    }
  }

  private async recalculateCreditCardInstallments(
    creditCardId: string,
  ): Promise<Installment[]> {
    // TODO: Implement credit card installments recalculation
    // This should:
    // 1. Find all accounts associated with this credit card
    // 2. Find all installments for these accounts
    // 3. Recalculate breakdown for each installment
    // 4. Update installments with new breakdown

    const accounts = await this.prisma.account.findMany({
      where: { creditCardId },
    });

    const allInstallments: Installment[] = [];

    for (const account of accounts) {
      try {
        const installments = await this.installmentsService.findByAccountSimple(
          account.id,
        );
        allInstallments.push(...installments);

        // Recalculate breakdown
        this.addBreakdownToInstallments(account.id, installments);
      } catch (error) {
        console.error(
          `Error recalculating installments for account ${account.id}:`,
          error,
        );
      }
    }

    return allInstallments;
  }

  // ========== Legacy method aliases for backward compatibility ==========

  async findAll(query: GetAccountsQueryDto): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {};

    // Support both referenceMonth/month and referenceYear/year
    const month = query.referenceMonth ?? query.month;
    const year = query.referenceYear ?? query.year;

    if (month !== undefined) {
      where.referenceMonth = month;
    }

    if (year !== undefined) {
      where.referenceYear = year;
    }

    if (query.isPaid !== undefined) {
      where.isPaid = query.isPaid;
    }

    if (query.userId !== undefined) {
      where.userId = query.userId;
    }

    const skip =
      query.page && query.limit ? (query.page - 1) * query.limit : undefined;
    const take = query.limit;

    return this.prisma.account.findMany({
      where,
      skip,
      take,
    });
  }

  async getAccountsByPeriod(query: GetAccountsQueryDto): Promise<Account[]> {
    return this.findAll(query);
  }

  async getUnpaidAccountsByPeriod(
    query: GetAccountsQueryDto,
  ): Promise<Account[]> {
    return this.findAll({ ...query, isPaid: false });
  }

  getDashboardData(_query: GetAccountsQueryDto): Promise<unknown> {
    // TODO: Implement dashboard data aggregation
    return Promise.reject(new Error('Not implemented yet'));
  }

  getMonthlySummary(_query: GetAccountsQueryDto): Promise<unknown> {
    // TODO: Implement monthly summary
    return Promise.reject(new Error('Not implemented yet'));
  }

  getPeriodStatistics(_query: GetAccountsQueryDto): Promise<unknown> {
    // TODO: Implement period statistics - use getPeriodStatisticsTyped(userId, query) instead
    return Promise.reject(new Error('Not implemented yet'));
  }

  async getInstallments(
    accountId: string,
  ): Promise<import('@prisma/client').Installment[]> {
    await this.findOne(accountId);
    return this.installmentsService.findByAccountSimple(accountId);
  }

  async associateAccountToCreditCardLegacy(
    creditCardId: string,
    dto: AssociateAccountToCreditCardDto,
  ): Promise<Account> {
    // Legacy signature - should use the new one with userId
    return this.update(dto.accountId, { creditCardId });
  }

  async getCreditCardAssociatedAccountsLegacy(
    creditCardId: string,
    query: GetCreditCardAssociatedAccountsDto,
  ): Promise<Account[]> {
    const where: Prisma.AccountWhereInput = {
      creditCardId,
    };

    const skip =
      query.page && query.limit ? (query.page - 1) * query.limit : undefined;
    const take = query.limit;

    return this.prisma.account.findMany({
      where,
      skip,
      take,
    });
  }

  getPluggyAccountsLegacy(_query: GetPluggyAccountsDto): Promise<unknown> {
    // Legacy signature - should use the new one with itemId
    return Promise.reject(new Error('Not implemented yet'));
  }
}
