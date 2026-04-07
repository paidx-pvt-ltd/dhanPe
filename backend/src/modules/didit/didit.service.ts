import { KYCStatus, Prisma, PrismaClient, User } from '@prisma/client';
import { createHmac, safeEqual } from '../../utils/hash.js';
import {
  AuthenticationError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../shared/errors.js';
import { config } from '../../config/index.js';
import { toNumber } from '../../utils/decimal.js';
import { DiditClient } from './didit.client.js';
import { DiditRepository } from './didit.repository.js';

type DiditWebhookPayload = {
  session_id?: string;
  status?: string;
  timestamp?: number | string;
  vendor_data?: string;
  workflow_id?: string;
  webhook_type?: string;
};

export class DiditService {
  constructor(
    private readonly diditRepository: DiditRepository,
    private readonly diditClient: DiditClient,
    private readonly db: PrismaClient
  ) {}

  async createSession(userId: string) {
    this.ensureConfigured();

    const user = await this.diditRepository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User');
    }

    const callback = config.server.appUrl
      ? `${config.server.appUrl.replace(/\/$/, '')}/api/webhook/didit`
      : undefined;
    const session = await this.diditClient.createSession({
      workflow_id: config.didit.workflowId,
      vendor_data: user.id,
      callback,
    });

    const mappedStatus = this.mapDiditStatus(session.status);
    if (mappedStatus !== user.kycStatus) {
      await this.diditRepository.updateUserKycStatus(user.id, mappedStatus);
    }

    return {
      sessionId: session.session_id,
      sessionToken: session.session_token,
      verificationUrl: session.verification_url ?? session.session_url ?? null,
      status: session.status,
    };
  }

  async syncSession(userId: string, sessionId: string) {
    this.ensureConfigured();

    const session = await this.diditClient.getSession(sessionId);
    if (session.vendor_data && session.vendor_data !== userId) {
      throw new AuthenticationError(
        'This verification session does not belong to the authenticated user'
      );
    }

    const user = await this.diditRepository.updateUserKycStatus(
      userId,
      this.mapDiditStatus(session.status)
    );

    return {
      profile: this.serializeUser(user),
      session: {
        sessionId: session.session_id,
        workflowId: session.workflow_id,
        verificationUrl: session.verification_url ?? session.session_url ?? null,
        status: session.status,
      },
    };
  }

  verifyWebhookSignature(
    payload: DiditWebhookPayload,
    headers: Record<string, string | undefined>
  ) {
    if (!config.didit.webhookSecret) {
      throw new ServiceUnavailableError('Didit webhook secret is not configured');
    }

    const timestampHeader = headers['x-timestamp'];
    if (!timestampHeader) {
      throw new ValidationError('Missing Didit webhook timestamp');
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
      throw new ValidationError('Didit webhook timestamp is invalid or expired');
    }

    const signatureV2 = headers['x-signature-v2'];
    if (signatureV2 && this.verifySignatureV2(payload, signatureV2)) {
      return;
    }

    const signatureSimple = headers['x-signature-simple'];
    if (signatureSimple && this.verifySignatureSimple(payload, signatureSimple)) {
      return;
    }

    throw new ValidationError('Invalid Didit webhook signature');
  }

  async processWebhook(payload: DiditWebhookPayload): Promise<void> {
    const eventId =
      payload.session_id && payload.status
        ? `${payload.session_id}:${payload.status}:${payload.timestamp ?? 'unknown'}`
        : undefined;

    if (!eventId) {
      throw new ValidationError('Didit webhook payload is missing session data');
    }

    const existingEvent = await this.diditRepository.findWebhookEventByEventId(eventId);
    if (existingEvent?.processed) {
      return;
    }

    const event =
      existingEvent ??
      (await this.diditRepository.createWebhookEvent({
        provider: 'didit',
        eventType: payload.webhook_type ?? 'status.updated',
        eventId,
        orderId: payload.session_id,
        payload: payload as Prisma.InputJsonValue,
      }));

    if (!payload.vendor_data) {
      await this.db.$transaction((tx) =>
        this.diditRepository.markWebhookProcessed(tx, event.id, false, 'Missing vendor_data')
      );
      throw new ValidationError('Didit webhook payload is missing vendor_data');
    }

    const user = await this.diditRepository.findUserById(payload.vendor_data);
    if (!user) {
      await this.db.$transaction((tx) =>
        this.diditRepository.markWebhookProcessed(tx, event.id, false, 'User not found')
      );
      throw new NotFoundError('User');
    }

    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          kycStatus: this.mapDiditStatus(payload.status),
        },
      });
      await this.diditRepository.markWebhookProcessed(tx, event.id, true);
    });
  }

  isTestWebhook(
    headers: Record<string, string | undefined>,
    payload: DiditWebhookPayload
  ): boolean {
    if (headers['x-didit-test-webhook'] === 'true') {
      return true;
    }

    const metadata = (payload as { metadata?: { test_webhook?: boolean } }).metadata;
    return metadata?.test_webhook === true;
  }

  private ensureConfigured() {
    if (!config.didit.apiKey || !config.didit.workflowId) {
      throw new ServiceUnavailableError(
        'Didit is not configured. Set DIDIT_API_KEY and DIDIT_WORKFLOW_ID on the backend'
      );
    }
  }

  private verifySignatureV2(payload: DiditWebhookPayload, signature: string): boolean {
    const canonical = JSON.stringify(this.sortKeys(payload));
    const expected = createHmac(canonical, config.didit.webhookSecret);
    return safeEqual(expected, signature);
  }

  private verifySignatureSimple(payload: DiditWebhookPayload, signature: string): boolean {
    const canonical = [
      payload.timestamp ?? '',
      payload.session_id ?? '',
      payload.status ?? '',
      payload.webhook_type ?? '',
    ].join(':');
    const expected = createHmac(canonical, config.didit.webhookSecret);
    return safeEqual(expected, signature);
  }

  private sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortKeys(item));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = this.sortKeys((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }

    return value;
  }

  private mapDiditStatus(status: string | undefined): KYCStatus {
    const normalized = status?.trim().toLowerCase();

    switch (normalized) {
      case 'approved':
        return KYCStatus.APPROVED;
      case 'declined':
      case 'expired':
        return KYCStatus.REJECTED;
      case 'in progress':
      case 'in review':
        return KYCStatus.SUBMITTED;
      case 'pending':
      case 'not started':
      default:
        return KYCStatus.PENDING;
    }
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      kycStatus: user.kycStatus,
      balance: toNumber(user.balance),
      createdAt: user.createdAt,
    };
  }
}
