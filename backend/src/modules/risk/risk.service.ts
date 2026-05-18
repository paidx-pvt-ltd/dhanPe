import { config } from '../../config/index.js';
import { RiskRejectedError } from '../../shared/errors.js';
import { toDecimal, toNumber } from '../../utils/decimal.js';
import { RiskRepository } from './risk.repository.js';

type TransferRiskContext = {
  ip?: string;
  userAgent?: string;
  beneficiaryId?: string;
};

export class RiskService {
  constructor(private readonly riskRepository: RiskRepository) {}

  async evaluateTransfer(userId: string, amount: number, context: TransferRiskContext = {}) {
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
    const signalWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

    const [recentBeneficiaryChanges, recentFailedPayouts, distinctSessionDevices] =
      await Promise.all([
        this.riskRepository.countRecentBeneficiaryChanges(userId, signalWindowStart),
        this.riskRepository.countRecentFailedPayouts(userId, signalWindowStart),
        this.riskRepository.countDistinctSessionDevices(userId, signalWindowStart),
      ]);

    const riskSignals = {
      repeatedBeneficiaryChanges: recentBeneficiaryChanges >= 3,
      repeatedPayoutFailures: recentFailedPayouts >= 2,
      suspiciousDevicePattern: distinctSessionDevices >= 4,
      sameMobileReuseRisk: false,
      requestIp: context.ip ?? null,
      requestUserAgent: context.userAgent ?? null,
      beneficiaryId: context.beneficiaryId ?? null,
      recentBeneficiaryChanges,
      recentFailedPayouts,
      distinctSessionDevices,
    };

    if (riskSignals.repeatedBeneficiaryChanges) {
      throw new RiskRejectedError('Too many beneficiary changes in the last 24 hours', riskSignals);
    }

    if (riskSignals.repeatedPayoutFailures) {
      throw new RiskRejectedError(
        'Repeated payout failures detected for this account',
        riskSignals
      );
    }

    if (riskSignals.suspiciousDevicePattern) {
      throw new RiskRejectedError('Suspicious device or session pattern detected', riskSignals);
    }

    const riskScore = Math.min(
      100,
      Math.round(
        (amount / config.risk.maxTransactionAmount) * 50 +
          (projectedVolume / config.risk.maxDailyVolume) * 30 +
          recentBeneficiaryChanges * 5 +
          recentFailedPayouts * 8 +
          distinctSessionDevices * 3
      )
    );

    await this.riskRepository.upsertRiskProfile(userId, {
      riskScore,
      dailyLimitUsed: toDecimal(projectedVolume),
      lastTxnAt: now,
      lastTxnAmount: toDecimal(amount),
      velocityFlag,
      riskSignals,
    });

    return {
      approved: true,
      riskScore,
      dailyLimitUsed: projectedVolume,
      velocityFlag,
      riskSignals,
    };
  }
}
