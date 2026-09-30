import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATS } from '@wts/game';
import { loadStats, saveStats, clearStats } from './guest-stats.ts';
import { loadPrefs, savePrefs, DEFAULT_PREFS } from './prefs.ts';

describe('storage degrades instead of throwing', () => {
  // There is no localStorage in Node — the same situation as a private window
  // or blocked site data, which is exactly what must not break the game.
  test('loadStats returns empty stats with no storage available', () => {
    assert.deepEqual(loadStats(), EMPTY_STATS);
  });

  test('saveStats and clearStats are silent no-ops', () => {
    assert.doesNotThrow(() => saveStats({ played: 1, won: 1, currentStreak: 1, bestStreak: 1 }));
    assert.doesNotThrow(() => clearStats());
  });

  test('prefs fall back to defaults', () => {
    assert.deepEqual(loadPrefs(), DEFAULT_PREFS);
    assert.doesNotThrow(() => savePrefs({ genre: 'bolero', tier: 'hard' }));
  });
});

describe('guest stats last only for the tab', () => {
  // A minimal Web Storage stand-in, installed only for these tests.
  function fakeStorage(): Storage {
    const m = new Map<string, string>();
    return {
      get length() { return m.size; },
      key: (i: number) => [...m.keys()][i] ?? null,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    };
  }

  test('saved to sessionStorage, never localStorage', () => {
    const g = globalThis as Record<string, unknown>;
    const session = fakeStorage();
    const local = fakeStorage();
    local.setItem('what-the-song:stats:v1', JSON.stringify({ played: 9, won: 9, currentStreak: 9, bestStreak: 9 }));
    g.sessionStorage = session;
    g.localStorage = local;
    try {
      const s = { played: 2, won: 1, currentStreak: 1, bestStreak: 1 };
      saveStats(s);
      assert.deepEqual(loadStats(), s);
      assert.equal(session.length, 1);
      assert.equal(local.length, 0, 'the pre-accounts forever-streak is removed, not resurrected');
      clearStats();
      assert.deepEqual(loadStats(), EMPTY_STATS);
    } finally {
      delete g.sessionStorage;
      delete g.localStorage;
    }
  });
});

describe('prefs', () => {
  function withStorage(fn: (store: Map<string, string>) => void) {
    const store = new Map<string, string>();
    const g = globalThis as Record<string, unknown>;
    g.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    try {
      fn(store);
    } finally {
      delete g.localStorage;
    }
  }

  test('a tier round-trips', () => {
    withStorage(() => {
      savePrefs({ genre: 'bolero', tier: 'expert' });
      assert.deepEqual(loadPrefs(), { genre: 'bolero', tier: 'expert' });
    });
  });

  test('the old difficulty setting reads back as "pick for me", not as a bogus tier', () => {
    withStorage((store) => {
      store.set('what-the-song:prefs:v1', JSON.stringify({ genre: null, difficulty: 'normal' }));
      assert.deepEqual(loadPrefs(), { genre: null, tier: null });
      store.set('what-the-song:prefs:v1', JSON.stringify({ genre: 'x', tier: 'Hard' }));
      assert.equal(loadPrefs().tier, null);
    });
  });
});
