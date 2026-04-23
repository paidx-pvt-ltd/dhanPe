import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { PayoutController } from './payout.controller.js';
import { payoutParamsSchema } from './payout.schemas.js';

const payoutController = new PayoutController((transactionId) =>
  fintechRuntime.dispatcher.enqueueReconciliation({
    kind: 'payout-sync',
    transactionId,
  })
);

export const payoutRoutes = Router();

payoutRoutes.post(
  '/:transactionId/sync',
  authenticate,
  validate(payoutParamsSchema, 'params'),
  asHandler(payoutController.sync)
);
