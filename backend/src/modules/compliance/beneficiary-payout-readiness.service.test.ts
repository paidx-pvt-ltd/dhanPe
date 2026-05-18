import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BeneficiaryPayoutReadinessService } from './beneficiary-payout-readiness.service.js';

describe('BeneficiaryPayoutReadinessService', () => {
  const paymentRepository = {
    updateBeneficiary: vi.fn(),
  };
  const cashfreeBeneficiaryService = {
    registerPayoutBeneficiary: vi.fn(),
  };

  const service = new BeneficiaryPayoutReadinessService(
    paymentRepository as never,
    cashfreeBeneficiaryService as never
  );

  const user = {
    id: 'user_1',
    mobileNumber: '+919999999999',
    phoneNumber: '9999999999',
    email: null,
    addressLine1: 'Line 1',
    city: 'City',
    state: 'State',
    postalCode: '560001',
    countryCode: '+91',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers legacy beneficiaries that are missing providerBeneficiaryId', async () => {
    const beneficiary = {
      id: 'beneficiary_1',
      providerBeneficiaryId: null,
      accountHolderName: 'Vendor Payee',
      accountNumber: '1234567890',
      ifsc: 'HDFC0001234',
      rawDetails: {
        accountHolderName: 'Vendor Payee',
        accountNumber: '1234567890',
        ifsc: 'HDFC0001234',
      },
    };

    cashfreeBeneficiaryService.registerPayoutBeneficiary.mockResolvedValue('bene_beneficiary_1');
    paymentRepository.updateBeneficiary.mockResolvedValue({
      ...beneficiary,
      providerBeneficiaryId: 'bene_beneficiary_1',
      status: 'VERIFIED',
      isVerified: true,
      providerStatus: 'VERIFIED',
    });

    const result = await service.ensureReady(user as never, beneficiary as never);

    expect(cashfreeBeneficiaryService.registerPayoutBeneficiary).toHaveBeenCalledTimes(1);
    expect(result.providerBeneficiaryId).toBe('bene_beneficiary_1');
  });

  it('skips registration when providerBeneficiaryId already exists', async () => {
    const beneficiary = {
      id: 'beneficiary_1',
      providerBeneficiaryId: 'bene_existing',
      accountHolderName: 'Vendor Payee',
      accountNumber: '1234567890',
      ifsc: 'HDFC0001234',
      rawDetails: {},
    };

    const result = await service.ensureReady(user as never, beneficiary as never);

    expect(cashfreeBeneficiaryService.registerPayoutBeneficiary).not.toHaveBeenCalled();
    expect(result.providerBeneficiaryId).toBe('bene_existing');
  });
});
