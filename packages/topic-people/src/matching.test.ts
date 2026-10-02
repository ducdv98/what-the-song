import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchGuess } from './matching.ts';

test('matches a Person name or Alias with accent folding and tone placement', () => {
  const person = { name: 'Hòa Minzy', aliases: ['Hoà Nguyễn'] };
  assert.equal(matchGuess('hoa minzy', person), true);
  assert.equal(matchGuess('Hoa Nguyen', person), true);
  assert.equal(matchGuess('Hòa Minzy', person), true);
});

test('does not give partial credit or match an empty Guess', () => {
  const person = { name: 'Hòa Minzy', aliases: ['Hoà Nguyễn'] };
  assert.equal(matchGuess('Hòa', person), false);
  assert.equal(matchGuess('Nguyễn', person), false);
  assert.equal(matchGuess('   ', person), false);
});
