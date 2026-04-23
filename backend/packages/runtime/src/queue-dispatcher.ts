import { Queue } from 'bullmq';
import { logger } from '../../config/src/logger.js';
import {
  createDlq,
  createQueue,
  createRedisConnection,
  ensureGlobalRateLimit,
  queueNames,
} from '../../queue/src/index.js';
import { DeadLetterJob, PayoutJob, ReconciliationJob, WebhookJob } from '../../types/src/index.js';

export class QueueDispatcher {
  private readonly producerConnection = createRedisConnection('queue-producer');
  private readonly payoutQueue = createQueue(queueNames.payout, this.producerConnection);
  private readonly webhookQueue = createQueue(queueNames.webhook, this.producerConnection);
  private readonly reconciliationQueue = createQueue(
    queueNames.reconciliation,
    this.producerConnection
  );
  private readonly payoutDlq = createDlq(queueNames.payout, this.producerConnection);
  private readonly webhookDlq = createDlq(queueNames.webhook, this.producerConnection);
  private readonly reconciliationDlq = createDlq(
    queueNames.reconciliation,
    this.producerConnection
  );

  async initialize(): Promise<void> {
    await Promise.all([
      ensureGlobalRateLimit(queueNames.payout, this.payoutQueue),
      ensureGlobalRateLimit(queueNames.webhook, this.webhookQueue),
      ensureGlobalRateLimit(queueNames.reconciliation, this.reconciliationQueue),
    ]);
  }

  async close(): Promise<void> {
    await Promise.all([
      this.payoutQueue.close(),
      this.webhookQueue.close(),
      this.reconciliationQueue.close(),
      this.payoutDlq.close(),
      this.webhookDlq.close(),
      this.reconciliationDlq.close(),
      this.producerConnection.quit(),
    ]);
  }

  async enqueuePayout(job: PayoutJob): Promise<void> {
    await this.payoutQueue.add('payout.process', job, {
      jobId: job.transactionId,
    });
    logger.info({ jobId: job.transactionId, queue: queueNames.payout }, 'Enqueued payout job');
  }

  async enqueueWebhook(job: WebhookJob): Promise<void> {
    await this.webhookQueue.add(`webhook.${job.provider}`, job, {
      jobId: job.eventId,
    });
    logger.info({ jobId: job.eventId, queue: queueNames.webhook }, 'Enqueued webhook job');
  }

  async enqueueReconciliation(job: ReconciliationJob): Promise<void> {
    const jobId =
      job.kind === 'run'
        ? job.runId
        : job.kind === 'payout-sync'
          ? job.transactionId
          : job.kind === 'refund-sync'
            ? job.refundId
            : job.kind;

    await this.reconciliationQueue.add(`reconciliation.${job.kind}`, job, {
      jobId,
    });
    logger.info({ jobId, queue: queueNames.reconciliation }, 'Enqueued reconciliation job');
  }

  async moveToDlq(
    queueName: 'payout' | 'webhook' | 'reconciliation',
    job: DeadLetterJob
  ): Promise<void> {
    const queueMap: Record<typeof queueName, Queue<DeadLetterJob>> = {
      payout: this.payoutDlq,
      webhook: this.webhookDlq,
      reconciliation: this.reconciliationDlq,
    };

    await queueMap[queueName].add(`${queueName}.failed`, job, {
      jobId: `${job.sourceJobId}:${job.failedAt}`,
    });
  }
}
