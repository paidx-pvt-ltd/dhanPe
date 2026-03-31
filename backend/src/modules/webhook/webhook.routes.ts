import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { LedgerRepository } from '../ledger/ledger.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { PayoutService } from '../payout/payout.service.js';
import { WebhookRepository } from './webhook.repository.js';
import { WebhookService } from './webhook.service.js';
import { WebhookController } from './webhook.controller.js';
import { asHandler } from '../../shared/http.js';

const ledgerRepository = new LedgerRepository(prisma);
const ledgerService = new LedgerService(ledgerRepository, prisma);
const payoutRepository = new PayoutRepository(prisma);
const cashfreeClient = new CashfreeClient();
const payoutService = new PayoutService(payoutRepository, ledgerService, cashfreeClient, prisma);
const webhookRepository = new WebhookRepository(prisma);
const webhookService = new WebhookService(
  webhookRepository,
  ledgerService,
  payoutRepository,
  payoutService,
  prisma
);
const webhookController = new WebhookController(webhookService);

export const webhookRoutes = Router();

webhookRoutes.post('/', asHandler(webhookController.cashfree));
