import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Topic } from '@wts/core';
import { songsTopic } from './topic.ts';
import { playableSongs, STAGE_TARGETS, type Song } from './catalogue.ts';

const song: Song = {
  id: 'nnca', title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP',
  aliases: ['Right Here'], genre: 'nhac-tre', clips: { '500': 'a.mp3', '100': 'b.mp3' },
};

test('Songs value satisfies the Topic contract', () => {
  const topic: Topic<Song, number> = songsTopic;
  assert.equal(topic.id, 'songs');
  const facet = topic.facets?.[0];
  assert.equal(facet?.id, 'genre');
  assert.deepEqual(facet?.labels, { vi: 'Thể loại', en: 'Genre' });
  assert.equal(facet?.value(song), 'nhac-tre');
  assert.equal(facet?.value({ ...song, genre: 'unknown' }), 'khac');
  assert.deepEqual(facet?.options([song]), [{
    value: 'nhac-tre', labels: { vi: 'Nhạc trẻ', en: 'Contemporary V-pop' }, count: 1,
  }]);
  assert.deepEqual(topic.ladder(song), [0.1, 0.5]);
  assert.equal(topic.matches(song, 'noi nay co anh'), true);
  assert.equal(topic.matches(song, 'right here'), true);
  assert.equal(topic.matches(song, 'nơi này'), false);
});

test('validates the catalogue and preserves song data', () => {
  assert.deepEqual(songsTopic.validateCatalogue([song]), [song]);
  assert.deepEqual(songsTopic.validateCatalogue([]), []);
  assert.throws(() => songsTopic.validateCatalogue({}), /expected an array/);
  assert.throws(() => songsTopic.validateCatalogue([{ ...song, aliases: ['ok', 1] }]), /index 0/);
  assert.throws(() => songsTopic.validateCatalogue([{ ...song, title: null }]), /index 0/);
});

test('accepts songs with missing or malformed clips and skips them for play', () => {
  const withoutClips = { id: 'missing', title: 'Missing', artist: 'A' };
  const nullClips = { id: 'null', title: 'Null', artist: 'A', clips: null };
  const malformedClips = { id: 'malformed', title: 'Malformed', artist: 'A', clips: '100' };
  const catalogue = songsTopic.validateCatalogue([song, withoutClips, nullClips, malformedClips]);

  assert.equal(catalogue.length, 4);
  assert.deepEqual(catalogue.slice(1).map(songsTopic.ladder), [
    [...STAGE_TARGETS], [...STAGE_TARGETS], [...STAGE_TARGETS],
  ]);
  const [playable, skipped] = playableSongs(catalogue);
  assert.deepEqual(playable.map((entry) => entry.id), [song.id]);
  assert.deepEqual(skipped.map((entry) => entry.id), ['missing', 'null', 'malformed']);
});
