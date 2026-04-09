import { PanInvalidError } from '../../shared/errors.js';
import { CashfreeClient } from '../payment/cashfree.client.js';

export class PanVerificationService {
  constructor(private readonly cashfreeClient: CashfreeClient) {}

  async verifyPan(panNumber: string, legalName?: string) {
    const normalizedPan = panNumber.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
      throw new PanInvalidError('PAN format is invalid');
    }

    const result = await this.cashfreeClient.verifyPan({
      pan: normalizedPan,
      name: legalName?.trim(),
    });

    if (!result.valid || !result.name) {
      throw new PanInvalidError('PAN could not be verified', result);
    }

    return {
      panNumber: normalizedPan,
      panName: result.name.trim(),
      panVerified: true,
      verificationMetadata: result,
    };
  }
}
