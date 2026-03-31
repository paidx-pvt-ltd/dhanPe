import { Prisma, PrismaClient, Payout, PayoutStatus, Transaction } from '@prisma/client';

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
        status: PayoutStatus.PENDING,
      },
    });
  }

  findByTransactionId(txnId: string) {
    return this.db.payout.findUnique({
      where: { txnId },
      include: {
        transaction: true,
      },
    });
  }

  updateStatus(
    tx: TxLike,
    payoutId: string,
    data: {
      status: PayoutStatus;
      providerRef?: string;
      failureReason?: string;
    }
  ) {
    return tx.payout.update({
      where: { id: payoutId },
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
