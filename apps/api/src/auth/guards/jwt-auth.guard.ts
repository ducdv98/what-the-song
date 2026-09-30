import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AccessPayload } from '../auth.service.js';
import { ACCESS_COOKIE, readCookie } from '../cookies.js';

export type AuthedRequest = Request & { auth: AccessPayload };

/**
 * Accepts the access token from its cookie (the browser) or an
 * `Authorization: Bearer` header (anything else — a future mobile client, a
 * script). Stateless: no database hit, so it costs the same on one instance or
 * twenty.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : readCookie(req, ACCESS_COOKIE);
    const payload = token ? await this.auth.verifyAccess(token) : null;
    if (!payload) throw new UnauthorizedException({ code: 'unauthenticated' });
    req.auth = payload;
    return true;
  }
}
