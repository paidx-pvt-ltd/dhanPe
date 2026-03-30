import { Router } from 'express';
import { authenticate, requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validation';
import { transactionQuerySchema } from '../utils/schemas';
import { TransactionService } from '../services/transaction.service';

const router = Router();

/**
 * GET /transactions
 * Get user's transactions with optional filters
 */
router.get(
  '/',
  authenticate,
  requireAuth,
  async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const filters = {
        type: req.query.type as 'DEBIT' | 'CREDIT' | 'REFUND' | undefined,
        status: req.query.status as 'PENDING' | 'SUCCESS' | 'FAILED' | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const result = await TransactionService.getUserTransactions(
        req.userId!,
        filters,
        limit,
        offset
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /transactions/:id
 * Get specific transaction
 */
router.get(
  '/:id',
  authenticate,
  requireAuth,
  async (req, res, next) => {
    try {
      const transaction = await TransactionService.getTransaction(
        req.params.id,
        req.userId!
      );

      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
