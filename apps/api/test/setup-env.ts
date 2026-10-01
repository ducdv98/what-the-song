/**
 * Runs before any test module is imported: ConfigModule.forRoot validates the
 * environment at import time, so these cannot be set in a beforeAll.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://wts:wts@127.0.0.1:5432/wts_test';
process.env.JWT_ACCESS_SECRET = 'e2e-secret-e2e-secret-e2e-secret-e2e';
// The e2e suite signs in dozens of times from one address.
process.env.AUTH_RATE_LIMIT = '1000';
process.env.TRUST_PROXY = 'true';
