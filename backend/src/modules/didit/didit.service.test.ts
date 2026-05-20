import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KYCStatus } from '@prisma/client';
import { config } from '../../config/index.js';
import { DiditService } from './didit.service.js';
import { createHmac } from '../../utils/hash.js';
import {
  AuthenticationError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../../shared/errors.js';

type WebhookHeaders = Record<string, string | undefined>;

const createSortedJsonSignature = (payload: Record<string, unknown>, secret: string) => {
  const canonical = JSON.stringify(
    Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {})
  );
  return createHmac(canonical, secret);
};

const createSimpleSignature = (
  timestamp: string,
  sessionId: string,
  status: string,
  webhookType: string,
  secret: string
) => createHmac([timestamp, sessionId, status, webhookType].join(':'), secret);

describe('DiditService', () => {
  const diditRepository = {
    findUserById: vi.fn(),
    updateUserKycStatus: vi.fn(),
    findWebhookEventByEventId: vi.fn(),
    createWebhookEvent: vi.fn(),
    markWebhookProcessed: vi.fn(),
  };
  const diditClient = {
    createSession: vi.fn(),
    getSession: vi.fn(),
  };
  const db = {
    $transaction: vi.fn(),
  };

  const service = new DiditService(diditRepository as never, diditClient as never, db as never);

  beforeEach(() => {
    vi.clearAllMocks();
    config.didit.apiKey = 'didit-api-key';
    config.didit.workflowId = 'workflow_1';
    config.didit.webhookSecret = 'didit-webhook-secret';
  });

  it('creates a session token for the authenticated user', async () => {
    diditRepository.findUserById.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      isActive: true,
      kycStatus: KYCStatus.PENDING,
    });
    diditClient.createSession.mockResolvedValue({
      session_id: 'session_1',
      session_token: 'session-token',
      verification_url: 'https://verify.didit.me/session/session-token',
      status: 'Not Started',
    });

    const result = await service.createSession('user_1');

    expect(diditClient.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        vendor_data: 'user_1',
      })
    );
    expect(result).toEqual({
      sessionId: 'session_1',
      sessionToken: 'session-token',
      verificationUrl: 'https://verify.didit.me/session/session-token',
      status: 'Not Started',
    });
  });

  it('syncs an approved session back to the user profile', async () => {
    diditClient.getSession.mockResolvedValue({
      session_id: 'session_1',
      workflow_id: 'workflow_1',
      vendor_data: 'user_1',
      status: 'Approved',
      verification_url: 'https://verify.didit.me/session/session-token',
    });
    diditRepository.updateUserKycStatus.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      firstName: 'Alex',
      lastName: 'Mercer',
      phoneNumber: '9999999999',
      kycStatus: KYCStatus.APPROVED,
      balance: '2500.00',
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
    });

    const result = await service.syncSession('user_1', 'session_1');

    expect(diditRepository.updateUserKycStatus).toHaveBeenCalledWith('user_1', KYCStatus.APPROVED);
    expect(result.profile).toMatchObject({
      id: 'user_1',
      kycStatus: KYCStatus.APPROVED,
      balance: 2500,
    });
    expect(result.session).toEqual({
      sessionId: 'session_1',
      workflowId: 'workflow_1',
      verificationUrl: 'https://verify.didit.me/session/session-token',
      status: 'Approved',
    });
  });

  it('validates Didit webhook signature with v2 signing', () => {
    const payload = {
      session_id: 'session_1',
      status: 'approved',
      timestamp: 1700000000,
    };
    const signature = createSortedJsonSignature(payload, config.didit.webhookSecret);

    expect(() =>
      service.verifyWebhookSignature(payload, {
        'x-timestamp': '1700000000',
        'x-signature-v2': signature,
      } as WebhookHeaders)
    ).not.toThrow();
  });

  it('validates Didit webhook signature with simple signing', () => {
    const payload = {
      session_id: 'session_1',
      status: 'approved',
      timestamp: '1700000000',
      webhook_type: 'status.updated',
    };
    const signature = createSimpleSignature(
      payload.timestamp as String,
      payload.session_id as string,
      payload.status as string,
      payload.webhook_type as string,
      config.didit.webhookSecret
    );

    expect(() =>
      service.verifyWebhookSignature(payload, {
        'x-timestamp': '1700000000',
        'x-signature-simple': signature,
      } as WebhookHeaders)
    ).not.toThrow();
  });

  it('throws when Didit webhook timestamp is missing', () => {
    expect(() =>
      service.verifyWebhookSignature(
        { session_id: 'session_1', status: 'approved' },
        {}
      )
    ).toThrow(ValidationError);
  });

  it('throws when Didit webhook signature is invalid', () => {
    expect(() =>
      service.verifyWebhookSignature(
        { session_id: 'session_1', status: 'approved', timestamp: '1700000000' },
        {
          'x-timestamp': '1700000000',
          'x-signature-v2': 'invalid-signature',
        } as WebhookHeaders
      )
    ).toThrow(ValidationError);
  });

  it('reports test webhooks when headers or metadata indicate a test', () => {
    expect(
      service.isTestWebhook({ 'x-didit-test-webhook': 'true' }, {})
    ).toBe(true);
    expect(
      service.isTestWebhook({}, { metadata: { test_webhook: true } })
    ).toBe(true);
    expect(service.isTestWebhook({}, {})).toBe(false);
  });

  it('rejects an event with missing session data', async () => {
    diditRepository.findWebhookEventByEventId.mockResolvedValue(null);
    diditRepository.createWebhookEvent.mockResolvedValue({ id: 'event_1' });
    db.$transaction.mockImplementation(async (handler) => handler({}));

    await expect(service.processWebhook({})).rejects.toThrow(ValidationError);
    expect(diditRepository.markWebhookProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'event_1',
      false,
      'Missing vendor_data'
    );
  });

  it('rejects a webhook when the referenced user cannot be found', async () => {
    diditRepository.findWebhookEventByEventId.mockResolvedValue(null);
    diditRepository.createWebhookEvent.mockResolvedValue({ id: 'event_1' });
    diditRepository.findUserById.mockResolvedValue(null);
    db.$transaction.mockImplementation(async (handler) => handler({}));

    await expect(
      service.processWebhook({
        session_id: 'session_1',
        status: 'approved',
        vendor_data: 'user_1',
        timestamp: 1700000000,
      })
    ).rejects.toThrow(NotFoundError);

    expect(diditRepository.markWebhookProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'event_1',
      false,
      'User not found'
    );
  });

  it('fails if Didit configuration is missing', () => {
    config.didit.apiKey = '';
    const badService = new DiditService(diditRepository as never, diditClient as never, db as never);

    expect(badService.createSession('user_1')).rejects.toThrow(ServiceUnavailableError);
  });
});
