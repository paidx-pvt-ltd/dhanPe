import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { validate } from '../../middleware/validation.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { loginSchema, refreshSchema, signupSchema } from './auth.schemas.js';
import { asHandler } from '../../shared/http.js';

const repository = new AuthRepository(prisma);
const service = new AuthService(repository);
const controller = new AuthController(service);

export const authRoutes = Router();

authRoutes.post('/signup', authLimiter, validate(signupSchema), asHandler(controller.signup));
authRoutes.post('/login', authLimiter, validate(loginSchema), asHandler(controller.login));
authRoutes.post('/refresh', validate(refreshSchema), asHandler(controller.refresh));
