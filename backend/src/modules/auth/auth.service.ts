import { AuthRepository } from './auth.repository.js';
import { VerifyOtpDto } from './auth.schemas.js';
import { AuthenticationError, ValidationError } from '../../shared/errors.js';
import { JwtService } from '../../utils/jwt.js';
import { sha256 } from '../../utils/hash.js';
import { logger } from '../../config/logger.js';
import { Msg91WidgetService } from './msg91-widget.service.js';

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly msg91WidgetService: Msg91WidgetService
  ) {}

  async getWidgetConfig() {
    return {
      success: true,
      data: this.msg91WidgetService.getWidgetConfig(),
    };
  }

  async verifyOtp(input: VerifyOtpDto) {
    const verified = await this.msg91WidgetService.verifyAccessToken(input.accessToken);
    const mobileNumber = this.normalizeMobileNumber(verified.mobileNumber);
    if (input.mobileNumber) {
      const claimedMobileNumber = this.normalizeMobileNumber(input.mobileNumber);
      if (claimedMobileNumber !== mobileNumber) {
        throw new AuthenticationError('Verified mobile number does not match the supplied number');
      }
    }

    const user =
      (await this.authRepository.findByMobileNumber(mobileNumber)) ??
      (await this.authRepository.createUser({
        mobileNumber,
        isMobileVerified: true,
      }));

    const updatedUser = await this.authRepository.updateUser(user.id, {
      isMobileVerified: true,
      phoneNumber: user.phoneNumber ?? mobileNumber,
    });

    logger.info({ userId: updatedUser.id, mobileNumber }, 'Mobile OTP verified');

    return this.buildAuthResponse(updatedUser);
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
      mobileNumber: string;
      isMobileVerified?: boolean;
      email?: string | null;
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
      mobileNumber: user.mobileNumber,
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
        mobileNumber: user.mobileNumber,
        isMobileVerified: user.isMobileVerified ?? true,
        email: user.email ?? null,
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

  private normalizeMobileNumber(mobileNumber: string) {
    const normalized = mobileNumber.replace(/[^\d+]/g, '');
    if (!/^\+?\d{10,15}$/.test(normalized)) {
      throw new ValidationError('Mobile number must be a valid MSISDN');
    }

    return normalized.startsWith('+') ? normalized : `+91${normalized.slice(-10)}`;
  }
}
