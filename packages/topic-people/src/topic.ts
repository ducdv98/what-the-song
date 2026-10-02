import type { Topic } from '@wts/core';
import { ladderFor, validateCatalogue, type Person, type Reveal } from './catalogue.ts';
import { matchGuess } from './matching.ts';
import { availableFields, fieldFacetValue } from './fields.ts';

/** All rules and metadata owned by the People Topic. */
export const peopleTopic: Topic<Person, Reveal> = {
  id: 'people',
  ladder: ladderFor,
  matches: (person, guess) => matchGuess(guess, person),
  validateCatalogue,
  facets: [{
    id: 'field',
    labels: { vi: 'Lĩnh vực', en: 'Field' },
    value: fieldFacetValue,
    options: availableFields,
  }],
};
