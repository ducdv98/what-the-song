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
    expect(env.COS_BUCKET).toBeUndefined();
  });

  it('accepts a complete COS read-only configuration and rejects partial or blank values', () => {
    const cos = {
      COS_BUCKET: 'library-1250000000',
      COS_REGION: 'ap-hongkong',
      COS_SECRET_ID: 'read-id',
      COS_SECRET_KEY: 'read-key',
    };
    expect(validateEnv({ ...base, ...cos }).COS_BUCKET).toBe(cos.COS_BUCKET);
    expect(
      validateEnv({
        ...base,
        COS_BUCKET: '',
        COS_REGION: '',
        COS_SECRET_ID: '',
        COS_SECRET_KEY: '',
      }).COS_BUCKET,
    ).toBeUndefined();
    for (const key of Object.keys(cos)) {
      const partial = { ...cos };
      delete partial[key as keyof typeof partial];
      expect(() => validateEnv({ ...base, ...partial })).toThrow(/COS_/);
      expect(() => validateEnv({ ...base, ...cos, [key]: '' })).toThrow(/COS_/);
    }
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

  it('leaderboard periods default to Vietnam time and accept only real offsets', () => {
    expect(validateEnv(base).LEADERBOARD_UTC_OFFSET).toBe(7);
    expect(
      validateEnv({ ...base, LEADERBOARD_UTC_OFFSET: '0' })
        .LEADERBOARD_UTC_OFFSET,
    ).toBe(0);
    expect(() =>
      validateEnv({ ...base, LEADERBOARD_UTC_OFFSET: '15' }),
    ).toThrow(/LEADERBOARD_UTC_OFFSET/);
    expect(() =>
      validateEnv({ ...base, LEADERBOARD_UTC_OFFSET: 'hanoi' }),
    ).toThrow(/LEADERBOARD_UTC_OFFSET/);
  });
});
