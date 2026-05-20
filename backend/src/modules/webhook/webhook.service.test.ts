import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LedgerEntryType,
  Prisma,
  TransactionLifecycleState,
  TransactionStatus,
} from '@prisma/client';
import { config } from '../../config/index.js';
import { createHmac, createHmacBase64 } from '../../utils/hash.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { WebhookService } from './webhook.service.js';

type MockTx = {
  $queryRaw?: ReturnType<typeof vi.fn>;
  transaction?: {
    update: ReturnType<typeof vi.fn>;
    updateMany?: ReturnType<typeof vi.fn>;
  };
};

type TransactionHandler = (tx: MockTx) => Promise<unknown>;

describe('WebhookService', () => {
  const webhookRepository = {
    findEventByEventId: vi.fn(),
    findEventForUpdate: vi.fn(),
    createEvent: vi.fn(),
    findTransactionByOrderId: vi.fn(),
    markEventProcessed: vi.fn(),
    updateTransactionPaid: vi.fn(),
    updateTransactionFailed: vi.fn(),
  };

  const ledgerService = {
    recordEntry: vi.fn(),
    recordPaymentCaptured: vi.fn(),
  };

  const payoutRepository = {
    createOrGetPendingPayout: vi.fn(),
  };

  const payoutService = {
    enqueue: vi.fn(),
    applyTransferUpdate: vi.fn(),
  };
  const transactionStateService = {
    transitionTransactionState: vi.fn(),
  };

  const refundService = {
    applyRefundUpdate: vi.fn(),
  };

  const enqueuePayoutJob = vi.fn();

  const db = {
    $transaction: vi.fn(),
    webhookEvent: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  const service = new WebhookService(
    webhookRepository as never,
    ledgerService as never,
    payoutRepository as never,
    transactionStateService as never,
    payoutService as never,
    refundService as never,
    db as never,
    enqueuePayoutJob
  );

  beforeEach(() => {
    vi.clearAllMocks();
    config.cashfree.webhookSecret = 'cashfree-secret';
    config.cashfree.payoutClientSecret = 'cashfree-payout-secret';
    db.$transaction.mockImplementation(async (handler: TransactionHandler) =>
      handler({
        $queryRaw: vi.fn(),
        transaction: {
          update: vi.fn(),
          updateMany: vi.fn(),
        },
      })
    );
    db.webhookEvent.upsert.mockResolvedValue({ id: 'event_1' });
  });

  it('validates Cashfree webhook signatures', () => {
    const rawBody = JSON.stringify({ order_id: 'order_1' });
    const timestamp = '1700000000';
    const signature = createHmac(`${timestamp}.${rawBody}`, config.cashfree.webhookSecret);

    expect(() =>
      service.verifySignature(rawBody, signature, timestamp)
    ).not.toThrow();
  });

  it('rejects invalid Cashfree webhook signatures', () => {
    expect(() => service.verifySignature('body', 'bad-signature', '1700000000')).toThrow(
      ValidationError
    );
  });

  it('validates Cashfree payout webhook signatures', () => {
    const rawBody = JSON.stringify({ transfer_id: 'txn_1' });
    const timestamp = '1700000000';
    const signature = createHmacBase64(`${timestamp}${rawBody}`, config.cashfree.payoutClientSecret);

    expect(() =>
      service.verifyPayoutSignature(rawBody, signature, timestamp)
    ).not.toThrow();
  });

  it('rejects payout webhook signatures when missing headers', () => {
    expect(() => service.verifyPayoutSignature('body', undefined, '1700000000')).toThrow(
      ValidationError
    );
  });

  it('throws NotFoundError when the webhook transaction is missing', async () => {
    webhookRepository.findEventForUpdate.mockResolvedValue({ id: 'event_1', processed: false });
    webhookRepository.findTransactionByOrderId.mockResolvedValue(null);

    await expect(
      service.processCashfreeWebhook(
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
      )
    ).rejects.toThrow(NotFoundError);

    expect(webhookRepository.markEventProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'event_1',
      false,
      'Transaction not found'
    );
  });

  it('throws ValidationError when the webhook amount does not match the transaction', async () => {
    webhookRepository.findEventForUpdate.mockResolvedValue({ id: 'event_1', processed: false });
    webhookRepository.findTransactionByOrderId.mockResolvedValue({
      id: 'txn_1',
      grossAmount: new Prisma.Decimal(5000),
    });

    await expect(
      service.processCashfreeWebhook(
        JSON.stringify({
          order_id: 'order_1',
          order_amount: 5001,
          payment_status: 'SUCCESS',
          cf_payment_id: 'pay_1',
        }),
        {
          order_id: 'order_1',
          order_amount: 5001,
          payment_status: 'SUCCESS',
          cf_payment_id: 'pay_1',
        }
      )
    ).rejects.toThrow(ValidationError);

    expect(webhookRepository.markEventProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'event_1',
      false,
      'Amount mismatch'
    );
  });
});
