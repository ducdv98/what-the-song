import { looseKey } from '@wts/core';
import type { Dish } from './catalogue.ts';

/** A Guess must name the whole Dish or one of its hand-curated Aliases. */
export function matchGuess(guess: string, dish: Pick<Dish, 'name' | 'aliases'>): boolean {
  const key = looseKey(guess);
  return key.length > 0 && [dish.name, ...(dish.aliases ?? [])].some((name) => looseKey(name) === key);
}
