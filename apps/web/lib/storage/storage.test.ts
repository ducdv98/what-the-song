import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_STATS } from '@wts/core';
import { loadStats, saveStats, clearStats } from './guest-stats.ts';
import { loadPrefs, savePrefs, DEFAULT_PREFS, isInstallHintDismissed, dismissInstallHint } from './prefs.ts';
import { loadWarmUp, saveWarmUp } from './warm-up.ts';

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
    assert.doesNotThrow(() => savePrefs({ genre: 'bolero', tier: 'hard', memes: true }));
  });

  test('blocked localStorage keeps Memes on without throwing', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('storage blocked'); },
    });
    try {
      assert.equal(loadPrefs().memes, true);
      assert.doesNotThrow(() => savePrefs({ genre: null, tier: null, memes: false }));
    } finally {
      delete (globalThis as Record<string, unknown>).localStorage;
    }
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
      savePrefs({ genre: 'bolero', tier: 'expert', memes: false });
      assert.deepEqual(loadPrefs(), { genre: 'bolero', tier: 'expert', memes: false });
    });
  });

  test('install dismissal survives a new view without changing picker choices', () => {
    withStorage(() => {
      assert.equal(isInstallHintDismissed(), false);
      savePrefs({ genre: 'bolero', tier: 'expert', memes: false });
      dismissInstallHint();
      assert.equal(isInstallHintDismissed(), true);
      assert.deepEqual(loadPrefs(), { genre: 'bolero', tier: 'expert', memes: false });
    });
  });

  test('the old difficulty setting reads back as "pick for me", not as a bogus tier', () => {
    withStorage((store) => {
      store.set('what-the-song:prefs:v1', JSON.stringify({ genre: null, difficulty: 'normal' }));
      assert.deepEqual(loadPrefs(), { genre: null, tier: null, memes: true });
      store.set('what-the-song:prefs:v1', JSON.stringify({ genre: 'x', tier: 'Hard' }));
      assert.equal(loadPrefs().tier, null);
      store.set('what-the-song:prefs:v1', JSON.stringify({ genre: 'x', tier: null, memes: 'off' }));
      assert.equal(loadPrefs().memes, true);
    });
  });
});

test('guest Warm-up progress survives reload per Topic and rejects malformed data', () => {
  const store = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  try {
    saveWarmUp('people', { rounds: 1, won: false, warmUp: true });
    assert.deepEqual(loadWarmUp('people'), { rounds: 1, won: false, warmUp: true });
    assert.equal(loadWarmUp('food'), null);
    store.set('what-the-song:warm-up:food:v1', '{"rounds":-1,"won":false,"warmUp":true}');
    assert.equal(loadWarmUp('food'), null);
  } finally {
    delete g.localStorage;
  }
});
