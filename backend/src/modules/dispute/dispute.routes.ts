import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { DisputeController } from './dispute.controller.js';
import {
  createDisputeSchema,
  disputeParamsSchema,
  disputeQuerySchema,
  resolveDisputeSchema,
  respondDisputeSchema,
} from './dispute.schemas.js';

const disputeController = new DisputeController(fintechRuntime.disputeService);

export const disputeRoutes = Router();

disputeRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createDisputeSchema),
  asHandler(disputeController.create)
);

disputeRoutes.get(
  '/',
  authenticate,
  requireAdmin,
  validate(disputeQuerySchema, 'query'),
  asHandler(disputeController.list)
);

disputeRoutes.get(
  '/:disputeId',
  authenticate,
  requireAdmin,
  validate(disputeParamsSchema, 'params'),
  asHandler(disputeController.get)
);

disputeRoutes.post(
  '/:disputeId/respond',
  authenticate,
  requireAdmin,
  validate(disputeParamsSchema, 'params'),
  validate(respondDisputeSchema),
  asHandler(disputeController.respond)
);

disputeRoutes.post(
  '/:disputeId/resolve',
  authenticate,
  requireAdmin,
  validate(disputeParamsSchema, 'params'),
  validate(resolveDisputeSchema),
  asHandler(disputeController.resolve)
);
