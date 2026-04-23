import {
  JournalAccount,
  JournalEntry,
  JournalEntryKind,
  Ledger,
  LedgerEntryType,
  Prisma,
  PrismaClient,
  User,
} from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class LedgerRepository {
  constructor(private readonly db: PrismaClient) {}

  async findUserForUpdate(tx: TxLike, userId: string): Promise<User | null> {
    const users = await tx.$queryRaw<User[]>`
      SELECT * FROM "User"
      WHERE "id" = ${userId}
      LIMIT 1
      FOR UPDATE
    `;
    return users[0] ?? null;
  }

  updateUserBalance(tx: TxLike, userId: string, nextBalance: Prisma.Decimal): Promise<User> {
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

  createJournalEntry(
    tx: TxLike,
    data: {
      transactionId?: string;
      referenceId: string;
      kind: JournalEntryKind;
      memo?: string;
      metadata?: Prisma.InputJsonValue;
      lines: Array<{
        account: JournalAccount;
        debit?: Prisma.Decimal;
        credit?: Prisma.Decimal;
      }>;
    }
  ): Promise<JournalEntry> {
    return tx.journalEntry.create({
      data: {
        transactionId: data.transactionId,
        referenceId: data.referenceId,
        kind: data.kind,
        memo: data.memo,
        metadata: data.metadata,
        lines: {
          create: data.lines.map((line) => ({
            account: line.account,
            debit: line.debit ?? new Prisma.Decimal(0),
            credit: line.credit ?? new Prisma.Decimal(0),
          })),
        },
      },
    });
  }

  listByTransaction(transactionId: string) {
    return this.db.ledger.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
