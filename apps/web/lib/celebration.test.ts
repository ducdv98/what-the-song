import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIG_EFFECTS, lossProgress, selectCelebration } from './celebration.ts';

const base = { topic: 'songs' as const, stageIndex: 2, tier: 'easy', streak: 1, firstWarmUpWin: false };

describe('celebration selection', () => {
  it('has seven effects and never repeats the previous primary', () => {
    assert.equal(BIG_EFFECTS.length, 7);
    for (const previous of BIG_EFFECTS) for (const random of [0, .25, .5, .75, .999]) {
      assert.notEqual(selectCelebration(base, previous, random).primary, previous);
    }
  });
  it('keeps song-only vinyl out of photo Topics', () => {
    for (const topic of ['food', 'people'] as const) for (const random of [0, .5, .999]) {
      const plan = selectCelebration({ ...base, topic }, null, random);
      assert.notEqual(plan.primary, 'vinyl');
      assert.notEqual(plan.secondary, 'vinyl');
    }
  });
  it('adds a second effect for each merit trigger and makes Warm-up biggest', () => {
    for (const input of [
      { stageIndex: 0 }, { tier: 'hard' }, { tier: 'expert' }, { tier: 'impossible' },
      { streak: 3 }, { streak: 5 }, { streak: 10 }, { firstWarmUpWin: true },
    ]) {
      const plan = selectCelebration({ ...base, ...input }, null, 0);
      assert.ok(plan.secondary);
      assert.notEqual(plan.secondary, plan.primary);
      assert.ok(plan.bursts >= 2);
    }
    assert.equal(selectCelebration({ ...base, firstWarmUpWin: true }, null, 0).bursts, 3);
    assert.equal(selectCelebration(base, null, 0).secondary, null);
  });
  it('chooses loss copy by progress', () => {
    assert.equal(lossProgress(0, 5), 'early');
    assert.equal(lossProgress(2, 5), 'middle');
    assert.equal(lossProgress(4, 5), 'late');
  });
});
