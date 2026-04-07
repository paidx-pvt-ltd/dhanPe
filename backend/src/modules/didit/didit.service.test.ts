import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KYCStatus } from '@prisma/client';
import { config } from '../../config/index.js';
import { DiditService } from './didit.service.js';

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

    expect(diditRepository.updateUserKycStatus).toHaveBeenCalledWith(
      'user_1',
      KYCStatus.APPROVED
    );
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
});
