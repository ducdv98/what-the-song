import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LADDER } from './ladder.ts';
import {
  createRound, submitGuess, skip, giveUp, revealedSeconds, isLastStep, MAX_LIVES,
  scoreForStep,
} from './round.ts';

const song = { id: 'nnca', title: 'Nơi Này Có Anh', aliases: ['Right Here'] };

describe('round setup', () => {
  test('starts on the shortest clue with full lives', () => {
    const r = createRound(song);
    assert.equal(r.stepIndex, 0);
    assert.equal(revealedSeconds(r), 0.1);
    assert.equal(r.livesLeft, MAX_LIVES);
    assert.equal(r.status, 'playing');
  });
});

describe('correct guesses', () => {
  test('a first-try win scores the maximum', () => {
    const r = submitGuess(createRound(song), 'Nơi Này Có Anh');
    assert.equal(r.status, 'won');
    assert.equal(r.score, 1000);
    assert.equal(r.livesLeft, MAX_LIVES, 'a win must not cost a life');
  });

  test('a diacritic-free guess still wins', () => {
    const r = submitGuess(createRound(song), 'noi nay co anh');
    assert.equal(r.status, 'won');
    assert.equal(r.attempts.at(-1)?.quality, 'diacritics');
  });

  test('an alias wins', () => {
    assert.equal(submitGuess(createRound(song), 'right here').status, 'won');
  });

  test('later wins score less', () => {
    let r = createRound(song);
    r = skip(r);
    r = skip(r);
    const won = submitGuess(r, 'Nơi Này Có Anh');
    assert.equal(won.status, 'won');
    assert.ok(won.score < 1000 && won.score > 0, `unexpected score ${won.score}`);
  });
});

describe('wrong guesses', () => {
  test('cost a life and reveal more audio', () => {
    const r = submitGuess(createRound(song), 'Chạy Ngay Đi');
    assert.equal(r.status, 'playing');
    assert.equal(r.livesLeft, MAX_LIVES - 1);
    assert.equal(r.stepIndex, 1);
    assert.equal(revealedSeconds(r), 0.5);
  });

  test('running out of lives loses the round', () => {
    let r = createRound(song);
    for (let i = 0; i < MAX_LIVES; i++) r = submitGuess(r, `wrong ${i}`);
    assert.equal(r.status, 'lost');
    assert.equal(r.livesLeft, 0);
    assert.equal(r.score, 0);
  });

  test('an empty or whitespace guess is a no-op, not a wasted life', () => {
    const start = createRound(song);
    for (const bad of ['', '   ', '\t\n']) {
      const r = submitGuess(start, bad);
      assert.equal(r.livesLeft, MAX_LIVES, `"${bad}" cost a life`);
      assert.equal(r.stepIndex, 0);
      assert.equal(r.attempts.length, 0);
    }
  });
});

describe('skipping', () => {
  test('reveals more audio without costing a life', () => {
    const r = skip(createRound(song));
    assert.equal(r.livesLeft, MAX_LIVES);
    assert.equal(r.stepIndex, 1);
    assert.equal(r.attempts.at(-1)?.kind, 'skip');
  });

  test('skipping past the last rung loses the round', () => {
    let r = createRound(song);
    for (let i = 0; i < DEFAULT_LADDER.length - 1; i++) {
      r = skip(r);
      assert.equal(r.status, 'playing', `ended early at step ${i}`);
    }
    assert.ok(isLastStep(r));
    assert.equal(revealedSeconds(r), DEFAULT_LADDER.at(-1));
    r = skip(r);
    assert.equal(r.status, 'lost', 'no ladder left should end the round');
  });

  test('the reveal never runs off the end of the ladder', () => {
    let r = createRound(song);
    for (let i = 0; i < 50; i++) r = skip(r);
    assert.ok(r.stepIndex < DEFAULT_LADDER.length);
    assert.equal(Number.isFinite(revealedSeconds(r)), true);
  });
});

describe('terminal states are final', () => {
  test('nothing changes a won round', () => {
    const won = submitGuess(createRound(song), 'Nơi Này Có Anh');
    assert.deepEqual(submitGuess(won, 'anything'), won);
    assert.deepEqual(skip(won), won);
    assert.deepEqual(giveUp(won), won);
  });

  test('nothing changes a lost round', () => {
    const lost = giveUp(createRound(song));
    assert.equal(lost.status, 'lost');
    assert.deepEqual(submitGuess(lost, 'Nơi Này Có Anh'), lost);
    assert.deepEqual(skip(lost), lost);
  });
});

describe('immutability', () => {
  test('transitions do not mutate the previous state', () => {
    const before = createRound(song);
    const snapshot = structuredClone({ ...before, song: { ...before.song } });
    submitGuess(before, 'wrong');
    skip(before);
    assert.deepEqual({ ...before, song: { ...before.song } }, snapshot);
  });
});

describe('per-song ladders', () => {
  test('the default fallback is the seven-rung ladder', () => {
    assert.deepEqual([...DEFAULT_LADDER], [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0]);
  });

  test('a round honours a song\'s own shorter ladder', () => {
    // A track with a long generic intro starts later and has fewer rungs.
    const r = createRound(song, [2, 4, 8]);
    assert.equal(revealedSeconds(r), 2);
    const after = skip(r);
    assert.equal(revealedSeconds(after), 4);
    assert.ok(isLastStep(skip(after)), 'three rungs means the third is last');
  });

  test('an empty ladder falls back rather than breaking the round', () => {
    const r = createRound(song, []);
    assert.equal(revealedSeconds(r), DEFAULT_LADDER[0]);
  });

  test('scoring scales to the ladder length', () => {
    // First rung always best, last always worst, whatever the length.
    for (const n of [3, 5, 7, 12]) {
      assert.equal(scoreForStep(0, n), 1000, `n=${n}`);
      assert.equal(scoreForStep(n - 1, n), 50, `n=${n}`);
      for (let i = 1; i < n; i++) {
        assert.ok(scoreForStep(i, n) < scoreForStep(i - 1, n), `n=${n} i=${i}`);
      }
    }
  });

  test('winning on a short ladder still awards the top score', () => {
    const r = submitGuess(createRound(song, [2, 4, 8]), 'Nơi Này Có Anh');
    assert.equal(r.status, 'won');
    assert.equal(r.score, 1000);
  });
});
