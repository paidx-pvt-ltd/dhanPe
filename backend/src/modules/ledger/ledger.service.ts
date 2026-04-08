import {
  JournalAccount,
  JournalEntryKind,
  LedgerEntryType,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { toDecimal } from '../../utils/decimal.js';
import { LedgerRepository } from './ledger.repository.js';

export class LedgerService {
  constructor(
    private readonly ledgerRepository: LedgerRepository,
    private readonly db: PrismaClient
  ) {}

  async recordEntry(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      transactionId: string;
      type: LedgerEntryType;
      amount: number | Prisma.Decimal;
      referenceId: string;
    }
  ) {
    const user = await this.ledgerRepository.findUserForUpdate(tx, input.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const amount = toDecimal(input.amount);
    const nextBalance =
      input.type === LedgerEntryType.CREDIT
        ? user.balance.plus(amount)
        : user.balance.minus(amount);

    if (nextBalance.isNegative()) {
      throw new ValidationError('Insufficient ledger balance for debit');
    }

    await this.ledgerRepository.updateUserBalance(tx, input.userId, nextBalance);

    return this.ledgerRepository.createEntry(tx, {
      userId: input.userId,
      transactionId: input.transactionId,
      type: input.type,
      amount,
      referenceId: input.referenceId,
      balanceAfter: nextBalance,
    });
  }

  async recordPaymentCaptured(
    tx: Prisma.TransactionClient,
    input: {
      transactionId: string;
      referenceId: string;
      grossAmount: number | Prisma.Decimal;
      netPayoutAmount: number | Prisma.Decimal;
      platformFeeAmount: number | Prisma.Decimal;
      taxAmount: number | Prisma.Decimal;
    }
  ) {
    const grossAmount = toDecimal(input.grossAmount);
    const netPayoutAmount = toDecimal(input.netPayoutAmount);
    const platformFeeAmount = toDecimal(input.platformFeeAmount);
    const taxAmount = toDecimal(input.taxAmount);

    await this.ledgerRepository.createJournalEntry(tx, {
      transactionId: input.transactionId,
      referenceId: input.referenceId,
      kind: JournalEntryKind.PAYMENT_CAPTURED,
      memo: 'Cashfree payment captured',
      lines: [
        { account: JournalAccount.GATEWAY_CLEARING, debit: grossAmount },
        { account: JournalAccount.CUSTOMER_FUNDS_LIABILITY, credit: netPayoutAmount },
        { account: JournalAccount.PLATFORM_REVENUE, credit: platformFeeAmount },
        { account: JournalAccount.TAX_PAYABLE, credit: taxAmount },
      ],
    });
  }

  async recordPayoutSubmitted(
    tx: Prisma.TransactionClient,
    input: {
      transactionId: string;
      referenceId: string;
      amount: number | Prisma.Decimal;
    }
  ) {
    const amount = toDecimal(input.amount);
    await this.ledgerRepository.createJournalEntry(tx, {
      transactionId: input.transactionId,
      referenceId: input.referenceId,
      kind: JournalEntryKind.PAYOUT_SUBMITTED,
      memo: 'Payout submitted to provider',
      lines: [
        { account: JournalAccount.CUSTOMER_FUNDS_LIABILITY, debit: amount },
        { account: JournalAccount.PAYOUT_CLEARING, credit: amount },
      ],
    });
  }

  async recordPayoutSettled(
    tx: Prisma.TransactionClient,
    input: {
      transactionId: string;
      referenceId: string;
      amount: number | Prisma.Decimal;
    }
  ) {
    const amount = toDecimal(input.amount);
    await this.ledgerRepository.createJournalEntry(tx, {
      transactionId: input.transactionId,
      referenceId: input.referenceId,
      kind: JournalEntryKind.PAYOUT_SETTLED,
      memo: 'Payout settled by provider',
      lines: [
        { account: JournalAccount.PAYOUT_CLEARING, debit: amount },
        { account: JournalAccount.GATEWAY_CLEARING, credit: amount },
      ],
    });
  }
}
