import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { GetAllTransactionsQueryDto } from './dto/get-all-transactions-query.dto';
import { GetBalanceQueryDto } from './dto/get-balance-query.dto';
import { GetExpensesByCategoryQueryDto } from './dto/get-expenses-by-category-query.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../shared/decorators/current-user.decorator';
import { PaginationResult } from '../../shared/types/pagination.types';
import { Transaction } from '@prisma/client';
import { UserBalanceResult } from './types/transaction.interfaces';
import { ExpensesByCategoryResult } from './types/transaction.interfaces';
import type { ICategoriesService } from '../../shared/types/categories.types';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    @Inject('ICategoriesService')
    private readonly categoriesService: ICategoriesService,
  ) {}

  @Get()
  getAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetAllTransactionsQueryDto,
  ): Promise<PaginationResult<Transaction>> {
    return this.transactionsService.getAll(user.userId, {
      userId: user.userId,
      limit: query.limit,
      page: query.page,
      type: query.type,
      category: query.category,
      accountId: query.accountId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('balance')
  getBalance(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetBalanceQueryDto,
  ): Promise<UserBalanceResult> {
    return this.transactionsService.getUserBalance(user.userId, {
      year: query.year,
      month: query.month,
    });
  }

  @Get('expenses-by-category')
  getExpensesByCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetExpensesByCategoryQueryDto,
  ): Promise<ExpensesByCategoryResult> {
    return this.transactionsService.getExpensesByCategory(user.userId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      year: query.year,
      month: query.month,
    });
  }

  @Get('categories')
  getCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Post('income')
  @HttpCode(HttpStatus.CREATED)
  createIncome(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateIncomeDto,
  ): Promise<Transaction> {
    return this.transactionsService.createIncome({
      userId: user.userId,
      accountId: dto.accountId,
      installmentId: dto.installmentId,
      type: 'INCOME' as const,
      category: dto.category,
      description: dto.description,
      value: dto.value,
      date: dto.date ?? new Date().toISOString().split('T')[0],
    });
  }

  @Post('expense')
  @HttpCode(HttpStatus.CREATED)
  createExpense(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExpenseDto,
  ): Promise<Transaction> {
    return this.transactionsService.createExpense({
      userId: user.userId,
      accountId: dto.accountId,
      installmentId: dto.installmentId,
      type: 'EXPENSE' as const,
      category: dto.category,
      description: dto.description,
      value: dto.value,
      date: dto.date ?? new Date().toISOString().split('T')[0],
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.transactionsService.delete(id);
  }
}
