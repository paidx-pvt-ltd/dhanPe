import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';
import { logger } from '../config/logger';

export interface CreateTransactionInput {
  userId: string;
  paymentId?: string;
  type: 'DEBIT' | 'CREDIT' | 'REFUND';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  description?: string;
  idempotencyKey?: string;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: Date;
}

export class TransactionService {
  /**
   * Create transaction
   */
  static async createTransaction(
    input: CreateTransactionInput
  ): Promise<TransactionResponse> {
    // Check for duplicate (idempotency)
    if (input.idempotencyKey) {
      const existing = await prisma.transaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        logger.info(`Duplicate transaction detected: ${input.idempotencyKey}`);
        return {
          id: existing.id,
          userId: existing.userId,
          type: existing.type,
          amount: existing.amount,
          status: existing.status,
          description: existing.description,
          createdAt: existing.createdAt,
        };
      }
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: input.userId,
        paymentId: input.paymentId,
        type: input.type,
        amount: input.amount,
        status: input.status,
        description: input.description,
        idempotencyKey: input.idempotencyKey,
      },
    });

    logger.info(`Transaction created: ${transaction.id}`);

    return {
      id: transaction.id,
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Get user transactions
   */
  static async getUserTransactions(
    userId: string,
    filters?: {
      type?: 'DEBIT' | 'CREDIT' | 'REFUND';
      status?: 'PENDING' | 'SUCCESS' | 'FAILED';
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 20,
    offset: number = 0
  ) {
    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.transaction.count({ where });

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(id: string, userId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundError('Transaction');
    }

    return transaction;
  }
}
