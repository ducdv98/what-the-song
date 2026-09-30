/**
 * Round state machine. Pure — no audio, no DOM, no fetch.
 *
 * Kept free of side effects so the rules are testable, which matters because
 * "how many lives did that cost" is exactly the sort of thing that silently
 * drifts once it is tangled up with playback.
 */

import { DEFAULT_LADDER } from './ladder.ts';
import { matchGuess, type MatchQuality, type SongLike } from './vietnamese.ts';
import { type Difficulty } from './difficulty.ts';

/** Default lives, used when no difficulty is supplied. */
export const MAX_LIVES = 3;

/**
 * The rules with no difficulty modifier applied: shortest clue, three lives,
 * skipping allowed.
 *
 * createRound defaults to this rather than to DEFAULT_DIFFICULTY, so the
 * unparameterised round is the plain game. Difficulty is a player-facing choice
 * the UI passes in explicitly — it should not quietly redefine what "a round"
 * means for every other caller and test.
 */
const BASELINE: Difficulty = {
  slug: 'baseline',
  label: '',
  gloss: '',
  startStep: 0,
  lives: MAX_LIVES,
  allowSkip: true,
};

/** Minimum shape a round needs from a song. */
type AnySong = SongLike & { id: string };

/** A first-rung win — the most one round can score. */
export const BEST_SCORE = 1000;
/** A last-rung win — the least a win can score. */
export const WORST_SCORE = 50;

/**
 * Points for winning at a given rung.
 *
 * Computed rather than tabulated, because ladders now vary in length per song.
 * Decays geometrically from BEST_SCORE on the first rung to WORST_SCORE on the
 * last, so guessing off the shortest clue always feels special regardless of
 * how many rungs that particular song has.
 */
export function scoreForStep(stepIndex: number, rungs: number): number {
  if (rungs <= 1) return BEST_SCORE;
  const frac = Math.min(stepIndex, rungs - 1) / (rungs - 1);
  return Math.round(BEST_SCORE * (WORST_SCORE / BEST_SCORE) ** frac);
}

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Attempt {
  text: string;
  kind: 'guess' | 'skip';
  /** How the guess matched, when it did. */
  quality?: MatchQuality;
}

export interface Round<S extends AnySong = AnySong> {
  readonly song: S;
  /** This song's reveal ladder, in seconds, ascending. */
  readonly ladder: readonly number[];
  /** Lives this round started with — varies by difficulty. */
  readonly maxLives: number;
  /** Whether "reveal more" is permitted. Off on expert. */
  readonly allowSkip: boolean;
  /** Index into REVEAL_LADDER — how much audio is unlocked. */
  stepIndex: number;
  livesLeft: number;
  status: RoundStatus;
  attempts: Attempt[];
  score: number;
}

export function createRound<S extends AnySong>(
  song: S,
  ladder: readonly number[] = DEFAULT_LADDER,
  difficulty: Difficulty = BASELINE,
): Round<S> {
  const rungs = ladder.length > 0 ? ladder : DEFAULT_LADDER;
  return {
    song,
    ladder: rungs,
    maxLives: difficulty.lives,
    allowSkip: difficulty.allowSkip,
    // Clamped: an easy start of rung 2 must still work on a song whose own
    // ladder only has two rungs.
    stepIndex: Math.min(Math.max(difficulty.startStep, 0), rungs.length - 1),
    livesLeft: difficulty.lives,
    status: 'playing',
    attempts: [],
    score: 0,
  };
}

/** Seconds of audio currently unlocked. */
export function revealedSeconds(round: Round<AnySong>): number {
  return round.ladder[Math.min(round.stepIndex, round.ladder.length - 1)];
}

export function isLastStep(round: Round<AnySong>): boolean {
  return round.stepIndex >= round.ladder.length - 1;
}

/**
 * Advance the reveal, or end the round if there is nothing left to reveal.
 * Shared by wrong guesses and skips — they differ only in the life cost.
 */
function advance<S extends AnySong>(round: Round<S>): Round<S> {
  if (isLastStep(round)) {
    return { ...round, status: 'lost' };
  }
  return { ...round, stepIndex: round.stepIndex + 1 };
}

/**
 * Submit a guess.
 *
 * A wrong guess costs a life *and* reveals more audio, so a round can end
 * either by running out of lives or by running out of ladder — whichever
 * comes first. Returns a new Round; never mutates.
 */
export function submitGuess<S extends AnySong>(round: Round<S>, text: string): Round<S> {
  if (round.status !== 'playing') return round;

  const trimmed = text.trim();
  // An empty submission is a no-op, not a wasted life.
  if (!trimmed) return round;

  const quality = matchGuess(trimmed, round.song);

  if (quality !== 'none') {
    return {
      ...round,
      status: 'won',
      score: scoreForStep(round.stepIndex, round.ladder.length),
      attempts: [...round.attempts, { text: trimmed, kind: 'guess', quality }],
    };
  }

  const livesLeft = round.livesLeft - 1;
  const attempts: Attempt[] = [...round.attempts, { text: trimmed, kind: 'guess', quality }];

  if (livesLeft <= 0) {
    return { ...round, livesLeft: 0, status: 'lost', attempts };
  }
  return { ...advance(round), livesLeft, attempts };
}

/**
 * Skip: reveals more audio, costs no life.
 *
 * A no-op when the difficulty forbids it, so expert mode cannot be skipped
 * through even if a stale button somehow calls this.
 */
export function skip<S extends AnySong>(round: Round<S>): Round<S> {
  if (round.status !== 'playing' || !round.allowSkip) return round;
  return {
    ...advance(round),
    attempts: [...round.attempts, { text: '', kind: 'skip' }],
  };
}

/** Give up immediately. */
export function giveUp<S extends AnySong>(round: Round<S>): Round<S> {
  if (round.status !== 'playing') return round;
  return { ...round, status: 'lost', livesLeft: 0 };
}
