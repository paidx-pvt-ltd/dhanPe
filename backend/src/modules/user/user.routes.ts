import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validation.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { updateProfileSchema } from './user.schemas.js';
import { asHandler } from '../../shared/http.js';

const repository = new UserRepository(prisma);
const service = new UserService(repository);
const controller = new UserController(service);

export const userRoutes = Router();

userRoutes.get('/profile', authenticate, asHandler(controller.getProfile));
userRoutes.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asHandler(controller.updateProfile)
);
