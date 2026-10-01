/**
 * Round state machine. Pure — no audio, no DOM, no fetch.
 *
 * A round follows an ordered ladder of stages. You start on the first. A wrong
 * guess or a skip opens the next stage; a wrong guess on the last stage, or
 * giving up, loses. There are
 * no lives on top of that — the stages *are* the attempts.
 */

import type { MatchQuality } from './match-quality.ts';
import type { Subject } from './topic.ts';

/** A Topic's matching rule, including the quality recorded for feedback. */
export type RoundMatcher<S extends Subject> = (guess: string, subject: S) => MatchQuality;

/** A first-stage win — the most one round can score. */
export const BEST_SCORE = 1000;
/** A last-stage win — the least a win can score. */
export const WORST_SCORE = 50;

/**
 * Points for winning at a given stage.
 *
 * Decays geometrically from BEST_SCORE on the first stage to WORST_SCORE on
 * the last, so guessing from the first Clue always counts for most.
 */
export function scoreForStep(stageIndex: number, stages: number): number {
  if (stages <= 1) return BEST_SCORE;
  const frac = Math.min(stageIndex, stages - 1) / (stages - 1);
  return Math.round(BEST_SCORE * (WORST_SCORE / BEST_SCORE) ** frac);
}

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Attempt<C = unknown> {
  /** What was guessed; empty for a skip. */
  text: string;
  kind: 'guess' | 'skip';
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
      score: scoreForStep(round.stageIndex, round.stages.length),
      attempts: [...round.attempts, { text, kind: 'guess', at, quality }],
    };
  }
  return advance(round, { text, kind: 'guess', at, quality });
}

/** Skip: open the next stage without guessing. On the last stage it loses. */
export function skip<S extends Subject, C>(round: Round<S, C>): Round<S, C> {
  if (round.status !== 'playing') return round;
  return advance(round, { text: '', kind: 'skip', at: currentClue(round) });
}

/** Give up immediately. */
export function giveUp<S extends Subject, C>(round: Round<S, C>): Round<S, C> {
  if (round.status !== 'playing') return round;
  return { ...round, status: 'lost' };
}
