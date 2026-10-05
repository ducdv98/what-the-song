/**
 * Round state machine. Pure — no audio, no DOM, no fetch.
 *
 * A Round follows an ordered ladder of Stages. You start on the first. A wrong
 * Guess or Reveal more opens the next Stage. A wrong Guess on the last Stage,
 * or Give up on any Stage, loses. Reveal more on the last Stage does nothing.
 * There are no lives on top of that — the Stages are the attempts.
 */

import type { MatchQuality } from './match-quality.ts';
import type { Subject } from './topic.ts';
import { DEFAULT_TIER, TIER_MULTIPLIERS, tierOf, type TierSlug } from './difficulty.ts';

/** A Topic's matching rule, including the quality recorded for feedback. */
export type RoundMatcher<S extends Subject> = (guess: string, subject: S) => MatchQuality;

/** A first-stage win — the most one round can score. */
export const BEST_SCORE = 1000;
/** Unscaled last-stage Score; lower Tiers have a lower floor. */
export const WORST_SCORE = 50;

/** Valid Score bounds for a winning Round at one Tier. */
export function scoreBoundsForTier(tier: TierSlug): { floor: number; ceiling: number } {
  const multiplier = TIER_MULTIPLIERS[tier];
  return { floor: Math.round(WORST_SCORE * multiplier), ceiling: Math.round(BEST_SCORE * multiplier) };
}

/**
 * Points for winning at a given stage.
 *
 * Decays geometrically from BEST_SCORE on the first stage to WORST_SCORE on
 * the last, so guessing from the first Clue always counts for most.
 */
export function scoreForStep(stageIndex: number, stages: number, tier: TierSlug = DEFAULT_TIER): number {
  if (stages <= 1) return Math.round(BEST_SCORE * TIER_MULTIPLIERS[tier]);
  const frac = Math.min(stageIndex, stages - 1) / (stages - 1);
  const stageScore = Math.round(BEST_SCORE * (WORST_SCORE / BEST_SCORE) ** frac);
  return Math.round(stageScore * TIER_MULTIPLIERS[tier]);
}

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Attempt<C = unknown> {
  /** What was guessed; empty for Reveal more. */
  text: string;
  kind: 'guess' | 'reveal';
  /** The Clue it was made on. */
  at: C;
  /** How a text guess matched, when it did. */
  quality?: MatchQuality;
}

export interface Round<S extends Subject = Subject, C = unknown> {
  readonly subject: S;
  /** The Topic's Clues in Stage order. */
  readonly stages: readonly C[];
  /** Index into stages — how much of the clue is unlocked. */
  stageIndex: number;
  status: RoundStatus;
  attempts: Attempt<C>[];
  score: number;
}

export function createRound<S extends Subject, C>(subject: S, ladder: readonly C[]): Round<S, C> {
  if (ladder.length === 0) throw new Error('A Round needs at least one Clue');
  return { subject, stages: [...ladder], stageIndex: 0, status: 'playing', attempts: [], score: 0 };
}

/** The Clue at the current Stage. */
export function currentClue<S extends Subject, C>(round: Round<S, C>): C {
  return round.stages[Math.min(round.stageIndex, round.stages.length - 1)];
}

export function isLastStage(round: Round<Subject, unknown>): boolean {
  return round.stageIndex >= round.stages.length - 1;
}

/** Open the next stage, or lose if this was the last. */
function advance<S extends Subject, C>(round: Round<S, C>, attempt: Attempt<C>): Round<S, C> {
  const attempts = [...round.attempts, attempt];
  if (isLastStage(round)) return { ...round, status: 'lost', attempts };
  return { ...round, stageIndex: round.stageIndex + 1, attempts };
}

/**
 * Submit a guess: free text, matched by the Topic rule.
 * Returns a new Round; never mutates.
 */
export function submitGuess<S extends Subject, C>(round: Round<S, C>, guess: string, matcher: RoundMatcher<S>): Round<S, C> {
  if (round.status !== 'playing') return round;
  const text = guess.trim();
  // An empty submission is a no-op, not a wasted stage.
  if (!text) return round;

  const at = currentClue(round);
  const quality = matcher(text, round.subject);

  if (quality !== 'none') {
    return {
      ...round,
      status: 'won',
      score: scoreForStep(round.stageIndex, round.stages.length, tierOf(round.subject)),
      attempts: [...round.attempts, { text, kind: 'guess', at, quality }],
    };
  }
  return advance(round, { text, kind: 'guess', at, quality });
}

/** Reveal more: open the next Stage without guessing; no-op on the last Stage. */
export function revealMore<S extends Subject, C>(round: Round<S, C>): Round<S, C> {
  if (round.status !== 'playing' || isLastStage(round)) return round;
  return advance(round, { text: '', kind: 'reveal', at: currentClue(round) });
}

/** Give up immediately. */
export function giveUp<S extends Subject, C>(round: Round<S, C>): Round<S, C> {
  if (round.status !== 'playing') return round;
  return { ...round, status: 'lost', score: 0 };
}
