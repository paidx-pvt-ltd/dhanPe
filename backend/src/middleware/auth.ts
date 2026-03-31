import { NextFunction, Request, Response } from 'express';
import { JwtService } from '../utils/jwt.js';
import { AuthenticationError } from '../shared/errors.js';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing bearer token');
  }

  const payload = JwtService.verifyAccessToken(header.slice(7));
  req.userId = payload.userId;
  req.user = {
    id: payload.userId,
    email: payload.email,
  };
  next();
};
