import { describe, expect, it, vi, beforeEach } from 'vitest';
import { KYCStatus, PaymentProvider, PayoutStatus, TransactionStatus } from '@prisma/client';
import { sha256 } from '../../utils/hash.js';
import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
  const paymentRepository = {
    findUser: vi.fn(),
    findIdempotencyKey: vi.fn(),
    createTransaction: vi.fn(),
    updateTransactionOrder: vi.fn(),
    saveIdempotencyRecord: vi.fn(),
  };

  const riskService = {
    evaluateTransfer: vi.fn(),
  };

  const cashfreeClient = {
    createOrder: vi.fn(),
  };

  const db = {
    $transaction: vi.fn(),
  };

  const service = new PaymentService(
    paymentRepository as never,
    riskService as never,
    cashfreeClient as never,
    db as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a transfer, persists an initiated transaction, and returns the order token', async () => {
    paymentRepository.findUser.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      phoneNumber: '9999999999',
      isActive: true,
      kycStatus: KYCStatus.APPROVED,
    });
    paymentRepository.findIdempotencyKey.mockResolvedValue(null);
    db.$transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({})
    );
    paymentRepository.createTransaction.mockResolvedValue({
      id: 'txn_1',
      status: TransactionStatus.INITIATED,
    });
    cashfreeClient.createOrder.mockResolvedValue({
      cf_order_id: 'cf_order_1',
      order_id: 'order_1',
      order_token: 'token_123',
      order_status: 'ACTIVE',
    });

    const result = await service.createTransfer(
      'user_1',
      {
        amount: 5000,
        description: 'Wallet transfer',
        bankAccount: {
          accountHolderName: 'Test User',
          accountNumber: '1234567890',
          ifsc: 'HDFC0001234',
        },
      },
      'idem-123'
    );

    expect(riskService.evaluateTransfer).toHaveBeenCalledWith('user_1', 5000);
    expect(paymentRepository.createTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user_1',
        status: TransactionStatus.INITIATED,
        paymentProvider: PaymentProvider.CASHFREE,
        payoutStatus: PayoutStatus.PENDING,
        idempotencyKey: 'idem-123',
      })
    );
    expect(cashfreeClient.createOrder).toHaveBeenCalledTimes(1);
    expect(paymentRepository.updateTransactionOrder).toHaveBeenCalledWith(
      'txn_1',
      expect.objectContaining({
        providerOrderId: 'cf_order_1',
      })
    );
    expect(result).toEqual({
      transactionId: 'txn_1',
      orderId: expect.any(String),
      orderToken: 'token_123',
      amount: 5000,
      status: TransactionStatus.INITIATED,
    });
  });

  it('returns the stored idempotent response when the same request is replayed', async () => {
    paymentRepository.findUser.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      phoneNumber: '9999999999',
      isActive: true,
      kycStatus: KYCStatus.APPROVED,
    });
    paymentRepository.findIdempotencyKey.mockResolvedValue({
      requestHash: sha256(
        JSON.stringify({
          amount: 5000,
          description: 'Wallet transfer',
          bankAccount: {
            accountHolderName: 'Test User',
            accountNumber: '1234567890',
            ifsc: 'HDFC0001234',
          },
        })
      ),
      responseBody: {
        transactionId: 'txn_existing',
        orderId: 'existing_order',
        orderToken: 'existing_token',
        amount: 5000,
        status: TransactionStatus.INITIATED,
      },
    });

    const result = await service.createTransfer(
      'user_1',
      {
        amount: 5000,
        description: 'Wallet transfer',
        bankAccount: {
          accountHolderName: 'Test User',
          accountNumber: '1234567890',
          ifsc: 'HDFC0001234',
        },
      },
      'idem-123'
    );

    expect(result).toEqual({
      transactionId: 'txn_existing',
      orderId: 'existing_order',
      orderToken: 'existing_token',
      amount: 5000,
      status: TransactionStatus.INITIATED,
    });
    expect(riskService.evaluateTransfer).not.toHaveBeenCalled();
    expect(cashfreeClient.createOrder).not.toHaveBeenCalled();
  });
});
