import { PrismaClient, User } from '@prisma/client';

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  updateProfile(
    id: string,
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
  ): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  updateKycStatus(id: string, kycStatus: User['kycStatus']): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { kycStatus },
    });
  }
}
