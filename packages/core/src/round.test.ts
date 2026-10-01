import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRound, submitGuess, skip, giveUp, currentClue, isLastStage,
  scoreForStep, BEST_SCORE, WORST_SCORE,
} from './round.ts';

const subject = { id: 'subject-1', name: 'Correct' };
const matcher = (guess: string, target: typeof subject): 'exact' | 'none' =>
  guess === target.name ? 'exact' : 'none';

describe('round setup', () => {
  test('later changes to the supplied ladder do not affect the Round', () => {
    const ladder = [1, 2, 3];
    const r = createRound(subject, ladder);
    ladder.push(4);
    assert.deepEqual(r.stages, [1, 2, 3]);
  });

  test('starts on the first Topic Clue', () => {
    const r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    assert.equal(r.stageIndex, 0);
    assert.equal(currentClue(r), 0.1);
    assert.equal(r.status, 'playing');
    assert.equal(r.stages.length, 5);
  });

  test('keeps the Topic ladder exactly as supplied', () => {
    const clues = ['face', 'hair', 'face'];
    const round = createRound(subject, clues);
    assert.deepEqual(round.stages, clues);
    assert.deepEqual([currentClue(round), currentClue(skip(round)), currentClue(skip(skip(round)))], clues);
  });
});

describe('winning', () => {
  test('typing the right guess on the first stage scores the maximum', () => {
    const r = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Correct', matcher);
    assert.equal(r.status, 'won');
    assert.equal(r.score, BEST_SCORE);
    assert.deepEqual(r.attempts, [{ text: 'Correct', kind: 'guess', at: 0.1, quality: 'exact' }]);
  });

  test('later wins score less, down to the floor on the last stage', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 4; i++) r = skip(r);
    assert.ok(isLastStage(r));
    const won = submitGuess(r, 'Correct', matcher);
    assert.equal(won.status, 'won');
    assert.equal(won.score, WORST_SCORE);
  });
});

describe('wrong guesses and skips open the next stage', () => {
  test('a wrong guess advances one stage and is recorded', () => {
    const r = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Wrong', matcher);
    assert.equal(r.status, 'playing');
    assert.equal(currentClue(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: 'Wrong', kind: 'guess', at: 0.1, quality: 'none' }]);
  });

  test('a skip advances one stage and is recorded', () => {
    const r = skip(createRound(subject, [0.1, 0.5, 2, 8, 16]));
    assert.equal(currentClue(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: '', kind: 'skip', at: 0.1 }]);
  });

  test('walking the whole ladder visits every stage in order', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    const seen = [currentClue(r)];
    while (!isLastStage(r)) {
      r = skip(r);
      seen.push(currentClue(r));
    }
    assert.deepEqual(seen, [0.1, 0.5, 2, 8, 16]);
  });

  test('a wrong guess on the last stage loses', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 4; i++) r = skip(r);
    const lost = submitGuess(r, 'wrong', matcher);
    assert.equal(lost.status, 'lost');
    assert.equal(lost.attempts.length, 5);
  });

  test('skipping the last stage loses', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 5; i++) r = skip(r);
    assert.equal(r.status, 'lost');
    assert.equal(currentClue(r), 16, 'the reveal never runs off the end');
  });

  test('an empty guess is a no-op, not a wasted stage', () => {
    const r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    assert.deepEqual(submitGuess(r, '   ', matcher), r);
    assert.deepEqual(submitGuess(r, '', matcher), r);
  });
});

describe('giving up and terminal states', () => {
  test('give up loses immediately, on any stage', () => {
    assert.equal(giveUp(createRound(subject, [0.1, 0.5, 2, 8, 16])).status, 'lost');
    assert.equal(giveUp(skip(skip(createRound(subject, [0.1, 0.5, 2, 8, 16])))).status, 'lost');
  });

  test('nothing changes a won or lost round', () => {
    const won = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Correct', matcher);
    assert.deepEqual(skip(won), won);
    assert.deepEqual(giveUp(won), won);
    assert.deepEqual(submitGuess(won, 'anything', matcher), won);
    const lost = giveUp(createRound(subject, [0.1, 0.5, 2, 8, 16]));
    assert.deepEqual(skip(lost), lost);
    assert.deepEqual(submitGuess(lost, 'Correct', matcher), lost);
  });

  test('transitions never mutate the previous state', () => {
    const r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    const snapshot = structuredClone(r);
    skip(r);
    submitGuess(r, 'wrong', matcher);
    submitGuess(r, 'Correct', matcher);
    giveUp(r);
    assert.deepEqual(r, snapshot);
  });
});

describe('scoring', () => {
  test('wins score by position for ladders of 1, 3, 5 and 7 clues', () => {
    for (const length of [1, 3, 5, 7]) {
      const clues = Array.from({ length }, (_, i) => `clue-${i}`);
      const first = createRound(subject, clues);
      assert.deepEqual(first.stages, clues);
      assert.equal(submitGuess(first, 'Correct', matcher).score, BEST_SCORE);

      let last = first;
      for (let i = 1; i < length; i++) last = skip(last);
      assert.equal(submitGuess(last, 'Correct', matcher).score, length === 1 ? BEST_SCORE : WORST_SCORE);
      assert.equal(last.stages.length, length);
    }
  });
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
