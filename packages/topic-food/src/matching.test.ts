import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchGuess } from './matching.ts';

test('matches a Dish name without diacritics and an Alias', () => {
  const dish = { name: 'Bún bò Huế', aliases: ['Hue beef noodle soup'] };
  assert.equal(matchGuess('bun bo hue', dish), true);
  assert.equal(matchGuess('hue beef noodle soup', dish), true);
  assert.equal(matchGuess('Bún bò Huế', dish), true);
});

test('accepts Vietnamese tone placement variants', () => {
  assert.equal(matchGuess('Hoà tấu', { name: 'Hòa tấu' }), true);
});

test('does not give partial credit or match an empty Guess', () => {
  const dish = { name: 'Bún bò Huế', aliases: ['Hue beef noodle soup'] };
  assert.equal(matchGuess('bún bò', dish), false);
  assert.equal(matchGuess('Hue beef', dish), false);
  assert.equal(matchGuess('   ', dish), false);
});
