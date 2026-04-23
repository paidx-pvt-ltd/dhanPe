import app from './app.js';
import { config, validateConfig } from '../../../packages/config/src/index.js';
import { logger } from '../../../packages/config/src/logger.js';
import { connectDatabase, disconnectDatabase } from '../../../packages/db/src/index.js';
import { fintechRuntime } from '../../../src/modules/fintech/fintech.runtime.js';

validateConfig();

const start = async (): Promise<void> => {
  await connectDatabase();
  await fintechRuntime.dispatcher.initialize();

  const server = app.listen(config.server.port, () => {
    logger.info({ port: config.server.port }, 'API server started');
  });

  let resourcesClosed = false;
  const closeResources = async (): Promise<void> => {
    if (resourcesClosed) {
      return;
    }
    resourcesClosed = true;
    await Promise.allSettled([fintechRuntime.dispatcher.close(), disconnectDatabase()]);
  };

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down API server and cleaning up resources');

    // Set a timeout for a forced exit
    const forceExitTimeout = setTimeout(() => {
      logger.error('Shutdown timed out, forcing exit');
      process.exit(1);
    }, 15000);

    server.close(() => {
      void (async () => {
        try {
          logger.info('HTTP server closed, closing database and queues');
          await closeResources();
          logger.info('Graceful shutdown complete');
          clearTimeout(forceExitTimeout);
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during graceful shutdown');
          process.exit(1);
        }
      })();
    });

    // If server.close is hanging, start closing other resources anyway
    await closeResources();
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

void start();
