import { Ledger, LedgerEntryType, Prisma, PrismaClient, PrismaPromise, User } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class LedgerRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserForUpdate(tx: TxLike, userId: string): Promise<User | null> {
    return tx.user.findUnique({
      where: { id: userId },
    });
  }

  updateUserBalance(
    tx: TxLike,
    userId: string,
    nextBalance: Prisma.Decimal
  ): Promise<User> {
    return tx.user.update({
      where: { id: userId },
      data: { balance: nextBalance },
    });
  }

  createEntry(
    tx: TxLike,
    data: {
      userId: string;
      transactionId?: string;
      type: LedgerEntryType;
      amount: Prisma.Decimal;
      referenceId: string;
      balanceAfter: Prisma.Decimal;
    }
  ): Promise<Ledger> {
    return tx.ledger.create({ data });
  }

  listByTransaction(transactionId: string) {
    return this.db.ledger.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
