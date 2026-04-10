import { Request, Response } from 'express';
import { WebhookService } from './webhook.service.js';
import { cashfreePayoutWebhookSchema, cashfreeWebhookSchema } from './webhook.schemas.js';
import { config } from '../../config/index.js';
import { WebhookJob } from '../../../packages/types/src/index.js';

export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly enqueueWebhookJob: (job: WebhookJob) => Promise<void>
  ) {}

  cashfree = async (req: Request, res: Response): Promise<void> => {
    const rawBody = req.rawBody ?? '{}';
    const signature =
      req.header(config.cashfree.webhookSignatureHeader) ??
      req.header('x-cashfree-signature') ??
      undefined;
    const timestamp = req.header(config.cashfree.webhookTimestampHeader) ?? undefined;

    this.webhookService.verifySignature(rawBody, signature, timestamp);
    const payload = cashfreeWebhookSchema.parse(JSON.parse(rawBody));
    const eventId = payload.refund_id
      ? `refund:${payload.refund_id}:${payload.refund_status ?? 'unknown'}`
      : payload.cf_payment_id ??
        `${payload.order_id}:${payload.payment_status ?? payload.order_status ?? 'unknown'}`;

    await this.enqueueWebhookJob({
      eventId,
      provider: 'cashfree',
      rawBody,
      payload,
    });

    res.json({ success: true });
  };

  cashfreePayout = async (req: Request, res: Response): Promise<void> => {
    const rawBody = req.rawBody ?? '{}';
    const signature =
      req.header(config.cashfree.webhookSignatureHeader) ??
      req.header('x-webhook-signature') ??
      undefined;
    const timestamp =
      req.header(config.cashfree.webhookTimestampHeader) ??
      req.header('x-webhook-timestamp') ??
      undefined;

    this.webhookService.verifyPayoutSignature(rawBody, signature, timestamp);
    const payload = cashfreePayoutWebhookSchema.parse(JSON.parse(rawBody));
    const eventId = `${payload.type}:${payload.data.transfer_id}:${payload.data.cf_transfer_id ?? 'na'}:${payload.event_time ?? 'na'}`;

    await this.enqueueWebhookJob({
      eventId,
      provider: 'cashfree-payout',
      rawBody,
      payload,
    });

    res.json({ success: true });
  };
}
