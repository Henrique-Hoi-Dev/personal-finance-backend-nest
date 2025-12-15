import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { Transaction, TransactionType, AccountType } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { MonthlySummaryService } from '../monthly-summary/monthly-summary.service';
import { AccountsService } from '../accounts/accounts.service';
import { InstallmentsService } from '../installments/installments.service';
import type { ICategoriesService } from '../../shared/types/categories.types';
import { PaginationResult } from '../../shared/types/pagination.types';
import {
  TransactionListFilters,
  UserBalanceOptions,
  UserBalanceResult,
  UserBalancePeriodInfo,
  ExpensesByCategoryOptions,
  ExpensesByCategoryResult,
  ExpenseCategoryItem,
} from './types/transaction.interfaces';
import { getCategoryColor } from '../../shared/utils/category-colors';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monthlySummaryService: MonthlySummaryService,
    @Inject(forwardRef(() => AccountsService))
    private readonly accountsService: AccountsService,
    @Inject(forwardRef(() => InstallmentsService))
    private readonly installmentsService: InstallmentsService,
    @Inject('ICategoriesService')
    private readonly categoriesService: ICategoriesService,
  ) {}

  async create(data: CreateTransactionDto): Promise<Transaction> {
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: data.userId,
        accountId: data.accountId ?? null,
        installmentId: data.installmentId ?? null,
        type: data.type,
        category: data.category ?? null,
        description: data.description,
        value: BigInt(data.value),
        date: new Date(data.date),
      },
    });

    // Recalculate monthly summary
    const transactionDate = new Date(data.date);
    await this.monthlySummaryService.calculateMonthlySummary(
      data.userId,
      transactionDate.getMonth() + 1,
      transactionDate.getFullYear(),
      true,
    );

    return transaction;
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('TRANSACTION_NOT_FOUND');
    }

    return transaction;
  }

  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);

    // Revert installment if exists
    if (transaction.installmentId) {
      const installment = await this.prisma.installment.findUnique({
        where: { id: transaction.installmentId },
      });

      if (installment) {
        await this.prisma.installment.update({
          where: { id: installment.id },
          data: {
            isPaid: false,
            paidAt: null,
          },
        });
      }
    }

    // Revert account if exists
    if (transaction.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: transaction.accountId },
      });

      if (account && account.isPaid) {
        // Count all installments for this account
        const allInstallments = await this.prisma.installment.findMany({
          where: { accountId: account.id },
        });

        if (allInstallments.length > 0) {
          // Count unpaid installments
          const unpaidInstallments = await this.prisma.installment.findMany({
            where: {
              accountId: account.id,
              isPaid: false,
            },
          });

          if (unpaidInstallments.length > 0) {
            await this.prisma.account.update({
              where: { id: account.id },
              data: { isPaid: false },
            });
          }
        } else {
          // No installments, always set isPaid = false
          await this.prisma.account.update({
            where: { id: account.id },
            data: { isPaid: false },
          });
        }
      }
    }

    // Delete transaction
    await this.prisma.transaction.delete({
      where: { id },
    });

    // Recalculate monthly summary
    const transactionDate = new Date(transaction.date);
    await this.monthlySummaryService.calculateMonthlySummary(
      transaction.userId,
      transactionDate.getMonth() + 1,
      transactionDate.getFullYear(),
      true,
    );
  }

  async getAll(
    userId: string,
    filters: TransactionListFilters,
  ): Promise<PaginationResult<Transaction>> {
    const limit = filters.limit ?? 10;
    const page = filters.page ?? 1;
    const offset = (page - 1) * limit;

    const where: {
      userId: string;
      type?: TransactionType;
      category?: string;
      accountId?: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      userId,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    const [docs, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      docs,
      total,
      limit,
      page,
      offset,
      hasNextPage: offset + limit < total,
      hasPrevPage: page > 1,
    };
  }

  async getUserBalance(
    userId: string,
    options: UserBalanceOptions = {},
  ): Promise<UserBalanceResult> {
    const now = new Date();
    const year = options.year ?? now.getFullYear();
    const month = options.month ?? now.getMonth() + 1;

    // Calculate period dates
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const period: UserBalancePeriodInfo = {
      year,
      month,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      isCurrentMonth:
        year === now.getFullYear() && month === now.getMonth() + 1,
    };

    // Get transactions in period
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate income and expense
    let income = 0;
    let expense = 0;
    let linkedExpenses = 0;

    for (const transaction of transactions) {
      const value = Number(transaction.value);
      if (transaction.type === TransactionType.INCOME) {
        income += value;
      } else {
        expense += value;
        if (transaction.accountId || transaction.installmentId) {
          linkedExpenses += value;
        }
      }
    }

    const standaloneExpenses = expense - linkedExpenses;

    // Get accounts for user
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });

    // Calculate loan accounts total
    let loanAccountsTotal = 0;
    for (const account of accounts) {
      if (account.type === AccountType.LOAN && account.totalAmount) {
        loanAccountsTotal += Number(account.totalAmount) * 100; // Convert to cents
      }
    }

    // Calculate total accounts (all types)
    let totalAccounts = 0;
    for (const account of accounts) {
      if (account.totalAmount) {
        totalAccounts += Number(account.totalAmount) * 100; // Convert to cents
      }
    }

    // Calculate fixed accounts total (taking installments into account)
    let fixedAccountsTotal = 0;
    for (const account of accounts) {
      if (account.type === AccountType.FIXED) {
        if (account.installments && account.totalAmount) {
          // For fixed accounts with installments, use totalAmount
          fixedAccountsTotal += Number(account.totalAmount) * 100;
        } else if (account.totalAmount) {
          // For fixed accounts without installments, use totalAmount
          fixedAccountsTotal += Number(account.totalAmount) * 100;
        }
      }
    }

    const balance = income - expense;

    return {
      income,
      expense,
      linkedExpenses,
      standaloneExpenses,
      balance,
      fixedAccountsTotal,
      loanAccountsTotal,
      totalAccounts,
      period,
    };
  }

  async createIncome(dto: CreateTransactionDto): Promise<Transaction> {
    // Validate category
    await this.categoriesService.validateCategoryExists(
      dto.category ?? 'OTHER',
      'INCOME',
    );

    return this.create({
      ...dto,
      type: TransactionType.INCOME,
    });
  }

  async createExpense(dto: CreateTransactionDto): Promise<Transaction> {
    // Validate category
    await this.categoriesService.validateCategoryExists(
      dto.category ?? 'OTHER',
      'EXPENSE',
    );

    // Validate account payment if accountId is provided
    if (dto.accountId) {
      await this._validateAccountPayment(dto.accountId, dto.value);
    }

    return this.create({
      ...dto,
      type: TransactionType.EXPENSE,
    });
  }

  async createInstallmentPayment(
    installmentId: string,
    userId: string,
  ): Promise<Transaction> {
    // Check if transaction already exists for this installment
    const existing = await this.prisma.transaction.findFirst({
      where: { installmentId },
    });

    if (existing) {
      throw new BadRequestException(
        'Transaction already exists for this installment',
      );
    }

    // Load installment
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: { account: true },
    });

    if (!installment) {
      throw new NotFoundException('INSTALLMENT_NOT_FOUND');
    }

    // Create transaction
    const transaction = await this.create({
      userId,
      accountId: installment.accountId,
      installmentId: installment.id,
      type: TransactionType.EXPENSE,
      category: 'INSTALLMENT_PAYMENT',
      description: `Pagamento da parcela ${installment.number}`,
      value: Number(installment.amount),
      date: installment.dueDate.toISOString().split('T')[0],
    });

    // Mark installment as paid
    await this.prisma.installment.update({
      where: { id: installment.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    });

    return transaction;
  }

  async createAccountPayment(
    accountId: string,
    userId: string,
    paymentAmount: number,
  ): Promise<Transaction> {
    // Load account
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    // Calculate transaction date based on account reference
    let transactionDate: Date;
    if (account.referenceMonth && account.referenceYear) {
      transactionDate = new Date(
        account.referenceYear,
        account.referenceMonth - 1,
        account.dueDay,
      );
    } else {
      transactionDate = new Date(account.startDate);
    }

    // Create transaction
    const transaction = await this.create({
      userId,
      accountId: account.id,
      type: TransactionType.EXPENSE,
      category: 'ACCOUNT_PAYMENT',
      description: `Payment for account: ${account.name}`,
      value: paymentAmount,
      date: transactionDate.toISOString().split('T')[0],
    });

    // Recalculate monthly summary for account's reference month/year
    if (account.referenceMonth && account.referenceYear) {
      await this.monthlySummaryService.calculateMonthlySummary(
        userId,
        account.referenceMonth,
        account.referenceYear,
        true,
      );
    }

    return transaction;
  }

  async findByUser(
    userId: string,
    filters: Omit<TransactionListFilters, 'userId'> = {},
  ): Promise<PaginationResult<Transaction>> {
    return this.getAll(userId, { ...filters, userId });
  }

  async findByUserSimple(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findByAccount(
    accountId: string,
    filters: Omit<TransactionListFilters, 'accountId' | 'userId'> = {},
  ): Promise<PaginationResult<Transaction>> {
    // Get account to extract userId
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    return this.getAll(account.userId, {
      ...filters,
      userId: account.userId,
      accountId,
    });
  }

  async findByInstallment(installmentId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { installmentId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async hasInstallmentPayment(installmentId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({
      where: { installmentId },
    });
    return count > 0;
  }

  private async _validateAccountPayment(
    accountId: string,
    paymentValue: number,
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    if (account.isPaid) {
      throw new BadRequestException('ACCOUNT_ALREADY_PAID');
    }

    // If account has installments
    if (account.installments) {
      const unpaidInstallments = await this.prisma.installment.findMany({
        where: {
          accountId: account.id,
          isPaid: false,
        },
      });

      const unpaidTotal = unpaidInstallments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0,
      );

      if (paymentValue < unpaidTotal) {
        throw new BadRequestException('INSUFFICIENT_PAYMENT_AMOUNT');
      }

      // Mark installments as paid
      for (const installment of unpaidInstallments) {
        await this.prisma.installment.update({
          where: { id: installment.id },
          data: {
            isPaid: true,
            paidAt: new Date(),
          },
        });
      }
    }

    // Check if paymentValue >= account.totalAmount
    if (account.totalAmount) {
      const accountTotalCents = Number(account.totalAmount) * 100;
      if (paymentValue < accountTotalCents) {
        throw new BadRequestException('INSUFFICIENT_PAYMENT_AMOUNT');
      }

      // Mark account as paid
      await this.prisma.account.update({
        where: { id: account.id },
        data: { isPaid: true },
      });
    }
  }

  async getExpensesByCategory(
    userId: string,
    options: ExpensesByCategoryOptions = {},
  ): Promise<ExpensesByCategoryResult> {
    // Determine date range
    let startDate: Date;
    let endDate: Date;

    if (options.startDate && options.endDate) {
      startDate = options.startDate;
      endDate = options.endDate;
    } else if (options.year && options.month) {
      startDate = new Date(options.year, options.month - 1, 1);
      endDate = new Date(options.year, options.month, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // Get expense transactions
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        account: true,
      },
    });

    // Group by category
    const categoryMap = new Map<string, ExpenseCategoryItem>();

    for (const transaction of transactions) {
      let categoryKey: string;
      let categoryName: string;
      let categoryNameEn: string;
      let type: 'account' | 'transaction' = 'transaction';

      if (transaction.accountId && transaction.account) {
        // Account-based category
        const accountType = transaction.account.type;
        categoryKey = accountType;
        categoryName = this.getAccountTypeName(accountType);
        categoryNameEn = accountType;
        type = 'account';
      } else if (transaction.category) {
        // Transaction-based category
        categoryKey = transaction.category;
        categoryName = transaction.category;
        categoryNameEn = transaction.category;
        type = 'transaction';
      } else {
        // Default category
        categoryKey = 'OTHER';
        categoryName = 'Outros';
        categoryNameEn = 'Other';
        type = 'transaction';
      }

      const value = Number(transaction.value);
      const existing = categoryMap.get(categoryKey);

      if (existing) {
        existing.value += value;
      } else {
        categoryMap.set(categoryKey, {
          category: categoryKey,
          name: categoryName,
          nameEn: categoryNameEn,
          value,
          percentage: 0, // Will calculate later
          color: getCategoryColor(categoryKey),
          type,
        });
      }
    }

    // Calculate total and percentages
    const categories = Array.from(categoryMap.values());
    const total = categories.reduce((sum, cat) => sum + cat.value, 0);

    if (total > 0) {
      for (const category of categories) {
        category.percentage = (category.value / total) * 100;
      }
    }

    // Sort by value descending
    categories.sort((a, b) => b.value - a.value);

    return { categories };
  }

  private getAccountTypeName(type: AccountType): string {
    const names: Record<AccountType, string> = {
      FIXED: 'Conta Fixa',
      LOAN: 'Empréstimo',
      CREDIT_CARD: 'Cartão de Crédito',
      DEBIT_CARD: 'Cartão de Débito',
      SUBSCRIPTION: 'Assinatura',
      INSURANCE: 'Seguro',
      TAX: 'Imposto',
      PENSION: 'Previdência',
      EDUCATION: 'Educação',
      HEALTH: 'Saúde',
      OTHER: 'Outros',
    };
    return names[type] ?? 'Outros';
  }
}
