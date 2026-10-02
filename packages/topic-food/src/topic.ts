import type { Topic } from '@wts/core';
import { ladderFor, validateCatalogue, type Dish, type Zoom } from './catalogue.ts';
import { matchGuess } from './matching.ts';
import { availableRegions, regionFacetValue } from './regions.ts';

/** All rules and metadata owned by the Food Topic. */
export const foodTopic: Topic<Dish, Zoom> = {
  id: 'food',
  ladder: ladderFor,
  matches: (dish, guess) => matchGuess(guess, dish),
  validateCatalogue,
  facets: [{
    id: 'region',
    labels: { vi: 'Vùng miền', en: 'Region' },
    value: regionFacetValue,
    options: availableRegions,
  }],
};
