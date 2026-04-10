import { config, validateConfig } from '../../../packages/config/src/index.js';
import { logger } from '../../../packages/config/src/logger.js';
import { createQueue, createRedisConnection, queueNames } from '../../../packages/queue/src/index.js';
import { ReconciliationJob } from '../../../packages/types/src/index.js';

validateConfig();

const connection = createRedisConnection('reconciliation-scheduler');
const reconciliationQueue = createQueue(queueNames.reconciliation, connection);

const start = async (): Promise<void> => {
  if (config.reconciliation.enabled) {
    await reconciliationQueue.upsertJobScheduler(
      'scheduled-reconciliation',
      { every: config.reconciliation.intervalMs },
      {
        name: 'reconciliation.scheduled-run',
        data: { kind: 'scheduled-run' } as ReconciliationJob,
      }
    );
    logger.info(
      { everyMs: config.reconciliation.intervalMs },
      'Registered reconciliation job scheduler'
    );
  } else {
    logger.info('Reconciliation scheduler disabled by configuration');
  }

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down scheduler');
    await Promise.all([reconciliationQueue.close(), connection.quit()]);
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
};

void start();
