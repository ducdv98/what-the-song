import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LADDER, STAGE_TARGETS } from './ladder.ts';
import {
  createRound, submitGuess, skip, giveUp, revealedSeconds, isLastStage, stagesFor,
  scoreForStep, BEST_SCORE, WORST_SCORE,
} from './round.ts';

const subject = { id: 'subject-1', name: 'Correct' };
const matcher = (guess: string, target: typeof subject): 'exact' | 'none' =>
  guess === target.name ? 'exact' : 'none';

describe('stages', () => {
  test('the default ladder is exactly the five stages', () => {
    assert.deepEqual([...STAGE_TARGETS], [0.1, 0.5, 2, 8, 16]);
    assert.deepEqual([...DEFAULT_LADDER], [...STAGE_TARGETS]);
    assert.deepEqual(stagesFor(DEFAULT_LADDER), [0.1, 0.5, 2, 8, 16]);
  });

  test('an older seven-rung ladder plays the same five stages', () => {
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
    const r = createRound(subject);
    assert.equal(r.stageIndex, 0);
    assert.equal(revealedSeconds(r), 0.1);
    assert.equal(r.status, 'playing');
    assert.equal(r.stages.length, 5);
  });
});

describe('winning', () => {
  test('typing the right guess on the first stage scores the maximum', () => {
    const r = submitGuess(createRound(subject), 'Correct', matcher);
    assert.equal(r.status, 'won');
    assert.equal(r.score, BEST_SCORE);
    assert.deepEqual(r.attempts, [{ text: 'Correct', kind: 'guess', at: 0.1, quality: 'exact' }]);
  });

  test('later wins score less, down to the floor on the last stage', () => {
    let r = createRound(subject);
    for (let i = 0; i < 4; i++) r = skip(r);
    assert.ok(isLastStage(r));
    const won = submitGuess(r, 'Correct', matcher);
    assert.equal(won.status, 'won');
    assert.equal(won.score, WORST_SCORE);
  });
});

describe('wrong guesses and skips open the next stage', () => {
  test('a wrong guess advances one stage and is recorded', () => {
    const r = submitGuess(createRound(subject), 'Wrong', matcher);
    assert.equal(r.status, 'playing');
    assert.equal(revealedSeconds(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: 'Wrong', kind: 'guess', at: 0.1, quality: 'none' }]);
  });

  test('a skip advances one stage and is recorded', () => {
    const r = skip(createRound(subject));
    assert.equal(revealedSeconds(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: '', kind: 'skip', at: 0.1 }]);
  });

  test('walking the whole ladder visits every stage in order', () => {
    let r = createRound(subject);
    const seen = [revealedSeconds(r)];
    while (!isLastStage(r)) {
      r = skip(r);
      seen.push(revealedSeconds(r));
    }
    assert.deepEqual(seen, [0.1, 0.5, 2, 8, 16]);
  });

  test('a wrong guess on the last stage loses', () => {
    let r = createRound(subject);
    for (let i = 0; i < 4; i++) r = skip(r);
    const lost = submitGuess(r, 'wrong', matcher);
    assert.equal(lost.status, 'lost');
    assert.equal(lost.attempts.length, 5);
  });

  test('skipping the last stage loses', () => {
    let r = createRound(subject);
    for (let i = 0; i < 5; i++) r = skip(r);
    assert.equal(r.status, 'lost');
    assert.equal(revealedSeconds(r), 16, 'the reveal never runs off the end');
  });

  test('an empty guess is a no-op, not a wasted stage', () => {
    const r = createRound(subject);
    assert.deepEqual(submitGuess(r, '   ', matcher), r);
    assert.deepEqual(submitGuess(r, '', matcher), r);
  });
});

describe('giving up and terminal states', () => {
  test('give up loses immediately, on any stage', () => {
    assert.equal(giveUp(createRound(subject)).status, 'lost');
    assert.equal(giveUp(skip(skip(createRound(subject)))).status, 'lost');
  });

  test('nothing changes a won or lost round', () => {
    const won = submitGuess(createRound(subject), 'Correct', matcher);
    assert.deepEqual(skip(won), won);
    assert.deepEqual(giveUp(won), won);
    assert.deepEqual(submitGuess(won, 'anything', matcher), won);
    const lost = giveUp(createRound(subject));
    assert.deepEqual(skip(lost), lost);
    assert.deepEqual(submitGuess(lost, 'Correct', matcher), lost);
  });

  test('transitions never mutate the previous state', () => {
    const r = createRound(subject);
    const snapshot = structuredClone(r);
    skip(r);
    submitGuess(r, 'wrong', matcher);
    submitGuess(r, 'Correct', matcher);
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

  test('a one-stage round still awards the top score', () => {
    const r = submitGuess(createRound(subject, [4]), 'Correct', matcher);
    assert.equal(r.score, BEST_SCORE);
  });
});
