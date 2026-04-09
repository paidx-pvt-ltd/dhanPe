import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { BeneficiaryValidationService } from '../compliance/beneficiary-validation.service.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { sha256 } from '../../utils/hash.js';
import { PaymentRepository } from '../payment/payment.repository.js';
import { CreateBeneficiaryDto } from './beneficiary.schemas.js';

export class BeneficiaryService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly beneficiaryValidationService: BeneficiaryValidationService,
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
      isVerified: beneficiary.isVerified,
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
        isVerified: existing.isVerified,
        status: existing.status,
        providerStatus: existing.providerStatus,
      };
    }

    const validated = await this.beneficiaryValidationService.validateBankAccount({
      accountNumber: input.accountNumber,
      ifsc: input.ifsc,
      accountHolderName: input.accountHolderName,
      userPanName: user.panVerified ? user.panName : null,
    });

    const beneficiary = await this.db.$transaction((tx) =>
      this.paymentRepository.createBeneficiary(tx, {
        userId,
        status: 'PENDING_VERIFICATION',
        accountHolderName: validated.accountHolderName,
        accountNumber: validated.accountNumber,
        accountNumberMask: this.maskAccountNumber(input.accountNumber),
        accountNumberHash,
        ifsc: validated.ifsc,
        isVerified: validated.isVerified,
        label: input.label ?? input.bankName ?? validated.accountHolderName,
        rawDetails: {
          accountHolderName: validated.accountHolderName,
          accountNumber: validated.accountNumber,
          ifsc: validated.ifsc,
          bankName: input.bankName,
        },
      })
    );

    logger.info(
      {
        userId,
        beneficiaryId: beneficiary.id,
        accountNumberMask: beneficiary.accountNumberMask,
        ifsc: beneficiary.ifsc,
      },
      'Beneficiary added after bank validation'
    );

    const updated = await this.paymentRepository.updateBeneficiary(beneficiary.id, {
      status: 'VERIFIED',
      providerStatus: 'VERIFIED',
      isVerified: true,
      verificationMetadata: validated.verificationMetadata as unknown as Prisma.JsonObject,
    });

    return {
      id: updated.id,
      label: updated.label,
      accountHolderName: updated.accountHolderName,
      accountNumberMask: updated.accountNumberMask,
      ifsc: updated.ifsc,
      isVerified: updated.isVerified,
      status: updated.status,
      providerStatus: updated.providerStatus,
    };
  }

  private maskAccountNumber(accountNumber: string) {
    const last4 = accountNumber.slice(-4);
    return `XXXXXX${last4}`;
  }
}
