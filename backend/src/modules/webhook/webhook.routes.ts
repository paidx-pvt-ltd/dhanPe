import { Router } from 'express';
import { WebhookController } from './webhook.controller.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';

const webhookController = new WebhookController(fintechRuntime.webhookService, (job) =>
  fintechRuntime.dispatcher.enqueueWebhook(job)
);

export const webhookRoutes = Router();

webhookRoutes.post('/', asHandler(webhookController.cashfree));
webhookRoutes.post('/payout', asHandler(webhookController.cashfreePayout));
