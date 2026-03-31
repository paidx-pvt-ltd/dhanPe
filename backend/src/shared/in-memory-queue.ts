import { logger } from '../config/logger.js';

type QueueHandler<T> = (job: T) => Promise<void>;

export class InMemoryQueue<T> {
  private readonly jobs: T[] = [];
  private running = 0;

  constructor(
    private readonly handler: QueueHandler<T>,
    private readonly concurrency: number
  ) {}

  async enqueue(job: T): Promise<void> {
    this.jobs.push(job);
    void this.drain();
  }

  private async drain(): Promise<void> {
    while (this.running < this.concurrency && this.jobs.length > 0) {
      const nextJob = this.jobs.shift();
      if (!nextJob) {
        return;
      }

      this.running += 1;
      void this.handler(nextJob)
        .catch((error: unknown) => {
          logger.error({ error }, 'Queue job failed');
        })
        .finally(() => {
          this.running -= 1;
          void this.drain();
        });
    }
  }
}
