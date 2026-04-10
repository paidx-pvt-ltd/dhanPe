import { JobsOptions, Processor, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config/src/index.js';
import {
  DeadLetterJob,
  PayoutJob,
  QUEUE_NAMES,
  QueueName,
  ReconciliationJob,
  WebhookJob,
} from '../../types/src/index.js';

type QueuePayloadMap = {
  [QUEUE_NAMES.payout]: PayoutJob;
  [QUEUE_NAMES.webhook]: WebhookJob;
  [QUEUE_NAMES.reconciliation]: ReconciliationJob;
};

const defaultJobOptions: JobsOptions = {
  attempts: config.queue.attempts,
  backoff: {
    type: 'exponential',
    delay: config.queue.backoffDelayMs,
  },
  removeOnComplete: 1000,
  removeOnFail: 1000,
};

const redisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const queueLimiters = {
  [QUEUE_NAMES.payout]: config.queue.payoutLimiter,
  [QUEUE_NAMES.webhook]: config.queue.webhookLimiter,
  [QUEUE_NAMES.reconciliation]: config.queue.reconciliationLimiter,
} as const;

const queueConcurrency = {
  [QUEUE_NAMES.payout]: config.queue.payoutConcurrency,
  [QUEUE_NAMES.webhook]: config.queue.webhookConcurrency,
  [QUEUE_NAMES.reconciliation]: config.queue.reconciliationConcurrency,
} as const;

export const DLQ_SUFFIX = 'dlq';
export const getDlqName = (queueName: QueueName): string => `${queueName}-${DLQ_SUFFIX}`;

export const createRedisConnection = (connectionName: string): IORedis =>
  new IORedis(config.redis.url, {
    ...redisOptions,
    connectionName,
  });

export const createQueue = <TQueueName extends QueueName>(
  queueName: TQueueName,
  connection: IORedis
): Queue<QueuePayloadMap[TQueueName]> =>
  new Queue<QueuePayloadMap[TQueueName]>(queueName, {
    connection,
    prefix: config.queue.prefix,
    defaultJobOptions,
  });

export const createDlq = (queueName: QueueName, connection: IORedis): Queue<DeadLetterJob> =>
  new Queue<DeadLetterJob>(getDlqName(queueName), {
    connection,
    prefix: config.queue.prefix,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });

export const createQueueEvents = (queueName: QueueName, connection: IORedis): QueueEvents =>
  new QueueEvents(queueName, {
    connection,
    prefix: config.queue.prefix,
  });

export const createWorker = <TQueueName extends QueueName>(
  queueName: TQueueName,
  connection: IORedis,
  processor: Processor<QueuePayloadMap[TQueueName]>
): Worker<QueuePayloadMap[TQueueName]> =>
  new Worker<QueuePayloadMap[TQueueName]>(queueName, processor, {
    connection,
    prefix: config.queue.prefix,
    concurrency: queueConcurrency[queueName],
    limiter: queueLimiters[queueName],
  });

export const ensureGlobalRateLimit = async <TQueueName extends QueueName>(
  queueName: TQueueName,
  queue: Queue<QueuePayloadMap[TQueueName]>
): Promise<void> => {
  const limiter = queueLimiters[queueName];
  await queue.setGlobalRateLimit(limiter.max, limiter.duration);
};

export const queueNames = QUEUE_NAMES;
