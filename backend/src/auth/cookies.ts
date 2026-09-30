import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'wts_at';
export const REFRESH_COOKIE = 'wts_rt';

/**
 * The access token goes to every API route; the refresh token only to the
 * auth routes, so it is not sent (and exposed) on every gameplay request.
 */
const ACCESS_PATH = '/api';
const REFRESH_PATH = '/api/auth';

function base(req: Request, forceSecure: boolean): CookieOptions {
  return {
    httpOnly: true,
    // Lax: sent on top-level navigation, withheld from cross-site POSTs —
    // which is what stops another site from acting as a signed-in player.
    sameSite: 'lax',
    // req.secure honours X-Forwarded-Proto when trust proxy is on.
    secure: forceSecure || req.secure,
  };
}

export function setAuthCookies(
  req: Request,
  res: Response,
  tokens: {
    accessToken: string;
    accessTtlMs: number;
    refreshToken: string;
    refreshExpiresAt: Date;
  },
  forceSecure: boolean,
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base(req, forceSecure),
    path: ACCESS_PATH,
    maxAge: tokens.accessTtlMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(req, forceSecure),
    path: REFRESH_PATH,
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(
  req: Request,
  res: Response,
  forceSecure: boolean,
): void {
  res.clearCookie(ACCESS_COOKIE, {
    ...base(req, forceSecure),
    path: ACCESS_PATH,
  });
  res.clearCookie(REFRESH_COOKIE, {
    ...base(req, forceSecure),
    path: REFRESH_PATH,
  });
}

export function readCookie(req: Request, name: string): string | undefined {
  const v = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
