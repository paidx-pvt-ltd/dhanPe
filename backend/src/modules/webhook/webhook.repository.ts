import { Prisma, PrismaClient, Transaction, WebhookEvent } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class WebhookRepository {
  constructor(private readonly db: PrismaClient) {}

  findTransactionByOrderId(orderId: string) {
    return this.db.transaction.findUnique({
      where: { orderId },
      include: {
        beneficiary: true,
      },
    });
  }

  findEventByEventId(eventId: string) {
    return this.db.webhookEvent.findUnique({
      where: { eventId },
    });
  }

  async findEventForUpdate(tx: TxLike, eventId: string): Promise<WebhookEvent | null> {
    const events = await tx.$queryRaw<WebhookEvent[]>`
      SELECT * FROM "WebhookEvent"
      WHERE "eventId" = ${eventId}
      LIMIT 1
      FOR UPDATE
    `;
    return events[0] ?? null;
  }

  createEvent(data: Prisma.WebhookEventUncheckedCreateInput): Promise<WebhookEvent> {
    return this.db.webhookEvent.create({ data });
  }

  markEventProcessed(
    tx: TxLike,
    eventId: string,
    processed: boolean,
    error?: string
  ): Promise<WebhookEvent> {
    return tx.webhookEvent.update({
      where: { id: eventId },
      data: {
        processed,
        error,
      },
    });
  }

  updateTransactionPaid(
    tx: TxLike,
    transactionId: string,
    paymentId: string | undefined,
    metadata: Prisma.InputJsonValue
  ): Promise<Transaction> {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'PAID',
        paymentId,
        metadata,
      },
    });
  }

  updateTransactionFailed(
    tx: TxLike,
    transactionId: string,
    metadata: Prisma.InputJsonValue
  ): Promise<Transaction> {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        metadata,
      },
    });
  }
}
