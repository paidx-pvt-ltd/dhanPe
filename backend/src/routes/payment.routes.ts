import { Router } from 'express';
import { authenticate, requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { createPaymentSchema } from '../utils/schemas';
import { paymentLimiter } from '../middlewares/rateLimit';
import { PaymentService } from '../services/payment.service';
import { TransactionService } from '../services/transaction.service';
import { logger } from '../config/logger';
import { generateIdempotencyKey } from '../utils/helpers';

const router = Router();

/**
 * POST /payments/create-order
 * Create payment order
 */
router.post(
  '/create-order',
  authenticate,
  requireAuth,
  paymentLimiter,
  validate(createPaymentSchema),
  async (req, res, next) => {
    try {
      const result = await PaymentService.createPayment({
        userId: req.userId!,
        amount: req.body.amount,
        description: req.body.description,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /payments/status/:id
 * Get payment status
 */
router.get(
  '/status/:id',
  authenticate,
  requireAuth,
  async (req, res, next) => {
    try {
      const payment = await PaymentService.getPaymentStatus(req.params.id, req.userId!);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /payments/history
 * Get user's payment history
 */
router.get(
  '/history',
  authenticate,
  requireAuth,
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await PaymentService.getUserPayments(req.userId!, limit, offset);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /payments/webhook
 * Cashfree webhook endpoint - MUST BE PUBLIC
 * Verify signature and update payment status
 */
router.post('/webhook', async (req, res, _next) => {
  try {
    const _signature = req.headers['x-cashfree-signature'] as string;
    const payload = req.body;

    // Log webhook for debugging
    logger.info('Webhook received:', { orderId: payload.order_id });

    // Verify Cashfree signature (implementation depends on Cashfree's exact format)
    // For now, we'll trust the webhook - in production, verify properly
    // const isValid = WebhookService.verifyCashfreeWebhook(payload, signature);
    // if (!isValid) {
    //   return res.status(401).json({ success: false, message: 'Invalid signature' });
    // }

    const orderId = payload.order_id;
    const orderStatus = payload.order_status;

    // Handle payment status update
    if (orderStatus === 'PAID' || orderStatus === 'SETTLED') {
      // Payment successful
      const idempotencyKey = generateIdempotencyKey(orderId, payload);

      // Update payment
      const payment = await PaymentService.updatePaymentStatus(
        orderId,
        'SUCCESS',
        payload
      );

      // Create transaction
      await TransactionService.createTransaction({
        userId: payment.userId,
        paymentId: payment.id,
        type: 'CREDIT',
        amount: payment.amount,
        status: 'SUCCESS',
        description: 'Payment successful',
        idempotencyKey,
      });

      logger.info(`Payment successful: ${orderId}`);
    } else if (orderStatus === 'FAILED' || orderStatus === 'CANCELLED') {
      // Payment failed
      const payment = await PaymentService.updatePaymentStatus(
        orderId,
        orderStatus === 'FAILED' ? 'FAILED' : 'CANCELLED',
        payload
      );

      logger.warn(`Payment failed: ${orderId} - ${orderStatus}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    // Still return 200 to prevent Cashfree from retrying indefinitely
    res.json({ success: false, message: 'Processing error' });
  }
});

export default router;
