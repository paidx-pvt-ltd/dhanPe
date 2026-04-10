import { LedgerEntryType, Prisma, PrismaClient, TransactionLifecycleState } from '@prisma/client';
import { config } from '../../config/index.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { createHmac, createHmacBase64, safeEqual } from '../../utils/hash.js';
import { toNumber } from '../../utils/decimal.js';
import { PayoutJob } from '../../../packages/types/src/index.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { PayoutService } from '../payout/payout.service.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { RefundService } from '../refund/refund.service.js';
import { TransactionStateService } from '../transaction/transaction-state.service.js';
import { WebhookRepository } from './webhook.repository.js';
import { CashfreePayoutWebhookDto, CashfreeWebhookDto } from './webhook.schemas.js';

export class WebhookService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly ledgerService: LedgerService,
    private readonly payoutRepository: PayoutRepository,
    private readonly transactionStateService: TransactionStateService,
    private readonly payoutService: PayoutService,
    private readonly refundService: RefundService,
    private readonly db: PrismaClient,
    private readonly enqueuePayoutJob: (job: PayoutJob) => Promise<void> = async () => undefined
  ) {}

  verifySignature(
    rawBody: string,
    signature: string | undefined,
    timestamp: string | undefined
  ): void {
    if (!config.cashfree.webhookSecret) {
      throw new ValidationError('Cashfree webhook secret is not configured');
    }

    if (!signature) {
      throw new ValidationError('Missing webhook signature');
    }

    const signedPayload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
    const expectedSignature = createHmac(signedPayload, config.cashfree.webhookSecret);

    if (!safeEqual(expectedSignature, signature)) {
      throw new ValidationError('Invalid webhook signature');
    }
  }

  verifyPayoutSignature(
    rawBody: string,
    signature: string | undefined,
    timestamp: string | undefined
  ): void {
    if (!config.cashfree.payoutClientSecret) {
      throw new ValidationError('Cashfree payout client secret is not configured');
    }

    if (!signature || !timestamp) {
      throw new ValidationError('Missing payout webhook signature headers');
    }

    const expectedSignature = createHmacBase64(
      `${timestamp}${rawBody}`,
      config.cashfree.payoutClientSecret
    );

    if (!safeEqual(expectedSignature, signature)) {
      throw new ValidationError('Invalid payout webhook signature');
    }
  }

  async processCashfreeWebhook(rawBody: string, payload: CashfreeWebhookDto): Promise<void> {
    const parsedPayload = JSON.parse(rawBody) as Prisma.JsonObject;

    if (payload.refund_id) {
      await this.refundService.applyRefundUpdate(payload.refund_id, {
        providerRefundId: payload.cf_refund_id,
        providerStatus: payload.refund_status,
        providerReference: payload.cf_payment_id,
        failureReason: payload.status_description,
        details: parsedPayload,
      });
      return;
    }

    const eventId =
      payload.cf_payment_id ??
      `${payload.order_id}:${payload.payment_status ?? payload.order_status ?? 'unknown'}`;

    // First ensure event exists (outside transaction for high concurrency)
    await this.db.webhookEvent.upsert({
      where: { eventId },
      update: {},
      create: {
        provider: 'cashfree',
        eventType: payload.type ?? 'payment',
        eventId,
        orderId: payload.order_id,
        payload: parsedPayload,
      },
    });

    const result = await this.db.$transaction(async (tx) => {
      const lockedEvent = await this.webhookRepository.findEventForUpdate(tx, eventId);
      if (!lockedEvent || lockedEvent.processed) {
        return { shouldProcess: false };
      }

      const transaction = await this.webhookRepository.findTransactionByOrderId(payload.order_id);
      if (!transaction) {
        await this.webhookRepository.markEventProcessed(tx, lockedEvent.id, false, 'Transaction not found');
        return { shouldProcess: false, error: 'Transaction not found' };
      }

      const webhookAmount = Number(payload.order_amount);
      if (Number.isNaN(webhookAmount) || toNumber(transaction.grossAmount) !== webhookAmount) {
        await this.webhookRepository.markEventProcessed(tx, lockedEvent.id, false, 'Amount mismatch');
        return { shouldProcess: false, error: 'Webhook amount mismatch' };
      }

      return { shouldProcess: true, transaction, event: lockedEvent };
    });

    if (!result.shouldProcess) {
      if (result.error === 'Transaction not found') throw new NotFoundError('Transaction');
      if (result.error === 'Webhook amount mismatch') throw new ValidationError('Webhook amount mismatch');
      return;
    }

    const { transaction, event } = result as { transaction: any; event: any };

    const paymentStatus = payload.payment_status ?? payload.order_status ?? 'UNKNOWN';
    if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED'].includes(paymentStatus)) {
      if (
        transaction.lifecycleState === TransactionLifecycleState.PAYMENT_SUCCESS ||
        transaction.lifecycleState === TransactionLifecycleState.PAYOUT_PENDING ||
        transaction.lifecycleState === TransactionLifecycleState.PAYOUT_SUCCESS ||
        transaction.lifecycleState === TransactionLifecycleState.COMPLETED ||
        transaction.lifecycleState === TransactionLifecycleState.REFUNDED ||
        transaction.lifecycleState === TransactionLifecycleState.DISPUTED
      ) {
        await this.db.$transaction((tx) =>
          this.webhookRepository.markEventProcessed(tx, event.id, true)
        );
        return;
      }

      await this.db.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            paymentId: payload.cf_payment_id,
            metadata: parsedPayload,
          },
        });
        await this.transactionStateService.transitionTransactionState(
          transaction.id,
          TransactionLifecycleState.PAYMENT_SUCCESS,
          {
            reason: 'Payment confirmed via Cashfree webhook',
            details: parsedPayload,
          },
          tx
        );
        await this.ledgerService.recordEntry(tx, {
          userId: transaction.userId,
          transactionId: transaction.id,
          type: LedgerEntryType.CREDIT,
          amount: transaction.netPayoutAmount,
          referenceId: transaction.id,
        });
        await this.ledgerService.recordPaymentCaptured(tx, {
          transactionId: transaction.id,
          referenceId: transaction.id,
          grossAmount: transaction.grossAmount,
          netPayoutAmount: transaction.netPayoutAmount,
          platformFeeAmount: transaction.platformFeeAmount,
          taxAmount: transaction.taxAmount,
        });
        await this.payoutRepository.createOrGetPendingPayout(tx, {
          txnId: transaction.id,
          bankAccount:
            (transaction.beneficiary?.rawDetails as Prisma.InputJsonValue) ??
            (transaction.bankAccount as Prisma.InputJsonValue),
        });
        await this.webhookRepository.markEventProcessed(tx, event.id, true);
      });

      await this.enqueuePayoutJob({
        transactionId: transaction.id,
        requestedBy: 'cashfree-webhook',
      });
      return;
    }

    if (transaction.lifecycleState === TransactionLifecycleState.PAYMENT_FAILED) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, true)
      );
      return;
    }

    await this.db.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: parsedPayload,
        },
      });
      await this.transactionStateService.transitionTransactionState(
        transaction.id,
        TransactionLifecycleState.PAYMENT_FAILED,
        {
          reason: `Payment failed via webhook status ${paymentStatus}`,
          details: parsedPayload,
        },
        tx
      );
      await this.webhookRepository.markEventProcessed(tx, event.id, true);
    });
  }

  async processCashfreePayoutWebhook(
    rawBody: string,
    payload: CashfreePayoutWebhookDto
  ): Promise<void> {
    const parsedPayload = JSON.parse(rawBody) as Prisma.JsonObject;
    const eventId = `${payload.type}:${payload.data.transfer_id}:${payload.data.cf_transfer_id ?? 'na'}:${payload.event_time ?? 'na'}`;

    // Ensure event exists
    await this.db.webhookEvent.upsert({
      where: { eventId },
      update: {},
      create: {
        provider: 'cashfree-payout',
        eventType: payload.type,
        eventId,
        orderId: payload.data.transfer_id,
        payload: parsedPayload,
      },
    });

    await this.db.$transaction(async (tx) => {
      const lockedEvent = await this.webhookRepository.findEventForUpdate(tx, eventId);
      if (!lockedEvent || lockedEvent.processed) {
        return;
      }

      try {
        await this.payoutService.applyTransferUpdate(payload.data.transfer_id, {
          providerRef: payload.data.cf_transfer_id,
          providerStatus: payload.data.status,
          providerStatusCode: payload.data.status_code,
          failureReason: payload.data.status_description,
          details: parsedPayload,
        });

        await this.webhookRepository.markEventProcessed(tx, lockedEvent.id, true);
      } catch (error) {
        await this.webhookRepository.markEventProcessed(
          tx,
          lockedEvent.id,
          false,
          error instanceof Error ? error.message : 'Unknown payout webhook error'
        );
        throw error;
      }
    });
  }
}
