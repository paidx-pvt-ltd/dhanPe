import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient();

prisma.$connect()
  .then(() => logger.info('Database connected'))
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
