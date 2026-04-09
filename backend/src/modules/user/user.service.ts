import { NotFoundError } from '../../shared/errors.js';
import { toNumber } from '../../utils/decimal.js';
import { PanVerificationService } from '../compliance/pan-verification.service.js';
import { UserRepository } from './user.repository.js';
import { SubmitPanDto } from './user.schemas.js';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly panVerificationService: PanVerificationService
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

  async submitPan(userId: string, input: SubmitPanDto) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const verified = await this.panVerificationService.verifyPan(input.panNumber, input.legalName);
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
    };
  }
}
