import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BEST_SCORE, DIFFICULTY_SLUGS, WORST_SCORE } from './game-rules.js';

/**
 * The backend judges rounds with its own copy of the game's rules. Read the web
 * app's sources and fail if the two ever disagree — a drifted slug list would
 * reject every round played on a new difficulty.
 */
const web = (rel: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../../${rel}`, import.meta.url)),
    'utf8',
  );

describe('game rules mirror the web app', () => {
  it('difficulty slugs', () => {
    const slugs = [
      ...web('lib/game/difficulty.ts').matchAll(/slug:\s*'([^']+)'/g),
    ].map((m) => m[1]);
    expect(slugs).toEqual([...DIFFICULTY_SLUGS]);
  });

  it('score bounds', () => {
    const round = web('lib/game/round.ts');
    expect(round).toMatch(new RegExp(`const BEST_SCORE = ${BEST_SCORE};`));
    expect(round).toMatch(new RegExp(`const WORST_SCORE = ${WORST_SCORE};`));
  });
});
