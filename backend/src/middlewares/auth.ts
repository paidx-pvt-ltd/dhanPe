import { Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';
import { RequestWithUser } from './error';

/**
 * Authenticate JWT token from Authorization header
 */
export const authenticate = (
  req: RequestWithUser,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);

  const payload = JWTService.verifyAccessToken(token);
  req.userId = payload.userId;
  req.user = {
    id: payload.userId,
    email: payload.email,
  };

  next();
};

/**
 * Optional authentication - doesn't fail if token is missing
 */
export const optionalAuth = (
  req: RequestWithUser,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = JWTService.verifyAccessToken(token);
      req.userId = payload.userId;
      req.user = {
        id: payload.userId,
        email: payload.email,
      };
    } catch {
      // Token invalid, but optional so continue
    }
  }

  next();
};

/**
 * Require authentication
 */
export const requireAuth = (
  req: RequestWithUser,
  _res: Response,
  next: NextFunction
) => {
  if (!req.userId || !req.user) {
    throw new AuthenticationError('Authentication required');
  }
  next();
};
