/**
 * Leaderboard periods: this week or this month, and the one before each.
 *
 * Only the period arithmetic lives here; ranking is a SQL query over the API's
 * `rounds` table. Shared so the API and the browser agree on where a week
 * starts. There is deliberately no all-time board: a fresh week gives someone
 * who joined late a real chance.
 */

export const LEADERBOARD_PERIODS = ['week', 'month'] as const;
export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

/** 0 = the current period, 1 = the one before. */
export const LEADERBOARD_BACKS = [0, 1] as const;
export type LeaderboardBack = (typeof LEADERBOARD_BACKS)[number];

/**
 * Boundaries fall at local midnight at this offset from UTC.
 *
 * Vietnam is UTC+7 with no daylight saving, so a fixed offset is exact and far
 * simpler than resolving an IANA zone. The API can override it.
 */
export const DEFAULT_UTC_OFFSET = 7;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface PeriodRange {
  /** Inclusive, epoch ms. */
  from: number;
  /** Exclusive, epoch ms. */
  to: number;
}

/**
 * The week (Monday 00:00 to Monday 00:00) or month (1st to 1st) containing
 * `now`, or `back` periods before it, in local time at `utcOffset` hours.
 */
export function periodRange(
  period: LeaderboardPeriod,
  now: number,
  utcOffset: number = DEFAULT_UTC_OFFSET,
  back: number = 0,
): PeriodRange {
  const shift = utcOffset * HOUR;
  // Shift into local time, then read it with the UTC getters — that sidesteps
  // the host's own time zone entirely.
  const local = new Date(now + shift);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();

  if (period === 'week') {
    const sinceMonday = (local.getUTCDay() + 6) % 7;
    const from = Date.UTC(y, m, d - sinceMonday - 7 * back) - shift;
    return { from, to: from + 7 * DAY };
  }
  return {
    from: Date.UTC(y, m - back, 1) - shift,
    to: Date.UTC(y, m - back + 1, 1) - shift,
  };
}
