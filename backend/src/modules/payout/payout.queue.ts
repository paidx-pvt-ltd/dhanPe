import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../../config/index.js';

export const PAYOUT_QUEUE_NAME = 'payout-transfers';
export const PAYOUT_JOB_NAME = 'submit-transfer';

export interface PayoutJobPayload {
  transactionId: string;
}

export const createRedisConnection = (): IORedis =>
  new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

export const createPayoutQueue = (connection: IORedis): Queue<PayoutJobPayload> =>
  new Queue<PayoutJobPayload>(PAYOUT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 8,
      backoff: {
        type: 'exponential',
        delay: 30_000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });

export const createPayoutQueueEvents = (connection: IORedis): QueueEvents =>
  new QueueEvents(PAYOUT_QUEUE_NAME, {
    connection,
  });

export const createPayoutWorker = (
  connection: IORedis,
  handler: (job: Job<PayoutJobPayload>) => Promise<void>
): Worker<PayoutJobPayload> =>
  new Worker<PayoutJobPayload>(PAYOUT_QUEUE_NAME, handler, {
    connection,
    concurrency: config.queue.concurrency,
  });
