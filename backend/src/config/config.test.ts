import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('backend config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('validates required environment variables and uses fallback config values', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/dhanpe_test';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'jwt-refresh-secret';
    process.env.CASHFREE_CLIENT_ID = 'cashfree-client';
    process.env.CASHFREE_CLIENT_SECRET = 'cashfree-secret';
    process.env.CASHFREE_PAYOUT_CLIENT_ID = 'cashfree-payout-client';
    process.env.CASHFREE_PAYOUT_CLIENT_SECRET = 'cashfree-payout-secret';
    process.env.CASHFREE_WEBHOOK_SECRET = 'webhook-secret';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.MSG91_AUTH_KEY = 'msg91-auth-key';
    process.env.MSG91_WIDGET_ENABLED = '0';
    process.env.CORS_ORIGIN = 'https://app.example.com,https://admin.example.com';

    const { config, validateConfig } = await import('../../packages/config/src/index.js');

    expect(config.server.env).toBe('test');
    expect(config.cashfree.payoutClientId).toBe('cashfree-payout-client');
    expect(config.cashfree.payoutClientSecret).toBe('cashfree-payout-secret');
    expect(config.msg91.widgetEnabled).toBe(false);
    expect(config.server.corsOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
    expect(() => validateConfig()).not.toThrow();
  });

  it('throws when required environment variables are missing', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/dhanpe_test';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = '';
    process.env.CASHFREE_CLIENT_ID = 'cashfree-client';
    process.env.CASHFREE_CLIENT_SECRET = 'cashfree-secret';
    process.env.CASHFREE_WEBHOOK_SECRET = 'webhook-secret';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.MSG91_AUTH_KEY = 'msg91-auth-key';

    const { validateConfig } = await import('../../packages/config/src/index.js');

    expect(() => validateConfig()).toThrow(/Missing required environment variables/);
  });

  it('throws when an invalid URL format is configured', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/dhanpe_test';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'jwt-refresh-secret';
    process.env.CASHFREE_CLIENT_ID = 'cashfree-client';
    process.env.CASHFREE_CLIENT_SECRET = 'cashfree-secret';
    process.env.CASHFREE_WEBHOOK_SECRET = 'webhook-secret';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.MSG91_AUTH_KEY = 'msg91-auth-key';
    process.env.APP_URL = 'ftp://invalid-host';

    const { validateConfig } = await import('../../packages/config/src/index.js');

    expect(() => validateConfig()).toThrow(/Invalid URL format/);
  });

  it('throws when production uses sandbox mode without allow-production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/dhanpe_test';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'jwt-refresh-secret';
    process.env.CASHFREE_CLIENT_ID = 'cashfree-client';
    process.env.CASHFREE_CLIENT_SECRET = 'cashfree-secret';
    process.env.CASHFREE_WEBHOOK_SECRET = 'webhook-secret';
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
    process.env.MSG91_AUTH_KEY = 'msg91-auth-key';
    process.env.MSG91_SANDBOX_ENABLED = 'true';
    process.env.MSG91_SANDBOX_ALLOW_PRODUCTION = 'false';

    const { validateConfig } = await import('../../packages/config/src/index.js');

    expect(() => validateConfig()).toThrow(/MSG91 sandbox mode is enabled in a strict environment/);
  });
});
