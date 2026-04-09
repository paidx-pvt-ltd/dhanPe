import { AuthRepository } from './auth.repository.js';
import { SignupDto, LoginDto } from './auth.schemas.js';
import { ConflictError, AuthenticationError } from '../../shared/errors.js';
import { PasswordService } from '../../utils/password.js';
import { JwtService } from '../../utils/jwt.js';
import { sha256 } from '../../utils/hash.js';

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async signup(input: SignupDto) {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User with this email already exists');
    }

    const user = await this.authRepository.createUser({
      email: input.email,
      passwordHash: await PasswordService.hash(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
    });

    return this.buildAuthResponse(user);
  }

  async login(input: LoginDto) {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await PasswordService.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const refreshTokenHash = sha256(refreshToken);
    const tokenRecord = await this.authRepository.findActiveRefreshToken(refreshTokenHash);
    if (!tokenRecord) {
      throw new AuthenticationError('Refresh token is invalid, expired, or revoked');
    }

    const payload = JwtService.verifyRefreshToken(refreshToken);
    const user = await this.authRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    return this.buildAuthResponse(user, tokenRecord.id);
  }

  private async buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      phoneNumber?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      countryCode?: string | null;
      kycStatus?: string;
      isAdmin?: boolean;
      balance?: { toString(): string } | number | string;
      createdAt?: Date;
    },
    rotateFromTokenId?: string
  ) {
    const payload = {
      userId: user.id,
      email: user.email,
    };
    const accessToken = JwtService.signAccessToken(payload);
    const refreshToken = JwtService.signRefreshToken(payload);
    const refreshTokenRecord = await this.authRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      tokenHash: sha256(refreshToken),
      expiresAt: JwtService.getRefreshTokenExpiryDate(),
    });

    if (rotateFromTokenId) {
      await this.authRepository.revokeRefreshToken(rotateFromTokenId, refreshTokenRecord.id);
    }

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber ?? null,
        addressLine1: user.addressLine1 ?? null,
        city: user.city ?? null,
        state: user.state ?? null,
        postalCode: user.postalCode ?? null,
        countryCode: user.countryCode ?? '+91',
        kycStatus: user.kycStatus ?? 'PENDING',
        isAdmin: user.isAdmin ?? false,
        balance: Number(user.balance ?? 0),
        createdAt: user.createdAt ?? new Date(),
      },
    };
  }
}
