import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticationError } from '../shared/errors.js';

export interface JwtPayload {
  userId: string;
  email: string;
}

export class JwtService {
  static signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
    } as SignOptions);
  }

  static signRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    } as SignOptions);
  }

  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }
}
