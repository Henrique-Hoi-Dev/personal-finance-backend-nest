import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// TODO: Definir modelo Transaction no Prisma schema
export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  type: string;
  description?: string;
  createdAt: Date;
}

export interface CreateAccountPaymentDto {
  accountId: string;
  userId: string;
  amount: number;
  description?: string;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  createAccountPayment(_dto: CreateAccountPaymentDto): Promise<Transaction> {
    // TODO: Implementar quando o modelo Transaction estiver disponível no Prisma
    // Por enquanto, retorna erro indicando que não está implementado
    return Promise.reject(
      new Error('Not implemented yet - Transaction model not available'),
    );
  }
}
