import {
  LedgerEntryType,
  PayoutStatus,
  Prisma,
  PrismaClient,
  TransactionLifecycleState,
} from '@prisma/client';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { sha256 } from '../../utils/hash.js';
import { toNumber } from '../../utils/decimal.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { TransactionStateService } from '../transaction/transaction-state.service.js';
import {
  createPayoutQueue,
  createPayoutQueueEvents,
  createPayoutWorker,
  createRedisConnection,
  PAYOUT_JOB_NAME,
  PayoutJobPayload,
} from './payout.queue.js';
import { PayoutRepository } from './payout.repository.js';

const TERMINAL_SUCCESS = new Set(['SUCCESS', 'COMPLETED', 'SETTLED']);
const TERMINAL_FAILURE = new Set(['FAILED', 'REJECTED', 'REVERSED', 'CANCELLED']);
const IN_FLIGHT = new Set(['RECEIVED', 'PENDING', 'PROCESSING', 'QUEUED', 'SUBMITTED']);

export class PayoutService {
  private readonly queueConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly eventsConnection: IORedis;
  private readonly queue: Queue<PayoutJobPayload>;
  private readonly queueEvents: QueueEvents;
  private worker?: Worker<PayoutJobPayload>;
  private pollTimer?: NodeJS.Timeout;

  constructor(
    private readonly payoutRepository: PayoutRepository,
    private readonly ledgerService: LedgerService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly transactionStateService: TransactionStateService,
    private readonly db: PrismaClient
  ) {
    this.queueConnection = createRedisConnection();
    this.workerConnection = createRedisConnection();
    this.eventsConnection = createRedisConnection();
    this.queue = createPayoutQueue(this.queueConnection);
    this.queueEvents = createPayoutQueueEvents(this.eventsConnection);
  }

  startWorker(): void {
    if (this.worker) {
      return;
    }

    this.worker = createPayoutWorker(this.workerConnection, async (job: Job<PayoutJobPayload>) => {
      await this.processPayout(job.data.transactionId);
    });

    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Payout queue job completed');
    });

    this.worker.on('failed', (job, error) => {
      logger.error({ error, jobId: job?.id }, 'Payout queue job failed');
    });

    this.pollTimer = setInterval(() => {
      void this.resumePendingWork();
    }, config.queue.pollIntervalMs);

    void this.resumePendingWork();
  }

  async stopWorker(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    await Promise.all([
      this.worker?.close(),
      this.queueEvents.close(),
      this.queue.close(),
      this.queueConnection.quit(),
      this.workerConnection.quit(),
      this.eventsConnection.quit(),
    ]);
    this.worker = undefined;
  }

  enqueue(transactionId: string): Promise<void> {
    return this.queue
      .add(
        PAYOUT_JOB_NAME,
        { transactionId },
        {
          jobId: transactionId,
        }
      )
      .then(() => undefined);
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

    const blockingRefund = payoutRecord.transaction.refunds.find((refund) =>
      ['PENDING', 'PROCESSING', 'SUCCESS'].includes(refund.status)
    );
    if (blockingRefund) {
      await this.markPayoutFailed(
        payoutRecord.id,
        transactionId,
        payoutRecord.syncAttempts + 1,
        `Refund ${blockingRefund.refundId} is ${blockingRefund.status.toLowerCase()}`,
        undefined
      );
      return;
    }

    if (payoutRecord.status === PayoutStatus.SUCCESS) {
      return;
    }

    if (
      payoutRecord.transaction.lifecycleState === TransactionLifecycleState.PAYOUT_SUCCESS ||
      payoutRecord.transaction.lifecycleState === TransactionLifecycleState.COMPLETED ||
      payoutRecord.transaction.lifecycleState === TransactionLifecycleState.REFUNDED ||
      payoutRecord.transaction.lifecycleState === TransactionLifecycleState.DISPUTED
    ) {
      return;
    }

    if (
      payoutRecord.transaction.lifecycleState !== TransactionLifecycleState.PAYMENT_SUCCESS &&
      payoutRecord.transaction.lifecycleState !== TransactionLifecycleState.PAYOUT_PENDING
    ) {
      throw new ValidationError(
        `Payout processing is blocked for transaction lifecycle state ${payoutRecord.transaction.lifecycleState}`
      );
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
      if (
        payoutRecord.transaction.lifecycleState === TransactionLifecycleState.PAYMENT_SUCCESS
      ) {
        await this.transactionStateService.transitionTransactionState(
          transactionId,
          TransactionLifecycleState.PAYOUT_PENDING,
          {
            reason: 'Payout worker picked transaction for submission',
          },
          tx
        );
      }
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
          await this.transactionStateService.transitionTransactionState(
            transactionId,
            TransactionLifecycleState.PAYOUT_SUCCESS,
            {
              reason: 'Payout marked successful from create payout response',
              details: payoutResponse as unknown as Prisma.InputJsonValue,
            },
            tx
          );
          await this.transactionStateService.transitionTransactionState(
            transactionId,
            TransactionLifecycleState.COMPLETED,
            {
              reason: 'Transaction completed after payout success',
            },
            tx
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

    return this.applyTransferUpdate(transactionId, {
      providerRef: statusResponse.cf_transfer_id ?? payoutRecord.providerRef ?? undefined,
      providerStatus: statusResponse.status,
      providerStatusCode: statusResponse.status_code,
      failureReason: statusResponse.status_description,
      details: statusResponse as unknown as Prisma.InputJsonValue,
    });
  }

  async applyTransferUpdate(
    transactionId: string,
    input: {
      providerRef?: string;
      providerStatus?: string;
      providerStatusCode?: string;
      failureReason?: string;
      details: Prisma.InputJsonValue;
    }
  ): Promise<PayoutStatus | null> {
    const payoutRecord = await this.payoutRepository.findByTransactionId(transactionId);
    if (!payoutRecord) {
      throw new NotFoundError('Payout');
    }

    const mappedStatus = this.mapTransferState(input.providerStatus, input.providerStatusCode);
    const latestAttempt = payoutRecord.attempts[0];

    if (payoutRecord.status === PayoutStatus.SUCCESS && mappedStatus === PayoutStatus.SUCCESS) {
      return PayoutStatus.SUCCESS;
    }

    await this.db.$transaction(async (tx) => {
      if (latestAttempt) {
        await this.payoutRepository.updateAttempt(tx, latestAttempt.id, {
          status: mappedStatus,
          providerStatus: input.providerStatus,
          providerRef: input.providerRef,
          responsePayload: input.details,
          errorMessage: mappedStatus === PayoutStatus.FAILED ? input.failureReason : undefined,
        });
      }

      await this.payoutRepository.updateStatus(tx, payoutRecord.id, {
        status: mappedStatus,
        providerRef: input.providerRef,
        providerStatus: input.providerStatus,
        lastSyncAt: new Date(),
        syncAttempts: payoutRecord.syncAttempts + 1,
        nextRetryAt:
          mappedStatus === PayoutStatus.SUCCESS
            ? null
            : this.computeRetryAt(payoutRecord.syncAttempts + 1),
        statusDetails: input.details,
        failureReason: mappedStatus === PayoutStatus.FAILED ? input.failureReason : undefined,
      });
      await this.payoutRepository.updateTransactionPayoutStatus(tx, transactionId, mappedStatus);

      if (mappedStatus === PayoutStatus.SUCCESS && payoutRecord.status !== PayoutStatus.SUCCESS) {
        await this.finalizeSuccessfulPayout(
          tx,
          payoutRecord.transaction.userId,
          transactionId,
          payoutRecord.id,
          payoutRecord.transaction.netPayoutAmount
        );
        await this.transactionStateService.transitionTransactionState(
          transactionId,
          TransactionLifecycleState.PAYOUT_SUCCESS,
          {
            reason: 'Payout marked successful from status sync',
            details: input.details,
          },
          tx
        );
        await this.transactionStateService.transitionTransactionState(
          transactionId,
          TransactionLifecycleState.COMPLETED,
          {
            reason: 'Transaction completed after payout status sync success',
          },
          tx
        );
      }

      if (
        mappedStatus !== PayoutStatus.SUCCESS &&
        payoutRecord.transaction.lifecycleState === TransactionLifecycleState.PAYMENT_SUCCESS
      ) {
        await this.transactionStateService.transitionTransactionState(
          transactionId,
          TransactionLifecycleState.PAYOUT_PENDING,
          {
            reason: 'Payout status sync moved transaction into payout pending',
            details: input.details,
          },
          tx
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
      const freshTxn = await tx.transaction.findUnique({
        where: { id: transactionId },
        select: { lifecycleState: true },
      });
      if (freshTxn?.lifecycleState === TransactionLifecycleState.PAYOUT_PENDING) {
        await this.transactionStateService.transitionTransactionState(
          transactionId,
          TransactionLifecycleState.PAYOUT_FAILED,
          {
            reason: failureReason,
          },
          tx
        );
      }
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

  private mapTransferState(providerStatus?: string, providerStatusCode?: string): PayoutStatus {
    const normalizedStatus = providerStatus?.trim().toUpperCase() ?? 'UNKNOWN';
    const normalizedCode = providerStatusCode?.trim().toUpperCase();

    if (normalizedStatus === 'SUCCESS' && normalizedCode === 'COMPLETED') {
      return PayoutStatus.SUCCESS;
    }

    return this.mapProviderStatus(normalizedStatus);
  }

  private computeRetryAt(attempts: number) {
    const delayMinutes = Math.min(30, Math.max(1, attempts * 2));
    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }
}
