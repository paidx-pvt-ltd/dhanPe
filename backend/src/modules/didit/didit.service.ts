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
  decision_status?: string;
  verification_status?: string;
  timestamp?: number | string;
  vendor_data?: string;
  workflow_id?: string;
  webhook_type?: string;
  event_type?: string;
  data?: Record<string, unknown>;
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

    const timestamp = this.parseWebhookTimestamp(timestampHeader);
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
    const resolved = await this.resolveWebhookPayload(payload);
    const eventId =
      resolved.sessionId && resolved.status
        ? `${resolved.sessionId}:${resolved.status}:${resolved.timestamp ?? 'unknown'}`
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
        eventType: resolved.webhookType ?? 'status.updated',
        eventId,
        orderId: resolved.sessionId,
        payload: payload as Prisma.InputJsonValue,
      }));

    if (!resolved.vendorData) {
      await this.db.$transaction((tx) =>
        this.diditRepository.markWebhookProcessed(tx, event.id, false, 'Missing vendor_data')
      );
      throw new ValidationError('Didit webhook payload is missing vendor_data');
    }

    const user = await this.diditRepository.findUserById(resolved.vendorData);
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
          kycStatus: this.mapDiditStatus(resolved.status),
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

    if (config.server.env === 'production') {
      const appUrl = this.parseAppUrl(config.server.appUrl);
      if (!appUrl || appUrl.protocol !== 'https:' || this.isLocalhost(appUrl.hostname)) {
        throw new ServiceUnavailableError(
          'APP_URL must be a public HTTPS URL in production for Didit webhook callback sync'
        );
      }
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
      case 'success':
      case 'completed':
        return KYCStatus.APPROVED;
      case 'declined':
      case 'rejected':
      case 'failed':
      case 'expired':
        return KYCStatus.REJECTED;
      case 'in progress':
      case 'in review':
      case 'review':
      case 'under review':
        return KYCStatus.SUBMITTED;
      case 'pending':
      case 'not started':
      default:
        return KYCStatus.PENDING;
    }
  }

  private async resolveWebhookPayload(payload: DiditWebhookPayload): Promise<{
    sessionId?: string;
    status?: string;
    vendorData?: string;
    timestamp?: number | string;
    webhookType?: string;
  }> {
    const data = payload.data ?? {};
    const sessionId = this.asString(payload.session_id) ?? this.asString(data.session_id);
    const status =
      this.asString(payload.status) ??
      this.asString(payload.decision_status) ??
      this.asString(payload.verification_status) ??
      this.asString(data.status) ??
      this.asString(data.decision_status) ??
      this.asString(data.verification_status);
    const vendorData = this.asString(payload.vendor_data) ?? this.asString(data.vendor_data);
    const webhookType =
      this.asString(payload.webhook_type) ??
      this.asString(payload.event_type) ??
      this.asString(data.webhook_type) ??
      this.asString(data.event_type);
    const timestamp =
      payload.timestamp ??
      (typeof data.timestamp === 'number' || typeof data.timestamp === 'string'
        ? data.timestamp
        : undefined);

    if (sessionId && (!vendorData || !status)) {
      const session = await this.diditClient.getSession(sessionId);
      return {
        sessionId,
        status: status ?? session.status,
        vendorData: vendorData ?? session.vendor_data,
        timestamp,
        webhookType,
      };
    }

    return {
      sessionId,
      status,
      vendorData,
      timestamp,
      webhookType,
    };
  }

  private asString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private parseWebhookTimestamp(value: string): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return Number.NaN;
    }

    // Accept both epoch seconds and epoch milliseconds.
    return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
  }

  private parseAppUrl(value: string | undefined): URL | null {
    if (!value) {
      return null;
    }

    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  private isLocalhost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      mobileNumber: user.mobileNumber,
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
