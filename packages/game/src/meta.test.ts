import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENRES, findGenre, isKnownGenre, availableGenres, filterByGenre,
} from './genres.ts';
import { TIERS, TIER_SLUGS, DEFAULT_TIER, isTier, tierOf, filterByTier, tierCounts } from './difficulty.ts';
import { EMPTY_STATS, recordResult, winRate, coerceStats } from './stats.ts';

describe('genre taxonomy', () => {
  test('slugs are unique and url-safe', () => {
    const slugs = GENRES.map((g) => g.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug');
    for (const s of slugs) assert.match(s, /^[a-z-]+$/, s);
  });

  test('every genre has a Vietnamese label and an English gloss', () => {
    for (const g of GENRES) {
      assert.ok(g.label.length > 0, g.slug);
      assert.ok(g.gloss.length > 0, g.slug);
    }
  });

  test('the taxonomy is Vietnamese, not the Anglophone one', () => {
    const slugs = GENRES.map((g) => g.slug);
    assert.ok(slugs.includes('nhac-tre'));
    assert.ok(slugs.includes('rap-viet'));
    assert.ok(slugs.includes('bolero'));
    assert.ok(!slugs.includes('k-pop'), 'K-Pop does not belong here');
    assert.ok(!slugs.includes('country'));
  });

  test('lookup', () => {
    assert.equal(findGenre('bolero')?.label, 'Bolero');
    assert.equal(findGenre('nope'), undefined);
    assert.equal(findGenre(null), undefined);
    assert.equal(isKnownGenre('rap-viet'), true);
    assert.equal(isKnownGenre('jazz'), false);
    assert.equal(isKnownGenre(undefined), false);
  });
});

describe('available genres', () => {
  const songs = [
    { genre: 'nhac-tre' }, { genre: 'nhac-tre' }, { genre: 'rap-viet' },
    { genre: null }, { genre: 'not-a-genre' },
  ];

  test('only genres present are offered, with counts', () => {
    const got = availableGenres(songs);
    assert.deepEqual(
      got.map((g) => [g.genre.slug, g.count]),
      [['nhac-tre', 2], ['rap-viet', 1], ['khac', 2]],
    );
  });

  test('unknown and missing genres fall under khac, so no song is unreachable', () => {
    const khac = availableGenres(songs).find((g) => g.genre.slug === 'khac');
    assert.equal(khac?.count, 2);
  });

  test('order follows the taxonomy, not insertion', () => {
    const got = availableGenres([{ genre: 'bolero' }, { genre: 'nhac-tre' }]);
    assert.deepEqual(got.map((g) => g.genre.slug), ['nhac-tre', 'bolero']);
  });

  test('an empty catalogue offers nothing', () => {
    assert.deepEqual(availableGenres([]), []);
  });
});

describe('genre filtering', () => {
  const songs = [
    { id: 'a', genre: 'nhac-tre' },
    { id: 'b', genre: 'rap-viet' },
    { id: 'c', genre: null },
    { id: 'd', genre: 'bogus' },
  ];

  test('null selects everything', () => {
    assert.equal(filterByGenre(songs, null).length, 4);
  });

  test('a genre selects only its songs', () => {
    assert.deepEqual(filterByGenre(songs, 'nhac-tre').map((s) => s.id), ['a']);
  });

  test('khac collects unknown and missing tags', () => {
    assert.deepEqual(filterByGenre(songs, 'khac').map((s) => s.id), ['c', 'd']);
  });

  test('a genre with no songs yields an empty pool, not everything', () => {
    assert.deepEqual(filterByGenre(songs, 'vong-co'), []);
  });
});

describe('difficulty tiers', () => {
  const songs = [
    { id: 'a', tier: 'easy' },
    { id: 'b', tier: 'impossible' },
    { id: 'c' },                 // untagged
    { id: 'd', tier: 'Easy' },   // wrong case: not a tier
    { id: 'e', tier: 'normal' }, // the old difficulty name: not a tier
    { id: 'f', tier: null },
  ];

  test('five tiers in order, each labelled in both languages', () => {
    assert.deepEqual(TIERS.map((t) => t.slug), [...TIER_SLUGS]);
    assert.deepEqual([...TIER_SLUGS], ['easy', 'medium', 'hard', 'expert', 'impossible']);
    for (const t of TIERS) assert.ok(t.label && t.gloss, t.slug);
  });

  test('anything that is not exactly a tier counts as medium', () => {
    assert.equal(DEFAULT_TIER, 'medium');
    assert.deepEqual(songs.map(tierOf), ['easy', 'impossible', 'medium', 'medium', 'medium', 'medium']);
    assert.equal(isTier('hard'), true);
    assert.equal(isTier('Hard'), false);
    assert.equal(isTier(undefined), false);
  });

  test('filtering picks one tier; null picks every song', () => {
    assert.deepEqual(filterByTier(songs, 'easy').map((s) => s.id), ['a']);
    assert.deepEqual(filterByTier(songs, 'medium').map((s) => s.id), ['c', 'd', 'e', 'f']);
    assert.deepEqual(filterByTier(songs, 'hard'), []);
    assert.equal(filterByTier(songs, null).length, songs.length);
  });

  test('counts list all five tiers, including empty ones', () => {
    assert.deepEqual(
      tierCounts(songs).map((c) => [c.tier.slug, c.count]),
      [['easy', 1], ['medium', 4], ['hard', 0], ['expert', 0], ['impossible', 1]],
    );
  });
});

describe('streaks', () => {
  test('a win extends the current streak and can raise the best', () => {
    let s = EMPTY_STATS;
    s = recordResult(s, true);
    assert.deepEqual(s, { played: 1, won: 1, currentStreak: 1, bestStreak: 1 });
    s = recordResult(s, true);
    assert.deepEqual(s, { played: 2, won: 2, currentStreak: 2, bestStreak: 2 });
  });

  test('a loss resets the current streak but never the best', () => {
    let s = EMPTY_STATS;
    for (let i = 0; i < 4; i++) s = recordResult(s, true);
    s = recordResult(s, false);
    assert.equal(s.currentStreak, 0);
    assert.equal(s.bestStreak, 4, 'a loss must not erase a past run');
    assert.equal(s.played, 5);
    assert.equal(s.won, 4);
  });

  test('best streak tracks the longest run, not the latest', () => {
    let s = EMPTY_STATS;
    for (let i = 0; i < 5; i++) s = recordResult(s, true);
    s = recordResult(s, false);
    for (let i = 0; i < 2; i++) s = recordResult(s, true);
    assert.equal(s.currentStreak, 2);
    assert.equal(s.bestStreak, 5);
  });

  test('recordResult never mutates its input', () => {
    const before = EMPTY_STATS;
    recordResult(before, true);
    assert.deepEqual(before, { played: 0, won: 0, currentStreak: 0, bestStreak: 0 });
  });

  test('win rate', () => {
    assert.equal(winRate(EMPTY_STATS), 0, 'no division by zero');
    assert.equal(winRate({ played: 4, won: 1, currentStreak: 0, bestStreak: 1 }), 25);
    assert.equal(winRate({ played: 3, won: 2, currentStreak: 2, bestStreak: 2 }), 67);
  });
});

describe('coerceStats', () => {
  test('stored values are never trusted', () => {
    assert.deepEqual(coerceStats(null), EMPTY_STATS);
    assert.deepEqual(coerceStats({ played: -3, won: 'x', currentStreak: 2.7, bestStreak: NaN }), {
      played: 0, won: 0, currentStreak: 0, bestStreak: 0,
    });
    assert.deepEqual(coerceStats({ played: 4, won: 9, currentStreak: 9, bestStreak: 1 }), {
      played: 4, won: 4, currentStreak: 4, bestStreak: 4,
    });
  });
});
