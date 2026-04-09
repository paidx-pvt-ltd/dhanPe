import { KYCStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { PasswordService } from '../utils/password.js';

const seed = async (): Promise<void> => {
  const email = process.env.SEED_USER_EMAIL ?? 'fintech-demo@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'SecurePassword123';
  const mobileNumber = process.env.SEED_USER_MOBILE ?? '+919999999999';

  await prisma.user.upsert({
    where: { mobileNumber },
    update: {
      email,
      passwordHash: await PasswordService.hash(password),
      mobileNumber,
      isMobileVerified: true,
      kycStatus: KYCStatus.APPROVED,
      isActive: true,
      isAdmin: true,
    },
    create: {
      email,
      passwordHash: await PasswordService.hash(password),
      mobileNumber,
      isMobileVerified: true,
      firstName: 'Fintech',
      lastName: 'Demo',
      phoneNumber: mobileNumber,
      kycStatus: KYCStatus.APPROVED,
      isActive: true,
      isAdmin: true,
    },
  });
};

const run = async (): Promise<void> => {
  try {
    await seed();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

void run();
