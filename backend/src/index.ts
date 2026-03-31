import app from './app.js';
import { validateConfig, config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './db/prisma.js';
import { logger } from './config/logger.js';

validateConfig();

const start = async (): Promise<void> => {
  await connectDatabase();

  const server = app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, 'Server started');
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

void start();
