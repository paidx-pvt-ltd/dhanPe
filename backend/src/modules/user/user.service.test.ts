import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, PanInvalidError } from '../../shared/errors.js';
import { UserService } from './user.service.js';

describe('UserService', () => {
  const userRepository = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
    countBeneficiaries: vi.fn(),
    updatePan: vi.fn(),
  };
  const panVerificationService = {
    verifyPan: vi.fn(),
  };
  const onboardingService = {
    resolve: vi.fn(),
  };
  const diditService = {
    createSession: vi.fn(),
  };

  const service = new UserService(
    userRepository as never,
    panVerificationService as never,
    onboardingService as never,
    diditService as never
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the authenticated user profile', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      mobileNumber: '+919999999999',
      isMobileVerified: true,
      firstName: 'Alex',
      lastName: 'Mercer',
      phoneNumber: '9999999999',
      panNumber: null,
      panName: null,
      panVerified: false,
      panVerifiedAt: null,
      kycStatus: 'PENDING',
      balance: '2500.00',
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
    });

    const result = await service.getProfile('user_1');

    expect(userRepository.findById).toHaveBeenCalledWith('user_1');
    expect(result).toMatchObject({
      id: 'user_1',
      kycStatus: 'PENDING',
      balance: 2500,
    });
  });

  it('resolves onboarding status using beneficiary count', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user_1',
      kycStatus: 'PENDING',
    });
    userRepository.countBeneficiaries.mockResolvedValue(2);
    onboardingService.resolve.mockReturnValue({ step: 'completed' });

    const result = await service.getOnboardingStatus('user_1');

    expect(result).toEqual({ step: 'completed' });
    expect(onboardingService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user_1' }),
      2
    );
  });

  it('submits PAN successfully and returns verification metadata', async () => {
    userRepository.findById.mockResolvedValue({ id: 'user_1' });
    panVerificationService.verifyPan.mockResolvedValue({
      panNumber: 'ABCDE1234F',
      panName: 'Alex Mercer',
    });
    userRepository.updatePan.mockResolvedValue({
      id: 'user_1',
      mobileNumber: '+919999999999',
      panNumber: 'ABCDE1234F',
      panName: 'Alex Mercer',
      panVerified: true,
      panVerifiedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const result = await service.submitPan('user_1', {
      panNumber: 'ABCDE1234F',
      legalName: 'Alex Mercer',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user_1',
        panNumber: 'ABCDE1234F',
        panName: 'Alex Mercer',
        panVerified: true,
        verificationMethod: 'CASHFREE_PAN_API',
      })
    );
  });

  it('returns fallback details when PAN verification fails', async () => {
    userRepository.findById.mockResolvedValue({ id: 'user_1' });
    panVerificationService.verifyPan.mockRejectedValue(
      new PanInvalidError('Invalid PAN', { providerResponse: 'bad request' })
    );

    await expect(
      service.submitPan('user_1', {
        panNumber: 'INVALID',
        legalName: 'Alex Mercer',
      })
    ).rejects.toThrow(PanInvalidError);

    try {
      await service.submitPan('user_1', {
        panNumber: 'INVALID',
        legalName: 'Alex Mercer',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PanInvalidError);
      expect((error as PanInvalidError).details).toMatchObject({
        providerResponse: 'bad request',
        fallbackAvailable: true,
        fallbackRoute: '/api/users/pan/fallback',
      });
    }
  });

  it('creates a PAN fallback session through Didit', async () => {
    userRepository.findById.mockResolvedValue({ id: 'user_1' });
    diditService.createSession.mockResolvedValue({
      sessionId: 'session_1',
      sessionToken: 'session_token',
      verificationUrl: 'https://verify.didit.me/session/session_token',
      status: 'Not Started',
    });

    const result = await service.createPanFallbackSession('user_1');

    expect(result).toEqual(
      expect.objectContaining({
        sessionId: 'session_1',
        purpose: 'PAN_DOCUMENT_VERIFICATION',
      })
    );
  });
});
