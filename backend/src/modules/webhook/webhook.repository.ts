import { Prisma, PrismaClient, Transaction, WebhookEvent } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class WebhookRepository {
  constructor(private readonly db: PrismaClient) {}

  findTransactionByOrderId(orderId: string): Promise<Transaction | null> {
    return this.db.transaction.findUnique({
      where: { orderId },
    });
  }

  findEventByEventId(eventId: string) {
    return this.db.webhookEvent.findUnique({
      where: { eventId },
    });
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
