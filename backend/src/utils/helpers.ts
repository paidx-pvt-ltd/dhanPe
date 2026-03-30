import crypto from 'crypto';

/**
 * Generate a random string
 */
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate idempotency key from payment and webhook data
 */
export const generateIdempotencyKey = (
  paymentId: string,
  webhookData: Record<string, any>
): string => {
  const data = `${paymentId}-${JSON.stringify(webhookData)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  return amount.toFixed(decimals);
};

/**
 * Delay execution
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
