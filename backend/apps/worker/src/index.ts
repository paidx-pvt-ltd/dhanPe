import { Job } from 'bullmq';
import { ReconciliationScope } from '@prisma/client';
import { config, validateConfig } from '../../../packages/config/src/index.js';
import { logger } from '../../../packages/config/src/logger.js';
import { connectDatabase, disconnectDatabase } from '../../../packages/db/src/index.js';
import {
  createQueueEvents,
  createRedisConnection,
  createWorker,
  queueNames,
} from '../../../packages/queue/src/index.js';
import { createFintechRuntime, QueueDispatcher } from '../../../packages/runtime/src/index.js';
import {
  DeadLetterJob,
  PayoutJob,
  QueueName,
  ReconciliationJob,
  WebhookJob,
} from '../../../packages/types/src/index.js';
import { DiditService } from '../../../src/modules/didit/didit.service.js';
import {
  cashfreePayoutWebhookSchema,
  cashfreeWebhookSchema,
} from '../../../src/modules/webhook/webhook.schemas.js';

validateConfig();

const dispatcher = new QueueDispatcher();
const runtime = createFintechRuntime(dispatcher);

const logJobStart = (queue: QueueName, job: Job) => {
  logger.info(
    {
      jobId: job.id,
      jobName: job.name,
      queue,
      attemptsMade: job.attemptsMade,
    },
    'Job started'
  );
};

const logJobCompletion = (queue: QueueName, job: Job, startedAt: number) => {
  logger.info(
    {
      jobId: job.id,
      jobName: job.name,
      queue,
      attemptsMade: job.attemptsMade,
      durationMs: Date.now() - startedAt,
      status: 'completed',
    },
    'Job completed'
  );
};

const logJobFailure = (queue: QueueName, job: Job | undefined, error: Error) => {
  logger.error(
    {
      jobId: job?.id,
      jobName: job?.name,
      queue,
      attemptsMade: job?.attemptsMade,
      reason: error.message,
      status: 'failed',
    },
    'Job failed'
  );
};

const wrapProcessor =
  <T>(queue: QueueName, handler: (job: Job<T>) => Promise<void>) =>
  async (job: Job<T>) => {
    const startedAt = Date.now();
    logJobStart(queue, job);
    await handler(job);
    logJobCompletion(queue, job, startedAt);
  };

const processWebhookJob = async (job: Job<WebhookJob>): Promise<void> => {
  if (job.data.provider === 'cashfree') {
    await runtime.webhookService.processCashfreeWebhook(
      job.data.rawBody,
      cashfreeWebhookSchema.parse(job.data.payload)
    );
    return;
  }

  if (job.data.provider === 'cashfree-payout') {
    await runtime.webhookService.processCashfreePayoutWebhook(
      job.data.rawBody,
      cashfreePayoutWebhookSchema.parse(job.data.payload)
    );
    return;
  }

  const payload = job.data.payload as Parameters<DiditService['processWebhook']>[0];
  await runtime.diditService.processWebhook(payload);
};

const processReconciliationJob = async (job: Job<ReconciliationJob>): Promise<void> => {
  if (job.data.kind === 'run') {
    await runtime.reconciliationService.executeRun(
      job.data.runId,
      job.data.scope as ReconciliationScope | undefined,
      job.data.triggeredByUserId
    );
    return;
  }

  if (job.data.kind === 'scheduled-run') {
    await runtime.reconciliationService.run(undefined);
    return;
  }

  if (job.data.kind === 'payout-sync') {
    await runtime.payoutService.syncTransferStatus(job.data.transactionId);
    return;
  }

  if (job.data.kind === 'refund-sync') {
    await runtime.refundService.syncRefundStatus(job.data.refundId, job.data.userId);
    return;
  }

  const pending = await runtime.payoutService.listPendingTransactionIds();
  await Promise.all(
    pending.map((transactionId) =>
      dispatcher.enqueuePayout({
        transactionId,
        requestedBy: 'resume-pending',
      })
    )
  );
};

const moveToDlq = async (queue: QueueName, job: Job, error: Error) => {
  const attempts = job.attemptsMade;
  const maxAttempts =
    typeof job.opts.attempts === 'number' ? job.opts.attempts : config.queue.attempts;
  if (attempts < maxAttempts) {
    return;
  }

  const payload: DeadLetterJob = {
    sourceQueue: queue,
    sourceJobId: String(job.id),
    sourceJobName: job.name,
    payload: job.data,
    failedAt: new Date().toISOString(),
    attemptsMade: attempts,
    reason: error.message,
  };

  await dispatcher.moveToDlq(queue, payload);
  logger.error(
    {
      jobId: job.id,
      queue,
      attemptsMade: attempts,
      reason: error.message,
      status: 'dead-lettered',
    },
    'Moved job to dead letter queue'
  );
};

const start = async (): Promise<void> => {
  await connectDatabase();
  await dispatcher.initialize();

  const payoutWorkerConnection = createRedisConnection('worker-payout');
  const webhookWorkerConnection = createRedisConnection('worker-webhook');
  const reconciliationWorkerConnection = createRedisConnection('worker-reconciliation');
  const payoutEventsConnection = createRedisConnection('worker-payout-events');
  const webhookEventsConnection = createRedisConnection('worker-webhook-events');
  const reconciliationEventsConnection = createRedisConnection('worker-reconciliation-events');

  const payoutEvents = createQueueEvents(queueNames.payout, payoutEventsConnection);
  const webhookEvents = createQueueEvents(queueNames.webhook, webhookEventsConnection);
  const reconciliationEvents = createQueueEvents(
    queueNames.reconciliation,
    reconciliationEventsConnection
  );

  const payoutWorker = createWorker(
    queueNames.payout,
    payoutWorkerConnection,
    wrapProcessor(queueNames.payout, async (job: Job<PayoutJob>) => {
      await runtime.payoutService.processPayout(job.data.transactionId);
    })
  );

  const webhookWorker = createWorker(
    queueNames.webhook,
    webhookWorkerConnection,
    wrapProcessor(queueNames.webhook, processWebhookJob)
  );

  const reconciliationWorker = createWorker(
    queueNames.reconciliation,
    reconciliationWorkerConnection,
    wrapProcessor(queueNames.reconciliation, processReconciliationJob)
  );

  payoutWorker.on('failed', (job, error) => {
    if (!job) {
      return;
    }
    logJobFailure(queueNames.payout, job, error);
    void moveToDlq(queueNames.payout, job, error);
  });
  webhookWorker.on('failed', (job, error) => {
    if (!job) {
      return;
    }
    logJobFailure(queueNames.webhook, job, error);
    void moveToDlq(queueNames.webhook, job, error);
  });
  reconciliationWorker.on('failed', (job, error) => {
    if (!job) {
      return;
    }
    logJobFailure(queueNames.reconciliation, job, error);
    void moveToDlq(queueNames.reconciliation, job, error);
  });

  await dispatcher.enqueueReconciliation({ kind: 'resume-payouts' });
  logger.info('Worker service started');

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down worker');
    await Promise.all([
      payoutWorker.close(),
      webhookWorker.close(),
      reconciliationWorker.close(),
      payoutEvents.close(),
      webhookEvents.close(),
      reconciliationEvents.close(),
      payoutWorkerConnection.quit(),
      webhookWorkerConnection.quit(),
      reconciliationWorkerConnection.quit(),
      payoutEventsConnection.quit(),
      webhookEventsConnection.quit(),
      reconciliationEventsConnection.quit(),
      dispatcher.close(),
      disconnectDatabase(),
    ]);
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
