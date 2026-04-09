import { LedgerEntryType, Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { config } from '../../config/index.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { createHmac, createHmacBase64, safeEqual } from '../../utils/hash.js';
import { toNumber } from '../../utils/decimal.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { PayoutService } from '../payout/payout.service.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { RefundService } from '../refund/refund.service.js';
import { WebhookRepository } from './webhook.repository.js';
import { CashfreePayoutWebhookDto, CashfreeWebhookDto } from './webhook.schemas.js';

export class WebhookService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly ledgerService: LedgerService,
    private readonly payoutRepository: PayoutRepository,
    private readonly payoutService: PayoutService,
    private readonly refundService: RefundService,
    private readonly db: PrismaClient
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
    if (!config.cashfree.clientSecret) {
      throw new ValidationError('Cashfree client secret is not configured');
    }

    if (!signature || !timestamp) {
      throw new ValidationError('Missing payout webhook signature headers');
    }

    const expectedSignature = createHmacBase64(
      `${timestamp}${rawBody}`,
      config.cashfree.clientSecret
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
    const existingEvent = await this.webhookRepository.findEventByEventId(eventId);
    if (existingEvent?.processed) {
      return;
    }

    const event =
      existingEvent ??
      (await this.webhookRepository.createEvent({
        provider: 'cashfree',
        eventType: payload.type ?? 'payment',
        eventId,
        orderId: payload.order_id,
        payload: parsedPayload,
      }));

    const transaction = await this.webhookRepository.findTransactionByOrderId(payload.order_id);
    if (!transaction) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, false, 'Transaction not found')
      );
      throw new NotFoundError('Transaction');
    }

    const webhookAmount = Number(payload.order_amount);
    if (Number.isNaN(webhookAmount) || toNumber(transaction.grossAmount) !== webhookAmount) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, false, 'Amount mismatch')
      );
      throw new ValidationError('Webhook amount mismatch');
    }

    const paymentStatus = payload.payment_status ?? payload.order_status ?? 'UNKNOWN';
    if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED'].includes(paymentStatus)) {
      if (transaction.status === TransactionStatus.PAID) {
        await this.db.$transaction((tx) =>
          this.webhookRepository.markEventProcessed(tx, event.id, true)
        );
        return;
      }

      await this.db.$transaction(async (tx) => {
        await this.webhookRepository.updateTransactionPaid(
          tx,
          transaction.id,
          payload.cf_payment_id,
          parsedPayload
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

      await this.payoutService.enqueue(transaction.id);
      return;
    }

    await this.db.$transaction(async (tx) => {
      await this.webhookRepository.updateTransactionFailed(tx, transaction.id, parsedPayload);
      await this.webhookRepository.markEventProcessed(tx, event.id, true);
    });
  }

  async processCashfreePayoutWebhook(
    rawBody: string,
    payload: CashfreePayoutWebhookDto
  ): Promise<void> {
    const parsedPayload = JSON.parse(rawBody) as Prisma.JsonObject;
    const eventId = `${payload.type}:${payload.data.transfer_id}:${payload.data.cf_transfer_id ?? 'na'}:${payload.event_time ?? 'na'}`;
    const existingEvent = await this.webhookRepository.findEventByEventId(eventId);
    if (existingEvent?.processed) {
      return;
    }

    const event =
      existingEvent ??
      (await this.webhookRepository.createEvent({
        provider: 'cashfree-payout',
        eventType: payload.type,
        eventId,
        orderId: payload.data.transfer_id,
        payload: parsedPayload,
      }));

    try {
      await this.payoutService.applyTransferUpdate(payload.data.transfer_id, {
        providerRef: payload.data.cf_transfer_id,
        providerStatus: payload.data.status,
        providerStatusCode: payload.data.status_code,
        failureReason: payload.data.status_description,
        details: parsedPayload,
      });

      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, true)
      );
    } catch (error) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(
          tx,
          event.id,
          false,
          error instanceof Error ? error.message : 'Unknown payout webhook error'
        )
      );
      throw error;
    }
  }
}
