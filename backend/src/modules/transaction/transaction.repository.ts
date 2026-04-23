import { Prisma, PrismaClient, Transaction } from '@prisma/client';

export class TransactionRepository {
  constructor(private readonly db: PrismaClient) {}

  async findForUpdate(tx: Prisma.TransactionClient, transactionId: string) {
    const txns = await tx.$queryRaw<Transaction[]>`
      SELECT * FROM "Transaction"
      WHERE "id" = ${transactionId}
      LIMIT 1
      FOR UPDATE
    `;
    return txns[0] ?? null;
  }

  listSummaries(userId: string, limit: number) {
    return this.db.transaction.findMany({
      where: { userId },
      include: {
        beneficiary: true,
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        disputes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        reconciliationItems: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findLifecycle(transactionId: string, userId: string) {
    return this.db.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        beneficiary: true,
        ledgerEntries: {
          orderBy: { createdAt: 'asc' },
        },
        payout: true,
        refunds: {
          orderBy: { createdAt: 'asc' },
        },
        disputes: {
          orderBy: { createdAt: 'asc' },
        },
        reconciliationItems: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
        journalEntries: {
          include: {
            lines: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }
}
