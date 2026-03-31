import { LedgerEntryType, Prisma, PrismaClient } from '@prisma/client';
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
      input.type === LedgerEntryType.CREDIT ? user.balance.plus(amount) : user.balance.minus(amount);

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
}
