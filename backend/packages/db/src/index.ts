import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/src/logger.js';

const globalForPrisma = globalThis as typeof globalThis & {
  __dhanpePrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__dhanpePrisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__dhanpePrisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
