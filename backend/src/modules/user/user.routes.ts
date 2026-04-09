import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { PanVerificationService } from '../compliance/pan-verification.service.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { submitPanSchema, updateProfileSchema } from './user.schemas.js';
import { asHandler } from '../../shared/http.js';

const repository = new UserRepository(prisma);
const service = new UserService(repository, new PanVerificationService(fintechRuntime.cashfreeClient));
const controller = new UserController(service);

export const userRoutes = Router();

userRoutes.get('/profile', authenticate, asHandler(controller.getProfile));
userRoutes.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asHandler(controller.updateProfile)
);
userRoutes.post('/pan', authenticate, validate(submitPanSchema), asHandler(controller.submitPan));
