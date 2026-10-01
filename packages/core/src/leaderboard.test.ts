import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { periodRange } from './leaderboard.ts';

/** Vietnam local time as epoch ms: vn(2026, 9, 30, 14) is 30 Sep 2026, 14:00 UTC+7. */
const vn = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 7, mi);

describe('leaderboard periods (UTC+7)', () => {
  test('a week runs Monday 00:00 to the next Monday 00:00, local time', () => {
    // Wednesday 30 Sep 2026.
    assert.deepEqual(periodRange('week', vn(2026, 9, 30, 14)), { from: vn(2026, 9, 28), to: vn(2026, 10, 5) });
  });

  test('Sunday night belongs to the week that started the Monday before', () => {
    assert.equal(periodRange('week', vn(2026, 10, 4, 23, 59)).from, vn(2026, 9, 28));
  });

  test('Monday just after local midnight is a new week — though UTC still says Sunday', () => {
    const t = vn(2026, 10, 5, 0, 30);
    assert.equal(new Date(t).getUTCDay(), 0, 'precondition: Sunday in UTC');
    assert.equal(periodRange('week', t).from, vn(2026, 10, 5));
  });

  test('a month runs from the 1st to the 1st, local time', () => {
    assert.deepEqual(periodRange('month', vn(2026, 9, 30, 14)), { from: vn(2026, 9, 1), to: vn(2026, 10, 1) });
    assert.equal(periodRange('month', vn(2026, 10, 1, 0, 5)).from, vn(2026, 10, 1));
  });

  test('previous periods', () => {
    const now = vn(2026, 9, 30, 14);
    assert.deepEqual(periodRange('week', now, 7, 1), { from: vn(2026, 9, 21), to: vn(2026, 9, 28) });
    assert.deepEqual(periodRange('month', now, 7, 1), { from: vn(2026, 8, 1), to: vn(2026, 9, 1) });
  });

  test('last month across a year boundary', () => {
    assert.deepEqual(periodRange('month', vn(2027, 1, 10), 7, 1), { from: vn(2026, 12, 1), to: vn(2027, 1, 1) });
  });

  test('a week spanning two months is still seven days', () => {
    const r = periodRange('week', vn(2026, 10, 1));
    assert.equal(r.from, vn(2026, 9, 28));
    assert.equal(r.to - r.from, 7 * 24 * 60 * 60 * 1000);
  });

  test('the offset is honoured', () => {
    // 23:00 UTC on Sunday is already Monday in Vietnam, but not in UTC.
    const t = Date.UTC(2026, 9, 4, 23);
    assert.equal(periodRange('week', t, 7).from, Date.UTC(2026, 9, 4, 17));
    assert.equal(periodRange('week', t, 0).from, Date.UTC(2026, 8, 28));
  });
});
