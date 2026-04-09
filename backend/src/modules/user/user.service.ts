import { NotFoundError } from '../../shared/errors.js';
import { toNumber } from '../../utils/decimal.js';
import { UserRepository } from './user.repository.js';

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
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
}
