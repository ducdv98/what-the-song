import { looseKey, toneKey, type MatchQuality } from '@wts/core';

export interface SongLike {
  title: string;
  /** Hand-curated extra accepted answers: bilingual titles, nicknames. */
  aliases?: string[];
}

/**
 * Decide whether a guess names this song.
 *
 * Returns *how* it matched, so the UI can distinguish "correct" from
 * "correct, and here is the properly accented title" — which is a nice touch
 * for a game people play to learn, and costs nothing.
 */
export function matchGuess(guess: string, song: SongLike): MatchQuality {
  const g = looseKey(guess);
  if (!g) return 'none';

  if (toneKey(guess) === toneKey(song.title)) return 'exact';
  if (g === looseKey(song.title)) return 'diacritics';

  for (const alias of song.aliases ?? []) {
    if (g === looseKey(alias)) return 'alias';
  }

  return 'none';
}
