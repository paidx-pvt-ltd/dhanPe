import { User } from '@prisma/client';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { CashfreeClient } from '../payment/cashfree.client.js';

export class CashfreeBeneficiaryService {
  constructor(private readonly cashfreeClient: CashfreeClient) {}

  async registerPayoutBeneficiary(input: {
    beneficiaryId: string;
    user: User;
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
  }): Promise<string> {
    const providerBeneficiaryId = `bene_${input.beneficiaryId}`;
    const contactPhone =
      input.user.phoneNumber?.replace(/\D/g, '') ??
      input.user.mobileNumber.replace(/\D/g, '').slice(-10);
    const contactEmail =
      input.user.email?.trim() || `user+${input.user.id.slice(-8)}@users.dhanpe.local`;

    if (config.cashfree.payoutBaseUrl.includes('sandbox')) {
      logger.info(
        { beneficiaryId: input.beneficiaryId, providerBeneficiaryId },
        'Sandbox payout beneficiary registration skipped'
      );
      return providerBeneficiaryId;
    }

    try {
      const response = await this.cashfreeClient.createBeneficiary(
        {
          beneficiary_id: providerBeneficiaryId,
          beneficiary_name: input.accountHolderName,
          beneficiary_instrument_details: {
            bank_account_number: input.accountNumber,
            bank_ifsc: input.ifsc,
          },
          beneficiary_contact_details: {
            beneficiary_email: contactEmail,
            beneficiary_phone: contactPhone,
            beneficiary_country_code: input.user.countryCode ?? '+91',
            beneficiary_address: input.user.addressLine1 ?? 'NA',
            beneficiary_city: input.user.city ?? 'NA',
            beneficiary_state: input.user.state ?? 'NA',
            beneficiary_postal_code: input.user.postalCode ?? '000000',
          },
        },
        `beneficiary:${input.beneficiaryId}`
      );

      return response.beneficiary_id ?? providerBeneficiaryId;
    } catch (error) {
      throw new ExternalServiceError('Failed to register beneficiary with Cashfree payouts', error);
    }
  }
}
