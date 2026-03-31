import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LedgerEntryType, Prisma, TransactionStatus } from '@prisma/client';
import { WebhookService } from './webhook.service.js';

describe('WebhookService', () => {
  const webhookRepository = {
    findEventByEventId: vi.fn(),
    createEvent: vi.fn(),
    findTransactionByOrderId: vi.fn(),
    markEventProcessed: vi.fn(),
    updateTransactionPaid: vi.fn(),
    updateTransactionFailed: vi.fn(),
  };

  const ledgerService = {
    recordEntry: vi.fn(),
  };

  const payoutRepository = {
    createOrGetPendingPayout: vi.fn(),
  };

  const payoutService = {
    enqueue: vi.fn(),
  };

  const db = {
    $transaction: vi.fn(),
  };

  const service = new WebhookService(
    webhookRepository as never,
    ledgerService as never,
    payoutRepository as never,
    payoutService as never,
    db as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({})
    );
  });

  it('marks a valid paid webhook as processed, credits the ledger, and enqueues payout', async () => {
    const rawBody = JSON.stringify({
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    });

    webhookRepository.findEventByEventId.mockResolvedValue(null);
    webhookRepository.createEvent.mockResolvedValue({ id: 'event_1' });
    webhookRepository.findTransactionByOrderId.mockResolvedValue({
      id: 'txn_1',
      userId: 'user_1',
      amount: new Prisma.Decimal(5000),
      bankAccount: {
        accountHolderName: 'Test User',
        accountNumber: '1234567890',
        ifsc: 'HDFC0001234',
      },
      status: TransactionStatus.INITIATED,
    });

    await service.processCashfreeWebhook(rawBody, {
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    });

    expect(webhookRepository.updateTransactionPaid).toHaveBeenCalled();
    expect(ledgerService.recordEntry).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user_1',
        transactionId: 'txn_1',
        type: LedgerEntryType.CREDIT,
      })
    );
    expect(payoutRepository.createOrGetPendingPayout).toHaveBeenCalled();
    expect(webhookRepository.markEventProcessed).toHaveBeenCalledWith({}, 'event_1', true);
    expect(payoutService.enqueue).toHaveBeenCalledWith('txn_1');
  });

  it('returns early when an already-processed webhook is replayed', async () => {
    webhookRepository.findEventByEventId.mockResolvedValue({
      id: 'event_1',
      processed: true,
    });

    await service.processCashfreeWebhook(
      JSON.stringify({
        order_id: 'order_1',
        order_amount: 5000,
        payment_status: 'SUCCESS',
        cf_payment_id: 'pay_1',
      }),
      {
        order_id: 'order_1',
        order_amount: 5000,
        payment_status: 'SUCCESS',
        cf_payment_id: 'pay_1',
      }
    );

    expect(webhookRepository.createEvent).not.toHaveBeenCalled();
    expect(payoutService.enqueue).not.toHaveBeenCalled();
  });
});
