import app from './app.js';
import { validateConfig, config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './db/prisma.js';
import { logger } from './config/logger.js';
import { fintechRuntime } from './modules/fintech/fintech.runtime.js';

validateConfig();

const start = async (): Promise<void> => {
  await connectDatabase();
  fintechRuntime.payoutService.startWorker();

  const server = app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, 'Server started');
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down');
    fintechRuntime.payoutService.stopWorker();
    server.close(() => {
      void disconnectDatabase().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
};

void start();
