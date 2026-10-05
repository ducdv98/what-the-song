import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { finishWarmUp, warmUpEligible, warmUpRound, warmUpSubjects } from './warm-up.ts';
import { revealMore, scoreBoundsForTier, submitGuess } from './round.ts';

const subjects = (tier: string, count: number) => Array.from({ length: count }, (_, i) => ({ id: `${tier}-${i}`, tier }));

describe('Warm-up', () => {
  it('allows only a new Topic with no saved Tier, then ends on a win or third Round', () => {
    assert.equal(warmUpEligible(null, 0, null), true);
    assert.equal(warmUpEligible('easy', 0, null), false);
    assert.equal(warmUpEligible(null, 1, null), false);
    const start = { rounds: 0, won: false, warmUp: true };
    const afterLoss = finishWarmUp(start, false);
    assert.equal(warmUpEligible(null, 0, afterLoss), true);
    assert.equal(warmUpEligible(null, 0, finishWarmUp(afterLoss, true)), false);
    assert.equal(warmUpEligible(null, 0, finishWarmUp(finishWarmUp(afterLoss, false), false)), false);
    assert.equal(warmUpEligible(null, 0, { ...start, warmUp: false }), false);
  });

  it('adds medium only for a small easy pool', () => {
    const medium = subjects('medium', 3);
    assert.deepEqual(warmUpSubjects([...subjects('easy', 10), ...medium]).length, 10);
    assert.deepEqual(warmUpSubjects([...subjects('easy', 9), ...medium]).length, 12);
    assert.deepEqual(warmUpSubjects(subjects('hard', 3)), []);
  });

  it('opens at the middle Stage and keeps the actual Stage Score within API bounds', () => {
    const pool = subjects('easy', 2);
    const played = new Set<string>();
    const round = warmUpRound(pool, played, () => [0.1, 0.5, 2, 8, 16]);
    assert.ok(round);
    assert.equal(round.stageIndex, 2);
    assert.equal(revealMore(round).stageIndex, 3);
    const won = submitGuess(round, 'correct', () => 'exact');
    const bounds = scoreBoundsForTier('easy');
    assert.ok(won.score >= bounds.floor && won.score <= bounds.ceiling);
    assert.equal(warmUpRound(pool, played, () => [1, 2, 3])?.subject.id !== round.subject.id, true);
  });
});
