import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiry: process.env.JWT_EXPIRY || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  cashfree: {
    clientId: process.env.CASHFREE_CLIENT_ID!,
    clientSecret: process.env.CASHFREE_CLIENT_SECRET!,
    baseUrl: process.env.CASHFREE_API_BASE_URL || 'https://sandbox.cashfree.com/pg',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET!,
  },
};

export const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CASHFREE_CLIENT_ID',
    'CASHFREE_CLIENT_SECRET',
    'WEBHOOK_SECRET',
    'DATABASE_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
