import { DisputePhase, DisputeStatus, Prisma, TransactionStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { DisputeService } from './dispute.service.js';

describe('DisputeService', () => {
  const disputeRepository = {
    findTransaction: vi.fn(),
    createDispute: vi.fn(),
    findByDisputeId: vi.fn(),
    listDisputes: vi.fn(),
    updateDispute: vi.fn(),
  };

  const service = new DisputeService(disputeRepository as never);

  it('creates a chargeback case against a paid transaction', async () => {
    disputeRepository.findTransaction.mockResolvedValue({
      id: 'txn_1',
      orderId: 'order_1',
      grossAmount: new Prisma.Decimal(5000),
      currency: 'INR',
      status: TransactionStatus.PAID,
      payoutStatus: 'SUCCESS',
      createdAt: new Date(),
    });
    disputeRepository.createDispute.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.CHARGEBACK,
      status: DisputeStatus.OPEN,
      amount: new Prisma.Decimal(2500),
      currency: 'INR',
      providerDisputeId: 'provider_case_1',
      providerCaseId: 'cb_1',
      providerStatus: 'OPEN',
      reasonCode: 'FRAUD',
      reasonMessage: 'Cardholder disputed the transfer',
      operatorNote: null,
      resolutionNote: null,
      evidenceDueBy: null,
      respondedAt: null,
      resolvedAt: null,
      openedByUserId: 'admin_1',
      resolvedByUserId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
      },
    });

    const result = await service.createDispute(
      {
        transactionId: 'txn_1',
        phase: DisputePhase.CHARGEBACK,
        amount: 2500,
        providerDisputeId: 'provider_case_1',
        providerCaseId: 'cb_1',
        providerStatus: 'OPEN',
        reasonCode: 'FRAUD',
        reasonMessage: 'Cardholder disputed the transfer',
      },
      'admin_1'
    );

    expect(disputeRepository.createDispute).toHaveBeenCalled();
    expect(result.phase).toBe(DisputePhase.CHARGEBACK);
    expect(result.amount).toBe(2500);
  });

  it('moves an open dispute into review with an operator note', async () => {
    disputeRepository.findByDisputeId.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.DISPUTE,
      status: DisputeStatus.OPEN,
      amount: new Prisma.Decimal(1000),
      currency: 'INR',
      providerDisputeId: null,
      providerCaseId: null,
      providerStatus: 'OPEN',
      reasonCode: 'SERVICE',
      reasonMessage: 'Service not rendered',
      operatorNote: null,
      resolutionNote: null,
      evidenceDueBy: null,
      respondedAt: null,
      resolvedAt: null,
      openedByUserId: 'admin_1',
      resolvedByUserId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
        userId: 'user_1',
      },
    });
    disputeRepository.updateDispute.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.DISPUTE,
      status: DisputeStatus.UNDER_REVIEW,
      amount: new Prisma.Decimal(1000),
      currency: 'INR',
      providerDisputeId: null,
      providerCaseId: null,
      providerStatus: 'UNDER_REVIEW',
      reasonCode: 'SERVICE',
      reasonMessage: 'Service not rendered',
      operatorNote: 'Evidence package shared with processor',
      resolutionNote: null,
      evidenceDueBy: null,
      respondedAt: new Date(),
      resolvedAt: null,
      openedByUserId: 'admin_1',
      resolvedByUserId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
      },
    });

    const result = await service.respondToDispute('case_1', {
      operatorNote: 'Evidence package shared with processor',
      providerStatus: 'UNDER_REVIEW',
    });

    expect(disputeRepository.updateDispute).toHaveBeenCalled();
    expect(result.status).toBe(DisputeStatus.UNDER_REVIEW);
    expect(result.operatorNote).toBe('Evidence package shared with processor');
  });

  it('resolves a dispute with a terminal outcome', async () => {
    disputeRepository.findByDisputeId.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.CHARGEBACK,
      status: DisputeStatus.UNDER_REVIEW,
      amount: new Prisma.Decimal(1000),
      currency: 'INR',
      providerDisputeId: null,
      providerCaseId: null,
      providerStatus: 'UNDER_REVIEW',
      reasonCode: 'FRAUD',
      reasonMessage: 'Potential fraud',
      operatorNote: 'Submitted dispute evidence',
      resolutionNote: null,
      evidenceDueBy: null,
      respondedAt: new Date(),
      resolvedAt: null,
      openedByUserId: 'admin_1',
      resolvedByUserId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
        userId: 'user_1',
      },
    });
    disputeRepository.updateDispute.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.CHARGEBACK,
      status: DisputeStatus.LOST,
      amount: new Prisma.Decimal(1000),
      currency: 'INR',
      providerDisputeId: null,
      providerCaseId: null,
      providerStatus: 'LOST',
      reasonCode: 'FRAUD',
      reasonMessage: 'Potential fraud',
      operatorNote: 'Submitted dispute evidence',
      resolutionNote: 'Processor ruled against us',
      evidenceDueBy: null,
      respondedAt: new Date(),
      resolvedAt: new Date(),
      openedByUserId: 'admin_1',
      resolvedByUserId: 'admin_2',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
      },
    });

    const result = await service.resolveDispute('case_1', 'admin_2', {
      outcome: DisputeStatus.LOST,
      resolutionNote: 'Processor ruled against us',
      providerStatus: 'LOST',
    });

    expect(result.status).toBe(DisputeStatus.LOST);
    expect(result.resolvedByUserId).toBe('admin_2');
  });

  it('rejects dispute amounts above the captured amount', async () => {
    disputeRepository.findTransaction.mockResolvedValue({
      id: 'txn_1',
      orderId: 'order_1',
      grossAmount: new Prisma.Decimal(5000),
      currency: 'INR',
      status: TransactionStatus.PAID,
      payoutStatus: 'SUCCESS',
      createdAt: new Date(),
    });

    await expect(
      service.createDispute(
        {
          transactionId: 'txn_1',
          amount: 6000,
        },
        'admin_1'
      )
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('blocks reopening a resolved dispute', async () => {
    disputeRepository.findByDisputeId.mockResolvedValue({
      id: 'row_1',
      disputeId: 'case_1',
      phase: DisputePhase.DISPUTE,
      status: DisputeStatus.WON,
      amount: new Prisma.Decimal(1000),
      currency: 'INR',
      providerDisputeId: null,
      providerCaseId: null,
      providerStatus: 'WON',
      reasonCode: null,
      reasonMessage: null,
      operatorNote: 'Handled',
      resolutionNote: 'Closed in our favor',
      evidenceDueBy: null,
      respondedAt: new Date(),
      resolvedAt: new Date(),
      openedByUserId: 'admin_1',
      resolvedByUserId: 'admin_1',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      transaction: {
        id: 'txn_1',
        orderId: 'order_1',
        status: TransactionStatus.PAID,
        payoutStatus: 'SUCCESS',
        userId: 'user_1',
      },
    });

    await expect(
      service.respondToDispute('case_1', {
        operatorNote: 'Trying to reopen',
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws when the dispute case does not exist', async () => {
    disputeRepository.findByDisputeId.mockResolvedValue(null);

    await expect(service.getDispute('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
