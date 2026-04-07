import { AuthRepository } from './auth.repository.js';
import { SignupDto, LoginDto } from './auth.schemas.js';
import { ConflictError, AuthenticationError } from '../../shared/errors.js';
import { PasswordService } from '../../utils/password.js';
import { JwtService } from '../../utils/jwt.js';

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
    const payload = JwtService.verifyRefreshToken(refreshToken);
    const user = await this.authRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber?: string | null;
    kycStatus?: string;
    balance?: { toString(): string } | number | string;
    createdAt?: Date;
  }) {
    const payload = {
      userId: user.id,
      email: user.email,
    };

    return {
      success: true,
      accessToken: JwtService.signAccessToken(payload),
      refreshToken: JwtService.signRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber ?? null,
        kycStatus: user.kycStatus ?? 'PENDING',
        balance: Number(user.balance ?? 0),
        createdAt: user.createdAt ?? new Date(),
      },
    };
  }
}
