import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregate, cleanName, nameKey, parseSubmission, periodRange, retentionStart,
  MAX_NAME_LENGTH, MAX_SUBMIT_LAG_MS, type ScoreRecord,
} from './leaderboard.ts';
import { flushResults, submitResult, newRoundId, loadName, saveName, pendingCount, type Result } from './scoreboard.ts';

/** Vietnam local time as epoch ms: vn(2026, 9, 30, 14) is 30 Sep 2026, 14:00 UTC+7. */
const vn = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 7, mi);

describe('period boundaries (UTC+7)', () => {
  test('a week runs Monday 00:00 to the next Monday 00:00, local time', () => {
    // Wednesday 30 Sep 2026.
    const r = periodRange('week', vn(2026, 9, 30, 14));
    assert.equal(r.from, vn(2026, 9, 28));
    assert.equal(r.to, vn(2026, 10, 5));
  });

  test('Sunday belongs to the week that started the Monday before', () => {
    const r = periodRange('week', vn(2026, 10, 4, 23, 59));
    assert.equal(r.from, vn(2026, 9, 28));
  });

  test('Monday just after local midnight starts a new week — though UTC still says Sunday', () => {
    const t = vn(2026, 10, 5, 0, 30);
    assert.equal(new Date(t).getUTCDay(), 0, 'precondition: Sunday in UTC');
    assert.equal(periodRange('week', t).from, vn(2026, 10, 5));
  });

  test('a month runs from the 1st, local time', () => {
    const r = periodRange('month', vn(2026, 9, 30, 14));
    assert.equal(r.from, vn(2026, 9, 1));
    assert.equal(r.to, vn(2026, 10, 1));
  });

  test('the 1st just after local midnight is the new month', () => {
    assert.equal(periodRange('month', vn(2026, 10, 1, 0, 5)).from, vn(2026, 10, 1));
  });

  test('previous periods', () => {
    const now = vn(2026, 9, 30, 14);
    assert.deepEqual(periodRange('week', now, 7, 1), { from: vn(2026, 9, 21), to: vn(2026, 9, 28) });
    assert.deepEqual(periodRange('month', now, 7, 1), { from: vn(2026, 8, 1), to: vn(2026, 9, 1) });
  });

  test('last month crosses a year boundary', () => {
    assert.deepEqual(periodRange('month', vn(2027, 1, 10), 7, 1), { from: vn(2026, 12, 1), to: vn(2027, 1, 1) });
  });

  test('a week spanning two months is still seven days', () => {
    const r = periodRange('week', vn(2026, 10, 1));
    assert.equal(r.to - r.from, 7 * 24 * 60 * 60 * 1000);
    assert.equal(r.from, vn(2026, 9, 28));
  });

  test('the offset is honoured', () => {
    // 23:00 UTC on Sunday is already Monday in Vietnam, but not in UTC.
    const t = Date.UTC(2026, 9, 4, 23);
    assert.equal(periodRange('week', t, 7).from, Date.UTC(2026, 9, 4, 17));
    assert.equal(periodRange('week', t, 0).from, Date.UTC(2026, 8, 28));
  });

  test('retention keeps everything either board can still show', () => {
    for (const now of [vn(2026, 9, 1), vn(2026, 9, 30, 23), vn(2026, 3, 2), vn(2027, 1, 1)]) {
      const keep = retentionStart(now);
      for (const period of ['week', 'month'] as const) {
        for (const back of [0, 1]) {
          assert.ok(periodRange(period, now, 7, back).from >= keep, `${period} back=${back} at ${new Date(now).toISOString()}`);
        }
      }
    }
  });
});

describe('names', () => {
  test('cleaned: NFC, trimmed, single spaces, no control characters', () => {
    const nfd = 'Đức'.normalize('NFD');
    assert.equal(cleanName(`  ${nfd}\u0000  \t Anh​ `), 'Đức Anh');
    assert.equal(cleanName(`  ${nfd} `), 'Đức'.normalize('NFC'));
  });

  test('capped by code point, not by UTF-16 unit', () => {
    const long = 'Nguyễn '.repeat(10);
    const got = cleanName(long);
    assert.ok(Array.from(got).length <= MAX_NAME_LENGTH);
    assert.equal(got, got.trim(), 'a cut must not leave a trailing space');
  });

  test('non-strings clean to empty', () => {
    assert.equal(cleanName(undefined), '');
    assert.equal(cleanName(42), '');
    assert.equal(cleanName('   '), '');
  });

  test('the key ignores case and composition but keeps diacritics', () => {
    assert.equal(nameKey('MINH'), nameKey('minh'));
    assert.equal(nameKey('Đức'.normalize('NFD')), nameKey('đức'));
    assert.notEqual(nameKey('Đức'), nameKey('Duc'));
  });
});

describe('submissions', () => {
  const now = vn(2026, 9, 30, 14);
  const good = { round: 'abcdef0123456789', name: 'Minh', score: 800, won: true, difficulty: 'hard', playedAt: now - 1000 };

  test('a valid result is accepted with its own timestamp', () => {
    const p = parseSubmission(good, now);
    assert.ok(p.ok);
    assert.equal(p.record.at, now - 1000);
    assert.equal(p.record.name, 'Minh');
  });

  test('a loss scores nothing and is still a valid round', () => {
    assert.ok(parseSubmission({ ...good, won: false, score: 0 }, now).ok);
  });

  for (const [why, patch] of [
    ['a missing name', { name: '  ' }],
    ['a score above the best possible', { score: 1001 }],
    ['a negative score', { score: -5 }],
    ['a fractional score', { score: 10.5 }],
    ['points for a loss', { won: false, score: 100 }],
    ['a win for nothing', { won: true, score: 0 }],
    ['an unknown difficulty', { difficulty: 'godlike' }],
    ['a short round id', { round: 'abc' }],
    ['a round id with odd characters', { round: '../../etc/passwd' }],
  ] as const) {
    test(`rejects ${why}`, () => {
      assert.equal(parseSubmission({ ...good, ...patch }, now).ok, false);
    });
  }

  test('rejects non-objects', () => {
    assert.equal(parseSubmission(null, now).ok, false);
    assert.equal(parseSubmission('x', now).ok, false);
  });

  test('an implausible timestamp is replaced by server time', () => {
    for (const playedAt of [now + 60_000, now - MAX_SUBMIT_LAG_MS - 1, 'yesterday', undefined]) {
      const p = parseSubmission({ ...good, playedAt }, now);
      assert.ok(p.ok);
      assert.equal(p.record.at, now, String(playedAt));
    }
  });
});

describe('aggregation', () => {
  const range = { from: 1000, to: 2000 };
  const rec = (name: string, score: number, at = 1500, round = `${name}-${score}-${at}-${Math.random()}`): ScoreRecord => ({
    round, name, score, won: score > 0, difficulty: 'normal', at,
  });

  test('sums points, rounds and wins per player, best first', () => {
    const rows = aggregate([rec('An', 500), rec('Bình', 1000), rec('An', 700), rec('An', 0)], range);
    assert.deepEqual(rows, [
      { rank: 1, name: 'An', points: 1200, rounds: 3, wins: 2 },
      { rank: 2, name: 'Bình', points: 1000, rounds: 1, wins: 1 },
    ]);
  });

  test('only records inside the range count; the end is exclusive', () => {
    const rows = aggregate([rec('An', 100, 999), rec('An', 200, 1000), rec('An', 400, 2000)], range);
    assert.equal(rows[0].points, 200);
  });

  test('one player across spellings, shown with the latest one', () => {
    const rows = aggregate([rec('minh', 100, 1100), rec('Minh', 100, 1200)], range);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Minh');
    assert.equal(rows[0].points, 200);
  });

  test('equal points share a rank, and the next rank skips', () => {
    const rows = aggregate([rec('A', 500), rec('B', 500), rec('C', 100)], range);
    assert.deepEqual(rows.map((r) => r.rank), [1, 1, 3]);
  });

  test('a player with only losses is still listed', () => {
    const rows = aggregate([rec('Lan', 0)], range);
    assert.deepEqual(rows, [{ rank: 1, name: 'Lan', points: 0, rounds: 1, wins: 0 }]);
  });

  test('nothing in range, nothing listed', () => {
    assert.deepEqual(aggregate([rec('An', 100, 5000)], range), []);
  });
});

describe('client queue', () => {
  // No localStorage in Node — the private-window case. The queue must still
  // work for the page's lifetime.
  const result = (round: string): Result => ({
    round, name: 'Minh', score: 500, won: true, difficulty: 'normal', playedAt: 0,
  });
  const reply = (status: number) => async () => new Response('{}', { status });

  test('round ids are unique and pass the server check', () => {
    const a = newRoundId();
    assert.match(a, /^[0-9a-f]{32}$/);
    assert.notEqual(a, newRoundId());
  });

  test('name storage degrades silently', () => {
    assert.equal(loadName(), '');
    assert.doesNotThrow(() => saveName('Minh'));
  });

  test('a result that cannot be sent waits, and goes with the next one', async () => {
    assert.equal(await submitResult(result('r1-aaaaaaaa'), reply(502)), 1);
    const sent: string[] = [];
    const ok = async (_: unknown, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)).round);
      return new Response('{}', { status: 201 });
    };
    assert.equal(await submitResult(result('r2-aaaaaaaa'), ok as typeof fetch), 0);
    assert.deepEqual(sent, ['r1-aaaaaaaa', 'r2-aaaaaaaa']);
  });

  test('offline keeps the result queued', async () => {
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    assert.equal(await submitResult(result('r3-aaaaaaaa'), offline), 1);
    assert.equal(pendingCount(), 1);
    assert.equal(await flushResults(reply(201)), 0);
  });

  test('a result the server rejects is dropped, not retried forever', async () => {
    assert.equal(await submitResult(result('r4-aaaaaaaa'), reply(400)), 0);
  });
});
