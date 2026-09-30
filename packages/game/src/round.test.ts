import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LADDER, STAGE_TARGETS } from './ladder.ts';
import {
  createRound, submitGuess, skip, giveUp, revealedSeconds, isLastStage, stagesFor,
  scoreForStep, BEST_SCORE, WORST_SCORE,
} from './round.ts';

const song = { id: 'nnca', title: 'Nơi Này Có Anh', aliases: ['Right Here'] };
const other = { id: 'other', title: 'Nơi Này Có Anh' }; // same title, different song

describe('stages', () => {
  test('the default ladder is exactly the five stages', () => {
    assert.deepEqual([...STAGE_TARGETS], [0.1, 0.5, 2, 8, 16]);
    assert.deepEqual([...DEFAULT_LADDER], [...STAGE_TARGETS]);
    assert.deepEqual(stagesFor(DEFAULT_LADDER), [0.1, 0.5, 2, 8, 16]);
  });

  test('a library built with the old seven-clip ladder plays the same five stages', () => {
    assert.deepEqual(stagesFor([0.1, 0.5, 1, 2, 4, 8, 16]), [0.1, 0.5, 2, 8, 16]);
  });

  test('a ladder of five or fewer rungs is used as is', () => {
    assert.deepEqual(stagesFor([2, 4, 8]), [2, 4, 8]);
    assert.deepEqual(stagesFor([0.5, 1, 2, 4, 8]), [0.5, 1, 2, 4, 8]);
  });

  test('a longer custom ladder picks the nearest rungs, ascending, ending on the longest', () => {
    const s = stagesFor([0.5, 1, 2, 4, 8, 16]);
    assert.equal(s.length, 5);
    assert.deepEqual(s, [...s].sort((a, b) => a - b), 'ascending');
    assert.equal(new Set(s).size, 5, 'no repeats');
    assert.equal(s.at(-1), 16);
    assert.deepEqual(s, [0.5, 1, 2, 8, 16]);
  });

  test('unsorted, duplicated or junk rungs are cleaned up', () => {
    assert.deepEqual(stagesFor([16, 0.1, 8, 0.1, 2, NaN, -1, 0.5]), [0.1, 0.5, 2, 8, 16]);
  });

  test('an empty ladder falls back to the targets instead of breaking the round', () => {
    assert.deepEqual(stagesFor([]), [...STAGE_TARGETS]);
  });
});

describe('round setup', () => {
  test('always starts on the shortest clue', () => {
    const r = createRound(song);
    assert.equal(r.stageIndex, 0);
    assert.equal(revealedSeconds(r), 0.1);
    assert.equal(r.status, 'playing');
    assert.equal(r.stages.length, 5);
  });
});

describe('winning', () => {
  test('picking the right song on the first stage scores the maximum', () => {
    const r = submitGuess(createRound(song), { id: 'nnca', title: 'Nơi Này Có Anh' });
    assert.equal(r.status, 'won');
    assert.equal(r.score, BEST_SCORE);
    assert.deepEqual(r.attempts, [{ text: 'Nơi Này Có Anh', kind: 'guess', at: 0.1, quality: 'exact' }]);
  });

  test('a picked song is compared by id, so a same-titled different song is wrong', () => {
    const r = submitGuess(createRound(song), other);
    assert.equal(r.status, 'playing');
    assert.equal(r.stageIndex, 1);
  });

  test('free text still matches leniently — no diacritics, aliases', () => {
    assert.equal(submitGuess(createRound(song), 'noi nay co anh').status, 'won');
    assert.equal(submitGuess(createRound(song), 'right here').status, 'won');
  });

  test('later wins score less, down to the floor on the last stage', () => {
    let r = createRound(song);
    for (let i = 0; i < 4; i++) r = skip(r);
    assert.ok(isLastStage(r));
    const won = submitGuess(r, { id: 'nnca', title: 'x' });
    assert.equal(won.status, 'won');
    assert.equal(won.score, WORST_SCORE);
  });
});

describe('wrong guesses and skips open the next stage', () => {
  test('a wrong guess advances one stage and is recorded', () => {
    const r = submitGuess(createRound(song), { id: 'other', title: 'Bigcityboi' });
    assert.equal(r.status, 'playing');
    assert.equal(revealedSeconds(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: 'Bigcityboi', kind: 'guess', at: 0.1, quality: 'none' }]);
  });

  test('a skip advances one stage and is recorded', () => {
    const r = skip(createRound(song));
    assert.equal(revealedSeconds(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: '', kind: 'skip', at: 0.1 }]);
  });

  test('walking the whole ladder visits every stage in order', () => {
    let r = createRound(song);
    const seen = [revealedSeconds(r)];
    while (!isLastStage(r)) {
      r = skip(r);
      seen.push(revealedSeconds(r));
    }
    assert.deepEqual(seen, [0.1, 0.5, 2, 8, 16]);
  });

  test('a wrong guess on the last stage loses', () => {
    let r = createRound(song);
    for (let i = 0; i < 4; i++) r = skip(r);
    const lost = submitGuess(r, { id: 'other', title: 'x' });
    assert.equal(lost.status, 'lost');
    assert.equal(lost.attempts.length, 5);
  });

  test('skipping the last stage loses', () => {
    let r = createRound(song);
    for (let i = 0; i < 5; i++) r = skip(r);
    assert.equal(r.status, 'lost');
    assert.equal(revealedSeconds(r), 16, 'the reveal never runs off the end');
  });

  test('an empty guess is a no-op, not a wasted stage', () => {
    const r = createRound(song);
    assert.deepEqual(submitGuess(r, '   '), r);
    assert.deepEqual(submitGuess(r, { id: 'x', title: '' }), r);
  });
});

describe('giving up and terminal states', () => {
  test('give up loses immediately, on any stage', () => {
    assert.equal(giveUp(createRound(song)).status, 'lost');
    assert.equal(giveUp(skip(skip(createRound(song)))).status, 'lost');
  });

  test('nothing changes a won or lost round', () => {
    const won = submitGuess(createRound(song), { id: 'nnca', title: 't' });
    assert.deepEqual(skip(won), won);
    assert.deepEqual(giveUp(won), won);
    assert.deepEqual(submitGuess(won, 'anything'), won);
    const lost = giveUp(createRound(song));
    assert.deepEqual(skip(lost), lost);
    assert.deepEqual(submitGuess(lost, { id: 'nnca', title: 't' }), lost);
  });

  test('transitions never mutate the previous state', () => {
    const r = createRound(song);
    const snapshot = structuredClone(r);
    skip(r);
    submitGuess(r, 'wrong');
    submitGuess(r, { id: 'nnca', title: 't' });
    giveUp(r);
    assert.deepEqual(r, snapshot);
  });
});

describe('scoring', () => {
  test('decays from best to worst across the stages', () => {
    const scores = [0, 1, 2, 3, 4].map((i) => scoreForStep(i, 5));
    assert.equal(scores[0], BEST_SCORE);
    assert.equal(scores[4], WORST_SCORE);
    for (let i = 1; i < 5; i++) assert.ok(scores[i] < scores[i - 1]);
  });

  test('a one-stage song still awards the top score', () => {
    const r = submitGuess(createRound(song, [4]), { id: 'nnca', title: 't' });
    assert.equal(r.score, BEST_SCORE);
  });
});
