import { Prisma, PrismaClient, Transaction, User } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class PaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  findUser(userId: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id: userId } });
  }

  findIdempotencyKey(key: string) {
    return this.db.idempotencyKey.findUnique({ where: { key } });
  }

  createTransaction(
    tx: TxLike,
    data: Prisma.TransactionUncheckedCreateInput
  ): Promise<Transaction> {
    return tx.transaction.create({ data });
  }

  updateTransactionOrder(
    transactionId: string,
    data: {
      providerOrderId: string;
      metadata: Prisma.InputJsonValue;
    }
  ): Promise<Transaction> {
    return this.db.transaction.update({
      where: { id: transactionId },
      data,
    });
  }

  saveIdempotencyRecord(data: {
    key: string;
    scope: string;
    userId: string;
    requestHash: string;
    resourceId: string;
    responseBody: Prisma.InputJsonValue;
  }) {
    return this.db.idempotencyKey.upsert({
      where: { key: data.key },
      update: {
        requestHash: data.requestHash,
        resourceId: data.resourceId,
        responseBody: data.responseBody,
      },
      create: data,
    });
  }
}
