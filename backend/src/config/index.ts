import dotenv from 'dotenv';
import jwt, { SignOptions } from 'jsonwebtoken';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return ['http://localhost:3000'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

export const config = {
  server: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseNumber(process.env.PORT, 3000),
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
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
    payoutClientId: process.env.CASHFREE_PAYOUT_CLIENT_ID ?? process.env.CASHFREE_CLIENT_ID ?? '',
    payoutClientSecret:
      process.env.CASHFREE_PAYOUT_CLIENT_SECRET ?? process.env.CASHFREE_CLIENT_SECRET ?? '',
    baseUrl: process.env.CASHFREE_API_BASE_URL ?? 'https://sandbox.cashfree.com',
    webhookSecret: process.env.CASHFREE_WEBHOOK_SECRET ?? process.env.WEBHOOK_SECRET ?? '',
    webhookSignatureHeader: process.env.CASHFREE_WEBHOOK_SIGNATURE_HEADER ?? 'x-webhook-signature',
    webhookTimestampHeader: process.env.CASHFREE_WEBHOOK_TIMESTAMP_HEADER ?? 'x-webhook-timestamp',
    payoutBaseUrl: process.env.CASHFREE_PAYOUT_BASE_URL ?? 'https://payout-api.cashfree.com',
  },
  didit: {
    apiKey: process.env.DIDIT_API_KEY ?? '',
    workflowId: process.env.DIDIT_WORKFLOW_ID ?? '',
    baseUrl: process.env.DIDIT_API_BASE_URL ?? 'https://verification.didit.me/v3',
    webhookSecret: process.env.DIDIT_WEBHOOK_SECRET ?? '',
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
  redis: {
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  },
  queue: {
    concurrency: parseNumber(process.env.PAYOUT_QUEUE_CONCURRENCY, 1),
    pollIntervalMs: parseNumber(process.env.PAYOUT_QUEUE_POLL_INTERVAL_MS, 15000),
  },
  auth: {
    otpExpiryMinutes: parseNumber(process.env.OTP_EXPIRY_MINUTES, 5),
    otpMaxAttempts: parseNumber(process.env.OTP_MAX_ATTEMPTS, 5),
  },
  msg91: {
    authKey: process.env.MSG91_AUTH_KEY ?? '',
    widgetId: process.env.MSG91_WIDGET_ID ?? '',
    widgetEnabled: parseBoolean(
      process.env.MSG91_WIDGET_ENABLED,
      process.env.NODE_ENV === 'production'
    ),
    baseUrl: process.env.MSG91_BASE_URL ?? 'https://api.msg91.com',
  },
  reconciliation: {
    enabled: parseBoolean(process.env.RECONCILIATION_ENABLED, true),
    intervalMs: parseNumber(process.env.RECONCILIATION_INTERVAL_MS, 300000),
  },
};

export const validateConfig = (): void => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CASHFREE_CLIENT_ID',
    'CASHFREE_CLIENT_SECRET',
    'CASHFREE_PAYOUT_CLIENT_ID',
    'CASHFREE_PAYOUT_CLIENT_SECRET',
    'CASHFREE_WEBHOOK_SECRET',
    'REDIS_URL',
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Use separate Cashfree key pairs for PG and Payout integrations.'
    );
  }

  const placeholderValues = [
    process.env.CASHFREE_CLIENT_ID,
    process.env.CASHFREE_CLIENT_SECRET,
    process.env.CASHFREE_PAYOUT_CLIENT_ID,
    process.env.CASHFREE_PAYOUT_CLIENT_SECRET,
    process.env.CASHFREE_WEBHOOK_SECRET,
  ].filter((value) => value?.includes('your_cashfree'));

  if (placeholderValues.length > 0) {
    throw new Error('Cashfree credentials must be real values, placeholder values are not allowed');
  }

  if (process.env.DIDIT_API_KEY?.includes('your_didit')) {
    throw new Error('Didit credentials must be real values, placeholder values are not allowed');
  }

  if (config.msg91.widgetEnabled) {
    const msg91Required = ['MSG91_AUTH_KEY', 'MSG91_WIDGET_ID'];
    const msg91Missing = msg91Required.filter((key) => !process.env[key]);
    if (msg91Missing.length > 0) {
      throw new Error(
        `Missing required MSG91 widget environment variables: ${msg91Missing.join(', ')}`
      );
    }
  }

  // Fail fast on invalid JWT configuration instead of surfacing 500s on login/signup.
  try {
    jwt.sign({ userId: 'config-check', mobileNumber: '9999999999' }, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
    } as SignOptions);

    jwt.sign({ userId: 'config-check', mobileNumber: '9999999999' }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiry,
    } as SignOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JWT config error';
    throw new Error(`Invalid JWT configuration: ${message}`);
  }
};
