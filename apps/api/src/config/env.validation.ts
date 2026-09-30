import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const toBool = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/**
 * Every setting the service reads, validated once at boot. A missing secret or
 * a malformed database URL stops the process with a clear message instead of
 * surfacing as a confusing failure on the first request.
 */
export class Env {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => Number(value))
  PORT = 4000;

  /** postgres://user:password@host:5432/db */
  @IsString()
  DATABASE_URL: string;

  /** Run pending migrations on boot. Turn off when a deploy step runs them. */
  @IsBoolean()
  @Transform(toBool)
  DB_MIGRATIONS_RUN = true;

  /** HMAC secret for access tokens. Generate with `openssl rand -base64 48`. */
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  /** Access token lifetime in seconds. Short: it cannot be revoked early. */
  @IsInt()
  @Min(60)
  @Transform(({ value }) => Number(value))
  JWT_ACCESS_TTL = 15 * 60;

  /** Refresh token lifetime in days. Rotated on every use. */
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  REFRESH_TTL_DAYS = 30;

  /**
   * Believe X-Forwarded-* from the reverse proxy (Caddy), so client IPs for
   * rate limiting and https detection for Secure cookies are right. Only set
   * this when the service is not reachable except through that proxy.
   */
  @IsBoolean()
  @Transform(toBool)
  TRUST_PROXY = false;

  /** Force the Secure cookie flag; otherwise it follows the request scheme. */
  @IsBoolean()
  @Transform(toBool)
  COOKIE_SECURE = false;

  /** Requests per minute per client on the sign-in and register endpoints. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  AUTH_RATE_LIMIT = 10;

  /**
   * Leaderboard weeks start Monday 00:00 and months on the 1st, at this many
   * hours from UTC. 7 is Vietnam, which has no daylight saving.
   */
  @IsInt()
  @Min(-12)
  @Max(14)
  @Transform(({ value }) => Number(value))
  LEADERBOARD_UTC_OFFSET = 7;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, {
    skipMissingProperties: false,
    whitelist: false,
  });
  if (errors.length > 0) {
    const detail = errors
      .map(
        (e) =>
          `  ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
      )
      .join('\n');
    throw new Error(`Invalid environment:\n${detail}`);
  }
  return env;
}
