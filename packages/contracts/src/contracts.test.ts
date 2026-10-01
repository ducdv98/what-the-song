import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACET_SLUG_PATTERN, SUBJECT_ID_PATTERN, TOPIC_ID_PATTERN, USERNAME_MAX, USERNAME_MIN, USERNAME_PATTERN,
} from './index.ts';

test('username pattern agrees with the length bounds', () => {
  const re = new RegExp(USERNAME_PATTERN);
  assert.ok(re.test('a'.repeat(USERNAME_MIN)));
  assert.ok(re.test('a'.repeat(USERNAME_MAX)));
  assert.ok(!re.test('a'.repeat(USERNAME_MIN - 1)));
  assert.ok(!re.test('a'.repeat(USERNAME_MAX + 1)));
  assert.ok(!re.test('có_dấu'), 'ASCII only');
});

test('subject ids, Facet slugs, and Topic ids have safe shapes', () => {
  assert.ok(new RegExp(SUBJECT_ID_PATTERN).test('noi-nay-co-anh'));
  assert.ok(!new RegExp(SUBJECT_ID_PATTERN).test('../../etc/passwd'));
  assert.ok(new RegExp(FACET_SLUG_PATTERN).test('rap-viet'));
  assert.ok(!new RegExp(FACET_SLUG_PATTERN).test('DROP TABLE'));
  const topic = new RegExp(TOPIC_ID_PATTERN);
  assert.ok(topic.test('songs'));
  assert.ok(topic.test(`a${'b'.repeat(39)}`));
  assert.ok(!topic.test(''));
  assert.ok(!topic.test('People'));
  assert.ok(!topic.test('1songs'));
  assert.ok(!topic.test(`a${'b'.repeat(40)}`));
});
