import type { Topic } from '@wts/core';
import { ladderFor, type Song } from './catalogue.ts';
import { matchGuess } from './matching.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Check the JSON shape used by the existing Songs catalogue. */
export function validateCatalogue(data: unknown): Song[] {
  if (!Array.isArray(data)) throw new Error('Invalid Songs catalogue: expected an array');
  for (const [index, value] of data.entries()) {
    if (!isRecord(value) ||
        typeof value.id !== 'string' || !value.id ||
        typeof value.title !== 'string' || !value.title ||
        typeof value.artist !== 'string' ||
        (value.aliases !== undefined &&
          (!Array.isArray(value.aliases) || !value.aliases.every((alias: unknown) => typeof alias === 'string'))) ||
        (value.genre !== undefined && value.genre !== null && typeof value.genre !== 'string') ||
        (value.tier !== undefined && value.tier !== null && typeof value.tier !== 'string') ||
        (value.cover !== undefined && value.cover !== null && typeof value.cover !== 'string')) {
      throw new Error(`Invalid Songs catalogue entry at index ${index}`);
    }
  }
  return data as Song[];
}

/** All rules and metadata owned by the Songs Topic. */
export const songsTopic: Topic<Song, number> = {
  id: 'songs',
  ladder: ladderFor,
  matches: (song, guess) => matchGuess(guess, song) !== 'none',
  validateCatalogue,
  facets: ['genre'],
};
