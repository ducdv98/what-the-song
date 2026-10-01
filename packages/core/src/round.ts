/**
 * Round state machine. Pure — no audio, no DOM, no fetch.
 *
 * A round follows an ordered ladder of stages. You start on the first. A wrong
 * guess or a skip opens the next stage; a wrong guess on the last stage, or
 * giving up, loses. There are
 * no lives on top of that — the stages *are* the attempts.
 */

import { DEFAULT_LADDER, STAGE_TARGETS } from './ladder.ts';
import type { MatchQuality } from './match-quality.ts';
import type { Subject } from './topic.ts';

/** A Topic's matching rule, including the quality recorded for feedback. */
export type RoundMatcher<S extends Subject> = (guess: string, subject: S) => MatchQuality;

/** A first-stage win — the most one round can score. */
export const BEST_SCORE = 1000;
/** A last-stage win — the least a win can score. */
export const WORST_SCORE = 50;

/**
 * Pick a round's stages from the ladder provided by its Topic.
 *
 * A ladder with five rungs or fewer keeps all of them. Longer ladders use
 * the rungs nearest each target, compared as ratios, in ascending order and
 * ending on the longest clue.
 */
export function stagesFor(ladder: readonly number[]): number[] {
  const rungs = [...new Set(ladder.filter((s) => Number.isFinite(s) && s > 0))].sort((a, b) => a - b);
  if (rungs.length === 0) return [...STAGE_TARGETS];
  if (rungs.length <= STAGE_TARGETS.length) return rungs;

  const picked: number[] = [];
  let from = 0;
  STAGE_TARGETS.forEach((target, i) => {
    const isLast = i === STAGE_TARGETS.length - 1;
    // Leave enough rungs for the targets still to come.
    const to = rungs.length - (STAGE_TARGETS.length - 1 - i);
    let best = isLast ? rungs.length - 1 : from;
    if (!isLast) {
      for (let j = from; j < to; j++) {
        if (Math.abs(Math.log(rungs[j] / target)) < Math.abs(Math.log(rungs[best] / target))) best = j;
      }
    }
    picked.push(rungs[best]);
    from = best + 1;
  });
  return picked;
}

/**
 * Points for winning at a given stage.
 *
 * Decays geometrically from BEST_SCORE on the first stage to WORST_SCORE on
 * the last, so guessing off the shortest clue always counts for most. Kept for
 * the leaderboard; the result screen leads with the time instead.
 */
export function scoreForStep(stageIndex: number, stages: number): number {
  if (stages <= 1) return BEST_SCORE;
  const frac = Math.min(stageIndex, stages - 1) / (stages - 1);
  return Math.round(BEST_SCORE * (WORST_SCORE / BEST_SCORE) ** frac);
}

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Attempt {
  /** What was guessed; empty for a skip. */
  text: string;
  kind: 'guess' | 'skip';
  /** The stage value it was made on. */
  at: number;
  /** How a text guess matched, when it did. */
  quality?: MatchQuality;
}

export interface Round<S extends Subject = Subject> {
  readonly song: S;
  /** This round's numeric stages, ascending. */
  readonly stages: readonly number[];
  /** Index into stages — how much of the clue is unlocked. */
  stageIndex: number;
  status: RoundStatus;
  attempts: Attempt[];
  score: number;
}

export function createRound<S extends Subject>(subject: S, ladder: readonly number[] = DEFAULT_LADDER): Round<S> {
  return { song: subject, stages: stagesFor(ladder), stageIndex: 0, status: 'playing', attempts: [], score: 0 };
}

/** Current stage value in the numeric ladder. */
export function revealedSeconds(round: Round<Subject>): number {
  return round.stages[Math.min(round.stageIndex, round.stages.length - 1)];
}

export function isLastStage(round: Round<Subject>): boolean {
  return round.stageIndex >= round.stages.length - 1;
}

/** Open the next stage, or lose if this was the last. */
function advance<S extends Subject>(round: Round<S>, attempt: Attempt): Round<S> {
  const attempts = [...round.attempts, attempt];
  if (isLastStage(round)) return { ...round, status: 'lost', attempts };
  return { ...round, stageIndex: round.stageIndex + 1, attempts };
}

/**
 * Submit a guess: free text, matched by the Topic rule.
 * Returns a new Round; never mutates.
 */
export function submitGuess<S extends Subject>(round: Round<S>, guess: string, matcher: RoundMatcher<S>): Round<S> {
  if (round.status !== 'playing') return round;
  const text = guess.trim();
  // An empty submission is a no-op, not a wasted stage.
  if (!text) return round;

  const at = revealedSeconds(round);
  const quality = matcher(text, round.song);

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
export function skip<S extends Subject>(round: Round<S>): Round<S> {
  if (round.status !== 'playing') return round;
  return advance(round, { text: '', kind: 'skip', at: revealedSeconds(round) });
}

/** Give up immediately. */
export function giveUp<S extends Subject>(round: Round<S>): Round<S> {
  if (round.status !== 'playing') return round;
  return { ...round, status: 'lost' };
}
