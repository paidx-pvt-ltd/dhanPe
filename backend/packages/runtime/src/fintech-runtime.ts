import { prisma } from '../../db/src/index.js';
import { QueueDispatcher } from './queue-dispatcher.js';
import { BeneficiaryValidationService } from '../../../src/modules/compliance/beneficiary-validation.service.js';
import { DisputeRepository } from '../../../src/modules/dispute/dispute.repository.js';
import { DisputeService } from '../../../src/modules/dispute/dispute.service.js';
import { LedgerRepository } from '../../../src/modules/ledger/ledger.repository.js';
import { LedgerService } from '../../../src/modules/ledger/ledger.service.js';
import { CashfreeClient } from '../../../src/modules/payment/cashfree.client.js';
import { PaymentRepository } from '../../../src/modules/payment/payment.repository.js';
import { PaymentService } from '../../../src/modules/payment/payment.service.js';
import { PayoutRepository } from '../../../src/modules/payout/payout.repository.js';
import { PayoutService } from '../../../src/modules/payout/payout.service.js';
import { ReconciliationRepository } from '../../../src/modules/reconciliation/reconciliation.repository.js';
import { ReconciliationService } from '../../../src/modules/reconciliation/reconciliation.service.js';
import { RefundRepository } from '../../../src/modules/refund/refund.repository.js';
import { RefundService } from '../../../src/modules/refund/refund.service.js';
import { RiskRepository } from '../../../src/modules/risk/risk.repository.js';
import { RiskService } from '../../../src/modules/risk/risk.service.js';
import { TransactionRepository } from '../../../src/modules/transaction/transaction.repository.js';
import { TransactionStateService } from '../../../src/modules/transaction/transaction-state.service.js';
import { TransactionService } from '../../../src/modules/transaction/transaction.service.js';
import { WebhookRepository } from '../../../src/modules/webhook/webhook.repository.js';
import { WebhookService } from '../../../src/modules/webhook/webhook.service.js';
import { DiditClient } from '../../../src/modules/didit/didit.client.js';
import { DiditRepository } from '../../../src/modules/didit/didit.repository.js';
import { DiditService } from '../../../src/modules/didit/didit.service.js';

export const createFintechRuntime = (dispatcher: QueueDispatcher) => {
  const ledgerRepository = new LedgerRepository(prisma);
  const ledgerService = new LedgerService(ledgerRepository, prisma);
  const payoutRepository = new PayoutRepository(prisma);
  const cashfreeClient = new CashfreeClient();
  const diditClient = new DiditClient();
  const beneficiaryValidationService = new BeneficiaryValidationService(cashfreeClient);
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
    beneficiaryValidationService,
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
    prisma,
    (job) => dispatcher.enqueuePayout(job)
  );
  const transactionRepository = new TransactionRepository(prisma);
  const transactionService = new TransactionService(transactionRepository, async (transactionId) =>
    dispatcher.enqueueReconciliation({
      kind: 'payout-sync',
      transactionId,
    })
  );
  const diditRepository = new DiditRepository(prisma);
  const diditService = new DiditService(diditRepository, diditClient, prisma);

  return {
    cashfreeClient,
    diditClient,
    diditRepository,
    diditService,
    beneficiaryValidationService,
    disputeRepository,
    disputeService,
    dispatcher,
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
};

export type FintechRuntime = ReturnType<typeof createFintechRuntime>;
