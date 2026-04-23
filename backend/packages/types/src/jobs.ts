export const QUEUE_NAMES = {
  payout: 'payout',
  webhook: 'webhook',
  reconciliation: 'reconciliation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type PayoutJob = {
  transactionId: string;
  requestedBy?: 'cashfree-webhook' | 'manual-sync' | 'resume-pending';
};

export type CashfreeWebhookJob = {
  eventId: string;
  provider: 'cashfree';
  rawBody: string;
  payload: unknown;
};

export type CashfreePayoutWebhookJob = {
  eventId: string;
  provider: 'cashfree-payout';
  rawBody: string;
  payload: unknown;
};

export type DiditWebhookJob = {
  eventId: string;
  provider: 'didit';
  payload: unknown;
};

export type WebhookJob = CashfreeWebhookJob | CashfreePayoutWebhookJob | DiditWebhookJob;

export type ReconciliationRunJob = {
  runId: string;
  kind: 'run';
  scope?: 'PAYMENT' | 'PAYOUT' | 'REFUND';
  triggeredByUserId?: string;
};

export type PayoutSyncJob = {
  transactionId: string;
  kind: 'payout-sync';
};

export type RefundSyncJob = {
  refundId: string;
  kind: 'refund-sync';
  userId: string;
};

export type ResumePayoutsJob = {
  kind: 'resume-payouts';
};

export type ScheduledReconciliationJob = {
  kind: 'scheduled-run';
};

export type ReconciliationJob =
  | ReconciliationRunJob
  | PayoutSyncJob
  | RefundSyncJob
  | ResumePayoutsJob
  | ScheduledReconciliationJob;

export type DeadLetterJob = {
  sourceQueue: QueueName;
  sourceJobId: string;
  sourceJobName: string;
  payload: unknown;
  failedAt: string;
  attemptsMade: number;
  reason: string;
};
