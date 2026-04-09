import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { asHandler } from '../../shared/http.js';
import { BeneficiaryValidationService } from '../compliance/beneficiary-validation.service.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { BeneficiaryController } from './beneficiary.controller.js';
import { createBeneficiarySchema } from './beneficiary.schemas.js';
import { BeneficiaryService } from './beneficiary.service.js';

const beneficiaryController = new BeneficiaryController(
  new BeneficiaryService(
    fintechRuntime.paymentRepository,
    new BeneficiaryValidationService(fintechRuntime.cashfreeClient),
    prisma
  )
);

export const beneficiaryRoutes = Router();

beneficiaryRoutes.get('/', authenticate, asHandler(beneficiaryController.list));
beneficiaryRoutes.post(
  '/',
  authenticate,
  validate(createBeneficiarySchema),
  asHandler(beneficiaryController.create)
);
