import { Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { toDecimal } from '../../utils/decimal.js';

export class RiskRepository {
  constructor(private readonly db: PrismaClient) {}

  async getTodayVolume(userId: string, start: Date, end: Date): Promise<Prisma.Decimal> {
    const result = await this.db.transaction.aggregate({
      where: {
        userId,
        status: {
          in: [TransactionStatus.INITIATED, TransactionStatus.PAID],
        },
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ?? toDecimal(0);
  }

  countRecentTransactions(userId: string, since: Date): Promise<number> {
    return this.db.transaction.count({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  upsertRiskProfile(
    userId: string,
    data: {
      riskScore: number;
      dailyLimitUsed: Prisma.Decimal;
      lastTxnAt: Date;
      lastTxnAmount: Prisma.Decimal;
      velocityFlag: boolean;
    }
  ) {
    return this.db.riskProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
