import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENRE_SLUG_PATTERN, SONG_ID_PATTERN, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN,
} from './index.ts';

test('username pattern agrees with the length bounds', () => {
  const re = new RegExp(USERNAME_PATTERN);
  assert.ok(re.test('a'.repeat(USERNAME_MIN)));
  assert.ok(re.test('a'.repeat(USERNAME_MAX)));
  assert.ok(!re.test('a'.repeat(USERNAME_MIN - 1)));
  assert.ok(!re.test('a'.repeat(USERNAME_MAX + 1)));
  assert.ok(!re.test('có_dấu'), 'ASCII only');
});

test('song ids and genre slugs refuse path- and SQL-shaped input', () => {
  assert.ok(new RegExp(SONG_ID_PATTERN).test('noi-nay-co-anh'));
  assert.ok(!new RegExp(SONG_ID_PATTERN).test('../../etc/passwd'));
  assert.ok(new RegExp(GENRE_SLUG_PATTERN).test('rap-viet'));
  assert.ok(!new RegExp(GENRE_SLUG_PATTERN).test('DROP TABLE'));
});
