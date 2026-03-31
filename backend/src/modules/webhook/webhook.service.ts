import { LedgerEntryType, Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { config } from '../../config/index.js';
import { prisma } from '../../db/prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { createHmac, safeEqual } from '../../utils/hash.js';
import { toNumber } from '../../utils/decimal.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { PayoutService } from '../payout/payout.service.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { WebhookRepository } from './webhook.repository.js';
import { CashfreeWebhookDto } from './webhook.schemas.js';

export class WebhookService {
  constructor(
    private readonly webhookRepository: WebhookRepository,
    private readonly ledgerService: LedgerService,
    private readonly payoutRepository: PayoutRepository,
    private readonly payoutService: PayoutService,
    private readonly db: PrismaClient
  ) {}

  verifySignature(rawBody: string, signature: string | undefined, timestamp: string | undefined): void {
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

  async processCashfreeWebhook(rawBody: string, payload: CashfreeWebhookDto): Promise<void> {
    const eventId = payload.cf_payment_id ?? `${payload.order_id}:${payload.payment_status ?? payload.order_status ?? 'unknown'}`;
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
        payload: JSON.parse(rawBody),
      }));

    const transaction = await this.webhookRepository.findTransactionByOrderId(payload.order_id);
    if (!transaction) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, false, 'Transaction not found')
      );
      throw new NotFoundError('Transaction');
    }

    const webhookAmount = Number(payload.order_amount);
    if (Number.isNaN(webhookAmount) || toNumber(transaction.amount) !== webhookAmount) {
      await this.db.$transaction((tx) =>
        this.webhookRepository.markEventProcessed(tx, event.id, false, 'Amount mismatch')
      );
      throw new ValidationError('Webhook amount mismatch');
    }

    const paymentStatus = payload.payment_status ?? payload.order_status ?? 'UNKNOWN';
    if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED'].includes(paymentStatus)) {
      if (transaction.status === TransactionStatus.PAID) {
        await this.db.$transaction((tx) => this.webhookRepository.markEventProcessed(tx, event.id, true));
        return;
      }

      await this.db.$transaction(async (tx) => {
        await this.webhookRepository.updateTransactionPaid(tx, transaction.id, payload.cf_payment_id, JSON.parse(rawBody));
        await this.ledgerService.recordEntry(tx, {
          userId: transaction.userId,
          transactionId: transaction.id,
          type: LedgerEntryType.CREDIT,
          amount: transaction.amount,
          referenceId: transaction.id,
        });
        await this.payoutRepository.createOrGetPendingPayout(tx, {
          txnId: transaction.id,
          bankAccount: transaction.bankAccount as Prisma.InputJsonValue,
        });
        await this.webhookRepository.markEventProcessed(tx, event.id, true);
      });

      await this.payoutService.enqueue(transaction.id);
      return;
    }

    await this.db.$transaction(async (tx) => {
      await this.webhookRepository.updateTransactionFailed(tx, transaction.id, JSON.parse(rawBody));
      await this.webhookRepository.markEventProcessed(tx, event.id, true);
    });
  }
}
