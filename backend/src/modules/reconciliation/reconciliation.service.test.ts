import {
  PayoutStatus,
  Prisma,
  ReconciliationRunStatus,
  ReconciliationScope,
  ReconciliationSeverity,
  RefundStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconciliationService } from './reconciliation.service.js';

describe('ReconciliationService', () => {
  const reconciliationRepository = {
    createRun: vi.fn(),
    updateRun: vi.fn(),
    createItem: vi.fn(),
    findRun: vi.fn(),
    listItems: vi.fn(),
    findItem: vi.fn(),
    updateItem: vi.fn(),
    findPaymentCandidates: vi.fn(),
    findPayoutCandidates: vi.fn(),
    findRefundCandidates: vi.fn(),
  };

  const payoutService = {
    applyTransferUpdate: vi.fn(),
  };

  const refundService = {
    applyRefundUpdate: vi.fn(),
  };

  const cashfreeClient = {
    getPayoutStatus: vi.fn(),
    getRefund: vi.fn(),
  };

  const db = {
    $transaction: vi.fn(),
  };

  const service = new ReconciliationService(
    reconciliationRepository as never,
    payoutService as never,
    refundService as never,
    cashfreeClient as never,
    db as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
    db.$transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({})
    );
  });

  it('creates mismatch items for payout status divergence and missing downstream payment action', async () => {
    reconciliationRepository.createRun.mockResolvedValue({ id: 'run_1' });
    reconciliationRepository.findPaymentCandidates.mockResolvedValue([
      {
        id: 'txn_1',
        status: 'PAID',
        payout: null,
        refunds: [],
      },
    ]);
    reconciliationRepository.findPayoutCandidates.mockResolvedValue([
      {
        id: 'payout_1',
        txnId: 'txn_2',
        status: PayoutStatus.SUBMITTED,
        providerRef: 'cf_transfer_1',
        transaction: {
          refunds: [],
        },
      },
    ]);
    reconciliationRepository.findRefundCandidates.mockResolvedValue([]);
    cashfreeClient.getPayoutStatus.mockResolvedValue({
      cf_transfer_id: 'cf_transfer_1',
      status: 'SUCCESS',
      status_code: 'COMPLETED',
    });
    payoutService.applyTransferUpdate.mockResolvedValue(PayoutStatus.SUCCESS);
    reconciliationRepository.findRun.mockResolvedValue({
      id: 'run_1',
      scope: ReconciliationScope.PAYMENT,
      status: ReconciliationRunStatus.COMPLETED,
      mismatchCount: 2,
      startedAt: new Date(),
      completedAt: new Date(),
      summary: {
        mismatchCount: 2,
      } as Prisma.JsonObject,
      items: [
        {
          id: 'item_1',
          scope: ReconciliationScope.PAYMENT,
          severity: ReconciliationSeverity.HIGH,
          status: 'OPEN',
          code: 'PAID_TRANSACTION_MISSING_DOWNSTREAM_ACTION',
          message: 'missing downstream action',
          entityId: 'txn_1',
          transactionId: 'txn_1',
          expectedState: {},
          actualState: {},
          createdAt: new Date(),
        },
        {
          id: 'item_2',
          scope: ReconciliationScope.PAYOUT,
          severity: ReconciliationSeverity.HIGH,
          status: 'OPEN',
          code: 'PAYOUT_STATUS_MISMATCH',
          message: 'status mismatch',
          entityId: 'payout_1',
          transactionId: 'txn_2',
          expectedState: {},
          actualState: {},
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.run(undefined, 'user_1');

    expect(reconciliationRepository.createItem).toHaveBeenCalledTimes(2);
    expect(result.mismatchCount).toBe(2);
  });

  it('creates mismatch items for refund status divergence', async () => {
    reconciliationRepository.createRun.mockResolvedValue({ id: 'run_2' });
    reconciliationRepository.findPaymentCandidates.mockResolvedValue([]);
    reconciliationRepository.findPayoutCandidates.mockResolvedValue([]);
    reconciliationRepository.findRefundCandidates.mockResolvedValue([
      {
        id: 'refund_row_1',
        refundId: 'refund_1',
        transactionId: 'txn_1',
        status: RefundStatus.PROCESSING,
        transaction: {
          orderId: 'order_1',
          payout: null,
        },
      },
    ]);
    cashfreeClient.getRefund.mockResolvedValue({
      refund_id: 'refund_1',
      refund_status: 'SUCCESS',
      order_id: 'order_1',
      refund_amount: 100,
    });
    refundService.applyRefundUpdate.mockResolvedValue(RefundStatus.SUCCESS);
    reconciliationRepository.findRun.mockResolvedValue({
      id: 'run_2',
      scope: ReconciliationScope.REFUND,
      status: ReconciliationRunStatus.COMPLETED,
      mismatchCount: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      summary: {
        mismatchCount: 1,
      } as Prisma.JsonObject,
      items: [
        {
          id: 'item_3',
          scope: ReconciliationScope.REFUND,
          severity: ReconciliationSeverity.HIGH,
          status: 'OPEN',
          code: 'REFUND_STATUS_MISMATCH',
          message: 'status mismatch',
          entityId: 'refund_row_1',
          transactionId: 'txn_1',
          expectedState: {},
          actualState: {},
          createdAt: new Date(),
        },
      ],
    });

    const result = await service.run(ReconciliationScope.REFUND, 'user_1');

    expect(reconciliationRepository.createItem).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(1);
  });

  it('resolves an open reconciliation item with an operator note', async () => {
    reconciliationRepository.findItem.mockResolvedValue({
      id: 'item_1',
      status: 'OPEN',
    });
    reconciliationRepository.updateItem.mockResolvedValue({
      id: 'item_1',
      status: 'RESOLVED',
      resolutionNote: 'Checked with provider and replayed sync',
      resolvedByUserId: 'admin_1',
      resolvedAt: new Date(),
    });

    const result = await service.resolveItem(
      'item_1',
      'admin_1',
      'Checked with provider and replayed sync'
    );

    expect(reconciliationRepository.updateItem).toHaveBeenCalledWith(
      {},
      'item_1',
      expect.objectContaining({
        status: 'RESOLVED',
        resolvedByUserId: 'admin_1',
      })
    );
    expect(result.status).toBe('RESOLVED');
  });
});
