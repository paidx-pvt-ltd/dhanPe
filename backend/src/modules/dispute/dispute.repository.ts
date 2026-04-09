import { Prisma, PrismaClient } from '@prisma/client';

export class DisputeRepository {
  constructor(private readonly db: PrismaClient) {}

  findTransaction(transactionId: string) {
    return this.db.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        orderId: true,
        grossAmount: true,
        currency: true,
        status: true,
        lifecycleState: true,
        payoutStatus: true,
        createdAt: true,
      },
    });
  }

  createDispute(data: Prisma.DisputeUncheckedCreateInput) {
    return this.db.dispute.create({
      data,
      include: {
        transaction: {
          select: {
            id: true,
            orderId: true,
            status: true,
            lifecycleState: true,
            payoutStatus: true,
          },
        },
      },
    });
  }

  findByDisputeId(disputeId: string) {
    return this.db.dispute.findUnique({
      where: { disputeId },
      include: {
        transaction: {
          select: {
            id: true,
            orderId: true,
            status: true,
            lifecycleState: true,
            payoutStatus: true,
            userId: true,
          },
        },
      },
    });
  }

  listDisputes(filters: {
    status?: Prisma.DisputeWhereInput['status'];
    phase?: Prisma.DisputeWhereInput['phase'];
    transactionId?: string;
  }) {
    return this.db.dispute.findMany({
      where: {
        status: filters.status,
        phase: filters.phase,
        transactionId: filters.transactionId,
      },
      include: {
        transaction: {
          select: {
            id: true,
            orderId: true,
            status: true,
            lifecycleState: true,
            payoutStatus: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { evidenceDueBy: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  updateDispute(disputeId: string, data: Prisma.DisputeUncheckedUpdateInput) {
    return this.db.dispute.update({
      where: { id: disputeId },
      data,
      include: {
        transaction: {
          select: {
            id: true,
            orderId: true,
            status: true,
            lifecycleState: true,
            payoutStatus: true,
          },
        },
      },
    });
  }
}
