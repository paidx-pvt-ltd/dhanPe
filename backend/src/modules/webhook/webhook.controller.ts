import { Request, Response } from 'express';
import { WebhookService } from './webhook.service.js';
import { cashfreePayoutWebhookSchema, cashfreeWebhookSchema } from './webhook.schemas.js';
import { config } from '../../config/index.js';

export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  cashfree = async (req: Request, res: Response): Promise<void> => {
    const rawBody = req.rawBody ?? '{}';
    const signature =
      req.header(config.cashfree.webhookSignatureHeader) ??
      req.header('x-cashfree-signature') ??
      undefined;
    const timestamp = req.header(config.cashfree.webhookTimestampHeader) ?? undefined;

    this.webhookService.verifySignature(rawBody, signature, timestamp);
    const payload = cashfreeWebhookSchema.parse(JSON.parse(rawBody));
    await this.webhookService.processCashfreeWebhook(rawBody, payload);

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
    await this.webhookService.processCashfreePayoutWebhook(rawBody, payload);

    res.json({ success: true });
  };
}
