import { prisma } from '../../db/prisma.js';
import { LedgerRepository } from '../ledger/ledger.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PaymentRepository } from '../payment/payment.repository.js';
import { PaymentService } from '../payment/payment.service.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { PayoutService } from '../payout/payout.service.js';
import { RiskRepository } from '../risk/risk.repository.js';
import { RiskService } from '../risk/risk.service.js';
import { TransactionRepository } from '../transaction/transaction.repository.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { WebhookRepository } from '../webhook/webhook.repository.js';
import { WebhookService } from '../webhook/webhook.service.js';

const ledgerRepository = new LedgerRepository(prisma);
const ledgerService = new LedgerService(ledgerRepository, prisma);
const payoutRepository = new PayoutRepository(prisma);
const cashfreeClient = new CashfreeClient();
const payoutService = new PayoutService(payoutRepository, ledgerService, cashfreeClient, prisma);
const paymentRepository = new PaymentRepository(prisma);
const riskRepository = new RiskRepository(prisma);
const riskService = new RiskService(riskRepository);
const paymentService = new PaymentService(paymentRepository, riskService, cashfreeClient, prisma);
const webhookRepository = new WebhookRepository(prisma);
const webhookService = new WebhookService(
  webhookRepository,
  ledgerService,
  payoutRepository,
  payoutService,
  prisma
);
const transactionRepository = new TransactionRepository(prisma);
const transactionService = new TransactionService(transactionRepository, payoutService);

export const fintechRuntime = {
  cashfreeClient,
  ledgerRepository,
  ledgerService,
  paymentRepository,
  paymentService,
  payoutRepository,
  payoutService,
  riskRepository,
  riskService,
  transactionRepository,
  transactionService,
  webhookRepository,
  webhookService,
};
