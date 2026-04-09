import { NotFoundError } from '../../shared/errors.js';
import { toNumber } from '../../utils/decimal.js';
import { PayoutService } from '../payout/payout.service.js';
import { TransactionRepository } from './transaction.repository.js';

export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly payoutService: PayoutService
  ) {}

  async getLifecycle(transactionId: string, userId: string) {
    const transaction = await this.transactionRepository.findLifecycle(transactionId, userId);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    if (
      transaction.payoutStatus === 'PROCESSING' ||
      transaction.payoutStatus === 'SUBMITTED' ||
      transaction.payoutStatus === 'QUEUED'
    ) {
      await this.payoutService.syncTransferStatus(transactionId).catch(() => null);
    }

    const refreshedTransaction = await this.transactionRepository.findLifecycle(
      transactionId,
      userId
    );
    if (!refreshedTransaction) {
      throw new NotFoundError('Transaction');
    }

    return {
      id: refreshedTransaction.id,
      orderId: refreshedTransaction.orderId,
      paymentId: refreshedTransaction.paymentId,
      paymentProvider: refreshedTransaction.paymentProvider,
      status: refreshedTransaction.status,
      payoutStatus: refreshedTransaction.payoutStatus,
      amount: toNumber(refreshedTransaction.amount),
      grossAmount: toNumber(refreshedTransaction.grossAmount),
      platformFeeAmount: toNumber(refreshedTransaction.platformFeeAmount),
      taxAmount: toNumber(refreshedTransaction.taxAmount),
      netPayoutAmount: toNumber(refreshedTransaction.netPayoutAmount),
      currency: refreshedTransaction.currency,
      feeRuleVersion: refreshedTransaction.feeRuleVersion,
      description: refreshedTransaction.description,
      createdAt: refreshedTransaction.createdAt,
      updatedAt: refreshedTransaction.updatedAt,
      beneficiary: refreshedTransaction.beneficiary
        ? {
            id: refreshedTransaction.beneficiary.id,
            type: refreshedTransaction.beneficiary.type,
            label: refreshedTransaction.beneficiary.label,
            accountHolderName: refreshedTransaction.beneficiary.accountHolderName,
            accountNumberMask: refreshedTransaction.beneficiary.accountNumberMask,
            ifsc: refreshedTransaction.beneficiary.ifsc,
            upiHandle: refreshedTransaction.beneficiary.upiHandle,
            status: refreshedTransaction.beneficiary.status,
          }
        : null,
      ledger: refreshedTransaction.ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: toNumber(entry.amount),
        balanceAfter: toNumber(entry.balanceAfter),
        referenceId: entry.referenceId,
        createdAt: entry.createdAt,
      })),
      journals: refreshedTransaction.journalEntries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        referenceId: entry.referenceId,
        memo: entry.memo,
        createdAt: entry.createdAt,
        lines: entry.lines.map((line) => ({
          id: line.id,
          account: line.account,
          debit: toNumber(line.debit),
          credit: toNumber(line.credit),
          createdAt: line.createdAt,
        })),
      })),
      payout: refreshedTransaction.payout
        ? {
            id: refreshedTransaction.payout.id,
            status: refreshedTransaction.payout.status,
            providerRef: refreshedTransaction.payout.providerRef,
            providerStatus: refreshedTransaction.payout.providerStatus,
            bankAccount:
              typeof refreshedTransaction.payout.bankAccount === 'object' &&
              refreshedTransaction.payout.bankAccount !== null
                ? {
                    accountHolderName: (
                      refreshedTransaction.payout.bankAccount as Record<string, unknown>
                    ).accountHolderName,
                    accountNumberMask: (
                      refreshedTransaction.payout.bankAccount as Record<string, unknown>
                    ).accountNumberMask,
                    ifsc: (refreshedTransaction.payout.bankAccount as Record<string, unknown>).ifsc,
                    bankName: (refreshedTransaction.payout.bankAccount as Record<string, unknown>)
                      .bankName,
                  }
                : null,
            failureReason: refreshedTransaction.payout.failureReason,
            createdAt: refreshedTransaction.payout.createdAt,
            updatedAt: refreshedTransaction.payout.updatedAt,
          }
        : null,
      refunds: refreshedTransaction.refunds.map((refund) => ({
        id: refund.id,
        refundId: refund.refundId,
        amount: toNumber(refund.amount),
        currency: refund.currency,
        status: refund.status,
        providerRefundId: refund.providerRefundId,
        providerStatus: refund.providerStatus,
        reason: refund.reason,
        failureReason: refund.failureReason,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
      })),
      disputes: refreshedTransaction.disputes.map((dispute) => ({
        id: dispute.id,
        disputeId: dispute.disputeId,
        phase: dispute.phase,
        status: dispute.status,
        amount: toNumber(dispute.amount),
        currency: dispute.currency,
        providerDisputeId: dispute.providerDisputeId,
        providerCaseId: dispute.providerCaseId,
        providerStatus: dispute.providerStatus,
        reasonCode: dispute.reasonCode,
        reasonMessage: dispute.reasonMessage,
        operatorNote: dispute.operatorNote,
        resolutionNote: dispute.resolutionNote,
        evidenceDueBy: dispute.evidenceDueBy,
        respondedAt: dispute.respondedAt,
        resolvedAt: dispute.resolvedAt,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
      })),
      reconciliation: refreshedTransaction.reconciliationItems.map((item) => ({
        id: item.id,
        scope: item.scope,
        severity: item.severity,
        status: item.status,
        code: item.code,
        message: item.message,
        createdAt: item.createdAt,
      })),
    };
  }
}
