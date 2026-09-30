import { validateEnv } from './env.validation.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('fills defaults', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_TTL).toBe(900);
    expect(env.REFRESH_TTL_DAYS).toBe(30);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.DB_MIGRATIONS_RUN).toBe(true);
  });

  it('parses strings from the environment', () => {
    const env = validateEnv({
      ...base,
      PORT: '8080',
      TRUST_PROXY: '1',
      COOKIE_SECURE: 'true',
      DB_MIGRATIONS_RUN: 'false',
    });
    expect(env.PORT).toBe(8080);
    expect(env.TRUST_PROXY).toBe(true);
    expect(env.COOKIE_SECURE).toBe(true);
    expect(env.DB_MIGRATIONS_RUN).toBe(false);
  });

  it('refuses to boot without a database or with a weak secret', () => {
    expect(() =>
      validateEnv({ JWT_ACCESS_SECRET: base.JWT_ACCESS_SECRET }),
    ).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });
});
