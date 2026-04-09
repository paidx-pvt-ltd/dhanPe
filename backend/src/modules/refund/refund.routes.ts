import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { RefundController } from './refund.controller.js';
import {
  createRefundSchema,
  refundParamsSchema,
  refundSyncParamsSchema,
} from './refund.schemas.js';

const refundController = new RefundController(fintechRuntime.refundService);

export const refundRoutes = Router();

refundRoutes.post(
  '/:transactionId',
  authenticate,
  validate(refundParamsSchema, 'params'),
  validate(createRefundSchema),
  asHandler(refundController.create)
);

refundRoutes.post(
  '/:refundId/sync',
  authenticate,
  validate(refundSyncParamsSchema, 'params'),
  asHandler(refundController.sync)
);
