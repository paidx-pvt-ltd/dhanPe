import { Router } from 'express';
import { requireAdmin } from '../../middleware/admin.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { ReconciliationController } from './reconciliation.controller.js';
import {
  reconciliationItemParamsSchema,
  reconciliationItemsQuerySchema,
  reconciliationRunParamsSchema,
  resolveReconciliationItemSchema,
  runReconciliationSchema,
} from './reconciliation.schemas.js';

const reconciliationController = new ReconciliationController(fintechRuntime.reconciliationService);

export const reconciliationRoutes = Router();

reconciliationRoutes.post(
  '/run',
  authenticate,
  requireAdmin,
  validate(runReconciliationSchema),
  asHandler(reconciliationController.run)
);

reconciliationRoutes.get(
  '/runs/:runId',
  authenticate,
  requireAdmin,
  validate(reconciliationRunParamsSchema, 'params'),
  asHandler(reconciliationController.getRun)
);

reconciliationRoutes.get(
  '/items',
  authenticate,
  requireAdmin,
  validate(reconciliationItemsQuerySchema, 'query'),
  asHandler(reconciliationController.listItems)
);

reconciliationRoutes.post(
  '/items/:itemId/resolve',
  authenticate,
  requireAdmin,
  validate(reconciliationItemParamsSchema, 'params'),
  validate(resolveReconciliationItemSchema),
  asHandler(reconciliationController.resolveItem)
);
