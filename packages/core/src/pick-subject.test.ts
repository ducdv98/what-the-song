import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pickSubject } from './pick-subject.ts';

const pool = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}` }));

describe('pickSubject', () => {
  test('plays every Subject once before any repeats', () => {
    const items = pool(7);
    const played = new Set<string>();
    const ids = items.map(() => pickSubject(items, played)!.id);
    assert.equal(new Set(ids).size, items.length);
  });

  test('never repeats across the cycle boundary back-to-back', () => {
    const items = pool(3);
    const played = new Set<string>();
    let last: string | undefined;
    for (let i = 0; i < 60; i++) {
      const id = pickSubject(items, played)!.id;
      assert.notEqual(id, last);
      last = id;
    }
  });

  test('a changed pool skips Subjects already played from the old one', () => {
    const played = new Set<string>(['s0', 's1']);
    const id = pickSubject(pool(3), played)!.id;
    assert.equal(id, 's2');
  });

  test('a one-Subject pool still returns it; an empty pool returns undefined', () => {
    assert.equal(pickSubject(pool(1), new Set())!.id, 's0');
    assert.equal(pickSubject([], new Set()), undefined);
  });
});
