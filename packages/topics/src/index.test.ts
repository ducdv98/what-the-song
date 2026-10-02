import assert from 'node:assert/strict';
import { test } from 'node:test';
import { songsTopic } from '@wts/topic-songs';
import { foodTopic } from '@wts/topic-food';
import { DEFAULT_TOPIC_ID, TOPIC_IDS, getTopic, isTopicId, topics } from './index.ts';

test('registry resolves every declared Topic by id', () => {
  assert.deepEqual(TOPIC_IDS, ['songs', 'food']);
  assert.equal(DEFAULT_TOPIC_ID, 'songs');
  assert.deepEqual(Object.keys(topics), TOPIC_IDS);
  assert.equal(getTopic('songs'), songsTopic);
  assert.equal(topics.songs, songsTopic);
  assert.equal(getTopic('food'), foodTopic);
  assert.equal(topics.food, foodTopic);
});

test('unknown Topic ids do not resolve', () => {
  assert.equal(getTopic('people'), undefined);
  assert.equal(getTopic('__proto__'), undefined);
  assert.equal(isTopicId('songs'), true);
  assert.equal(isTopicId('food'), true);
  assert.equal(isTopicId('people'), false);
  assert.equal(isTopicId('__proto__'), false);
});
