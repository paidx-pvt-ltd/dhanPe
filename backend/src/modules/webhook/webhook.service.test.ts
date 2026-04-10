import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  LedgerEntryType,
  Prisma,
  TransactionLifecycleState,
  TransactionStatus,
} from '@prisma/client';
import { WebhookService } from './webhook.service.js';

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
    db.$transaction.mockImplementation(async (handler: (tx: any) => Promise<any>) =>
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

  it('marks a valid paid webhook as processed, credits the ledger, and enqueues payout', async () => {
    const rawBody = JSON.stringify({
      order_id: 'order_1',
      order_amount: 5075,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    });

    webhookRepository.findEventByEventId.mockResolvedValue(null);
    webhookRepository.createEvent.mockResolvedValue({ id: 'event_1' });
    webhookRepository.findEventForUpdate.mockResolvedValue({ id: 'event_1', processed: false });
    webhookRepository.findTransactionByOrderId.mockResolvedValue({
      id: 'txn_1',
      userId: 'user_1',
      amount: new Prisma.Decimal(5075),
      grossAmount: new Prisma.Decimal(5075),
      platformFeeAmount: new Prisma.Decimal(75),
      taxAmount: new Prisma.Decimal(0),
      netPayoutAmount: new Prisma.Decimal(5000),
      bankAccount: {
        accountHolderName: 'Test User',
        accountNumber: '1234567890',
        ifsc: 'HDFC0001234',
      },
      beneficiary: {
        rawDetails: {
          accountHolderName: 'Test User',
          accountNumber: '1234567890',
          ifsc: 'HDFC0001234',
        },
      },
      status: TransactionStatus.INITIATED,
      lifecycleState: TransactionLifecycleState.PAYMENT_PENDING,
    });

    db.$transaction.mockImplementation(async (handler: (tx: any) => Promise<any>) =>
      handler({
        transaction: {
          update: vi.fn(),
        },
      })
    );

    await service.processCashfreeWebhook(rawBody, {
      order_id: 'order_1',
      order_amount: 5075,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    });

    expect(transactionStateService.transitionTransactionState).toHaveBeenCalled();
    expect(ledgerService.recordEntry).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        userId: 'user_1',
        transactionId: 'txn_1',
        type: LedgerEntryType.CREDIT,
      })
    );
    expect(ledgerService.recordPaymentCaptured).toHaveBeenCalled();
    expect(payoutRepository.createOrGetPendingPayout).toHaveBeenCalled();
    expect(webhookRepository.markEventProcessed).toHaveBeenCalledWith(
      expect.any(Object),
      'event_1',
      true
    );
    expect(enqueuePayoutJob).toHaveBeenCalledWith({
      transactionId: 'txn_1',
      requestedBy: 'cashfree-webhook',
    });
  });

  it('returns early when an already-processed webhook is replayed', async () => {
    webhookRepository.findEventForUpdate.mockResolvedValue({
      id: 'event_1',
      processed: true,
    });

    db.$transaction.mockImplementation(async (handler: (tx: any) => Promise<any>) =>
      handler({})
    );

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
    expect(enqueuePayoutJob).not.toHaveBeenCalled();
  });

  it('processes payout webhooks through the payout service and marks the event processed', async () => {
    const rawBody = JSON.stringify({
      type: 'TRANSFER_SUCCESS',
      event_time: '2024-07-25T17:43:37',
      data: {
        transfer_id: 'txn_1',
        cf_transfer_id: 'cf_transfer_1',
        status: 'SUCCESS',
        status_code: 'COMPLETED',
        status_description: 'Transfer completed successfully',
      },
    });

    webhookRepository.findEventForUpdate.mockResolvedValue({ id: 'event_payout_1', processed: false });

    db.$transaction.mockImplementation(async (handler: (tx: any) => Promise<any>) =>
      handler({})
    );

    await service.processCashfreePayoutWebhook(rawBody, {
      type: 'TRANSFER_SUCCESS',
      event_time: '2024-07-25T17:43:37',
      data: {
        transfer_id: 'txn_1',
        cf_transfer_id: 'cf_transfer_1',
        status: 'SUCCESS',
        status_code: 'COMPLETED',
        status_description: 'Transfer completed successfully',
      },
    });

    expect(payoutService.applyTransferUpdate).toHaveBeenCalledWith(
      'txn_1',
      expect.objectContaining({
        providerRef: 'cf_transfer_1',
        providerStatus: 'SUCCESS',
        providerStatusCode: 'COMPLETED',
      })
    );
    expect(webhookRepository.markEventProcessed).toHaveBeenCalledWith(
      expect.any(Object),
      'event_payout_1',
      true
    );
  });

  it('routes refund payment webhooks through the refund service', async () => {
    const rawBody = JSON.stringify({
      order_id: 'order_1',
      order_amount: 5075,
      refund_id: 'refund_1',
      cf_refund_id: 'cf_refund_1',
      refund_status: 'SUCCESS',
      status_description: 'Refund completed',
    });

    await service.processCashfreeWebhook(rawBody, {
      order_id: 'order_1',
      order_amount: 5075,
      refund_id: 'refund_1',
      cf_refund_id: 'cf_refund_1',
      refund_status: 'SUCCESS',
      status_description: 'Refund completed',
    });

    expect(refundService.applyRefundUpdate).toHaveBeenCalledWith(
      'refund_1',
      expect.objectContaining({
        providerRefundId: 'cf_refund_1',
        providerStatus: 'SUCCESS',
      })
    );
    expect(webhookRepository.createEvent).not.toHaveBeenCalled();
  });
});
