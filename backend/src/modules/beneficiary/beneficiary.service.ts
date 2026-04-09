import { Prisma, PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { sha256 } from '../../utils/hash.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { PaymentRepository } from '../payment/payment.repository.js';
import { CreateBeneficiaryDto } from './beneficiary.schemas.js';

export class BeneficiaryService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly cashfreeClient: CashfreeClient,
    private readonly db: PrismaClient
  ) {}

  async list(userId: string) {
    const beneficiaries = await this.paymentRepository.listBeneficiaries(userId);
    return beneficiaries.map((beneficiary) => ({
      id: beneficiary.id,
      label: beneficiary.label,
      accountHolderName: beneficiary.accountHolderName,
      accountNumberMask: beneficiary.accountNumberMask,
      ifsc: beneficiary.ifsc,
      status: beneficiary.status,
      providerStatus: beneficiary.providerStatus,
      createdAt: beneficiary.createdAt,
      updatedAt: beneficiary.updatedAt,
    }));
  }

  async create(userId: string, input: CreateBeneficiaryDto) {
    const user = await this.paymentRepository.findUser(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const missing = [
      user.firstName,
      user.lastName,
      user.phoneNumber,
      user.addressLine1,
      user.city,
      user.state,
      user.postalCode,
    ].some((value) => !value?.trim());
    if (missing) {
      throw new ValidationError('Complete your profile before creating a beneficiary');
    }

    const accountNumberHash = sha256(
      `${input.accountNumber.trim()}|${input.ifsc.trim().toUpperCase()}`
    );
    const existing = await this.paymentRepository.findVerifiedBeneficiary(
      userId,
      accountNumberHash,
      input.ifsc.trim().toUpperCase()
    );
    if (existing) {
      return {
        id: existing.id,
        label: existing.label,
        accountHolderName: existing.accountHolderName,
        accountNumberMask: existing.accountNumberMask,
        ifsc: existing.ifsc,
        status: existing.status,
        providerStatus: existing.providerStatus,
      };
    }

    const beneficiary = await this.db.$transaction((tx) =>
      this.paymentRepository.createBeneficiary(tx, {
        userId,
        status: 'PENDING_VERIFICATION',
        accountHolderName: input.accountHolderName.trim(),
        accountNumberMask: this.maskAccountNumber(input.accountNumber),
        accountNumberHash,
        ifsc: input.ifsc.trim().toUpperCase(),
        label: input.label ?? input.bankName ?? input.accountHolderName,
        rawDetails: {
          accountHolderName: input.accountHolderName,
          accountNumber: input.accountNumber,
          ifsc: input.ifsc,
          bankName: input.bankName,
        },
      })
    );

    const providerBeneficiaryId = `bene_${beneficiary.id.slice(-18)}`;
    const providerBeneficiary = await this.cashfreeClient.createBeneficiary({
      beneficiary_id: providerBeneficiaryId,
      beneficiary_name: input.accountHolderName.trim(),
      beneficiary_instrument_details: {
        bank_account_number: input.accountNumber.trim(),
        bank_ifsc: input.ifsc.trim().toUpperCase(),
      },
      beneficiary_contact_details: {
        beneficiary_email: user.email,
        beneficiary_phone: user.phoneNumber!,
        beneficiary_country_code: user.countryCode ?? '+91',
        beneficiary_address: user.addressLine1!,
        beneficiary_city: user.city!,
        beneficiary_state: user.state!,
        beneficiary_postal_code: user.postalCode!,
      },
    });

    const updated = await this.paymentRepository.updateBeneficiary(beneficiary.id, {
      providerBeneficiaryId: providerBeneficiary.beneficiary_id,
      providerStatus: providerBeneficiary.beneficiary_status,
      status:
        providerBeneficiary.beneficiary_status === 'VERIFIED' ? 'VERIFIED' : 'PENDING_VERIFICATION',
      verificationMetadata: providerBeneficiary as unknown as Prisma.JsonObject,
    });

    return {
      id: updated.id,
      label: updated.label,
      accountHolderName: updated.accountHolderName,
      accountNumberMask: updated.accountNumberMask,
      ifsc: updated.ifsc,
      status: updated.status,
      providerStatus: updated.providerStatus,
    };
  }

  private maskAccountNumber(accountNumber: string) {
    const last4 = accountNumber.slice(-4);
    return `XXXXXX${last4}`;
  }
}
