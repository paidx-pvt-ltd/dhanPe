import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import supertest from 'supertest';
import { describeIfDatabaseIntegration } from './integration-test-utils.js';

const TEST_MOBILE = '+919900000001';
const SANDBOX_WIDGET_TOKEN = 'sandbox-widget-919900000001';

let app: any;
let prisma: any;

const configureTestEnvironment = () => {
  process.env.NODE_ENV = 'test';
  process.env.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-jwt-refresh-secret';
  process.env.CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID ?? 'test-cashfree-client';
  process.env.CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET ?? 'test-cashfree-secret';
  process.env.CASHFREE_WEBHOOK_SECRET =
    process.env.CASHFREE_WEBHOOK_SECRET ?? 'test-webhook-secret';
  process.env.MSG91_WIDGET_ENABLED = '1';
  process.env.MSG91_SANDBOX_ENABLED = '1';
  process.env.MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID ?? 'test-widget-id';
  process.env.MSG91_WIDGET_TOKEN = process.env.MSG91_WIDGET_TOKEN ?? 'test-widget-token';
  process.env.MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY ?? 'test-msg91-auth-key';
  process.env.MSG91_SANDBOX_ALLOW_PRODUCTION = '1';
};

describeIfDatabaseIntegration('Auth and user integration', () => {
  beforeAll(async () => {
    configureTestEnvironment();
    vi.resetModules();

    const configModule = await import('../config/index.js');
    expect(configModule.config.msg91.sandboxEnabled).toBe(true);

    const appModule = await import('../app.js');
    app = appModule.default;

    const prismaModule = await import('../db/prisma.js');
    prisma = prismaModule.prisma;
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          mobileNumber: TEST_MOBILE,
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        mobileNumber: TEST_MOBILE,
      },
    });
  });

  it('rejects malformed JSON bodies with a 400 validation error', async () => {
    const request = supertest(app);
    const response = await request
      .post('/api/auth/verify-widget')
      .set('Content-Type', 'application/json')
      .send('{"mobileNumber":');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('Malformed JSON body');
  });

  it('creates a user and refresh session using sandbox MSG91 widget auth', async () => {
    const request = supertest(app);
    const response = await request.post('/api/auth/verify-widget').send({
      mobileNumber: TEST_MOBILE,
      accessToken: SANDBOX_WIDGET_TOKEN,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    expect(response.body.user?.mobileNumber).toBe(TEST_MOBILE);

    const refreshResponse = await request.post('/api/auth/refresh').send({
      refreshToken: response.body.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.user?.mobileNumber).toBe(TEST_MOBILE);
  });

  it('returns authentication failure for invalid refresh tokens', async () => {
    const request = supertest(app);
    const response = await request.post('/api/auth/refresh').send({
      refreshToken: 'invalid-refresh-token',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects corrupted access tokens on protected routes', async () => {
    const request = supertest(app);
    const response = await request
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('enforces authentication on protected user onboarding and profile routes', async () => {
    const request = supertest(app);

    const onboardingResponse = await request.get('/api/users/onboarding');
    expect(onboardingResponse.status).toBe(401);
    expect(onboardingResponse.body.error.code).toBe('AUTHENTICATION_ERROR');

    const profileResponse = await request.get('/api/users/profile');
    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns onboarding steps after successful widget login', async () => {
    const request = supertest(app);
    const loginResponse = await request.post('/api/auth/verify-widget').send({
      mobileNumber: TEST_MOBILE,
      accessToken: SANDBOX_WIDGET_TOKEN,
    });

    const accessToken = loginResponse.body.accessToken as string;
    expect(accessToken).toBeTruthy();

    const onboardingResponse = await request
      .get('/api/users/onboarding')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(onboardingResponse.status).toBe(200);
    expect(onboardingResponse.body.success).toBe(true);
    expect(onboardingResponse.body.currentStep).toBe('PAN_VERIFICATION');
    expect(onboardingResponse.body.panFallbackAvailable).toBe(true);
    expect(onboardingResponse.body.canAddBeneficiary).toBe(false);
  });
});
