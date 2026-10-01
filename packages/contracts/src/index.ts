/**
 * The account API's wire format, shared by the server (apps/api) and its one
 * client (apps/web), so a renamed field or a new error code is a compile error
 * on both sides instead of a runtime surprise on one.
 *
 * Types and plain constants only — no runtime dependencies, safe to import
 * from a browser bundle.
 */

// ── Account input rules ──────────────────────────────────────────────────────

/**
 * ASCII only. A username is a handle people type on each other's phones —
 * Vietnamese tone marks would make "which spelling was it" a real question,
 * and NFC/NFD variants would make identical-looking names distinct. A display
 * name with diacritics can come alongside the leaderboard.
 */
export const USERNAME_PATTERN = '^[A-Za-z0-9_]{3,20}$';
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
/** Bounds hashing work per request; nobody needs a longer password. */
export const PASSWORD_MAX = 128;

// ── Round reports ────────────────────────────────────────────────────────────

/** Song ids as tools/ingest.py writes them into the catalogue. */
export const SONG_ID_PATTERN = '^[\\w.-]{1,120}$';
/** Genre slugs, as in @wts/core's GENRES. */
export const GENRE_SLUG_PATTERN = '^[a-z0-9-]{1,40}$';

// ── Shapes ───────────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  username: string;
  /** Always lowercased. */
  email: string;
  /** ISO 8601. */
  createdAt: string;
}

export interface PlayerStats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  /** Username or email — told apart by the '@'. */
  identifier: string;
  password: string;
}

/** One finished round, as the browser reports it. */
export interface RoundReport {
  songId: string;
  won: boolean;
  /** 0 for a loss; within the game's score range for a win. */
  score: number;
  difficulty: string;
  /** null means "all genres". */
  genre: string | null;
}

export interface UserResponse {
  user: PublicUser;
}

/** GET /auth/session: a guest is `null`, never a 401. */
export interface SessionResponse {
  user: PublicUser | null;
}

export interface StatsResponse {
  stats: PlayerStats;
}

/** Leaderboards cover a week or a month — there is no all-time board. */
export type LeaderboardPeriod = 'week' | 'month';

/** GET /leaderboard query: `back` is 0 for the current period, 1 for the one before. */
export interface LeaderboardQuery {
  period: LeaderboardPeriod;
  back: 0 | 1;
}

export interface LeaderboardRow {
  /** Equal points share a rank: 1, 1, 3. */
  rank: number;
  username: string;
  /** Sum of round scores in the period; a loss adds 0. */
  points: number;
  rounds: number;
  wins: number;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  back: 0 | 1;
  /** ISO 8601, inclusive. */
  from: string;
  /** ISO 8601, exclusive. */
  to: string;
  /** Hours from UTC at which periods start, so the client can label the dates. */
  utcOffset: number;
  rows: LeaderboardRow[];
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Stable, machine-readable; the client maps each to translated copy. */
export type ApiErrorCode =
  | 'validation_failed'
  | 'username_taken'
  | 'email_taken'
  | 'invalid_credentials'
  | 'invalid_round'
  | 'unauthenticated'
  | 'bad_origin'
  | 'rate_limited'
  | 'bad_request'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'conflict'
  | 'too_large'
  | 'unsupported_media_type'
  | 'server_error';

export interface ApiError {
  statusCode: number;
  code: ApiErrorCode;
  message?: string;
  /** With validation_failed: the offending request properties. */
  fields?: string[];
}

/** Every route, under the /api prefix. */
export const API_PREFIX = '/api';
export const API_ROUTES = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  session: '/auth/session',
  me: '/auth/me',
  myStats: '/stats/me',
  rounds: '/rounds',
  leaderboard: '/leaderboard',
  health: '/health',
} as const;
