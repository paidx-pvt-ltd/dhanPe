import prisma from '../config/database';
import { CashfreeService } from './cashfree.service';
import { NotFoundError, InternalServerError } from '../utils/errors';
import { logger } from '../config/logger';
import { generateIdempotencyKey, generateRandomString } from '../utils/helpers';

export interface CreatePaymentInput {
  userId: string;
  amount: number;
  description?: string;
}

export interface PaymentResponse {
  id: string;
  orderToken: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export class PaymentService {
  /**
   * Create payment order
   */
  static async createPayment(input: CreatePaymentInput): Promise<PaymentResponse> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      // Create order in Cashfree
      const cashfreeOrder = await CashfreeService.createOrder({
        order_amount: input.amount,
        order_currency: 'INR',
        order_note: input.description || 'Payment',
        customer_details: {
          customer_id: user.id,
          customer_email: user.email,
          customer_phone: user.phoneNumber || '9999999999',
        },
      });

      // Store payment in DB
      const payment = await prisma.payment.create({
        data: {
          userId: input.userId,
          cashfreeOrderId: cashfreeOrder.cf_order_id,
          amount: input.amount,
          status: 'PENDING',
        },
      });

      logger.info(`Payment created: ${payment.id}`);

      return {
        id: payment.id,
        orderToken: cashfreeOrder.order_token,
        orderId: cashfreeOrder.cf_order_id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt,
      };
    } catch (error) {
      logger.error('Failed to create payment:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || payment.userId !== userId) {
      throw new NotFoundError('Payment');
    }

    return {
      id: payment.id,
      orderId: payment.cashfreeOrderId,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /**
   * Update payment status (called by webhook)
   */
  static async updatePaymentStatus(
    cashfreeOrderId: string,
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED',
    webhookData: Record<string, any>
  ) {
    const payment = await prisma.payment.findUnique({
      where: { cashfreeOrderId },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Update payment
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        webhookReceived: true,
        webhookData,
        updatedAt: new Date(),
      },
    });

    logger.info(`Payment status updated: ${payment.id} -> ${status}`);

    return updated;
  }

  /**
   * Get user payments
   */
  static async getUserPayments(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const payments = await prisma.payment.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.payment.count({
      where: { userId },
    });

    return {
      payments,
      total,
      limit,
      offset,
    };
  }
}
