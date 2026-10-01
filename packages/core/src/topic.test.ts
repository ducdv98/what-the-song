import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Subject, Topic } from './topic.ts';

interface Thing extends Subject {
  name: string;
  clues: string[];
}

const things: Topic<Thing, string> = {
  id: 'things',
  ladder: (s) => s.clues,
  matches: (s, guess) => s.name === guess,
  validateCatalogue: (data) => {
    if (!Array.isArray(data)) throw new Error('catalogue must be an array');
    return data as Thing[];
  },
  facets: ['colour'],
};

test('a Topic yields its Subject\'s ladder and judges Guesses', () => {
  const s: Thing = { id: 'a', name: 'A', clues: ['x', 'y'] };
  assert.deepEqual(things.ladder(s), ['x', 'y']);
  assert.ok(things.matches(s, 'A'));
});

test('a Topic missing part of the contract does not type-check', () => {
  // @ts-expect-error — no matcher, validator or facets
  const incomplete: Topic = { id: 'x', ladder: () => [] };
  assert.equal(incomplete.id, 'x');
});
