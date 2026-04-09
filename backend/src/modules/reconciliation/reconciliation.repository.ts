import { Prisma, PrismaClient, ReconciliationRun } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class ReconciliationRepository {
  constructor(private readonly db: PrismaClient) {}

  createRun(
    tx: TxLike,
    data: Prisma.ReconciliationRunUncheckedCreateInput
  ): Promise<ReconciliationRun> {
    return tx.reconciliationRun.create({ data });
  }

  updateRun(
    tx: TxLike,
    runId: string,
    data: Prisma.ReconciliationRunUncheckedUpdateInput
  ): Promise<ReconciliationRun> {
    return tx.reconciliationRun.update({
      where: { id: runId },
      data,
    });
  }

  createItem(tx: TxLike, data: Prisma.ReconciliationItemUncheckedCreateInput) {
    return tx.reconciliationItem.create({ data });
  }

  findRun(runId: string) {
    return this.db.reconciliationRun.findUnique({
      where: { id: runId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  listItems(filters: { status?: 'OPEN' | 'RESOLVED'; scope?: 'PAYMENT' | 'PAYOUT' | 'REFUND' }) {
    return this.db.reconciliationItem.findMany({
      where: {
        status: filters.status,
        scope: filters.scope,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        run: true,
        transaction: {
          select: {
            id: true,
            orderId: true,
            status: true,
            payoutStatus: true,
          },
        },
      },
      take: 200,
    });
  }

  findItem(itemId: string) {
    return this.db.reconciliationItem.findUnique({
      where: { id: itemId },
      include: {
        run: true,
        transaction: true,
      },
    });
  }

  updateItem(tx: TxLike, itemId: string, data: Prisma.ReconciliationItemUncheckedUpdateInput) {
    return tx.reconciliationItem.update({
      where: { id: itemId },
      data,
    });
  }

  findPaymentCandidates() {
    return this.db.transaction.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          lte: new Date(Date.now() - 5 * 60 * 1000),
        },
      },
      include: {
        payout: true,
        refunds: {
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 100,
      orderBy: { updatedAt: 'asc' },
    });
  }

  findPayoutCandidates() {
    return this.db.payout.findMany({
      where: {
        status: {
          in: ['SUBMITTED', 'PROCESSING'],
        },
      },
      include: {
        transaction: {
          include: {
            refunds: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      take: 100,
      orderBy: { updatedAt: 'asc' },
    });
  }

  findRefundCandidates() {
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
      take: 100,
      orderBy: { updatedAt: 'asc' },
    });
  }
}
