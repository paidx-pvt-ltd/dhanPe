import { describe, expect, it, vi, beforeEach } from 'vitest';
import { KYCStatus, PaymentProvider, PayoutStatus, TransactionStatus } from '@prisma/client';
import { sha256 } from '../../utils/hash.js';
import { PaymentService } from './payment.service.js';

describe('PaymentService', () => {
  const paymentRepository = {
    findUser: vi.fn(),
    findIdempotencyKey: vi.fn(),
    findVerifiedBeneficiary: vi.fn(),
    createBeneficiary: vi.fn(),
    updateBeneficiary: vi.fn(),
    createTransaction: vi.fn(),
    updateTransactionOrder: vi.fn(),
    saveIdempotencyRecord: vi.fn(),
  };

  const riskService = {
    evaluateTransfer: vi.fn(),
  };

  const cashfreeClient = {
    createOrder: vi.fn(),
    createBeneficiary: vi.fn(),
  };
  const transactionStateService = {
    transitionTransactionState: vi.fn(),
  };

  const db = {
    $transaction: vi.fn(),
  };

  const service = new PaymentService(
    paymentRepository as never,
    riskService as never,
    transactionStateService as never,
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
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '221B Baker Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      countryCode: '+91',
      isActive: true,
      kycStatus: KYCStatus.APPROVED,
    });
    paymentRepository.findIdempotencyKey.mockResolvedValue(null);
    paymentRepository.findVerifiedBeneficiary.mockResolvedValue(null);
    db.$transaction.mockImplementation(async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({})
    );
    paymentRepository.createBeneficiary.mockResolvedValue({
      id: 'beneficiary_1',
      accountHolderName: 'Test User',
      accountNumberMask: 'XXXXXX7890',
      ifsc: 'HDFC0001234',
      status: 'PENDING_VERIFICATION',
    });
    paymentRepository.updateBeneficiary.mockResolvedValue({
      id: 'beneficiary_1',
      accountHolderName: 'Test User',
      accountNumberMask: 'XXXXXX7890',
      ifsc: 'HDFC0001234',
      status: 'VERIFIED',
    });
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
    cashfreeClient.createBeneficiary.mockResolvedValue({
      beneficiary_id: 'cf_bene_1',
      beneficiary_status: 'VERIFIED',
    });

    const result = (await service.createTransfer(
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
    )) as {
      transactionId: string;
      orderId: string;
      orderToken: string;
      amount: number;
      status: TransactionStatus;
    };

    expect(riskService.evaluateTransfer).toHaveBeenCalledWith('user_1', 5000);
    expect(paymentRepository.createTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user_1',
        status: TransactionStatus.INITIATED,
        paymentProvider: PaymentProvider.CASHFREE,
        payoutStatus: PayoutStatus.QUEUED,
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
    expect(result.transactionId).toBe('txn_1');
    expect(result.orderId).toEqual(expect.any(String));
    expect(result.orderToken).toBe('token_123');
    expect(result.amount).toBe(5075);
    expect(result.status).toBe(TransactionStatus.INITIATED);
  });

  it('returns the stored idempotent response when the same request is replayed', async () => {
    paymentRepository.findUser.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      phoneNumber: '9999999999',
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '221B Baker Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      countryCode: '+91',
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
        amount: 5075,
        status: TransactionStatus.INITIATED,
      },
    });

    const result = (await service.createTransfer(
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
    )) as {
      transactionId: string;
      orderId: string;
      orderToken: string;
      amount: number;
      status: TransactionStatus;
    };

    expect(result).toEqual({
      transactionId: 'txn_existing',
      orderId: 'existing_order',
      orderToken: 'existing_token',
      amount: 5075,
      status: TransactionStatus.INITIATED,
    });
    expect(riskService.evaluateTransfer).not.toHaveBeenCalled();
    expect(cashfreeClient.createOrder).not.toHaveBeenCalled();
  });
});
