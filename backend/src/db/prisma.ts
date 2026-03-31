import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

export const prisma = new PrismaClient();

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
