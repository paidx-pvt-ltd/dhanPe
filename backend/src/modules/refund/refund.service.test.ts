import { PayoutStatus, Prisma, RefundStatus, TransactionStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefundService } from './refund.service.js';

describe('RefundService', () => {
  const refundRepository = {
    findTransactionForRefund: vi.fn(),
    createRefund: vi.fn(),
    findRefundForUser: vi.fn(),
    findRefundByRefundId: vi.fn(),
    updateRefund: vi.fn(),
    updateTransactionMetadata: vi.fn(),
  };

  const payoutRepository = {
    updateStatus: vi.fn(),
    updateTransactionPayoutStatus: vi.fn(),
  };

  const ledgerService = {
    recordRefundSettled: vi.fn(),
  };

  const cashfreeClient = {
    createRefund: vi.fn(),
    getRefund: vi.fn(),
  };

  const db = {
    $transaction: vi.fn(),
  };

  const service = new RefundService(
    refundRepository as never,
    payoutRepository as never,
    ledgerService as never,
    cashfreeClient as never,
    db as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({})
    );
  });

  it('creates a refund through Cashfree and settles it when the provider returns success', async () => {
    refundRepository.findTransactionForRefund.mockResolvedValue({
      id: 'txn_1',
      orderId: 'order_1',
      status: TransactionStatus.PAID,
      payoutStatus: PayoutStatus.QUEUED,
      grossAmount: new Prisma.Decimal(5075),
      netPayoutAmount: new Prisma.Decimal(5000),
      platformFeeAmount: new Prisma.Decimal(75),
      taxAmount: new Prisma.Decimal(0),
      currency: 'INR',
      refunds: [],
      payout: {
        id: 'payout_1',
        status: PayoutStatus.QUEUED,
      },
    });
    refundRepository.createRefund.mockResolvedValue({
      id: 'refund_row_1',
      refundId: 'refund_txn_1',
    });
    cashfreeClient.createRefund.mockResolvedValue({
      refund_id: 'refund_txn_1',
      cf_refund_id: 'cf_refund_1',
      refund_status: 'SUCCESS',
      order_id: 'order_1',
      refund_amount: 5075,
    });
    refundRepository.findRefundByRefundId.mockResolvedValue({
      id: 'refund_row_1',
      refundId: 'refund_txn_1',
      status: RefundStatus.PENDING,
      amount: new Prisma.Decimal(5075),
      transactionId: 'txn_1',
      transaction: {
        orderId: 'order_1',
        grossAmount: new Prisma.Decimal(5075),
        netPayoutAmount: new Prisma.Decimal(5000),
        platformFeeAmount: new Prisma.Decimal(75),
        taxAmount: new Prisma.Decimal(0),
        payout: {
          id: 'payout_1',
          status: PayoutStatus.QUEUED,
        },
      },
    });

    const result = await service.createRefund('user_1', 'txn_1', {
      amount: 5075,
      reason: 'Customer requested cancellation',
    });

    expect(cashfreeClient.createRefund).toHaveBeenCalledWith(
      'order_1',
      expect.objectContaining({
        refund_amount: 5075,
      })
    );
    expect(ledgerService.recordRefundSettled).toHaveBeenCalled();
    expect(payoutRepository.updateStatus).toHaveBeenCalledWith(
      {},
      'payout_1',
      expect.objectContaining({
        status: PayoutStatus.FAILED,
      })
    );
    expect(result.status).toBe(RefundStatus.SUCCESS);
  });
});
