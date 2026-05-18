import { Beneficiary, User } from '@prisma/client';
import { ValidationError } from '../../shared/errors.js';
import { PaymentRepository } from '../payment/payment.repository.js';
import { CashfreeBeneficiaryService } from './cashfree-beneficiary.service.js';

export class BeneficiaryPayoutReadinessService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly cashfreeBeneficiaryService: CashfreeBeneficiaryService
  ) {}

  async ensureReady(user: User, beneficiary: Beneficiary): Promise<Beneficiary> {
    if (beneficiary.providerBeneficiaryId) {
      return beneficiary;
    }

    const bankDetails = this.extractBankDetails(beneficiary);
    const providerBeneficiaryId = await this.cashfreeBeneficiaryService.registerPayoutBeneficiary({
      beneficiaryId: beneficiary.id,
      user,
      accountHolderName: bankDetails.accountHolderName,
      accountNumber: bankDetails.accountNumber,
      ifsc: bankDetails.ifsc,
    });

    return this.paymentRepository.updateBeneficiary(beneficiary.id, {
      providerBeneficiaryId,
      status: 'VERIFIED',
      providerStatus: 'VERIFIED',
      isVerified: true,
    });
  }

  private extractBankDetails(beneficiary: Beneficiary) {
    const rawDetails =
      typeof beneficiary.rawDetails === 'object' && beneficiary.rawDetails !== null
        ? (beneficiary.rawDetails as Record<string, unknown>)
        : null;

    const accountHolderName =
      rawDetails?.accountHolderName?.toString().trim() ?? beneficiary.accountHolderName.trim();
    const accountNumber =
      rawDetails?.accountNumber?.toString().trim() ?? beneficiary.accountNumber.trim();
    const ifsc = rawDetails?.ifsc?.toString().trim() ?? beneficiary.ifsc?.trim();

    if (!accountHolderName || !accountNumber || !ifsc) {
      throw new ValidationError('Beneficiary is missing bank details required for payout registration');
    }

    return {
      accountHolderName,
      accountNumber,
      ifsc: ifsc.toUpperCase(),
    };
  }
}

export const mapBeneficiaryResponse = (beneficiary: Beneficiary) => ({
  id: beneficiary.id,
  label: beneficiary.label,
  accountHolderName: beneficiary.accountHolderName,
  accountNumberMask: beneficiary.accountNumberMask,
  ifsc: beneficiary.ifsc,
  isVerified: beneficiary.isVerified,
  status: beneficiary.status,
  providerStatus: beneficiary.providerStatus,
  providerBeneficiaryId: beneficiary.providerBeneficiaryId,
});
