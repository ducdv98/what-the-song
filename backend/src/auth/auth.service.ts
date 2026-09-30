import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import type { Env } from '../config/env.validation.js';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './refresh-token.entity.js';

export interface AccessPayload {
  sub: string;
  username: string;
}

export interface IssuedTokens {
  accessToken: string;
  accessTtlMs: number;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export type RegisterResult =
  { user: User; tokens: IssuedTokens } | { taken: 'username' | 'email' };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtlMs: number;
  /**
   * A real argon2 hash of a random string, verified against when the account
   * does not exist, so "no such user" and "wrong password" take the same time.
   * Otherwise response timing alone reveals which usernames are registered.
   */
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {
    this.accessTtl = config.get('JWT_ACCESS_TTL', { infer: true });
    this.refreshTtlMs =
      config.get('REFRESH_TTL_DAYS', { infer: true }) * 24 * 60 * 60 * 1000;
  }

  hashPassword(password: string): Promise<string> {
    // argon2id with the library defaults (64 MiB, t=3, p=4) — above OWASP's
    // minimum. Parameters live in the encoded hash, so raising them later only
    // affects new hashes. NFC so a Vietnamese password typed on a different
    // keyboard (NFD) is still the same password.
    return argon2.hash(password.normalize('NFC'), { type: argon2.argon2id });
  }

  async register(
    username: string,
    email: string,
    password: string,
    userAgent?: string,
  ): Promise<RegisterResult> {
    const created = await this.users.create(
      username,
      email,
      await this.hashPassword(password),
    );
    if ('taken' in created) return created;
    return {
      user: created.user,
      tokens: await this.issue(created.user, randomUUID(), userAgent),
    };
  }

  /** Null for any failure; the caller must not learn which part was wrong. */
  async login(
    identifier: string,
    password: string,
    userAgent?: string,
  ): Promise<{ user: User; tokens: IssuedTokens } | null> {
    const user = await this.users.findForLogin(identifier);
    this.dummyHash ??= this.hashPassword(randomBytes(16).toString('hex'));
    const hash = user?.passwordHash ?? (await this.dummyHash);
    const ok = await argon2
      .verify(hash, password.normalize('NFC'))
      .catch(() => false);
    if (!user || !ok) return null;
    return { user, tokens: await this.issue(user, randomUUID(), userAgent) };
  }

  /**
   * Exchange a refresh token for a new pair. The presented token is revoked
   * either way; if it had already been revoked, that is reuse — revoke the
   * whole family.
   */
  async refresh(
    presented: string,
    userAgent?: string,
  ): Promise<{ user: User; tokens: IssuedTokens } | null> {
    const row = await this.refreshTokens.findOneBy({
      tokenHash: sha256(presented),
    });
    if (!row) return null;

    if (row.revokedAt) {
      await this.refreshTokens.update(
        { familyId: row.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) return null;

    // Conditional update: of two concurrent refreshes with the same token,
    // exactly one wins, and the loser is treated as reuse.
    const claimed = await this.refreshTokens.update(
      { id: row.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!claimed.affected) {
      await this.refreshTokens.update(
        { familyId: row.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      return null;
    }

    const user = await this.users.findById(row.userId);
    if (!user) return null;
    return { user, tokens: await this.issue(user, row.familyId, userAgent) };
  }

  /** Sign out this device: revoke the token's family. */
  async logout(presented: string | undefined): Promise<void> {
    if (!presented) return;
    const row = await this.refreshTokens.findOneBy({
      tokenHash: sha256(presented),
    });
    if (row) {
      await this.refreshTokens.update(
        { familyId: row.familyId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }
  }

  async verifyAccess(token: string): Promise<AccessPayload | null> {
    try {
      return await this.jwt.verifyAsync<AccessPayload>(token);
    } catch {
      return null;
    }
  }

  /** Housekeeping: tokens past expiry are useless, revoked or not. */
  async purgeExpired(): Promise<number> {
    const res = await this.refreshTokens.delete({
      expiresAt: LessThan(new Date()),
    });
    return res.affected ?? 0;
  }

  private async issue(
    user: User,
    familyId: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const payload: AccessPayload = { sub: user.id, username: user.username };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessTtl,
    });
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + this.refreshTtlMs);
    await this.refreshTokens.insert({
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiresAt,
      userAgent: userAgent?.slice(0, 255) ?? null,
    });
    return {
      accessToken,
      accessTtlMs: this.accessTtl * 1000,
      refreshToken,
      refreshExpiresAt,
    };
  }
}
