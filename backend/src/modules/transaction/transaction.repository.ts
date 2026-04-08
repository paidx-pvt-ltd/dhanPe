import { PrismaClient } from '@prisma/client';

export class TransactionRepository {
  constructor(private readonly db: PrismaClient) {}

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
