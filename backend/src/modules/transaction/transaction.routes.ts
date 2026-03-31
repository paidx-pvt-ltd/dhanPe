import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { TransactionController } from './transaction.controller.js';
import { TransactionRepository } from './transaction.repository.js';
import { transactionParamsSchema } from './transaction.schemas.js';
import { TransactionService } from './transaction.service.js';
import { asHandler } from '../../shared/http.js';

const repository = new TransactionRepository(prisma);
const service = new TransactionService(repository);
const controller = new TransactionController(service);

export const transactionRoutes = Router();

transactionRoutes.get(
  '/:id',
  authenticate,
  validate(transactionParamsSchema, 'params'),
  asHandler(controller.getLifecycle)
);
