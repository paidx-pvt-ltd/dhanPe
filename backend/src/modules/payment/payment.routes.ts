import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { transferLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validation.js';
import { RiskRepository } from '../risk/risk.repository.js';
import { RiskService } from '../risk/risk.service.js';
import { CashfreeClient } from './cashfree.client.js';
import { PaymentRepository } from './payment.repository.js';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { createTransferSchema } from './payment.schemas.js';
import { asHandler } from '../../shared/http.js';

const paymentRepository = new PaymentRepository(prisma);
const riskRepository = new RiskRepository(prisma);
const riskService = new RiskService(riskRepository);
const cashfreeClient = new CashfreeClient();
const paymentService = new PaymentService(paymentRepository, riskService, cashfreeClient, prisma);
const paymentController = new PaymentController(paymentService);

export const paymentRoutes = Router();

paymentRoutes.post(
  '/',
  authenticate,
  transferLimiter,
  validate(createTransferSchema),
  asHandler(paymentController.createTransfer)
);
