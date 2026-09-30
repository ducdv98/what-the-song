/**
 * End to end over real HTTP and a real file — the parts the pure tests in
 * lib/game/leaderboard.test.ts cannot reach: body parsing, dedupe across a
 * restart, pruning, and a torn line left by a crash.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createScoreServer } from './scores.ts';

const vn = (y: number, mo: number, d: number, h = 0) => Date.UTC(y, mo - 1, d, h - 7);

let dir: string;
let clock = vn(2026, 9, 30, 14);

async function start(file: string): Promise<{ server: Server; base: string }> {
  const server = createScoreServer({ file, now: () => clock });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

const stop = (s: Server) => new Promise<void>((r) => s.close(() => r()));

function post(base: string, body: unknown) {
  return fetch(`${base}/api/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function board(base: string, query = 'period=week') {
  const res = await fetch(`${base}/api/leaderboard?${query}`);
  return { status: res.status, body: await res.json() };
}

let n = 0;
const result = (name: string, score: number, extra: object = {}) => ({
  round: `round-${String(++n).padStart(6, '0')}`,
  name, score, won: score > 0, difficulty: 'normal', ...extra,
});

describe('score server', () => {
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'wts-scores-'));
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  test('records results and ranks them', async () => {
    const { server, base } = await start(join(dir, 'a', 'scores.jsonl'));
    try {
      assert.equal((await post(base, result('Minh', 1000))).status, 201);
      assert.equal((await post(base, result('Lan', 400))).status, 201);
      assert.equal((await post(base, result('minh', 0))).status, 201);

      const { status, body } = await board(base);
      assert.equal(status, 200);
      assert.equal(body.from, vn(2026, 9, 28));
      assert.equal(body.utcOffset, 7);
      assert.deepEqual(body.rows, [
        { rank: 1, name: 'minh', points: 1000, rounds: 2, wins: 1 },
        { rank: 2, name: 'Lan', points: 400, rounds: 1, wins: 1 },
      ]);
    } finally {
      await stop(server);
    }
  });

  test('a resent round counts once, including after a restart', async () => {
    const file = join(dir, 'b.jsonl');
    const r = result('An', 500);
    let s = await start(file);
    assert.equal((await post(s.base, r)).status, 201);
    const dup = await post(s.base, r);
    assert.equal(dup.status, 200);
    assert.deepEqual(await dup.json(), { ok: true, duplicate: true });
    await stop(s.server);

    s = await start(file);
    try {
      assert.equal((await post(s.base, r)).status, 200);
      assert.equal((await board(s.base)).body.rows[0].points, 500);
    } finally {
      await stop(s.server);
    }
  });

  test('week and month, current and previous, are separate boards', async () => {
    const { server, base } = await start(join(dir, 'c.jsonl'));
    try {
      clock = vn(2026, 9, 5, 12); // this month, not this week or last
      await post(base, result('An', 300));
      clock = vn(2026, 9, 27, 23); // Sunday night: last week
      await post(base, result('Bình', 700));
      clock = vn(2026, 9, 30, 14);
      await post(base, result('Chi', 100));

      const names = async (q: string) => (await board(base, q)).body.rows.map((r: { name: string }) => r.name);
      assert.deepEqual(await names('period=week&back=0'), ['Chi']);
      assert.deepEqual(await names('period=week&back=1'), ['Bình']);
      assert.deepEqual(await names('period=month&back=0'), ['Bình', 'An', 'Chi']);
      assert.deepEqual(await names('period=month&back=1'), []);
    } finally {
      await stop(server);
    }
  });

  test('rejects bad input without touching the file', async () => {
    const file = join(dir, 'd.jsonl');
    const { server, base } = await start(file);
    try {
      assert.equal((await post(base, '{not json')).status, 400);
      assert.equal((await post(base, result('X', 5000))).status, 400);
      assert.equal((await post(base, { ...result('X', 10), name: '' })).status, 400);
      assert.equal((await post(base, 'x'.repeat(10_000))).status, 400);
      assert.equal((await board(base, 'period=year')).status, 400);
      assert.equal((await board(base, 'period=week&back=2')).status, 400);
      assert.equal((await fetch(`${base}/api/nope`)).status, 404);
      assert.equal(readFileSync(file, 'utf-8'), '');
    } finally {
      await stop(server);
    }
  });

  test('responses are never cached', async () => {
    const { server, base } = await start(join(dir, 'e.jsonl'));
    try {
      const res = await fetch(`${base}/api/leaderboard?period=month`);
      assert.equal(res.headers.get('cache-control'), 'no-store');
    } finally {
      await stop(server);
    }
  });

  test('drops what no board can show, and survives a torn last line', async () => {
    const file = join(dir, 'f.jsonl');
    const old = { round: 'old-00000001', name: 'Cũ', score: 900, won: true, difficulty: 'hard', at: vn(2026, 7, 15) };
    const lastMonth = { round: 'lm-00000001', name: 'Lan', score: 200, won: true, difficulty: 'easy', at: vn(2026, 8, 20) };
    writeFileSync(file, JSON.stringify(old) + '\n' + JSON.stringify(lastMonth) + '\n');
    appendFileSync(file, '{"round":"torn-000'); // crash mid-append

    const { server, base } = await start(file);
    try {
      const kept = readFileSync(file, 'utf-8').trim().split('\n').map((l) => JSON.parse(l).round);
      assert.deepEqual(kept, ['lm-00000001']);
      assert.deepEqual((await board(base, 'period=month&back=1')).body.rows.map((r: { name: string }) => r.name), ['Lan']);
      // And appending after a torn line still yields parseable lines.
      assert.equal((await post(base, result('Mai', 100))).status, 201);
      const lines = readFileSync(file, 'utf-8').trim().split('\n');
      assert.ok(lines.every((l) => JSON.parse(l)));
    } finally {
      await stop(server);
    }
  });

  test('a torn line is repaired even when nothing is old enough to prune', async () => {
    const file = join(dir, 'g.jsonl');
    const kept = { round: 'keep-0000001', name: 'Lan', score: 200, won: true, difficulty: 'easy', at: vn(2026, 9, 29) };
    writeFileSync(file, JSON.stringify(kept) + '\n{"round":"torn-000');

    let s = await start(file);
    assert.equal((await post(s.base, result('Mai', 100))).status, 201);
    await stop(s.server);

    // Had the append been glued onto the torn fragment, Mai would vanish here.
    s = await start(file);
    try {
      const names = (await board(s.base)).body.rows.map((r: { name: string }) => r.name);
      assert.deepEqual(names, ['Lan', 'Mai']);
    } finally {
      await stop(s.server);
    }
  });
});
