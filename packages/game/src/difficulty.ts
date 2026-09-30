/**
 * Difficulty as a game mode, not a per-song rating.
 *
 * docs/RESEARCH.md §1 argued that per-song difficulty should be calibrated from
 * real play data, seeded with a popularity proxy. We have neither yet, and
 * inventing a per-song rating would be a guess dressed up as data. So
 * difficulty instead adjusts the *rules*: where on the ladder you start, how
 * many lives you get, and whether you may skip. That needs no metadata, is
 * immediately meaningful, and composes with each song's own ladder.
 *
 * Per-song difficulty remains the right long-term answer — once there is play
 * data to derive it from.
 */

export interface Difficulty {
  slug: string;
  label: string;
  gloss: string;
  /** Ladder index the round opens on. Clamped to the song's ladder. */
  startStep: number;
  lives: number;
  allowSkip: boolean;
}

export const DIFFICULTIES: readonly Difficulty[] = [
  {
    slug: 'easy',
    label: 'Dễ',
    gloss: 'Longer first clue, 5 lives',
    startStep: 2,
    lives: 5,
    allowSkip: true,
  },
  {
    slug: 'normal',
    label: 'Thường',
    gloss: 'Short first clue, 3 lives',
    startStep: 1,
    lives: 3,
    allowSkip: true,
  },
  {
    slug: 'hard',
    label: 'Khó',
    gloss: 'Shortest clue, 3 lives',
    startStep: 0,
    lives: 3,
    allowSkip: true,
  },
  {
    slug: 'expert',
    label: 'Cực khó',
    gloss: 'Shortest clue, 1 life, no skips',
    startStep: 0,
    lives: 1,
    allowSkip: false,
  },
] as const;

export const DEFAULT_DIFFICULTY =
  DIFFICULTIES.find((d) => d.slug === 'normal') ?? DIFFICULTIES[0];

export function findDifficulty(slug: string | null | undefined): Difficulty {
  return DIFFICULTIES.find((d) => d.slug === slug) ?? DEFAULT_DIFFICULTY;
}
