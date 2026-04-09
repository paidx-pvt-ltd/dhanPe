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
import { ExternalServiceError, NotFoundError, ValidationError } from '../../shared/errors.js';
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
    private readonly db: PrismaClient
  ) {}

  async createTransfer(userId: string, input: CreateTransferDto, idempotencyKey?: string) {
    const user = await this.paymentRepository.findUser(userId);
    if (!user || !user.isActive) {
      throw new NotFoundError('User');
    }

    if (user.kycStatus !== KYCStatus.APPROVED) {
      throw new ValidationError('User KYC is not approved');
    }

    if (!user.phoneNumber?.trim()) {
      throw new ValidationError('Add a phone number to your profile before starting a transfer');
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
        customer_email: user.email,
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
    const resolvedBeneficiary =
      !beneficiary.providerBeneficiaryId || beneficiary.providerStatus !== 'VERIFIED'
        ? await this.syncCashfreeBeneficiary(beneficiary, {
            userId,
            accountHolderName: bankAccount.accountHolderName,
            accountNumber: bankAccount.accountNumber,
            ifsc: bankAccount.ifsc,
          })
        : beneficiary;

    return {
      beneficiary: resolvedBeneficiary,
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
    const accountNumberHash = sha256(
      `${bankAccount.accountNumber.trim()}|${bankAccount.ifsc.trim().toUpperCase()}`
    );
    const existing = await this.paymentRepository.findVerifiedBeneficiary(
      userId,
      accountNumberHash,
      bankAccount.ifsc.trim().toUpperCase()
    );

    if (existing) {
      if (!existing.providerBeneficiaryId || existing.providerStatus !== 'VERIFIED') {
        return this.syncCashfreeBeneficiary(existing, {
          userId,
          accountHolderName: bankAccount.accountHolderName,
          accountNumber: bankAccount.accountNumber,
          ifsc: bankAccount.ifsc,
        });
      }
      return existing;
    }

    const beneficiary = await this.db.$transaction((tx) =>
      this.paymentRepository.createBeneficiary(tx, {
        userId,
        status: 'PENDING_VERIFICATION',
        accountHolderName: bankAccount.accountHolderName.trim(),
        accountNumberMask: this.maskAccountNumber(bankAccount.accountNumber),
        accountNumberHash,
        ifsc: bankAccount.ifsc.trim().toUpperCase(),
        label: bankAccount.bankName ?? bankAccount.accountHolderName,
        rawDetails: bankAccount as unknown as Prisma.InputJsonValue,
      })
    );

    return this.syncCashfreeBeneficiary(beneficiary, {
      userId,
      accountHolderName: bankAccount.accountHolderName,
      accountNumber: bankAccount.accountNumber,
      ifsc: bankAccount.ifsc,
    });
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

  private async syncCashfreeBeneficiary(
    beneficiary: Pick<
      Beneficiary,
      'id' | 'userId' | 'accountHolderName' | 'providerBeneficiaryId' | 'status'
    >,
    instrument: {
      userId: string;
      accountHolderName: string;
      accountNumber: string;
      ifsc: string;
    }
  ) {
    const user = await this.paymentRepository.findUser(instrument.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const providerBeneficiaryId =
      beneficiary.providerBeneficiaryId ?? `bene_${beneficiary.id.slice(-18)}`;

    try {
      const providerBeneficiary = await this.cashfreeClient.createBeneficiary({
        beneficiary_id: providerBeneficiaryId,
        beneficiary_name: instrument.accountHolderName.trim(),
        beneficiary_instrument_details: {
          bank_account_number: instrument.accountNumber.trim(),
          bank_ifsc: instrument.ifsc.trim().toUpperCase(),
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

      return this.paymentRepository.updateBeneficiary(beneficiary.id, {
        providerBeneficiaryId: providerBeneficiary.beneficiary_id,
        providerStatus: providerBeneficiary.beneficiary_status,
        status:
          providerBeneficiary.beneficiary_status === 'VERIFIED'
            ? 'VERIFIED'
            : 'PENDING_VERIFICATION',
        verificationMetadata: providerBeneficiary as unknown as Prisma.InputJsonValue,
      });
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        await this.paymentRepository.updateBeneficiary(beneficiary.id, {
          providerBeneficiaryId,
          providerStatus: 'PENDING',
        });
      }

      throw error;
    }
  }

  private extractBankAccountFromBeneficiary(beneficiary: Beneficiary) {
    const rawDetails =
      typeof beneficiary.rawDetails === 'object' && beneficiary.rawDetails !== null
        ? (beneficiary.rawDetails as Record<string, unknown>)
        : null;
    const accountHolderName = rawDetails?.accountHolderName?.toString().trim();
    const accountNumber = rawDetails?.accountNumber?.toString().trim();
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
