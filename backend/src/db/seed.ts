import { KYCStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { PasswordService } from '../utils/password.js';

const main = async (): Promise<void> => {
  const email = process.env.SEED_USER_EMAIL ?? 'fintech-demo@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'SecurePassword123';

  await prisma.user.upsert({
    where: { email },
    update: {
      kycStatus: KYCStatus.APPROVED,
      isActive: true,
    },
    create: {
      email,
      passwordHash: await PasswordService.hash(password),
      firstName: 'Fintech',
      lastName: 'Demo',
      phoneNumber: '9999999999',
      kycStatus: KYCStatus.APPROVED,
      isActive: true,
    },
  });
};

void main()
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
