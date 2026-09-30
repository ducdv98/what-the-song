import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENRES, findGenre, isKnownGenre, availableGenres, filterByGenre,
} from './genres.ts';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, findDifficulty } from './difficulty.ts';
import { EMPTY_STATS, recordResult, winRate, coerceStats } from './stats.ts';
import { createRound, skip, submitGuess, revealedSeconds } from './round.ts';

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

describe('difficulty modes', () => {
  test('slugs unique, default is normal', () => {
    const slugs = DIFFICULTIES.map((d) => d.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.equal(DEFAULT_DIFFICULTY.slug, 'normal');
  });

  test('unknown slug falls back rather than breaking the game', () => {
    assert.equal(findDifficulty('nonsense').slug, 'normal');
    assert.equal(findDifficulty(null).slug, 'normal');
  });

  test('harder modes start earlier on the ladder and give fewer lives', () => {
    const easy = findDifficulty('easy');
    const hard = findDifficulty('hard');
    const expert = findDifficulty('expert');
    assert.ok(easy.startStep > hard.startStep, 'easy should start later');
    assert.ok(easy.lives > hard.lives);
    assert.ok(expert.lives <= hard.lives);
    assert.equal(expert.allowSkip, false, 'expert must not allow skipping');
  });

  test('all modes are internally sane', () => {
    for (const d of DIFFICULTIES) {
      assert.ok(d.lives >= 1, d.slug);
      assert.ok(d.startStep >= 0, d.slug);
      assert.ok(d.label.length > 0 && d.gloss.length > 0, d.slug);
    }
  });
});

describe('difficulty drives the round', () => {
  const song = { id: 's', title: 'Nơi Này Có Anh' };
  const ladder = [0.1, 0.5, 1, 2, 4, 8, 16];

  test('easy opens on a longer clue with more lives', () => {
    const r = createRound(song, ladder, findDifficulty('easy'));
    assert.equal(r.stepIndex, 2);
    assert.equal(revealedSeconds(r), 1);
    assert.equal(r.livesLeft, 5);
    assert.equal(r.maxLives, 5);
  });

  test('hard opens on the shortest clue', () => {
    const r = createRound(song, ladder, findDifficulty('hard'));
    assert.equal(revealedSeconds(r), 0.1);
    assert.equal(r.maxLives, 3);
  });

  test('expert has one life and cannot skip', () => {
    const r = createRound(song, ladder, findDifficulty('expert'));
    assert.equal(r.livesLeft, 1);
    assert.equal(r.allowSkip, false);
    // Even a stale button must not advance the round.
    assert.deepEqual(skip(r), r);
    // And one wrong guess ends it.
    assert.equal(submitGuess(r, 'wrong').status, 'lost');
  });

  test('a start step beyond the song\'s ladder is clamped, not out of range', () => {
    // An "easy" start of rung 2 on a two-rung song must still work.
    const r = createRound(song, [2, 4], findDifficulty('easy'));
    assert.equal(r.stepIndex, 1);
    assert.equal(revealedSeconds(r), 4);
    assert.ok(Number.isFinite(revealedSeconds(r)));
  });

  test('starting later caps the achievable score — easier means fewer points', () => {
    const easy = submitGuess(createRound(song, ladder, findDifficulty('easy')), 'Nơi Này Có Anh');
    const hard = submitGuess(createRound(song, ladder, findDifficulty('hard')), 'Nơi Này Có Anh');
    assert.equal(hard.score, 1000);
    assert.ok(easy.score < hard.score, `${easy.score} should be under ${hard.score}`);
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
