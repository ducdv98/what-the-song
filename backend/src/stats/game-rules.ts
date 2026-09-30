/**
 * The parts of the game's rules the server needs to judge a reported round.
 *
 * Mirrors lib/game/difficulty.ts and lib/game/round.ts in the web app. The
 * backend is its own deployable and does not import across that boundary; a
 * test (game-rules.spec.ts) reads the web app's sources and fails if these
 * drift.
 */
export const DIFFICULTY_SLUGS = ['easy', 'normal', 'hard', 'expert'] as const;

/** A first-rung win — the most a single round can score. */
export const BEST_SCORE = 1000;
/** A last-rung win — the least a win can score. */
export const WORST_SCORE = 50;
