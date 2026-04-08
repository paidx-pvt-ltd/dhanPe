import { Router } from 'express';
import { WebhookController } from './webhook.controller.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';

const webhookController = new WebhookController(fintechRuntime.webhookService);

export const webhookRoutes = Router();

webhookRoutes.post('/', asHandler(webhookController.cashfree));
