import { NotFoundError, PanInvalidError } from '../../shared/errors.js';
import { toNumber } from '../../utils/decimal.js';
import { OnboardingService } from '../compliance/onboarding.service.js';
import { PanVerificationService } from '../compliance/pan-verification.service.js';
import { DiditService } from '../didit/didit.service.js';
import { UserRepository } from './user.repository.js';
import { SubmitPanDto } from './user.schemas.js';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly panVerificationService: PanVerificationService,
    private readonly onboardingService: OnboardingService,
    private readonly diditService: DiditService
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      isMobileVerified: user.isMobileVerified,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      panNumber: user.panNumber,
      panName: user.panName,
      panVerified: user.panVerified,
      panVerifiedAt: user.panVerifiedAt,
      addressLine1: user.addressLine1,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      countryCode: user.countryCode,
      kycStatus: user.kycStatus,
      isAdmin: user.isAdmin,
      balance: toNumber(user.balance),
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    }
  ) {
    const user = await this.userRepository.updateProfile(userId, data);
    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
      isMobileVerified: user.isMobileVerified,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      panNumber: user.panNumber,
      panName: user.panName,
      panVerified: user.panVerified,
      panVerifiedAt: user.panVerifiedAt,
      addressLine1: user.addressLine1,
      city: user.city,
      state: user.state,
      postalCode: user.postalCode,
      countryCode: user.countryCode,
      kycStatus: user.kycStatus,
      isAdmin: user.isAdmin,
      balance: toNumber(user.balance),
      createdAt: user.createdAt,
    };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const beneficiaryCount = await this.userRepository.countBeneficiaries(userId);
    return this.onboardingService.resolve(user, beneficiaryCount);
  }

  async submitPan(userId: string, input: SubmitPanDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    try {
      const verified = await this.panVerificationService.verifyPan(
        input.panNumber,
        input.legalName
      );
      const updated = await this.userRepository.updatePan(userId, {
        panNumber: verified.panNumber,
        panName: verified.panName,
        panVerified: true,
        panVerifiedAt: new Date(),
      });

      return {
        id: updated.id,
        mobileNumber: updated.mobileNumber,
        panNumber: updated.panNumber,
        panName: updated.panName,
        panVerified: updated.panVerified,
        panVerifiedAt: updated.panVerifiedAt,
        verificationMethod: 'CASHFREE_PAN_API',
      };
    } catch (error) {
      if (error instanceof PanInvalidError) {
        throw new PanInvalidError(error.message, {
          ...(typeof error.details === 'object' && error.details !== null
            ? (error.details as Record<string, unknown>)
            : { providerResponse: error.details }),
          fallbackAvailable: true,
          fallbackRoute: '/api/users/pan/fallback',
        });
      }

      throw error;
    }
  }

  async createPanFallbackSession(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const session = await this.diditService.createSession(userId);
    return {
      ...session,
      purpose: 'PAN_DOCUMENT_VERIFICATION',
      message:
        'Complete document verification via Didit. PAN details will be synced after approval.',
    };
  }
}
