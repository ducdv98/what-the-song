import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRound, submitGuess, revealMore, giveUp, currentClue, isLastStage,
  scoreForStep, BEST_SCORE,
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
    assert.deepEqual([currentClue(round), currentClue(revealMore(round)), currentClue(revealMore(revealMore(round)))], clues);
  });
});

describe('winning', () => {
  test('an untagged Subject scores as medium on the first Stage', () => {
    const r = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Correct', matcher);
    assert.equal(r.status, 'won');
    assert.equal(r.score, 600);
    assert.deepEqual(r.attempts, [{ text: 'Correct', kind: 'guess', at: 0.1, quality: 'exact' }]);
  });

  test('an untagged Subject scores as medium on the last Stage', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 4; i++) r = revealMore(r);
    assert.ok(isLastStage(r));
    const won = submitGuess(r, 'Correct', matcher);
    assert.equal(won.status, 'won');
    assert.equal(won.score, 30);
  });
});

describe('wrong guesses and Reveal more', () => {
  test('a wrong guess advances one stage and is recorded', () => {
    const r = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Wrong', matcher);
    assert.equal(r.status, 'playing');
    assert.equal(currentClue(r), 0.5);
    assert.deepEqual(r.attempts, [{ text: 'Wrong', kind: 'guess', at: 0.1, quality: 'none' }]);
  });

  test('Reveal more opens the next Stage from the first and middle Stages', () => {
    const first = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    const second = revealMore(first);
    assert.equal(second.stageIndex, 1);
    assert.equal(second.status, 'playing');
    assert.equal(second.score, 0);
    assert.deepEqual(second.attempts, [{ text: '', kind: 'reveal', at: 0.1 }]);

    const middle = revealMore(second);
    const fourth = revealMore(middle);
    assert.equal(fourth.stageIndex, 3);
    assert.equal(fourth.status, 'playing');
    assert.deepEqual(fourth.attempts[2], { text: '', kind: 'reveal', at: 2 });
    assert.equal(submitGuess(fourth, 'Correct', matcher).score, 64);
  });

  test('walking the whole ladder visits every stage in order', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    const seen = [currentClue(r)];
    while (!isLastStage(r)) {
      r = revealMore(r);
      seen.push(currentClue(r));
    }
    assert.deepEqual(seen, [0.1, 0.5, 2, 8, 16]);
  });

  test('a wrong guess on the last stage loses', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 4; i++) r = revealMore(r);
    const lost = submitGuess(r, 'wrong', matcher);
    assert.equal(lost.status, 'lost');
    assert.equal(lost.attempts.length, 5);
  });

  test('Reveal more on the last Stage returns the same Round without recording an attempt', () => {
    let r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (let i = 0; i < 4; i++) r = revealMore(r);
    assert.strictEqual(revealMore(r), r);
    assert.equal(r.status, 'playing');
    assert.equal(r.attempts.length, 4);
  });

  test('an empty guess is a no-op, not a wasted stage', () => {
    const r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    assert.deepEqual(submitGuess(r, '   ', matcher), r);
    assert.deepEqual(submitGuess(r, '', matcher), r);
  });
});

describe('giving up and terminal states', () => {
  test('Give up loses with zero Score on the first, middle and last Stage', () => {
    let round = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    for (const index of [0, 2, 4]) {
      while (round.stageIndex < index) round = revealMore(round);
      const lost = giveUp(round);
      assert.equal(lost.status, 'lost');
      assert.equal(lost.score, 0);
      assert.equal(lost.stageIndex, index);
      assert.deepEqual(lost.attempts, round.attempts);
    }
  });

  test('nothing changes a won or lost round', () => {
    const won = submitGuess(createRound(subject, [0.1, 0.5, 2, 8, 16]), 'Correct', matcher);
    assert.deepEqual(revealMore(won), won);
    assert.deepEqual(giveUp(won), won);
    assert.deepEqual(submitGuess(won, 'anything', matcher), won);
    const lost = giveUp(createRound(subject, [0.1, 0.5, 2, 8, 16]));
    assert.deepEqual(revealMore(lost), lost);
    assert.deepEqual(submitGuess(lost, 'Correct', matcher), lost);
  });

  test('transitions never mutate the previous state', () => {
    const r = createRound(subject, [0.1, 0.5, 2, 8, 16]);
    const snapshot = structuredClone(r);
    revealMore(r);
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
      assert.equal(submitGuess(first, 'Correct', matcher).score, 600);

      let last = first;
      for (let i = 1; i < length; i++) last = revealMore(last);
      assert.equal(submitGuess(last, 'Correct', matcher).score, length === 1 ? 600 : 30);
      assert.equal(last.stages.length, length);
    }
  });
  test('decays from best to worst across the stages', () => {
    const scores = [0, 1, 2, 3, 4].map((i) => scoreForStep(i, 5, 'medium'));
    assert.equal(scores[0], 600);
    assert.equal(scores[4], 30);
    for (let i = 1; i < 5; i++) assert.ok(scores[i] < scores[i - 1]);
  });

  test('scales the rounded Stage score', () => {
    assert.equal(scoreForStep(1, 3, 'expert'), 202);
  });

  test('a one-stage untagged Round awards the medium ceiling', () => {
    const r = submitGuess(createRound(subject, [4]), 'Correct', matcher);
    assert.equal(r.score, 600);
  });

  test('each Tier scales first and last Stage, with impossible retaining the global ceiling', () => {
    const cases = [
      ['easy', 400, 20], ['medium', 600, 30], ['hard', 800, 40],
      ['expert', 900, 45], ['impossible', 1000, 50],
    ] as const;
    for (const [tier, first, last] of cases) {
      const start = createRound({ ...subject, tier }, [1, 2, 3, 4, 5]);
      assert.equal(submitGuess(start, 'Correct', matcher).score, first);
      let end = start;
      for (let i = 1; i < 5; i++) end = revealMore(end);
      assert.equal(submitGuess(end, 'Correct', matcher).score, last);
    }
    assert.equal(BEST_SCORE, 1000);
  });

  test('Score falls by Stage and rises by Tier for every ladder length', () => {
    for (const length of [1, 3, 5, 7]) {
      const tiers = ['easy', 'medium', 'hard', 'expert', 'impossible'] as const;
      const rows = tiers.map((tier) => Array.from({ length }, (_, stage) => scoreForStep(stage, length, tier)));
      for (const row of rows) for (let stage = 1; stage < length; stage++) assert.ok(row[stage] <= row[stage - 1]);
      for (let tier = 1; tier < rows.length; tier++) for (let stage = 0; stage < length; stage++) {
        assert.ok(rows[tier][stage] > rows[tier - 1][stage]);
      }
    }
  });

  test('losing at any Tier scores zero', () => {
    for (const tier of ['easy', 'medium', 'hard', 'expert', 'impossible']) {
      assert.equal(giveUp(createRound({ ...subject, tier }, [1])).score, 0);
    }
  });
});
