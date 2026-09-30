/**
 * Browser side of the account API (backend/, NestJS).
 *
 * Same-origin only: in production Caddy routes /api/* to the API service, and
 * in development next.config.ts rewrites it to the local API process. Both
 * tokens live in HttpOnly cookies, so this code never sees them — the browser
 * attaches them on its own.
 *
 * The access token is short-lived. When a protected call answers 401, this
 * refreshes once (rotating the refresh token) and retries; concurrent 401s
 * share a single refresh, because the server treats a reused refresh token as
 * theft and would sign the player out.
 */
import type { Stats } from '../game/stats.ts';

export interface User {
  id: string;
  username: string;
  email: string;
  /** ISO 8601. */
  createdAt: string;
}

export type AccountStats = Stats & { totalScore: number };

export interface RoundReport {
  songId: string;
  won: boolean;
  score: number;
  difficulty: string;
  genre: string | null;
}

/** What the UI can report. Server codes outside this set become server_error. */
export type AuthErrorCode =
  | 'invalid_username'
  | 'invalid_email'
  | 'invalid_password'
  | 'username_taken'
  | 'email_taken'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'unauthenticated'
  | 'unavailable'
  | 'server_error';

const PASSTHROUGH: readonly string[] = [
  'username_taken', 'email_taken', 'invalid_credentials', 'rate_limited', 'unauthenticated',
];

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Map the API's `{ code, fields }` error body onto what the UI can say. */
function toCode(body: { code?: string; fields?: string[] }): AuthErrorCode {
  if (body.code && PASSTHROUGH.includes(body.code)) return body.code as AuthErrorCode;
  if (body.code === 'validation_failed') {
    // Report the first field the form actually has, in form order.
    for (const f of ['username', 'email', 'password'] as const) {
      if (body.fields?.includes(f)) return `invalid_${f}`;
    }
  }
  return 'server_error';
}

async function send<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw new AuthError('unavailable');
  }
  if (res.status === 204) return undefined as T;

  // A static-only deployment answers /api/* with the app's HTML (or a 404/502
  // from the proxy), so anything that is not our JSON means "no API here".
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  if (!isJson) throw new AuthError('unavailable');
  const data = (await res.json()) as T & { code?: string; fields?: string[] };
  if (!res.ok) throw new AuthError(toCode(data));
  return data;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, shared by every caller that hit a 401. */
function refreshOnce(): Promise<boolean> {
  refreshing ??= send('POST', '/api/auth/refresh')
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** For endpoints behind the access token: refresh and retry once on 401. */
async function authed<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  try {
    return await send<T>(method, path, body);
  } catch (err) {
    if (!(err instanceof AuthError) || err.code !== 'unauthenticated') throw err;
    if (!(await refreshOnce())) throw err;
    return send<T>(method, path, body);
  }
}

export const authApi = {
  /** Restore on page load: the user, silently refreshed if needed, or null. */
  session: () => send<{ user: User | null }>('GET', '/api/auth/session').then((r) => r.user),
  login: (identifier: string, password: string) =>
    send<{ user: User }>('POST', '/api/auth/login', { identifier, password }).then((r) => r.user),
  register: (username: string, email: string, password: string) =>
    send<{ user: User }>('POST', '/api/auth/register', { username, email, password }).then((r) => r.user),
  logout: () => send<void>('POST', '/api/auth/logout'),
  stats: () => authed<{ stats: AccountStats }>('GET', '/api/stats/me').then((r) => r.stats),
  recordRound: (round: RoundReport) =>
    authed<{ stats: AccountStats }>('POST', '/api/rounds', round).then((r) => r.stats),
};
