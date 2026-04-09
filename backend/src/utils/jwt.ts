import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticationError } from '../shared/errors.js';

export interface JwtPayload {
  userId: string;
  mobileNumber: string;
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

  static getRefreshTokenExpiryDate(): Date {
    const expiry = config.jwt.refreshExpiry;
    const now = new Date();
    const match = /^(\d+)([smhd])$/.exec(expiry);

    if (!match) {
      now.setDate(now.getDate() + 7);
      return now;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multiplier =
      unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;

    return new Date(Date.now() + value * multiplier);
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
