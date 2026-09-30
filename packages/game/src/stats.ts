/**
 * Streaks and running totals.
 *
 * Pure counting only. Where the numbers are kept is someone else's job: the
 * web app keeps a guest's in the browser tab (apps/web/lib/storage), and the
 * API keeps a player's in Postgres — both fold rounds with this reducer, so
 * they cannot disagree about what a streak is.
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
