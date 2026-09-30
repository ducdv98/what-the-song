import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuse state-changing requests from another origin.
 *
 * SameSite=Lax cookies already keep a cross-site POST from carrying a session;
 * this is the second lock on the same door. Browsers send Origin on every
 * cross-origin request and every POST, so its absence means a non-browser
 * client, which cookies do not protect against anyway.
 *
 * The API is only ever same-origin — Caddy (production) and the Next dev
 * server (development) put it under the site's own /api — so there is no CORS
 * to configure and nothing legitimate is blocked.
 */
@Injectable()
export class SameOriginMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const origin = req.get('origin');
    if (SAFE.has(req.method) || !origin) return next();
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new ForbiddenException({ code: 'bad_origin' });
    }
    // With trust proxy, req.host honours X-Forwarded-Host.
    const host =
      req.get('x-forwarded-host') && req.app.get('trust proxy')
        ? req.get('x-forwarded-host')
        : req.get('host');
    if (originHost !== host)
      throw new ForbiddenException({ code: 'bad_origin' });
    next();
  }
}
