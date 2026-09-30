/**
 * Client side of the leaderboard: the player's name, and getting results to
 * the score server.
 *
 * Results go through a small queue in localStorage. The server dedupes on the
 * round id, so resending is always safe, and a round finished during a network
 * blip is sent with the next one instead of silently missing from the board.
 * Like stats.ts, every storage access is guarded — without storage the queue
 * just lives for this page load.
 */

import { cleanName, type BoardRow, type Period } from './leaderboard.ts';

const NAME_KEY = 'what-the-song:name:v1';
const QUEUE_KEY = 'what-the-song:pending-scores:v1';
/** A week of heavy play offline; beyond that the oldest are dropped. */
const MAX_QUEUE = 200;

export interface Result {
  round: string;
  name: string;
  score: number;
  won: boolean;
  difficulty: string;
  playedAt: number;
}

export interface Board {
  period: Period;
  back: number;
  from: number;
  to: number;
  utcOffset: number;
  rows: BoardRow[];
}

export function loadName(): string {
  try {
    return cleanName(localStorage.getItem(NAME_KEY));
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, cleanName(name));
  } catch {
    // Kept in component state for this session.
  }
}

/**
 * A random id for one finished round.
 *
 * Not crypto.randomUUID: that only exists in secure contexts, and this is often
 * reached over plain http on a LAN address. getRandomValues has no such limit.
 */
export function newRoundId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let memoryQueue: Result[] = [];

function readQueue(): Result[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Result[]) : [];
  } catch {
    return memoryQueue;
  }
}

function writeQueue(queue: Result[]): void {
  memoryQueue = queue.slice(-MAX_QUEUE);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue));
  } catch {
    // memoryQueue still holds it.
  }
}

export function pendingCount(): number {
  return readQueue().length;
}

let flushing: Promise<number> | null = null;

/**
 * Send every queued result. Resolves to how many are still waiting.
 *
 * A 4xx means the server will never accept that result, so it is dropped
 * rather than retried forever; anything else keeps it for next time.
 * Concurrent calls share one run, so a result is never in flight twice.
 */
export function flushResults(fetchFn: typeof fetch = fetch): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    const sent = new Set<string>();
    for (const result of readQueue()) {
      try {
        const res = await fetchFn('/api/scores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) sent.add(result.round);
        else break;
      } catch {
        break; // Offline or server down; the rest would fail the same way.
      }
    }
    // Re-read: a result may have been queued while this was running.
    const remaining = readQueue().filter((r) => !sent.has(r.round));
    writeQueue(remaining);
    return remaining.length;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export async function submitResult(result: Result, fetchFn: typeof fetch = fetch): Promise<number> {
  writeQueue([...readQueue(), result]);
  // If a flush is already running it may have read the queue before this
  // result was added; run again once it is done.
  if (flushing) await flushing;
  return flushResults(fetchFn);
}

export async function fetchBoard(period: Period, back: 0 | 1, fetchFn: typeof fetch = fetch): Promise<Board> {
  const res = await fetchFn(`/api/leaderboard?period=${period}&back=${back}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`leaderboard returned ${res.status}`);
  return (await res.json()) as Board;
}
