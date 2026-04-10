import {
  Prisma,
  PrismaClient,
  PayoutStatus,
  Transaction,
  TransactionLifecycleState,
  TransactionStatus,
} from '@prisma/client';
import { logger } from '../../config/logger.js';
import {
  ConflictError,
  NotFoundError,
  InvalidTransactionTransitionError,
} from '../../shared/errors.js';

type TxLike = PrismaClient | Prisma.TransactionClient;

const ALLOWED_TRANSITIONS: Readonly<
  Record<TransactionLifecycleState, ReadonlySet<TransactionLifecycleState>>
> = {
  INITIATED: new Set([TransactionLifecycleState.PAYMENT_PENDING]),
  PAYMENT_PENDING: new Set([
    TransactionLifecycleState.PAYMENT_SUCCESS,
    TransactionLifecycleState.PAYMENT_FAILED,
  ]),
  PAYMENT_SUCCESS: new Set([TransactionLifecycleState.PAYOUT_PENDING]),
  PAYMENT_FAILED: new Set(),
  PAYOUT_PENDING: new Set([
    TransactionLifecycleState.PAYOUT_SUCCESS,
    TransactionLifecycleState.PAYOUT_FAILED,
  ]),
  PAYOUT_SUCCESS: new Set([TransactionLifecycleState.COMPLETED]),
  PAYOUT_FAILED: new Set([TransactionLifecycleState.PAYOUT_PENDING]), // Allow retries
  COMPLETED: new Set([TransactionLifecycleState.REFUNDED, TransactionLifecycleState.DISPUTED]),
  REFUNDED: new Set(),
  DISPUTED: new Set(),
};

export class TransactionStateService {
  constructor(private readonly db: PrismaClient) {}

  async transitionTransactionState(
    txnId: string,
    nextState: TransactionLifecycleState,
    metadata?: {
      reason?: string;
      details?: Prisma.InputJsonValue;
    },
    tx?: TxLike
  ): Promise<Transaction> {
    const executor = tx ?? this.db;
    const current = await executor.transaction.findUnique({
      where: { id: txnId },
      select: {
        id: true,
        lifecycleState: true,
        version: true,
      },
    });

    if (!current) {
      throw new NotFoundError('Transaction');
    }

    if (current.lifecycleState === nextState) {
      return executor.transaction.findUniqueOrThrow({ where: { id: txnId } });
    }

    const validNextStates = ALLOWED_TRANSITIONS[current.lifecycleState];
    if (!validNextStates.has(nextState)) {
      logger.warn(
        {
          transactionId: txnId,
          fromState: current.lifecycleState,
          toState: nextState,
          reason: metadata?.reason,
        },
        'Rejected invalid transaction state transition'
      );
      throw new InvalidTransactionTransitionError({
        transactionId: txnId,
        fromState: current.lifecycleState,
        toState: nextState,
        reason: metadata?.reason,
      });
    }

    const legacyFields = this.toLegacyStatus(nextState);
    const updateResult = await executor.transaction.updateMany({
      where: {
        id: txnId,
        lifecycleState: current.lifecycleState,
        version: current.version,
      },
      data: {
        lifecycleState: nextState,
        version: {
          increment: 1,
        },
        ...legacyFields,
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictError(
        `Transaction ${txnId} changed concurrently while transitioning ${current.lifecycleState} -> ${nextState}`
      );
    }

    await executor.transactionLog.create({
      data: {
        txnId,
        fromState: current.lifecycleState,
        toState: nextState,
        reason: metadata?.reason,
        metadata: metadata?.details,
      },
    });

    return executor.transaction.findUniqueOrThrow({ where: { id: txnId } });
  }

  private toLegacyStatus(nextState: TransactionLifecycleState): {
    status?: TransactionStatus;
    payoutStatus?: PayoutStatus;
  } {
    switch (nextState) {
      case TransactionLifecycleState.INITIATED:
      case TransactionLifecycleState.PAYMENT_PENDING:
        return { status: TransactionStatus.INITIATED, payoutStatus: PayoutStatus.PENDING };
      case TransactionLifecycleState.PAYMENT_SUCCESS:
        return { status: TransactionStatus.PAID, payoutStatus: PayoutStatus.QUEUED };
      case TransactionLifecycleState.PAYMENT_FAILED:
        return { status: TransactionStatus.FAILED, payoutStatus: PayoutStatus.FAILED };
      case TransactionLifecycleState.PAYOUT_PENDING:
        return { status: TransactionStatus.PAID, payoutStatus: PayoutStatus.PROCESSING };
      case TransactionLifecycleState.PAYOUT_SUCCESS:
      case TransactionLifecycleState.COMPLETED:
        return { status: TransactionStatus.PAID, payoutStatus: PayoutStatus.SUCCESS };
      case TransactionLifecycleState.PAYOUT_FAILED:
        return { status: TransactionStatus.PAID, payoutStatus: PayoutStatus.FAILED };
      case TransactionLifecycleState.REFUNDED:
      case TransactionLifecycleState.DISPUTED:
        return { status: TransactionStatus.PAID };
      default:
        return {};
    }
  }
}
