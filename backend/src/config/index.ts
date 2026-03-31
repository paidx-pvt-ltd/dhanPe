import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  server: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseNumber(process.env.PORT, 3000),
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
    directUrl: process.env.DIRECT_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiry: process.env.JWT_EXPIRY ?? '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
  },
  cashfree: {
    clientId: process.env.CASHFREE_CLIENT_ID ?? '',
    clientSecret: process.env.CASHFREE_CLIENT_SECRET ?? '',
    baseUrl: process.env.CASHFREE_API_BASE_URL ?? 'https://sandbox.cashfree.com',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET ?? '',
    webhookSignatureHeader: process.env.CASHFREE_WEBHOOK_SIGNATURE_HEADER ?? 'x-webhook-signature',
    webhookTimestampHeader: process.env.CASHFREE_WEBHOOK_TIMESTAMP_HEADER ?? 'x-webhook-timestamp',
    payoutBaseUrl:
      process.env.CASHFREE_PAYOUT_BASE_URL ?? process.env.CASHFREE_API_BASE_URL ?? 'https://sandbox.cashfree.com',
  },
  risk: {
    maxTransactionAmount: parseNumber(process.env.RISK_MAX_TRANSACTION_AMOUNT, 50000),
    maxDailyVolume: parseNumber(process.env.RISK_MAX_DAILY_VOLUME, 100000),
    velocityWindowMinutes: parseNumber(process.env.RISK_VELOCITY_WINDOW_MINUTES, 10),
    velocityMaxTransactions: parseNumber(process.env.RISK_VELOCITY_MAX_TRANSACTIONS, 3),
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  queue: {
    concurrency: parseNumber(process.env.PAYOUT_QUEUE_CONCURRENCY, 1),
  },
};

export const validateConfig = (): void => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CASHFREE_CLIENT_ID',
    'CASHFREE_CLIENT_SECRET',
    'CASHFREE_WEBHOOK_SECRET',
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const placeholderValues = [
    process.env.CASHFREE_CLIENT_ID,
    process.env.CASHFREE_CLIENT_SECRET,
    process.env.CASHFREE_WEBHOOK_SECRET,
  ].filter((value) => value?.includes('your_cashfree'));

  if (placeholderValues.length > 0) {
    throw new Error('Cashfree credentials must be real values, placeholder values are not allowed');
  }
};
