import prisma from '../config/database';
import { NotFoundError } from '../utils/errors';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  kycStatus: string;
  balance: number;
  createdAt: Date;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      balance: user.balance,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: Partial<UserProfile>
  ): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      balance: user.balance,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user balance
   */
  static async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user.balance;
  }

  /**
   * Update user balance
   */
  static async updateBalance(userId: string, amount: number): Promise<number> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount,
        },
      },
      select: { balance: true },
    });

    return user.balance;
  }
}
