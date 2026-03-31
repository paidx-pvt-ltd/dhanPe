import { NotFoundError } from '../../shared/errors.js';
import { toNumber } from '../../utils/decimal.js';
import { TransactionRepository } from './transaction.repository.js';

export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async getLifecycle(transactionId: string, userId: string) {
    const transaction = await this.transactionRepository.findLifecycle(transactionId, userId);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    return {
      id: transaction.id,
      orderId: transaction.orderId,
      paymentId: transaction.paymentId,
      paymentProvider: transaction.paymentProvider,
      status: transaction.status,
      payoutStatus: transaction.payoutStatus,
      amount: toNumber(transaction.amount),
      description: transaction.description,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      ledger: transaction.ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: toNumber(entry.amount),
        balanceAfter: toNumber(entry.balanceAfter),
        referenceId: entry.referenceId,
        createdAt: entry.createdAt,
      })),
      payout: transaction.payout
        ? {
            id: transaction.payout.id,
            status: transaction.payout.status,
            providerRef: transaction.payout.providerRef,
            bankAccount: transaction.payout.bankAccount,
            failureReason: transaction.payout.failureReason,
            createdAt: transaction.payout.createdAt,
            updatedAt: transaction.payout.updatedAt,
          }
        : null,
    };
  }
}
