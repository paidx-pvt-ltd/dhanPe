import crypto from 'crypto';

export const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

export const createHmac = (value: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(value).digest('hex');

export const safeEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};
