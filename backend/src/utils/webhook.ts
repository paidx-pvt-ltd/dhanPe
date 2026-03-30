import crypto from 'crypto';
import { config } from '../config';

export class WebhookService {
  /**
   * Verify Cashfree webhook signature
   */
  static verifySignature(
    payload: string,
    signature: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.webhook.secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify Cashfree webhook (using their specific format)
   * Cashfree provides: X-Cashfree-Signature header
   */
  static verifyCashfreeWebhook(
    payload: Record<string, any>,
    signature: string
  ): boolean {
    // Cashfree uses SHA256 hash of the JSON payload
    const data = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', config.cashfree.clientSecret)
      .update(data)
      .digest('hex');

    return signature === expectedSignature;
  }
}
