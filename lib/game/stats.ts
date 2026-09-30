/**
 * Streaks and running totals.
 *
 * Split in two on purpose: the reducer is pure and testable, and browser
 * storage is a thin adapter around it. Storage is the part that fails in
 * interesting ways (private windows, blocked site data, thumbnail capture), so
 * it must not be tangled up with the counting.
 */

export interface Stats {
  played: number;
  won: number;
  currentStreak: number;
  bestStreak: number;
}

export const EMPTY_STATS: Stats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  bestStreak: 0,
};

/** Fold one finished round into the totals. Pure; never mutates. */
export function recordResult(stats: Stats, won: boolean): Stats {
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  return {
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    currentStreak,
    // Best streak only ever grows, so a loss cannot erase a past run.
    bestStreak: Math.max(stats.bestStreak, currentStreak),
  };
}

export function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.won / stats.played) * 100);
}

/**
 * Guests keep their stats in sessionStorage: they survive a reload but end with
 * the tab, which is the deal a guest gets — play freely, keep nothing. Signed-in
 * players' stats live on the server instead (server/db.ts) and are never
 * written here.
 */
const STORAGE_KEY = 'what-the-song:guest-stats:v1';

/**
 * Before accounts existed, stats persisted forever in localStorage. Guests no
 * longer get that, so the old key is removed rather than left orphaned.
 */
const LEGACY_KEY = 'what-the-song:stats:v1';

/**
 * Coerce unknown JSON into Stats.
 *
 * Storage is per-viewer and hand-editable, and an older build may have written
 * a different shape, so nothing read back can be trusted. Anything missing or
 * nonsensical falls back to zero rather than propagating NaN through the UI.
 */
export function coerceStats(raw: unknown): Stats {
  if (typeof raw !== 'object' || raw === null) return EMPTY_STATS;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;

  const played = num(r.played);
  const won = Math.min(num(r.won), played);
  const currentStreak = Math.min(num(r.currentStreak), played);
  return {
    played,
    won,
    currentStreak,
    bestStreak: Math.max(num(r.bestStreak), currentStreak),
  };
}

/**
 * Read a guest's stats.
 *
 * Every access is guarded: in a private window, with site data blocked, or
 * during a thumbnail capture, the accessor itself can throw. Returning empty
 * stats keeps the game playable — a lost streak is a far better outcome than a
 * blank page.
 */
export function loadStats(): Stats {
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to clean up, or no storage at all.
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? coerceStats(JSON.parse(raw)) : EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(stats: Stats): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable or full. Counting still works for this session.
  }
}

export function clearStats(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
