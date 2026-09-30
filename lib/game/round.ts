/**
 * Round state machine. Pure — no audio, no DOM, no fetch.
 *
 * Kept free of side effects so the rules are testable, which matters because
 * "how many lives did that cost" is exactly the sort of thing that silently
 * drifts once it is tangled up with playback.
 */

import { REVEAL_LADDER } from '../audio/engine.ts';
import { matchGuess, type MatchQuality, type SongLike } from '../vietnamese.ts';

export const MAX_LIVES = 3;

/** Minimum shape a round needs from a song. */
type AnySong = SongLike & { id: string };

/** Points for winning at each rung. Guessing off 0.1s should feel special. */
const STEP_SCORES = [1000, 700, 500, 350, 200, 100, 50] as const;

export type RoundStatus = 'playing' | 'won' | 'lost';

export interface Attempt {
  text: string;
  kind: 'guess' | 'skip';
  /** How the guess matched, when it did. */
  quality?: MatchQuality;
}

export interface Round<S extends AnySong = AnySong> {
  readonly song: S;
  /** Index into REVEAL_LADDER — how much audio is unlocked. */
  stepIndex: number;
  livesLeft: number;
  status: RoundStatus;
  attempts: Attempt[];
  score: number;
}

export function createRound<S extends AnySong>(song: S): Round<S> {
  return {
    song,
    stepIndex: 0,
    livesLeft: MAX_LIVES,
    status: 'playing',
    attempts: [],
    score: 0,
  };
}

/** Seconds of audio currently unlocked. */
export function revealedSeconds(round: Round<AnySong>): number {
  return REVEAL_LADDER[Math.min(round.stepIndex, REVEAL_LADDER.length - 1)];
}

export function isLastStep(round: Round<AnySong>): boolean {
  return round.stepIndex >= REVEAL_LADDER.length - 1;
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
      score: STEP_SCORES[Math.min(round.stepIndex, STEP_SCORES.length - 1)],
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

/** Skip: reveals more audio, costs no life. */
export function skip<S extends AnySong>(round: Round<S>): Round<S> {
  if (round.status !== 'playing') return round;
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
