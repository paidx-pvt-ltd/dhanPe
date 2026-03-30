import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError } from './errors';

export interface JWTPayload {
  userId: string;
  email: string;
}

export class JWTService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (use with caution)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}
