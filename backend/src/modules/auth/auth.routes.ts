import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { validate } from '../../middleware/validation.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { Msg91OtpService } from './msg91-otp.service.js';
import {
  refreshSchema,
  sendOtpSchema,
  widgetConfigSchema,
  verifyOtpSchema,
} from './auth.schemas.js';
import { asHandler } from '../../shared/http.js';

const repository = new AuthRepository(prisma);
const service = new AuthService(repository, new Msg91OtpService());
const controller = new AuthController(service);

export const authRoutes = Router();

authRoutes.get(
  '/widget-config',
  validate(widgetConfigSchema),
  asHandler(controller.getWidgetConfig)
);
authRoutes.post('/send-otp', authLimiter, validate(sendOtpSchema), asHandler(controller.sendOtp));
authRoutes.post(
  '/verify-otp',
  authLimiter,
  validate(verifyOtpSchema),
  asHandler(controller.verifyOtp)
);
authRoutes.post('/refresh', validate(refreshSchema), asHandler(controller.refresh));
