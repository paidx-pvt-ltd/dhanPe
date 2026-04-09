import { prisma } from '../../db/prisma.js';
import { DisputeRepository } from '../dispute/dispute.repository.js';
import { DisputeService } from '../dispute/dispute.service.js';
import { LedgerRepository } from '../ledger/ledger.repository.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PaymentRepository } from '../payment/payment.repository.js';
import { PaymentService } from '../payment/payment.service.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { PayoutService } from '../payout/payout.service.js';
import { ReconciliationRepository } from '../reconciliation/reconciliation.repository.js';
import { ReconciliationService } from '../reconciliation/reconciliation.service.js';
import { RefundRepository } from '../refund/refund.repository.js';
import { RefundService } from '../refund/refund.service.js';
import { RiskRepository } from '../risk/risk.repository.js';
import { RiskService } from '../risk/risk.service.js';
import { TransactionRepository } from '../transaction/transaction.repository.js';
import { TransactionStateService } from '../transaction/transaction-state.service.js';
import { TransactionService } from '../transaction/transaction.service.js';
import { WebhookRepository } from '../webhook/webhook.repository.js';
import { WebhookService } from '../webhook/webhook.service.js';

const ledgerRepository = new LedgerRepository(prisma);
const ledgerService = new LedgerService(ledgerRepository, prisma);
const payoutRepository = new PayoutRepository(prisma);
const cashfreeClient = new CashfreeClient();
const paymentRepository = new PaymentRepository(prisma);
const riskRepository = new RiskRepository(prisma);
const riskService = new RiskService(riskRepository);
const transactionStateService = new TransactionStateService(prisma);
const payoutService = new PayoutService(
  payoutRepository,
  ledgerService,
  cashfreeClient,
  transactionStateService,
  prisma
);
const paymentService = new PaymentService(
  paymentRepository,
  riskService,
  transactionStateService,
  cashfreeClient,
  prisma
);
const disputeRepository = new DisputeRepository(prisma);
const disputeService = new DisputeService(disputeRepository, transactionStateService);
const refundRepository = new RefundRepository(prisma);
const refundService = new RefundService(
  refundRepository,
  payoutRepository,
  ledgerService,
  transactionStateService,
  cashfreeClient,
  prisma
);
const reconciliationRepository = new ReconciliationRepository(prisma);
const reconciliationService = new ReconciliationService(
  reconciliationRepository,
  payoutService,
  refundService,
  cashfreeClient,
  prisma
);
const webhookRepository = new WebhookRepository(prisma);
const webhookService = new WebhookService(
  webhookRepository,
  ledgerService,
  payoutRepository,
  transactionStateService,
  payoutService,
  refundService,
  prisma
);
const transactionRepository = new TransactionRepository(prisma);
const transactionService = new TransactionService(transactionRepository, payoutService);

export const fintechRuntime = {
  cashfreeClient,
  disputeRepository,
  disputeService,
  ledgerRepository,
  ledgerService,
  paymentRepository,
  paymentService,
  payoutRepository,
  payoutService,
  reconciliationRepository,
  reconciliationService,
  refundRepository,
  refundService,
  riskRepository,
  riskService,
  transactionRepository,
  transactionStateService,
  transactionService,
  webhookRepository,
  webhookService,
};
