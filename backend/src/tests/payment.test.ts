import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PaymentService } from '../services/payment.service';
import { TransactionService } from '../services/transaction.service';
import prisma from '../config/database';

describe('Payment Flow', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `payment-test-${Date.now()}@test.com`,
        passwordHash: 'hashedpassword',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('should create payment order', async () => {
    const payment = await PaymentService.createPayment({
      userId: testUserId,
      amount: 100,
      description: 'Test payment',
    });

    expect(payment.id).toBeDefined();
    expect(payment.status).toBe('PENDING');
    expect(payment.amount).toBe(100);
  });

  it('should handle idempotent webhook processing', async () => {
    const payment = await PaymentService.createPayment({
      userId: testUserId,
      amount: 50,
    });

    const idempotencyKey = `test-${Date.now()}`;
    const webhookData = { status: 'SUCCESS' };

    // First webhook
    const tx1 = await TransactionService.createTransaction({
      userId: testUserId,
      paymentId: payment.id,
      type: 'CREDIT',
      amount: 50,
      status: 'SUCCESS',
      idempotencyKey,
    });

    // Duplicate webhook
    const tx2 = await TransactionService.createTransaction({
      userId: testUserId,
      paymentId: payment.id,
      type: 'CREDIT',
      amount: 50,
      status: 'SUCCESS',
      idempotencyKey,
    });

    // Should return same transaction
    expect(tx1.id).toBe(tx2.id);
  });
});
