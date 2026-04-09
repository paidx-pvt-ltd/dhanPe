import { PrismaClient, RefreshToken, User } from '@prisma/client';

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findByMobileNumber(mobileNumber: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { mobileNumber } });
  }

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  createUser(data: { mobileNumber: string; isMobileVerified?: boolean }): Promise<User> {
    return this.db.user.create({ data });
  }

  updateUser(
    id: string,
    data: {
      isMobileVerified?: boolean;
      phoneNumber?: string;
    }
  ): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  createRefreshToken(data: {
    userId: string;
    token: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: object;
  }): Promise<RefreshToken> {
    return this.db.refreshToken.create({
      data,
    });
  }

  findActiveRefreshToken(tokenHash: string) {
    return this.db.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  revokeRefreshToken(id: string, replacedByTokenId?: string) {
    return this.db.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId,
        lastUsedAt: new Date(),
      },
    });
  }
}
