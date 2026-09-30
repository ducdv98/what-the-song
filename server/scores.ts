/**
 * The score service: the one piece of this app that is not static.
 *
 * A leaderboard is state shared between players, which a static export cannot
 * hold — localStorage never leaves one browser. So this is the smallest server
 * that can: Node's own http module, no dependencies, an append-only JSONL file.
 * Caddy proxies /api/* to it behind the same basic auth as everything else.
 *
 * Only the current and previous week and month are ever shown, so anything
 * older than the start of last month is dropped. At a few hundred rounds a
 * week, every record fits comfortably in memory.
 *
 *   node --experimental-strip-types server/scores.ts
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregate, parseSubmission, periodRange, retentionStart, DEFAULT_UTC_OFFSET, PERIODS,
  type Period, type ScoreRecord,
} from '../lib/game/leaderboard.ts';

const MAX_BODY_BYTES = 4096;
const MAX_ROWS = 100;

export class Store {
  private records: ScoreRecord[] = [];
  private rounds = new Set<string>();
  private cutoff = -Infinity;
  /** Set when the file holds a line that did not parse — see prune(). */
  private damaged = false;

  private readonly file: string;
  private readonly utcOffset: number;

  // No parameter properties: Node's type stripping cannot run them.
  constructor(file: string, utcOffset: number) {
    this.file = file;
    this.utcOffset = utcOffset;
    mkdirSync(dirname(file), { recursive: true });
    if (existsSync(file)) {
      for (const line of readFileSync(file, 'utf-8').split('\n')) {
        if (!line.trim()) continue;
        const rec = parseLine(line);
        if (!rec) this.damaged = true;
        else if (!this.rounds.has(rec.round)) {
          this.records.push(rec);
          this.rounds.add(rec.round);
        }
      }
    }
  }

  all(): readonly ScoreRecord[] {
    return this.records;
  }

  /** Returns false for a round already recorded — retries are expected. */
  add(rec: ScoreRecord, now: number): boolean {
    this.prune(now);
    if (this.rounds.has(rec.round)) return false;
    this.records.push(rec);
    this.rounds.add(rec.round);
    appendFileSync(this.file, JSON.stringify(rec) + '\n', 'utf-8');
    return true;
  }

  /**
   * Drop what no board can show. Runs at most once per month boundary, and
   * rewrites via a temp file so a crash mid-write cannot truncate the data.
   *
   * A damaged file — a torn last line from a crash mid-append — is always
   * rewritten, since the next append would otherwise be glued onto the torn
   * fragment and lost with it on the following restart.
   */
  prune(now: number): void {
    const cutoff = retentionStart(now, this.utcOffset);
    if (cutoff === this.cutoff) return;
    this.cutoff = cutoff;
    const kept = this.records.filter((r) => r.at >= cutoff);
    if (kept.length === this.records.length && !this.damaged && existsSync(this.file)) return;
    this.damaged = false;
    this.records = kept;
    this.rounds = new Set(kept.map((r) => r.round));
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, kept.map((r) => JSON.stringify(r) + '\n').join(''), 'utf-8');
    renameSync(tmp, this.file);
  }
}

/** A line from disk is trusted about as far as a line from the network. */
function parseLine(line: string): ScoreRecord | null {
  try {
    const r = JSON.parse(line) as Record<string, unknown>;
    if (
      typeof r.round === 'string' && typeof r.name === 'string' && typeof r.score === 'number' &&
      typeof r.won === 'boolean' && typeof r.difficulty === 'string' && typeof r.at === 'number'
    ) {
      return r as unknown as ScoreRecord;
    }
  } catch {
    // A torn final line from a crash mid-append. The rest is fine.
  }
  return null;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    // Past the limit, keep reading but discard, so the client still gets a
    // 400 rather than a reset connection. Caddy caps the body upstream too.
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () =>
      size > MAX_BODY_BYTES
        ? reject(new Error('too large'))
        : resolve(Buffer.concat(chunks).toString('utf-8')),
    );
    req.on('error', reject);
  });
}

export interface Options {
  file: string;
  utcOffset?: number;
  /** Injectable clock, for tests. */
  now?: () => number;
}

export function createScoreServer({ file, utcOffset = DEFAULT_UTC_OFFSET, now = Date.now }: Options): Server {
  const store = new Store(file, utcOffset);
  store.prune(now());

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        return send(res, 200, { ok: true });
      }

      if (url.pathname === '/api/scores' && req.method === 'POST') {
        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          return send(res, 400, { error: 'expected a JSON body under 4 KB' });
        }
        const t = now();
        const parsed = parseSubmission(body, t);
        if (!parsed.ok) return send(res, 400, { error: parsed.error });
        const added = store.add(parsed.record, t);
        return send(res, added ? 201 : 200, { ok: true, duplicate: !added });
      }

      if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
        const period = url.searchParams.get('period') ?? 'week';
        const back = Number(url.searchParams.get('back') ?? '0');
        if (!PERIODS.includes(period as Period)) return send(res, 400, { error: 'period must be week or month' });
        if (back !== 0 && back !== 1) return send(res, 400, { error: 'back must be 0 or 1' });

        const t = now();
        store.prune(t);
        const range = periodRange(period as Period, t, utcOffset, back);
        return send(res, 200, {
          period,
          back,
          from: range.from,
          to: range.to,
          utcOffset,
          rows: aggregate(store.all(), range).slice(0, MAX_ROWS),
        });
      }

      return send(res, 404, { error: 'not found' });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: 'internal error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.SCORES_PORT ?? 8787);
  const file = process.env.SCORES_FILE ?? 'data/scores.jsonl';
  const offset = Number(process.env.SCORES_UTC_OFFSET ?? DEFAULT_UTC_OFFSET);
  if (!Number.isFinite(offset) || offset < -12 || offset > 14) {
    throw new Error(`SCORES_UTC_OFFSET must be an hour offset from -12 to 14, got ${process.env.SCORES_UTC_OFFSET}`);
  }
  createScoreServer({ file, utcOffset: offset }).listen(port, () => {
    console.log(`scores: listening on :${port}, data in ${file}, boards at UTC${offset >= 0 ? '+' : ''}${offset}`);
  });
}
