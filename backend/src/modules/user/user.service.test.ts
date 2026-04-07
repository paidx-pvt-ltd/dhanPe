import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from './user.service.js';

describe('UserService', () => {
  const userRepository = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  };

  const service = new UserService(userRepository as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the authenticated user profile', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
      firstName: 'Alex',
      lastName: 'Mercer',
      phoneNumber: '9999999999',
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
});
