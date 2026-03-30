import prisma from '../config/database';
import { PasswordService } from '../utils/password';
import { JWTService, JWTPayload } from '../utils/jwt';
import { ConflictError, AuthenticationError } from '../utils/errors';
import { logger } from '../config/logger';

export interface SignupInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export class AuthService {
  /**
   * Signup new user
   */
  static async signup(input: SignupInput): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordService.hash(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    logger.info(`User registered: ${user.id}`);

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return {
      success: true,
      accessToken: JWTService.generateAccessToken(payload),
      refreshToken: JWTService.generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Login user
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValid = await PasswordService.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    logger.info(`User logged in: ${user.id}`);

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return {
      success: true,
      accessToken: JWTService.generateAccessToken(payload),
      refreshToken: JWTService.generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(token: string): Promise<AuthResponse> {
    const payload = JWTService.verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return {
      success: true,
      accessToken: JWTService.generateAccessToken(newPayload),
      refreshToken: JWTService.generateRefreshToken(newPayload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
