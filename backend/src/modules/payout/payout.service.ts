import { LedgerEntryType, PayoutStatus, PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { InMemoryQueue } from '../../shared/in-memory-queue.js';
import { toNumber } from '../../utils/decimal.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { BankAccountDto } from '../payment/payment.schemas.js';
import { PayoutRepository } from './payout.repository.js';

interface PayoutJob {
  transactionId: string;
}

export class PayoutService {
  private readonly queue: InMemoryQueue<PayoutJob>;

  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly ledgerService: LedgerService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {
    this.queue = new InMemoryQueue(async (job) => this.processPayout(job.transactionId), 1);
  }

  enqueue(transactionId: string): Promise<void> {
    return this.queue.enqueue({ transactionId });
  }

  async processPayout(transactionId: string): Promise<void> {
    const payoutRecord = await this.payoutRepository.findByTransactionId(transactionId);
    if (!payoutRecord) {
      throw new NotFoundError('Payout');
    }

    if (
      payoutRecord.status === PayoutStatus.SUCCESS ||
      payoutRecord.status === PayoutStatus.PROCESSING
    ) {
      return;
    }

    const bankAccount = payoutRecord.bankAccount as unknown as BankAccountDto;
    if (!bankAccount.accountHolderName || !bankAccount.accountNumber || !bankAccount.ifsc) {
      throw new ValidationError('Incomplete bank account details for payout');
    }

    await this.db.$transaction(async (tx) => {
      await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
        status: PayoutStatus.PROCESSING,
      });
      await this.payoutRepository.updateTransactionPayoutStatus(
        tx,
        transactionId,
        PayoutStatus.PROCESSING
      );
    });

    try {
      const payoutResponse = await this.cashfreeClient.createPayout({
        transfer_id: transactionId,
        transfer_amount: toNumber(payoutRecord.transaction.amount),
        transfer_currency: 'INR',
        beneficiary_details: {
          beneficiary_name: bankAccount.accountHolderName,
          beneficiary_account: bankAccount.accountNumber,
          beneficiary_ifsc: bankAccount.ifsc,
        },
      });

      await this.db.$transaction(async (tx) => {
        await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
          status: PayoutStatus.SUCCESS,
          providerRef: payoutResponse.reference_id,
        });
        await this.payoutRepository.updateTransactionPayoutStatus(
          tx,
          transactionId,
          PayoutStatus.SUCCESS
        );
        await this.ledgerService.recordEntry(tx, {
          userId: payoutRecord.transaction.userId,
          transactionId,
          type: LedgerEntryType.DEBIT,
          amount: payoutRecord.transaction.amount,
          referenceId: payoutRecord.id,
        });
      });
    } catch (error) {
      logger.error({ error, transactionId }, 'Payout failed');
      await this.db.$transaction(async (tx) => {
        await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
          status: PayoutStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Unknown payout error',
        });
        await this.payoutRepository.updateTransactionPayoutStatus(
          tx,
          transactionId,
          PayoutStatus.FAILED
        );
      });
    }
  }
}
