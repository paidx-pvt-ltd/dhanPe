import { LedgerEntryType, PayoutStatus, Prisma, PrismaClient } from '@prisma/client';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { InMemoryQueue } from '../../shared/in-memory-queue.js';
import { sha256 } from '../../utils/hash.js';
import { toNumber } from '../../utils/decimal.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PayoutRepository } from './payout.repository.js';

interface PayoutJob {
  transactionId: string;
}

const TERMINAL_SUCCESS = new Set(['SUCCESS', 'COMPLETED', 'SETTLED']);
const TERMINAL_FAILURE = new Set(['FAILED', 'REJECTED', 'REVERSED', 'CANCELLED']);
const IN_FLIGHT = new Set(['RECEIVED', 'PENDING', 'PROCESSING', 'QUEUED', 'SUBMITTED']);

export class PayoutService {
  private readonly queue: InMemoryQueue<PayoutJob>;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly ledgerService: LedgerService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {
    this.queue = new InMemoryQueue(
      async (job) => this.processPayout(job.transactionId),
      config.queue.concurrency
    );
  }

  startWorker(): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => {
      void this.resumePendingWork();
    }, config.queue.pollIntervalMs);

    void this.resumePendingWork();
  }

  stopWorker(): void {
    if (!this.pollTimer) {
      return;
    }

    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  enqueue(transactionId: string): Promise<void> {
    return this.queue.enqueue({ transactionId });
  }

  async resumePendingWork(): Promise<void> {
    const pending = await this.payoutRepository.findPendingWork();
    await Promise.all(pending.map((payout) => this.enqueue(payout.txnId)));
  }

  async processPayout(transactionId: string): Promise<void> {
    const payoutRecord = await this.payoutRepository.findByTransactionId(transactionId);
    if (!payoutRecord) {
      throw new NotFoundError('Payout');
    }

    if (payoutRecord.status === PayoutStatus.SUCCESS) {
      return;
    }

    if (
      payoutRecord.status === PayoutStatus.SUBMITTED ||
      payoutRecord.status === PayoutStatus.PROCESSING
    ) {
      await this.syncTransferStatus(transactionId);
      return;
    }

    if (
      payoutRecord.status !== PayoutStatus.PENDING &&
      payoutRecord.status !== PayoutStatus.QUEUED
    ) {
      return;
    }

    const beneficiary = payoutRecord.transaction.beneficiary;
    if (!beneficiary?.providerBeneficiaryId) {
      throw new ValidationError('Beneficiary is not registered with Cashfree payouts');
    }

    const attemptKey = sha256(
      `${payoutRecord.id}:${transactionId}:${toNumber(payoutRecord.transaction.netPayoutAmount)}:${beneficiary.providerBeneficiaryId}`
    );

    const attempt = await this.db.$transaction(async (tx) => {
      await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
        status: PayoutStatus.PROCESSING,
        nextRetryAt: this.computeRetryAt(1),
      });
      await this.payoutRepository.updateTransactionPayoutStatus(
        tx,
        transactionId,
        PayoutStatus.PROCESSING
      );

      return this.payoutRepository.createAttempt(tx, {
        payoutId: payoutRecord.id,
        idempotencyKey: attemptKey,
        status: PayoutStatus.PROCESSING,
        requestPayload: {
          transfer_id: transactionId,
          transfer_amount: toNumber(payoutRecord.transaction.netPayoutAmount),
          transfer_currency: payoutRecord.transaction.currency,
          beneficiary_id: beneficiary.providerBeneficiaryId,
        } as unknown as Prisma.InputJsonValue,
      });
    });

    try {
      const payoutResponse = await this.cashfreeClient.createPayout({
        transfer_id: transactionId,
        transfer_amount: toNumber(payoutRecord.transaction.netPayoutAmount),
        transfer_currency: payoutRecord.transaction.currency,
        beneficiary_details: {
          beneficiary_id: beneficiary.providerBeneficiaryId,
        },
      });

      const mappedStatus = this.mapProviderStatus(payoutResponse.status);

      await this.db.$transaction(async (tx) => {
        await this.payoutRepository.updateAttempt(tx, attempt.id, {
          status: mappedStatus,
          providerRef: payoutResponse.cf_transfer_id ?? payoutResponse.reference_id,
          providerStatus: payoutResponse.status,
          responsePayload: payoutResponse as unknown as Prisma.InputJsonValue,
        });
        await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
          status: mappedStatus,
          providerRef: payoutResponse.cf_transfer_id ?? payoutResponse.reference_id,
          providerStatus: payoutResponse.status,
          lastSyncAt: new Date(),
          syncAttempts: payoutRecord.syncAttempts + 1,
          nextRetryAt: mappedStatus === PayoutStatus.SUCCESS ? null : this.computeRetryAt(1),
          statusDetails: payoutResponse as unknown as Prisma.InputJsonValue,
        });
        await this.payoutRepository.updateTransactionPayoutStatus(tx, transactionId, mappedStatus);
        await this.ledgerService.recordPayoutSubmitted(tx, {
          transactionId,
          referenceId: payoutRecord.id,
          amount: payoutRecord.transaction.netPayoutAmount,
        });

        if (mappedStatus === PayoutStatus.SUCCESS) {
          await this.finalizeSuccessfulPayout(
            tx,
            payoutRecord.transaction.userId,
            transactionId,
            payoutRecord.id,
            payoutRecord.transaction.netPayoutAmount
          );
        }
      });
    } catch (error) {
      logger.error({ error, transactionId }, 'Payout submission failed');
      await this.markPayoutFailed(
        payoutRecord.id,
        transactionId,
        payoutRecord.syncAttempts + 1,
        error instanceof Error ? error.message : 'Unknown payout error',
        attempt.id
      );
    }
  }

  async syncTransferStatus(transactionId: string): Promise<PayoutStatus | null> {
    const payoutRecord = await this.payoutRepository.findByTransactionId(transactionId);
    if (!payoutRecord) {
      throw new NotFoundError('Payout');
    }

    if (!payoutRecord.providerRef) {
      return payoutRecord.status;
    }

    const statusResponse = await this.cashfreeClient.getPayoutStatus(
      transactionId,
      payoutRecord.providerRef
    );
    const mappedStatus = this.mapProviderStatus(statusResponse.status);

    const latestAttempt = payoutRecord.attempts[0];
    await this.db.$transaction(async (tx) => {
      if (latestAttempt) {
        await this.payoutRepository.updateAttempt(tx, latestAttempt.id, {
          status: mappedStatus,
          providerStatus: statusResponse.status,
          providerRef: statusResponse.cf_transfer_id ?? payoutRecord.providerRef,
          responsePayload: statusResponse as unknown as Prisma.InputJsonValue,
        });
      }

      await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
        status: mappedStatus,
        providerRef: statusResponse.cf_transfer_id ?? payoutRecord.providerRef ?? undefined,
        providerStatus: statusResponse.status,
        lastSyncAt: new Date(),
        syncAttempts: payoutRecord.syncAttempts + 1,
        nextRetryAt:
          mappedStatus === PayoutStatus.SUCCESS
            ? null
            : this.computeRetryAt(payoutRecord.syncAttempts + 1),
        statusDetails: statusResponse as unknown as Prisma.InputJsonValue,
        failureReason:
          mappedStatus === PayoutStatus.FAILED ? statusResponse.status_description : undefined,
      });
      await this.payoutRepository.updateTransactionPayoutStatus(tx, transactionId, mappedStatus);

      if (mappedStatus === PayoutStatus.SUCCESS) {
        await this.finalizeSuccessfulPayout(
          tx,
          payoutRecord.transaction.userId,
          transactionId,
          payoutRecord.id,
          payoutRecord.transaction.netPayoutAmount
        );
      }
    });

    return mappedStatus;
  }

  private async finalizeSuccessfulPayout(
    tx: Prisma.TransactionClient,
    userId: string,
    transactionId: string,
    payoutId: string,
    amount: Prisma.Decimal | number
  ) {
    await this.ledgerService.recordEntry(tx, {
      userId,
      transactionId,
      type: LedgerEntryType.DEBIT,
      amount,
      referenceId: payoutId,
    });
    await this.ledgerService.recordPayoutSettled(tx, {
      transactionId,
      referenceId: payoutId,
      amount,
    });
  }

  private async markPayoutFailed(
    payoutId: string,
    transactionId: string,
    attempts: number,
    failureReason: string,
    attemptId?: string
  ) {
    await this.db.$transaction(async (tx) => {
      if (attemptId) {
        await this.payoutRepository.updateAttempt(tx, attemptId, {
          status: PayoutStatus.FAILED,
          errorMessage: failureReason,
        });
      }
      await this.payoutRepository.updateStatus(tx, payoutId, {
        status: PayoutStatus.FAILED,
        failureReason,
        syncAttempts: attempts,
        lastSyncAt: new Date(),
        nextRetryAt: this.computeRetryAt(attempts),
      });
      await this.payoutRepository.updateTransactionPayoutStatus(
        tx,
        transactionId,
        PayoutStatus.FAILED
      );
    });
  }

  private mapProviderStatus(providerStatus?: string): PayoutStatus {
    const normalized = providerStatus?.trim().toUpperCase() ?? 'UNKNOWN';
    if (TERMINAL_SUCCESS.has(normalized)) {
      return PayoutStatus.SUCCESS;
    }
    if (TERMINAL_FAILURE.has(normalized)) {
      return PayoutStatus.FAILED;
    }
    if (IN_FLIGHT.has(normalized)) {
      return PayoutStatus.SUBMITTED;
    }
    return PayoutStatus.PROCESSING;
  }

  private computeRetryAt(attempts: number) {
    const delayMinutes = Math.min(30, Math.max(1, attempts * 2));
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }
}
