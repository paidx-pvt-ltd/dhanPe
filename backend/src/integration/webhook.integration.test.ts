import express from 'express';
import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ServiceUnavailableError, ValidationError } from '../shared/errors.js';
import { WebhookController } from '../modules/webhook/webhook.controller.js';
import { asHandler } from '../shared/http.js';
import { config } from '../config/index.js';

const createTestApp = (webhookService: any, enqueueWebhookJob: any) => {
  const controller = new WebhookController(webhookService, enqueueWebhookJob);
  const app = express();
  const rawParser = express.raw({
    type: 'application/json',
    verify: (req, _res, buffer) => {
      (req as express.Request).rawBody = buffer.toString('utf8');
    },
  });

  app.post('/api/webhook/cashfree', rawParser, asHandler(controller.cashfree));
  app.post('/api/webhook/cashfree/payout', rawParser, asHandler(controller.cashfreePayout));

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const maybeErr = err as { type?: string } | undefined;
    if (maybeErr?.type === 'entity.parse.failed') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Malformed JSON body',
        },
      });
      return;
    }
    next(err as any);
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  });

  return app;
};

describe('Webhook route integration', () => {
  let app: express.Express;
  let enqueueWebhookJob: ReturnType<typeof vi.fn>;
  let webhookService: { verifySignature: ReturnType<typeof vi.fn>; verifyPayoutSignature: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    enqueueWebhookJob = vi.fn(async () => {});
    webhookService = {
      verifySignature: vi.fn(() => undefined),
      verifyPayoutSignature: vi.fn(() => undefined),
    };
    app = createTestApp(webhookService, enqueueWebhookJob);
  });

  it('accepts a valid cashfree webhook and enqueues a webhook job', async () => {
    const payload = {
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    };

    const response = await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(enqueueWebhookJob).toHaveBeenCalledTimes(1);
    expect(enqueueWebhookJob).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'pay_1',
        provider: 'cashfree',
        payload: expect.objectContaining({
          order_id: 'order_1',
          payment_status: 'SUCCESS',
          cf_payment_id: 'pay_1',
        }),
      })
    );
  });

  it('rejects cashfree webhooks with invalid signatures', async () => {
    webhookService.verifySignature.mockImplementation(() => {
      throw new ValidationError('Invalid webhook signature');
    });

    const payload = {
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    };

    const response = await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'invalid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(enqueueWebhookJob).not.toHaveBeenCalled();
  });

  it('returns service unavailable when webhook signature verification fails externally', async () => {
    webhookService.verifySignature.mockImplementation(() => {
      throw new ServiceUnavailableError('Webhook provider unavailable');
    });

    const payload = {
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    };

    const response = await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(enqueueWebhookJob).not.toHaveBeenCalled();
  });

  it('returns malformed JSON for invalid webhook payloads', async () => {
    const response = await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send('{invalid-json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(enqueueWebhookJob).not.toHaveBeenCalled();
  });

  it('returns malformed JSON for invalid payout webhook payloads', async () => {
    const response = await supertest(app)
      .post('/api/webhook/cashfree/payout')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send('{invalid-json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(enqueueWebhookJob).not.toHaveBeenCalled();
  });

  it('preserves stable event IDs for repeated cashfree webhook payloads', async () => {
    const payload = {
      order_id: 'order_1',
      order_amount: 5000,
      payment_status: 'SUCCESS',
      cf_payment_id: 'pay_1',
    };

    await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);
    await supertest(app)
      .post('/api/webhook/cashfree')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);

    expect(enqueueWebhookJob).toHaveBeenCalledTimes(2);
    expect(enqueueWebhookJob.mock.calls[0][0].eventId).toBe('pay_1');
    expect(enqueueWebhookJob.mock.calls[1][0].eventId).toBe('pay_1');
  });

  it('accepts a payout webhook and computes a stable payout event ID', async () => {
    const payload = {
      type: 'TRANSFER_SUCCESS',
      event_time: '2024-07-25T17:43:37',
      data: {
        transfer_id: 'txn_1',
        cf_transfer_id: 'cf_transfer_1',
        status: 'SUCCESS',
        status_code: 'COMPLETED',
        status_description: 'Transfer completed successfully',
      },
    };

    const response = await supertest(app)
      .post('/api/webhook/cashfree/payout')
      .set(config.cashfree.webhookSignatureHeader, 'valid-signature')
      .set(config.cashfree.webhookTimestampHeader, '1234567890')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(enqueueWebhookJob).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'TRANSFER_SUCCESS:txn_1:cf_transfer_1:2024-07-25T17:43:37',
        provider: 'cashfree-payout',
      })
    );
  });
});
