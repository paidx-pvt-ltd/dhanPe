import {
  Beneficiary,
  KYCStatus,
  PaymentProvider,
  PayoutStatus,
  Prisma,
  PrismaClient,
  TransactionLifecycleState,
  TransactionStatus,
} from '@prisma/client';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { BeneficiaryValidationService } from '../compliance/beneficiary-validation.service.js';
import {
  BeneficiaryInvalidError,
  NotFoundError,
  PanRequiredError,
  ValidationError,
} from '../../shared/errors.js';
import { sha256 } from '../../utils/hash.js';
import { RiskService } from '../risk/risk.service.js';
import { TransactionStateService } from '../transaction/transaction-state.service.js';
import { PaymentRepository } from './payment.repository.js';
import { CashfreeClient } from './cashfree.client.js';
import { BankAccountDto, CreateTransferDto } from './payment.schemas.js';

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly riskService: RiskService,
    private readonly transactionStateService: TransactionStateService,
    private readonly cashfreeClient: CashfreeClient,
    private readonly beneficiaryValidationService: BeneficiaryValidationService,
    private readonly db: PrismaClient
  ) {}

  async createTransfer(userId: string, input: CreateTransferDto, idempotencyKey?: string) {
    const user = await this.paymentRepository.findUser(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User');
    }

    if (!user.isMobileVerified) {
      throw new ValidationError('Mobile number must be verified before initiating transfer');
    }

    if (user.kycStatus !== KYCStatus.APPROVED) {
      throw new ValidationError('User KYC is not approved');
    }

    if (!user.panVerified || !user.panName || !user.panNumber) {
      throw new PanRequiredError();
    }

    this.assertBeneficiaryProfile(user);

    const requestHash = sha256(JSON.stringify(input));
    if (idempotencyKey) {
      const existingKey = await this.paymentRepository.findIdempotencyKey(idempotencyKey);
      if (existingKey?.requestHash === requestHash && existingKey.responseBody) {
        return existingKey.responseBody;
      }
    }

    await this.riskService.evaluateTransfer(userId, input.amount);

    const pricing = this.calculatePricing(input.amount);
    const merchantOrderId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { beneficiary, bankAccount } = await this.resolveTransferInstrument(userId, input);
    if (!beneficiary.isVerified || beneficiary.status !== 'VERIFIED') {
      throw new BeneficiaryInvalidError('Beneficiary must be verified before transfer');
    }

    const transaction = await this.db.$transaction((tx) =>
      this.paymentRepository.createTransaction(tx, {
        userId,
        amount: pricing.grossAmount.toFixed(2),
        grossAmount: pricing.grossAmount.toFixed(2),
        platformFeeAmount: pricing.platformFeeAmount.toFixed(2),
        taxAmount: pricing.taxAmount.toFixed(2),
        netPayoutAmount: pricing.netPayoutAmount.toFixed(2),
        currency: 'INR',
        feeRuleVersion: pricing.feeRuleVersion,
        status: TransactionStatus.INITIATED,
        paymentProvider: PaymentProvider.CASHFREE,
        orderId: merchantOrderId,
        payoutStatus: PayoutStatus.QUEUED,
        bankAccount: this.maskBankAccount(bankAccount),
        beneficiaryId: beneficiary.id,
        description: input.description,
        idempotencyKey,
      })
    );

    await this.transactionStateService.transitionTransactionState(
      transaction.id,
      TransactionLifecycleState.PAYMENT_PENDING,
      {
        reason: 'Transfer initiated and waiting for payment confirmation',
      }
    );

    const order = await this.cashfreeClient.createOrder({
      order_id: merchantOrderId,
      order_amount: pricing.grossAmount,
      order_currency: 'INR',
      order_note: input.description,
      customer_details: {
        customer_id: user.id,
        customer_email: user.email ?? undefined,
        customer_phone: user.phoneNumber ?? undefined,
      },
      order_meta: {
        notify_url: `${config.server.appUrl}/webhook/cashfree`,
      },
    });

    await this.paymentRepository.updateTransactionOrder(transaction.id, {
      providerOrderId: order.cf_order_id,
      metadata: order as unknown as Prisma.InputJsonValue,
    });

    const response = {
      transactionId: transaction.id,
      orderId: merchantOrderId,
      paymentSessionId: order.payment_session_id ?? order.order_token,
      orderToken: order.order_token,
      amount: pricing.grossAmount,
      grossAmount: pricing.grossAmount,
      platformFeeAmount: pricing.platformFeeAmount,
      taxAmount: pricing.taxAmount,
      netPayoutAmount: pricing.netPayoutAmount,
      beneficiary: {
        id: beneficiary.id,
        accountHolderName: beneficiary.accountHolderName,
        accountNumberMask: beneficiary.accountNumberMask,
        ifsc: beneficiary.ifsc,
        isVerified: beneficiary.isVerified,
        status: beneficiary.status,
      },
      status: transaction.status,
    };

    if (idempotencyKey) {
      await this.paymentRepository.saveIdempotencyRecord({
        key: idempotencyKey,
        scope: 'TRANSFER',
        userId,
        requestHash,
        resourceId: transaction.id,
        responseBody: response,
      });
    }

    return response;
  }

  private async resolveTransferInstrument(userId: string, input: CreateTransferDto) {
    if (input.bankAccount) {
      const beneficiary = await this.ensureBeneficiary(userId, input.bankAccount);
      return {
        beneficiary,
        bankAccount: input.bankAccount,
      };
    }

    const beneficiary = await this.paymentRepository.findBeneficiaryById(
      userId,
      input.beneficiaryId!
    );
    if (!beneficiary) {
      throw new NotFoundError('Beneficiary');
    }

    const bankAccount = this.extractBankAccountFromBeneficiary(beneficiary);

    return {
      beneficiary,
      bankAccount,
    };
  }

  private calculatePricing(netPayoutAmount: number) {
    const feeRate = 0.015;
    const taxRate = 0;
    const platformFeeAmount = Number((netPayoutAmount * feeRate).toFixed(2));
    const taxAmount = Number((platformFeeAmount * taxRate).toFixed(2));
    const grossAmount = Number((netPayoutAmount + platformFeeAmount + taxAmount).toFixed(2));

    return {
      grossAmount,
      platformFeeAmount,
      taxAmount,
      netPayoutAmount: Number(netPayoutAmount.toFixed(2)),
      feeRuleVersion: 'v1',
    };
  }

  private async ensureBeneficiary(userId: string, bankAccount: BankAccountDto) {
    const user = await this.paymentRepository.findUser(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const accountNumberHash = sha256(
      `${bankAccount.accountNumber.trim()}|${bankAccount.ifsc.trim().toUpperCase()}`
    );
    const existing = await this.paymentRepository.findVerifiedBeneficiary(
      userId,
      accountNumberHash,
      bankAccount.ifsc.trim().toUpperCase()
    );

    if (existing) {
      return existing;
    }

    const validated = await this.beneficiaryValidationService.validateBankAccount({
      accountNumber: bankAccount.accountNumber,
      ifsc: bankAccount.ifsc,
      accountHolderName: bankAccount.accountHolderName,
      userPanName: user.panName,
    });

    const beneficiary = await this.db.$transaction((tx) =>
      this.paymentRepository.createBeneficiary(tx, {
        userId,
        status: 'VERIFIED',
        accountHolderName: validated.accountHolderName,
        accountNumber: validated.accountNumber,
        accountNumberMask: this.maskAccountNumber(bankAccount.accountNumber),
        accountNumberHash,
        ifsc: validated.ifsc,
        isVerified: true,
        label: bankAccount.bankName ?? validated.accountHolderName,
        rawDetails: bankAccount as unknown as Prisma.InputJsonValue,
        providerStatus: 'VERIFIED',
        verificationMetadata: validated.verificationMetadata as unknown as Prisma.InputJsonValue,
      })
    );

    logger.info(
      {
        userId,
        beneficiaryId: beneficiary.id,
        accountNumberMask: beneficiary.accountNumberMask,
      },
      'Inline beneficiary validated during transfer'
    );

    return beneficiary;
  }

  private maskBankAccount(input: BankAccountDto) {
    return {
      accountHolderName: input.accountHolderName,
      accountNumberMask: this.maskAccountNumber(input.accountNumber),
      ifsc: input.ifsc.trim().toUpperCase(),
      bankName: input.bankName,
    } as unknown as Prisma.InputJsonValue;
  }

  private maskAccountNumber(accountNumber: string) {
    const last4 = accountNumber.slice(-4);
    return `XXXXXX${last4}`;
  }

  private assertBeneficiaryProfile(user: {
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
  }) {
    const missing = [
      ['firstName', user.firstName],
      ['lastName', user.lastName],
      ['phoneNumber', user.phoneNumber],
      ['addressLine1', user.addressLine1],
      ['city', user.city],
      ['state', user.state],
      ['postalCode', user.postalCode],
    ]
      .filter(([, value]) => !value?.toString().trim())
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new ValidationError(
        `Complete your profile before starting a payout-backed transfer: ${missing.join(', ')}`
      );
    }
  }

  private extractBankAccountFromBeneficiary(beneficiary: Beneficiary) {
    const rawDetails =
      typeof beneficiary.rawDetails === 'object' && beneficiary.rawDetails !== null
        ? (beneficiary.rawDetails as Record<string, unknown>)
        : null;
    const accountHolderName = rawDetails?.accountHolderName?.toString().trim();
    const accountNumber =
      rawDetails?.accountNumber?.toString().trim() ?? beneficiary.accountNumber.trim();
    const ifsc = rawDetails?.ifsc?.toString().trim();
    const bankName = rawDetails?.bankName?.toString().trim();

    if (!accountHolderName || !accountNumber || !ifsc) {
      throw new ValidationError('Selected beneficiary is missing bank details');
    }

    return {
      accountHolderName,
      accountNumber,
      ifsc,
      bankName: bankName && bankName.length > 0 ? bankName : undefined,
    };
  }
}
