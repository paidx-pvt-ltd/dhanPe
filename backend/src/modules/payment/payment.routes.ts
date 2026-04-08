import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { transferLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validation.js';
import { PaymentController } from './payment.controller.js';
import { createTransferSchema } from './payment.schemas.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';

const paymentController = new PaymentController(fintechRuntime.paymentService);

export const paymentRoutes = Router();

paymentRoutes.post(
  '/',
  authenticate,
  transferLimiter,
  validate(createTransferSchema),
  asHandler(paymentController.createTransfer)
);
