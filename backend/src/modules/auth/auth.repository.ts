import { PrismaClient, User } from '@prisma/client';

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
}
