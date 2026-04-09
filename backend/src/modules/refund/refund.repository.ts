import { Prisma, PrismaClient, Refund, Transaction } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class RefundRepository {
  constructor(private readonly db: PrismaClient) {}

  findTransactionForRefund(transactionId: string, userId: string) {
    return this.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        payout: true,
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  findRefundByRefundId(refundId: string) {
    return this.db.refund.findUnique({
      where: { refundId },
      include: {
        transaction: {
          include: {
            payout: true,
          },
        },
      },
    });
  }

  findRefundForUser(refundId: string, userId: string) {
    return this.db.refund.findFirst({
      where: {
        refundId,
        transaction: {
          userId,
        },
      },
      include: {
        transaction: {
          include: {
            payout: true,
          },
        },
      },
    });
  }

  listPendingRefunds(limit = 50) {
    return this.db.refund.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
      include: {
        transaction: {
          include: {
            payout: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  createRefund(tx: TxLike, data: Prisma.RefundUncheckedCreateInput): Promise<Refund> {
    return tx.refund.create({ data });
  }

  updateRefund(
    tx: TxLike,
    refundId: string,
    data: Prisma.RefundUncheckedUpdateInput
  ): Promise<Refund> {
    return tx.refund.update({
      where: { id: refundId },
      data,
    });
  }

  updateTransactionMetadata(
    tx: TxLike,
    transactionId: string,
    metadata: Prisma.InputJsonValue
  ): Promise<Transaction> {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        metadata,
      },
    });
  }
}
