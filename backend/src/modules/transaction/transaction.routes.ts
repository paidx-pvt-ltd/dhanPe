import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { TransactionController } from './transaction.controller.js';
import { transactionParamsSchema } from './transaction.schemas.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';

const controller = new TransactionController(fintechRuntime.transactionService);

export const transactionRoutes = Router();

transactionRoutes.get(
  '/:id',
  authenticate,
  validate(transactionParamsSchema, 'params'),
  asHandler(controller.getLifecycle)
);
