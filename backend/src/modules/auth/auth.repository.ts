import { PrismaClient, RefreshToken, User } from '@prisma/client';

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<User> {
    return this.db.user.create({ data });
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
