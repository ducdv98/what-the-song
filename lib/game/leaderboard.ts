/**
 * Weekly and monthly leaderboard rules. Pure — no storage, no network.
 *
 * Shared by the score server (validation, aggregation) and the client (name
 * cleaning, date labels), so both sides agree on what a period is and what a
 * valid name looks like. There is deliberately no all-time board: a fresh week
 * gives someone who joined late a real chance, and it lets the server drop old
 * rows instead of growing forever.
 */

import { DIFFICULTIES } from './difficulty.ts';
import { BEST_SCORE } from './round.ts';

export type Period = 'week' | 'month';
export const PERIODS: readonly Period[] = ['week', 'month'];

/** 0 = the current period, 1 = the one before. Nothing older is kept. */
export type Back = 0 | 1;

/**
 * Boundaries fall at local midnight in this offset from UTC.
 *
 * Vietnam is UTC+7 with no daylight saving, so a fixed offset is exact and far
 * simpler than resolving an IANA zone. The server can override it.
 */
export const DEFAULT_UTC_OFFSET = 7;

export const MAX_NAME_LENGTH = 24;

/** How late a queued result may arrive and still keep its own timestamp. */
export const MAX_SUBMIT_LAG_MS = 24 * 60 * 60 * 1000;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface Range {
  /** Inclusive, epoch ms. */
  from: number;
  /** Exclusive, epoch ms. */
  to: number;
}

/**
 * The start and end of a week (Monday 00:00) or month (1st, 00:00), in local
 * time at `utcOffset`, `back` periods before the one containing `now`.
 */
export function periodRange(
  period: Period,
  now: number,
  utcOffset: number = DEFAULT_UTC_OFFSET,
  back: number = 0,
): Range {
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

/**
 * Anything older than this is unreachable from any board and can be dropped.
 *
 * The oldest board is last month, and last week always starts after last month
 * began (it is at most 13 days back; last month began at least 28 days back).
 */
export function retentionStart(now: number, utcOffset: number = DEFAULT_UTC_OFFSET): number {
  return periodRange('month', now, utcOffset, 1).from;
}

/**
 * Clean a display name: NFC, no control characters, single spaces, trimmed,
 * capped by code point so a Vietnamese name is not cut mid-character.
 */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const flat = raw
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(flat).slice(0, MAX_NAME_LENGTH).join('').trim();
}

/**
 * The identity a row is grouped by.
 *
 * Players are their names, not per-device ids, so someone on both a phone and
 * a laptop is one row. Among friends that is what people expect, and a clash
 * is visible on the board and fixed by picking another name. Case-folded, but
 * diacritics are kept: "Đức" and "Duc" are different Vietnamese names.
 */
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

export interface ScoreRecord {
  /** Client-generated id, so a retried submission counts once. */
  round: string;
  name: string;
  score: number;
  won: boolean;
  difficulty: string;
  /** Epoch ms. */
  at: number;
}

const ROUND_ID = /^[A-Za-z0-9_-]{8,64}$/;
const DIFFICULTY_SLUGS = new Set(DIFFICULTIES.map((d) => d.slug));

export type Parsed = { ok: true; record: ScoreRecord } | { ok: false; error: string };

/**
 * Validate a submitted result.
 *
 * The client knows every answer (docs/RESEARCH.md §10.5), so this cannot stop
 * a determined cheat and does not try. It keeps the file well-formed and rejects
 * scores no real round could produce — a typo'd curl, not an adversary.
 */
export function parseSubmission(body: unknown, now: number): Parsed {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'expected an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.round !== 'string' || !ROUND_ID.test(b.round)) {
    return { ok: false, error: 'bad round id' };
  }
  const name = cleanName(b.name);
  if (!name) return { ok: false, error: 'name required' };

  if (typeof b.won !== 'boolean') return { ok: false, error: 'won must be a boolean' };
  const score = b.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > BEST_SCORE) {
    return { ok: false, error: `score must be an integer from 0 to ${BEST_SCORE}` };
  }
  if (b.won !== score > 0) return { ok: false, error: 'only a win scores points' };

  if (typeof b.difficulty !== 'string' || !DIFFICULTY_SLUGS.has(b.difficulty)) {
    return { ok: false, error: 'unknown difficulty' };
  }

  // A result queued offline keeps its own time, so a round played on Sunday
  // night still counts for that week. Anything implausible gets server time.
  const played = b.playedAt;
  const at =
    typeof played === 'number' && played <= now && played >= now - MAX_SUBMIT_LAG_MS
      ? Math.floor(played)
      : now;

  return {
    ok: true,
    record: { round: b.round, name, score, won: b.won, difficulty: b.difficulty, at },
  };
}

export interface BoardRow {
  rank: number;
  name: string;
  points: number;
  rounds: number;
  wins: number;
}

/**
 * Total points per player within a range, best first.
 *
 * Ranked on points; ties share a rank (1, 1, 3). Wins then fewer rounds break
 * ties for ordering only — the same total should not look like a loss.
 */
export function aggregate(records: readonly ScoreRecord[], range: Range): BoardRow[] {
  const byKey = new Map<string, BoardRow & { lastAt: number }>();

  for (const r of records) {
    if (r.at < range.from || r.at >= range.to) continue;
    const key = nameKey(r.name);
    const row = byKey.get(key) ?? { rank: 0, name: r.name, points: 0, rounds: 0, wins: 0, lastAt: -Infinity };
    row.points += r.score;
    row.rounds += 1;
    row.wins += r.won ? 1 : 0;
    // Show the spelling they used most recently.
    if (r.at >= row.lastAt) {
      row.lastAt = r.at;
      row.name = r.name;
    }
    byKey.set(key, row);
  }

  const rows = [...byKey.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.rounds - b.rounds ||
      a.name.localeCompare(b.name, 'vi'),
  );

  let rank = 0;
  return rows.map(({ lastAt: _, ...row }, i) => {
    if (i === 0 || rows[i - 1].points !== row.points) rank = i + 1;
    return { ...row, rank };
  });
}
