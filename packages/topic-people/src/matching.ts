import { looseKey } from '@wts/core';
import type { Person } from './catalogue.ts';

/** A Guess must name the whole Person or one of their hand-curated Aliases. */
export function matchGuess(guess: string, person: Pick<Person, 'name' | 'aliases'>): boolean {
  const key = looseKey(guess);
  return key.length > 0 && [person.name, ...(person.aliases ?? [])].some((name) => looseKey(name) === key);
}
