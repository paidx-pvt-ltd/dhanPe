import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KYCStatus } from '@prisma/client';
import { UserService } from './user.service.js';

describe('UserService', () => {
  const userRepository = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
    updateKycStatus: vi.fn(),
  };

  const service = new UserService(userRepository as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the user as approved when identity verification completes', async () => {
    userRepository.updateKycStatus.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      firstName: 'Alex',
      lastName: 'Mercer',
      phoneNumber: '9999999999',
      kycStatus: KYCStatus.APPROVED,
      balance: '2500.00',
      createdAt: new Date('2026-04-05T00:00:00.000Z'),
    });

    const result = await service.completeKyc('user_1');

    expect(userRepository.updateKycStatus).toHaveBeenCalledWith(
      'user_1',
      KYCStatus.APPROVED
    );
    expect(result).toMatchObject({
      id: 'user_1',
      kycStatus: KYCStatus.APPROVED,
      balance: 2500,
    });
  });
});
