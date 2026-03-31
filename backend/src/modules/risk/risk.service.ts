import { config } from '../../config/index.js';
import { RiskRejectedError } from '../../shared/errors.js';
import { toDecimal, toNumber } from '../../utils/decimal.js';
import { RiskRepository } from './risk.repository.js';

export class RiskService {
  constructor(private readonly riskRepository: RiskRepository) {}

  async evaluateTransfer(userId: string, amount: number) {
    if (amount > config.risk.maxTransactionAmount) {
      throw new RiskRejectedError('Transaction amount exceeds limit', {
        maxTransactionAmount: config.risk.maxTransactionAmount,
      });
    }

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);

    const todayVolume = await this.riskRepository.getTodayVolume(userId, dayStart, nextDay);
    const projectedVolume = toNumber(todayVolume) + amount;

    if (projectedVolume > config.risk.maxDailyVolume) {
      throw new RiskRejectedError('Daily transaction limit exceeded', {
        maxDailyVolume: config.risk.maxDailyVolume,
      });
    }

    const velocitySince = new Date(now.getTime() - config.risk.velocityWindowMinutes * 60 * 1000);
    const recentCount = await this.riskRepository.countRecentTransactions(userId, velocitySince);
    const velocityFlag = recentCount >= config.risk.velocityMaxTransactions;

    if (velocityFlag) {
      throw new RiskRejectedError('Velocity rule triggered for this account', {
        velocityWindowMinutes: config.risk.velocityWindowMinutes,
        velocityMaxTransactions: config.risk.velocityMaxTransactions,
      });
    }

    const riskScore = Math.min(
      100,
      Math.round(
        (amount / config.risk.maxTransactionAmount) * 60 +
          (projectedVolume / config.risk.maxDailyVolume) * 40
      )
    );

    await this.riskRepository.upsertRiskProfile(userId, {
      riskScore,
      dailyLimitUsed: toDecimal(projectedVolume),
      lastTxnAt: now,
      lastTxnAmount: toDecimal(amount),
      velocityFlag,
    });

    return {
      approved: true,
      riskScore,
      dailyLimitUsed: projectedVolume,
      velocityFlag,
    };
  }
}
