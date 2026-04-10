import {
  PayoutStatus,
  Prisma,
  PrismaClient,
  RefundStatus,
  TransactionLifecycleState,
} from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { toDecimal, toNumber } from '../../utils/decimal.js';
import { sha256 } from '../../utils/hash.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { CashfreeRefundResponse } from '../payment/payment.types.js';
import { PayoutRepository } from '../payout/payout.repository.js';
import { TransactionStateService } from '../transaction/transaction-state.service.js';
import { CreateRefundDto } from './refund.schemas.js';
import { RefundRepository } from './refund.repository.js';

const TERMINAL_REFUND_SUCCESS = new Set(['SUCCESS', 'PROCESSED', 'COMPLETED']);
const TERMINAL_REFUND_FAILURE = new Set(['FAILED', 'CANCELLED', 'REJECTED']);

export class RefundService {
  constructor(
    private readonly refundRepository: RefundRepository,
    private readonly payoutRepository: PayoutRepository,
    private readonly ledgerService: LedgerService,
    private readonly transactionStateService: TransactionStateService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {}

  async createRefund(userId: string, transactionId: string, input: CreateRefundDto) {
    const refundIdentifier = input.refundId ?? `ref_${transactionId.slice(-8)}_${sha256(`${transactionId}:${input.amount}:${Date.now()}`).slice(0, 8)}`;

    const result = await this.db.$transaction(async (tx) => {
      const transaction = await this.refundRepository.findTransactionForRefund(transactionId, userId);
      if (!transaction) {
        throw new NotFoundError('Transaction');
      }

      // Lock the transaction to prevent race conditions with payouts or other refunds
      await this.refundRepository.findTransactionForUpdate(tx, transactionId);

      if (transaction.lifecycleState !== TransactionLifecycleState.COMPLETED && 
          transaction.lifecycleState !== TransactionLifecycleState.PAYOUT_SUCCESS) {
        throw new ValidationError('Only completed or payout_success transactions can be refunded');
      }

      const requestedAmount = toDecimal(input.amount ?? toNumber(transaction.grossAmount));
      const refundedAmount = transaction.refunds
        .filter((refund) => refund.status === RefundStatus.SUCCESS)
        .reduce((sum, refund) => sum.plus(refund.amount), new Prisma.Decimal(0));
      const pendingAmount = transaction.refunds
        .filter(
          (refund) =>
            refund.status === RefundStatus.PENDING || refund.status === RefundStatus.PROCESSING
        )
        .reduce((sum, refund) => sum.plus(refund.amount), new Prisma.Decimal(0));

      const remainingAmount = transaction.grossAmount.minus(refundedAmount).minus(pendingAmount);
      if (requestedAmount.lte(0) || requestedAmount.gt(remainingAmount)) {
        throw new ValidationError('Refund amount exceeds the remaining refundable balance');
      }

      const refund = await this.refundRepository.createRefund(tx, {
        transactionId: transaction.id,
        refundId: refundIdentifier,
        amount: requestedAmount,
        currency: transaction.currency,
        status: RefundStatus.PENDING,
        reason: input.reason,
      });

      return { transaction, refund, requestedAmount };
    });

    const { transaction, refund, requestedAmount } = result;

    let response: CashfreeRefundResponse;
    try {
      response = await this.cashfreeClient.createRefund(transaction.orderId, {
        refund_amount: toNumber(requestedAmount),
        refund_id: refundIdentifier,
        refund_note: input.reason,
        refund_speed: 'STANDARD',
      }, refundIdentifier); // Use refundId as idempotency key
    } catch (error) {
      await this.db.$transaction((tx) =>
        this.refundRepository.updateRefund(tx, refund.id, {
          status: RefundStatus.FAILED,
          failureReason: error instanceof Error ? error.message : 'Refund request failed',
        })
      );
      throw error;
    }

    const mappedStatus = this.mapProviderStatus(response.refund_status);
    await this.applyRefundUpdate(refundIdentifier, {
      providerRefundId: response.cf_refund_id,
      providerStatus: response.refund_status,
      providerReference: response.cf_payment_id?.toString(),
      failureReason: response.status_description,
      details: response as unknown as Prisma.InputJsonValue,
      nextStatus: mappedStatus,
    });

    return {
      refundId: refundIdentifier,
      transactionId: transaction.id,
      amount: toNumber(requestedAmount),
      currency: transaction.currency,
      status: mappedStatus,
      providerRefundId: response.cf_refund_id ?? null,
      providerStatus: response.refund_status,
    };
  }

  async syncRefundStatus(refundId: string, userId: string) {
    const refund = await this.refundRepository.findRefundForUser(refundId, userId);
    if (!refund) {
      throw new NotFoundError('Refund');
    }

    const providerRefund = await this.cashfreeClient.getRefund(
      refund.transaction.orderId,
      refund.refundId
    );

    return this.applyRefundUpdate(refund.refundId, {
      providerRefundId: providerRefund.cf_refund_id,
      providerStatus: providerRefund.refund_status,
      providerReference: providerRefund.cf_payment_id?.toString(),
      failureReason: providerRefund.status_description,
      details: providerRefund as unknown as Prisma.InputJsonValue,
      nextStatus: this.mapProviderStatus(providerRefund.refund_status),
    });
  }

  async applyRefundUpdate(
    refundId: string,
    input: {
      providerRefundId?: string;
      providerStatus?: string;
      providerReference?: string;
      failureReason?: string;
      details: Prisma.InputJsonValue;
      nextStatus?: RefundStatus;
    }
  ) {
    const refund = await this.refundRepository.findRefundByRefundId(refundId);
    if (!refund) {
      throw new NotFoundError('Refund');
    }

    const nextStatus = input.nextStatus ?? this.mapProviderStatus(input.providerStatus);
    const wasSuccessful = refund.status === RefundStatus.SUCCESS;

    await this.db.$transaction(async (tx) => {
      await this.refundRepository.updateRefund(tx, refund.id, {
        status: nextStatus,
        providerRefundId: input.providerRefundId,
        providerStatus: input.providerStatus,
        providerReference: input.providerReference,
        metadata: input.details,
        failureReason: nextStatus === RefundStatus.FAILED ? input.failureReason : null,
      });
      await this.refundRepository.updateTransactionMetadata(
        tx,
        refund.transactionId,
        input.details
      );

      if (!wasSuccessful && nextStatus === RefundStatus.SUCCESS) {
        const proportional = this.calculateReversalBreakdown(refund.transaction, refund.amount);
        await this.ledgerService.recordRefundSettled(tx, {
          transactionId: refund.transactionId,
          referenceId: refund.refundId,
          grossAmount: refund.amount,
          netPayoutAmount: proportional.netPayoutAmount,
          platformFeeAmount: proportional.platformFeeAmount,
          taxAmount: proportional.taxAmount,
        });

        if (
          refund.transaction.payout &&
          refund.transaction.payout.status !== PayoutStatus.SUCCESS &&
          refund.transaction.payout.status !== PayoutStatus.FAILED
        ) {
          await this.payoutRepository.updateStatus(tx, refund.transaction.payout.id, {
            status: PayoutStatus.FAILED,
            failureReason: `Refund ${refund.refundId} settled before payout`,
            lastSyncAt: new Date(),
          });
          await this.payoutRepository.updateTransactionPayoutStatus(
            tx,
            refund.transactionId,
            PayoutStatus.FAILED
          );
        }

        await this.transactionStateService.transitionTransactionState(
          refund.transactionId,
          TransactionLifecycleState.REFUNDED,
          {
            reason: `Refund ${refund.refundId} settled`,
            details: input.details,
          },
          tx
        );
      }
    });

    return nextStatus;
  }

  private mapProviderStatus(providerStatus?: string): RefundStatus {
    const normalized = providerStatus?.trim().toUpperCase() ?? 'UNKNOWN';
    if (TERMINAL_REFUND_SUCCESS.has(normalized)) {
      return RefundStatus.SUCCESS;
    }
    if (TERMINAL_REFUND_FAILURE.has(normalized)) {
      return RefundStatus.FAILED;
    }
    return RefundStatus.PROCESSING;
  }

  private calculateReversalBreakdown(
    transaction: {
      grossAmount: Prisma.Decimal;
      netPayoutAmount: Prisma.Decimal;
      platformFeeAmount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
    },
    refundAmount: Prisma.Decimal
  ) {
    if (refundAmount.equals(transaction.grossAmount)) {
      return {
        netPayoutAmount: transaction.netPayoutAmount,
        platformFeeAmount: transaction.platformFeeAmount,
        taxAmount: transaction.taxAmount,
      };
    }

    const ratio = refundAmount.div(transaction.grossAmount);
    const platformFeeAmount = transaction.platformFeeAmount.mul(ratio).toDecimalPlaces(2);
    const taxAmount = transaction.taxAmount.mul(ratio).toDecimalPlaces(2);
    const netPayoutAmount = refundAmount.minus(platformFeeAmount).minus(taxAmount);

    return {
      netPayoutAmount,
      platformFeeAmount,
      taxAmount,
    };
  }
}
