import { BeneficiaryInvalidError, SelfTransferNotAllowedError } from '../../shared/errors.js';
import { CashfreeClient } from '../payment/cashfree.client.js';
import { isSelfTransfer } from './self-transfer.util.js';

export class BeneficiaryValidationService {
  constructor(private readonly cashfreeClient: CashfreeClient) {}

  async validateBankAccount(input: {
    accountNumber: string;
    ifsc: string;
    accountHolderName?: string;
    userPanName?: string | null;
  }) {
    const accountNumber = input.accountNumber.trim();
    const ifsc = input.ifsc.trim().toUpperCase();

    const result = await this.cashfreeClient.validateBankAccount({
      bankAccount: accountNumber,
      ifsc,
      name: input.accountHolderName?.trim(),
    });

    if (!result.valid || !result.accountHolderName) {
      throw new BeneficiaryInvalidError('Beneficiary bank account validation failed', result);
    }

    if (input.userPanName && isSelfTransfer(input.userPanName, result.accountHolderName)) {
      throw new SelfTransferNotAllowedError(
        'Beneficiary account holder matches the verified PAN holder name',
        {
          userPanName: input.userPanName,
          beneficiaryName: result.accountHolderName,
        }
      );
    }

    return {
      accountNumber,
      ifsc,
      accountHolderName: result.accountHolderName.trim(),
      isVerified: true,
      verificationMetadata: result,
    };
  }
}
