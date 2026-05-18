import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { OnboardingService } from '../compliance/onboarding.service.js';
import { PanVerificationService } from '../compliance/pan-verification.service.js';
import { DiditClient } from '../didit/didit.client.js';
import { DiditRepository } from '../didit/didit.repository.js';
import { DiditService } from '../didit/didit.service.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { submitPanSchema, updateProfileSchema } from './user.schemas.js';
import { asHandler } from '../../shared/http.js';

const repository = new UserRepository(prisma);
const diditService = new DiditService(new DiditRepository(prisma), new DiditClient(), prisma);
const service = new UserService(
  repository,
  new PanVerificationService(fintechRuntime.cashfreeClient),
  new OnboardingService(),
  diditService
);
const controller = new UserController(service);

export const userRoutes = Router();

userRoutes.get('/onboarding', authenticate, asHandler(controller.getOnboarding));
userRoutes.get('/profile', authenticate, asHandler(controller.getProfile));
userRoutes.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asHandler(controller.updateProfile)
);
userRoutes.post('/pan', authenticate, validate(submitPanSchema), asHandler(controller.submitPan));
userRoutes.post('/pan/fallback', authenticate, asHandler(controller.createPanFallback));
