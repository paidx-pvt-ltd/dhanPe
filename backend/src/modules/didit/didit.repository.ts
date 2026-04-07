import { KYCStatus, Prisma, PrismaClient, User, WebhookEvent } from '@prisma/client';

type TxLike = PrismaClient | Prisma.TransactionClient;

export class DiditRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  updateUserKycStatus(id: string, kycStatus: KYCStatus): Promise<User> {
    return this.db.user.update({
      where: { id },
      data: { kycStatus },
    });
  }

  findWebhookEventByEventId(eventId: string): Promise<WebhookEvent | null> {
    return this.db.webhookEvent.findUnique({
      where: { eventId },
    });
  }

  createWebhookEvent(data: Prisma.WebhookEventUncheckedCreateInput): Promise<WebhookEvent> {
    return this.db.webhookEvent.create({ data });
  }

  markWebhookProcessed(
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
}
