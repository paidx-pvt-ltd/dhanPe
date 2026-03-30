import { Router } from 'express';
import { authLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';
import { signupSchema, loginSchema, refreshTokenSchema } from '../utils/schemas';
import { AuthService } from '../services/auth.service';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /auth/signup
 * Register new user
 */
router.post(
  '/signup',
  authLimiter,
  validate(signupSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.signup(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/login
 * Login user and return tokens
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  async (req, res, next) => {
    try {
      const result = await AuthService.refreshToken(req.body.refreshToken);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 * Logout user (optional - could revoke refresh tokens)
 */
router.post('/logout', authenticate, async (req, res) => {
  logger.info(`User logged out: ${req.userId}`);
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
