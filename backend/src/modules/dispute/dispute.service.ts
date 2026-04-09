import { DisputePhase, DisputeStatus, Prisma, TransactionStatus } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { toDecimal, toNumber } from '../../utils/decimal.js';
import {
  CreateDisputeDto,
  ResolveDisputeDto,
  RespondDisputeDto,
} from './dispute.schemas.js';
import { DisputeRepository } from './dispute.repository.js';

const TERMINAL_DISPUTE_STATUSES: ReadonlySet<DisputeStatus> = new Set([
  DisputeStatus.WON,
  DisputeStatus.LOST,
  DisputeStatus.CLOSED,
]);

type DisputeRecord = {
  id: string;
  disputeId: string;
  phase: DisputePhase;
  status: DisputeStatus;
  amount: Prisma.Decimal;
  currency: string;
  providerDisputeId: string | null;
  providerCaseId: string | null;
  providerStatus: string | null;
  reasonCode: string | null;
  reasonMessage: string | null;
  operatorNote: string | null;
  resolutionNote: string | null;
  evidenceDueBy: Date | null;
  respondedAt: Date | null;
  resolvedAt: Date | null;
  openedByUserId: string | null;
  resolvedByUserId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  transaction: {
    id: string;
    orderId: string;
    status: TransactionStatus;
    payoutStatus: string;
  };
};

export class DisputeService {
  constructor(private readonly disputeRepository: DisputeRepository) {}

  async createDispute(input: CreateDisputeDto, openedByUserId: string) {
    const transaction = await this.disputeRepository.findTransaction(input.transactionId);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }

    if (transaction.status !== TransactionStatus.PAID) {
      throw new ValidationError('Disputes can only be opened against paid transactions');
    }

    const amount = toDecimal(input.amount ?? toNumber(transaction.grossAmount));
    if (amount.lte(0) || amount.gt(transaction.grossAmount)) {
      throw new ValidationError('Dispute amount must be within the original transaction amount');
    }

    const created = await this.disputeRepository.createDispute({
      transactionId: transaction.id,
      disputeId: `case_${transaction.id.slice(-12)}_${Date.now()}`,
      phase: input.phase ?? DisputePhase.DISPUTE,
      status: input.status ?? DisputeStatus.OPEN,
      amount,
      currency: input.currency?.toUpperCase() ?? transaction.currency,
      providerDisputeId: input.providerDisputeId,
      providerCaseId: input.providerCaseId,
      providerStatus: input.providerStatus,
      reasonCode: input.reasonCode,
      reasonMessage: input.reasonMessage,
      evidenceDueBy: input.evidenceDueBy,
      metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      openedByUserId,
    });

    return this.serialize(created);
  }

  async listDisputes(filters: {
    status?: DisputeStatus;
    phase?: DisputePhase;
    transactionId?: string;
  }) {
    const disputes = await this.disputeRepository.listDisputes(filters);
    return disputes.map((dispute) => this.serialize(dispute));
  }

  async getDispute(disputeId: string) {
    const dispute = await this.disputeRepository.findByDisputeId(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute');
    }

    return this.serialize(dispute);
  }

  async respondToDispute(disputeId: string, input: RespondDisputeDto) {
    const dispute = await this.disputeRepository.findByDisputeId(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute');
    }

    if (TERMINAL_DISPUTE_STATUSES.has(dispute.status)) {
      throw new ConflictError('Resolved dispute cases cannot be moved back into review');
    }

    const updated = await this.disputeRepository.updateDispute(dispute.id, {
      phase: input.phase ?? dispute.phase,
      status: input.status ?? DisputeStatus.UNDER_REVIEW,
      providerStatus: input.providerStatus ?? dispute.providerStatus,
      operatorNote: input.operatorNote,
      evidenceDueBy: input.evidenceDueBy ?? dispute.evidenceDueBy,
      respondedAt: new Date(),
    });

    return this.serialize(updated);
  }

  async resolveDispute(disputeId: string, resolvedByUserId: string, input: ResolveDisputeDto) {
    const dispute = await this.disputeRepository.findByDisputeId(disputeId);
    if (!dispute) {
      throw new NotFoundError('Dispute');
    }

    if (TERMINAL_DISPUTE_STATUSES.has(dispute.status)) {
      throw new ConflictError('Dispute is already resolved');
    }

    const updated = await this.disputeRepository.updateDispute(dispute.id, {
      status: input.outcome,
      providerStatus: input.providerStatus ?? dispute.providerStatus,
      resolutionNote: input.resolutionNote,
      resolvedByUserId,
      resolvedAt: new Date(),
    });

    return this.serialize(updated);
  }

  private serialize(dispute: DisputeRecord | null) {
    if (!dispute) {
      throw new NotFoundError('Dispute');
    }

    return {
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
      openedByUserId: dispute.openedByUserId,
      resolvedByUserId: dispute.resolvedByUserId,
      metadata: dispute.metadata,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
      transaction: dispute.transaction,
    };
  }
}
