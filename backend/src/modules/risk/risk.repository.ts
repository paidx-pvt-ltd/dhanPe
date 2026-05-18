import { PayoutStatus, Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
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

  countRecentBeneficiaryChanges(userId: string, since: Date): Promise<number> {
    return this.db.beneficiary.count({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  countRecentFailedPayouts(userId: string, since: Date): Promise<number> {
    return this.db.payout.count({
      where: {
        status: PayoutStatus.FAILED,
        createdAt: {
          gte: since,
        },
        transaction: {
          userId,
        },
      },
    });
  }

  countDistinctSessionDevices(userId: string, since: Date): Promise<number> {
    return this.db.refreshToken
      .findMany({
        where: {
          userId,
          createdAt: {
            gte: since,
          },
        },
        select: {
          deviceInfo: true,
        },
      })
      .then((tokens) => {
        const fingerprints = new Set<string>();
        for (const token of tokens) {
          const deviceInfo =
            typeof token.deviceInfo === 'object' && token.deviceInfo !== null
              ? (token.deviceInfo as Record<string, unknown>)
              : {};
          const fingerprint = `${deviceInfo.ip ?? 'unknown'}|${deviceInfo.userAgent ?? 'unknown'}`;
          fingerprints.add(fingerprint);
        }
        return fingerprints.size;
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
      riskSignals?: Prisma.InputJsonValue;
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
