import {
  Prisma,
  PrismaClient,
  Payout,
  PayoutAttempt,
  PayoutStatus,
  Transaction,
} from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class PayoutRepository {
  constructor(private readonly db: PrismaClient) {}

  createOrGetPendingPayout(
    tx: TxLike,
    data: {
      txnId: string;
      bankAccount: Prisma.InputJsonValue;
    }
  ): Promise<Payout> {
    return tx.payout.upsert({
      where: { txnId: data.txnId },
      update: {},
      create: {
        txnId: data.txnId,
        bankAccount: data.bankAccount,
        status: PayoutStatus.QUEUED,
      },
    });
  }

  findByTransactionId(txnId: string) {
    return this.db.payout.findUnique({
      where: { txnId },
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        transaction: {
          include: {
            beneficiary: true,
            refunds: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
  }

  findPendingWork(limit = 25) {
    return this.db.payout.findMany({
      where: {
        status: {
          in: [PayoutStatus.QUEUED, PayoutStatus.PROCESSING, PayoutStatus.SUBMITTED],
        },
        OR: [
          { nextRetryAt: null },
          {
            nextRetryAt: {
              lte: new Date(),
            },
          },
        ],
      },
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        transaction: {
          include: {
            beneficiary: true,
            refunds: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  updateStatus(
    tx: TxLike,
    payoutId: string,
    data: {
      status: PayoutStatus;
      providerRef?: string;
      providerStatus?: string;
      syncAttempts?: number;
      lastSyncAt?: Date | null;
      nextRetryAt?: Date | null;
      statusDetails?: Prisma.InputJsonValue;
      failureReason?: string;
    }
  ) {
    return tx.payout.update({
      where: { id: payoutId },
      data,
    });
  }

  createAttempt(
    tx: TxLike,
    data: Prisma.PayoutAttemptUncheckedCreateInput
  ): Promise<PayoutAttempt> {
    return tx.payoutAttempt.create({ data });
  }

  updateAttempt(
    tx: TxLike,
    attemptId: string,
    data: Prisma.PayoutAttemptUncheckedUpdateInput
  ): Promise<PayoutAttempt> {
    return tx.payoutAttempt.update({
      where: { id: attemptId },
      data,
    });
  }

  updateTransactionPayoutStatus(
    tx: TxLike,
    transactionId: string,
    status: PayoutStatus
  ): Promise<Transaction> {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        payoutStatus: status,
      },
    });
  }
}
