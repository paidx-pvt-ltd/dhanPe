import {
  Prisma,
  PrismaClient,
  ReconciliationItemStatus,
  ReconciliationRunStatus,
  ReconciliationScope,
  ReconciliationSeverity,
} from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PayoutService } from '../payout/payout.service.js';
import { RefundService } from '../refund/refund.service.js';
import { ReconciliationRepository } from './reconciliation.repository.js';

export class ReconciliationService {
  constructor(
    private readonly reconciliationRepository: ReconciliationRepository,
    private readonly payoutService: PayoutService,
    private readonly refundService: RefundService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {}

  async createRunRequest(scope: ReconciliationScope | undefined, triggeredByUserId?: string) {
    const scopes = scope
      ? [scope]
      : [ReconciliationScope.PAYMENT, ReconciliationScope.PAYOUT, ReconciliationScope.REFUND];
    const run = await this.db.$transaction((tx) =>
      this.reconciliationRepository.createRun(tx, {
        scope: scope ?? ReconciliationScope.PAYMENT,
        triggeredByUserId,
        status: ReconciliationRunStatus.RUNNING,
        summary: {
          scopes,
          queuedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      })
    );

    return {
      id: run.id,
      scope: run.scope,
      status: run.status,
      mismatchCount: run.mismatchCount,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      summary: run.summary,
      items: [],
    };
  }

  async run(scope: ReconciliationScope | undefined, triggeredByUserId?: string) {
    const run = await this.createRunRequest(scope, triggeredByUserId);
    return this.executeRun(run.id, scope, triggeredByUserId);
  }

  async executeRun(
    runId: string,
    scope: ReconciliationScope | undefined,
    triggeredByUserId?: string
  ) {
    const scopes = scope
      ? [scope]
      : [ReconciliationScope.PAYMENT, ReconciliationScope.PAYOUT, ReconciliationScope.REFUND];

    const findings: Array<{
      scope: ReconciliationScope;
      severity: ReconciliationSeverity;
      code: string;
      message: string;
      entityId: string;
      transactionId?: string;
      expectedState: Prisma.InputJsonValue;
      actualState?: Prisma.InputJsonValue;
    }> = [];

    try {
      await this.db.$transaction((tx) =>
        this.reconciliationRepository.updateRun(tx, runId, {
          scope: scope ?? ReconciliationScope.PAYMENT,
          triggeredByUserId,
          status: ReconciliationRunStatus.RUNNING,
          summary: {
            scopes,
            startedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        })
      );

      for (const currentScope of scopes) {
        if (currentScope === ReconciliationScope.PAYMENT) {
          findings.push(...(await this.reconcilePayments()));
        } else if (currentScope === ReconciliationScope.PAYOUT) {
          findings.push(...(await this.reconcilePayouts()));
        } else if (currentScope === ReconciliationScope.REFUND) {
          findings.push(...(await this.reconcileRefunds()));
        }
      }

      await this.db.$transaction(async (tx) => {
        for (const finding of findings) {
          await this.reconciliationRepository.createItem(tx, {
            runId,
            transactionId: finding.transactionId,
            scope: finding.scope,
            severity: finding.severity,
            status: ReconciliationItemStatus.OPEN,
            code: finding.code,
            message: finding.message,
            entityId: finding.entityId,
            expectedState: finding.expectedState,
            actualState: finding.actualState,
          });
        }

        await this.reconciliationRepository.updateRun(tx, runId, {
          status: ReconciliationRunStatus.COMPLETED,
          mismatchCount: findings.length,
          completedAt: new Date(),
          summary: {
            scopes,
            mismatchCount: findings.length,
          } as Prisma.InputJsonValue,
        });
      });
    } catch (error) {
      await this.db.$transaction((tx) =>
        this.reconciliationRepository.updateRun(tx, runId, {
          status: ReconciliationRunStatus.FAILED,
          completedAt: new Date(),
          summary: {
            scopes,
            error: error instanceof Error ? error.message : 'Unknown reconciliation error',
          } as Prisma.InputJsonValue,
        })
      );
      throw error;
    }

    return this.getRun(runId);
  }

  async getRun(runId: string) {
    const run = await this.reconciliationRepository.findRun(runId);
    if (!run) {
      throw new NotFoundError('Reconciliation run');
    }

    return {
      id: run.id,
      scope: run.scope,
      status: run.status,
      mismatchCount: run.mismatchCount,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      summary: run.summary,
      items: run.items.map((item) => ({
        id: item.id,
        scope: item.scope,
        severity: item.severity,
        status: item.status,
        code: item.code,
        message: item.message,
        entityId: item.entityId,
        transactionId: item.transactionId,
        expectedState: item.expectedState,
        actualState: item.actualState,
        createdAt: item.createdAt,
      })),
    };
  }

  async listItems(filters: {
    status?: 'OPEN' | 'RESOLVED';
    scope?: 'PAYMENT' | 'PAYOUT' | 'REFUND';
  }) {
    const items = await this.reconciliationRepository.listItems(filters);
    return items.map((item) => ({
      id: item.id,
      scope: item.scope,
      severity: item.severity,
      status: item.status,
      code: item.code,
      message: item.message,
      entityId: item.entityId,
      resolutionNote: item.resolutionNote,
      resolvedByUserId: item.resolvedByUserId,
      resolvedAt: item.resolvedAt,
      createdAt: item.createdAt,
      run: {
        id: item.run.id,
        status: item.run.status,
        startedAt: item.run.startedAt,
      },
      transaction: item.transaction,
    }));
  }

  async resolveItem(itemId: string, userId: string, resolutionNote: string) {
    const item = await this.reconciliationRepository.findItem(itemId);
    if (!item) {
      throw new NotFoundError('Reconciliation item');
    }

    if (item.status === ReconciliationItemStatus.RESOLVED) {
      throw new ConflictError('Reconciliation item is already resolved');
    }

    const updated = await this.db.$transaction((tx) =>
      this.reconciliationRepository.updateItem(tx, itemId, {
        status: ReconciliationItemStatus.RESOLVED,
        resolutionNote,
        resolvedByUserId: userId,
        resolvedAt: new Date(),
      })
    );

    return {
      id: updated.id,
      status: updated.status,
      resolutionNote: updated.resolutionNote,
      resolvedByUserId: updated.resolvedByUserId,
      resolvedAt: updated.resolvedAt,
    };
  }

  private async reconcilePayments() {
    const findings: Array<{
      scope: ReconciliationScope;
      severity: ReconciliationSeverity;
      code: string;
      message: string;
      entityId: string;
      transactionId?: string;
      expectedState: Prisma.InputJsonValue;
      actualState?: Prisma.InputJsonValue;
    }> = [];
    const transactions = await this.reconciliationRepository.findPaymentCandidates();

    for (const transaction of transactions) {
      const successfulRefund = transaction.refunds.find((refund) => refund.status === 'SUCCESS');
      if (!transaction.payout && !successfulRefund) {
        findings.push({
          scope: ReconciliationScope.PAYMENT,
          severity: ReconciliationSeverity.HIGH,
          code: 'PAID_TRANSACTION_MISSING_DOWNSTREAM_ACTION',
          message: 'Paid transaction has neither a payout record nor a successful refund',
          entityId: transaction.id,
          transactionId: transaction.id,
          expectedState: {
            payoutOrRefundRequired: true,
            transactionStatus: transaction.status,
          } as Prisma.InputJsonValue,
          actualState: {
            payoutId: null,
            refunds: transaction.refunds.map((refund) => ({
              refundId: refund.refundId,
              status: refund.status,
            })),
          } as Prisma.InputJsonValue,
        });
      }
    }

    return findings;
  }

  private async reconcilePayouts() {
    const findings: Array<{
      scope: ReconciliationScope;
      severity: ReconciliationSeverity;
      code: string;
      message: string;
      entityId: string;
      transactionId?: string;
      expectedState: Prisma.InputJsonValue;
      actualState?: Prisma.InputJsonValue;
    }> = [];
    const payouts = await this.reconciliationRepository.findPayoutCandidates();

    for (const payout of payouts) {
      const blockingRefund = payout.transaction.refunds.find((refund) =>
        ['PENDING', 'PROCESSING', 'SUCCESS'].includes(refund.status)
      );

      if (blockingRefund) {
        findings.push({
          scope: ReconciliationScope.PAYOUT,
          severity: ReconciliationSeverity.CRITICAL,
          code: 'PAYOUT_BLOCKED_BY_REFUND',
          message: `Payout is still active while refund ${blockingRefund.refundId} is ${blockingRefund.status.toLowerCase()}`,
          entityId: payout.id,
          transactionId: payout.txnId,
          expectedState: {
            payoutStatus: 'FAILED',
          } as Prisma.InputJsonValue,
          actualState: {
            payoutStatus: payout.status,
            blockingRefundId: blockingRefund.refundId,
            blockingRefundStatus: blockingRefund.status,
          } as Prisma.InputJsonValue,
        });
        continue;
      }

      if (!payout.providerRef) {
        findings.push({
          scope: ReconciliationScope.PAYOUT,
          severity: ReconciliationSeverity.HIGH,
          code: 'PAYOUT_MISSING_PROVIDER_REFERENCE',
          message: 'Payout is in-flight but missing a provider transfer reference',
          entityId: payout.id,
          transactionId: payout.txnId,
          expectedState: {
            providerRefRequired: true,
          } as Prisma.InputJsonValue,
          actualState: {
            providerRef: null,
            payoutStatus: payout.status,
          } as Prisma.InputJsonValue,
        });
        continue;
      }

      const providerStatus = await this.cashfreeClient.getPayoutStatus(
        payout.txnId,
        payout.providerRef
      );
      const currentStatus = payout.status;
      const syncedStatus = await this.payoutService.applyTransferUpdate(payout.txnId, {
        providerRef: providerStatus.cf_transfer_id ?? payout.providerRef,
        providerStatus: providerStatus.status,
        providerStatusCode: providerStatus.status_code,
        failureReason: providerStatus.status_description,
        details: providerStatus as unknown as Prisma.InputJsonValue,
      });

      if (syncedStatus && currentStatus !== syncedStatus) {
        findings.push({
          scope: ReconciliationScope.PAYOUT,
          severity: ReconciliationSeverity.HIGH,
          code: 'PAYOUT_STATUS_MISMATCH',
          message: 'Internal payout status diverged from Cashfree transfer status',
          entityId: payout.id,
          transactionId: payout.txnId,
          expectedState: {
            payoutStatus: currentStatus,
          } as Prisma.InputJsonValue,
          actualState: {
            payoutStatus: syncedStatus,
            providerStatus: providerStatus.status,
            providerStatusCode: providerStatus.status_code,
          } as Prisma.InputJsonValue,
        });
      }
    }

    return findings;
  }

  private async reconcileRefunds() {
    const findings: Array<{
      scope: ReconciliationScope;
      severity: ReconciliationSeverity;
      code: string;
      message: string;
      entityId: string;
      transactionId?: string;
      expectedState: Prisma.InputJsonValue;
      actualState?: Prisma.InputJsonValue;
    }> = [];
    const refunds = await this.reconciliationRepository.findRefundCandidates();

    for (const refund of refunds) {
      const currentStatus = refund.status;
      const providerRefund = await this.cashfreeClient.getRefund(
        refund.transaction.orderId,
        refund.refundId
      );
      const syncedStatus = await this.refundService.applyRefundUpdate(refund.refundId, {
        providerRefundId: providerRefund.cf_refund_id,
        providerStatus: providerRefund.refund_status,
        providerReference: providerRefund.cf_payment_id?.toString(),
        failureReason: providerRefund.status_description,
        details: providerRefund as unknown as Prisma.InputJsonValue,
      });

      if (currentStatus !== syncedStatus) {
        findings.push({
          scope: ReconciliationScope.REFUND,
          severity: ReconciliationSeverity.HIGH,
          code: 'REFUND_STATUS_MISMATCH',
          message: 'Internal refund status diverged from Cashfree refund status',
          entityId: refund.id,
          transactionId: refund.transactionId,
          expectedState: {
            refundStatus: currentStatus,
          } as Prisma.InputJsonValue,
          actualState: {
            refundStatus: syncedStatus,
            providerStatus: providerRefund.refund_status,
          } as Prisma.InputJsonValue,
        });
      }
    }

    return findings;
  }
}
