import { describe } from 'vitest';

const REQUIRED_INTEGRATION_ENV = ['DATABASE_URL', 'DIRECT_URL'];

const missingIntegrationEnv = (): string[] =>
  REQUIRED_INTEGRATION_ENV.filter((key) => !process.env[key]);

const formatSkipMessage = (missing: string[]) =>
  [`Integration suite skipped`, `Missing required env: ${missing.join(', ')}`].join(' | ');

export const describeIfDatabaseIntegration = (
  title: string,
  callback: () => void
) => {
  const missingEnv = missingIntegrationEnv();
  if (missingEnv.length === 0) {
    return describe(title, callback);
  }

  const message = `${formatSkipMessage(missingEnv)}. Set DATABASE_URL and DIRECT_URL for local runs, or configure DATABASE_URL in CI before running integration tests.`;

  if (process.env.CI === 'true') {
    throw new Error(`CI integration failure: ${message}`);
  }

  // eslint-disable-next-line no-console
  console.warn(`\n[INTEGRATION SKIP] ${message}\n`);
  return describe.skip(`${title} (skipped: missing integration env)`, callback);
};
