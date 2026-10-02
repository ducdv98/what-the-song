import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Topic } from '@wts/core';
import { peopleTopic } from './topic.ts';
import { REVEAL_FRACTIONS, type Person, type Reveal } from './catalogue.ts';

const person: Person = {
  id: 'hoa-minzy', name: 'Hòa Minzy', aliases: ['Hoà Nguyễn'], tier: 'medium',
  field: 'Ca sĩ', photo: 'photo-a1.jpg', sourceUrl: 'https://example.com/photo.jpg',
};

test('People satisfies the Topic contract and returns five Reveal Clues', () => {
  const topic: Topic<Person, Reveal> = peopleTopic;
  assert.equal(topic.id, 'people');
  assert.deepEqual(REVEAL_FRACTIONS, [0.15, 0.35, 0.6, 0.85, 1]);
  assert.deepEqual(topic.ladder(person), [
    { photo: 'photo-a1.jpg', fraction: 0.15 },
    { photo: 'photo-a1.jpg', fraction: 0.35 },
    { photo: 'photo-a1.jpg', fraction: 0.6 },
    { photo: 'photo-a1.jpg', fraction: 0.85 },
    { photo: 'photo-a1.jpg', fraction: 1 },
  ]);
  assert.deepEqual(topic.ladder({ ...person, revealFractions: [0.1, 0.3, 0.55, 0.9, 1] })
    .map((clue) => clue.fraction), [0.1, 0.3, 0.55, 0.9, 1]);
});

test('field Facet has bilingual labels and counts only present values', () => {
  const facet = peopleTopic.facets?.[0];
  assert.equal(peopleTopic.facets?.length, 1);
  assert.equal(facet?.id, 'field');
  assert.deepEqual(facet?.labels, { vi: 'Lĩnh vực', en: 'Field' });
  assert.equal(facet?.value(person), 'ca-si');
  assert.deepEqual(facet?.options([
    person,
    { ...person, id: 'actor', field: 'Diễn viên' },
    { ...person, id: 'comic', field: 'MC / Hài' },
    { ...person, id: 'streamer', field: 'Streamer' },
    { ...person, id: 'influencer', field: 'Influencer' },
    { ...person, id: 'singer', field: 'Ca sĩ' },
  ]), [
    { value: 'ca-si', labels: { vi: 'Ca sĩ', en: 'Singer' }, count: 2 },
    { value: 'dien-vien', labels: { vi: 'Diễn viên', en: 'Actor' }, count: 1 },
    { value: 'mc-hai', labels: { vi: 'MC / Hài', en: 'MC / Comedy' }, count: 1 },
    { value: 'streamer', labels: { vi: 'Streamer', en: 'Streamer' }, count: 1 },
    { value: 'influencer', labels: { vi: 'Influencer', en: 'Influencer' }, count: 1 },
  ]);
});

test('validates required Person fields, source URL, field and Reveal override', () => {
  assert.deepEqual(peopleTopic.validateCatalogue([person]), [person]);
  assert.deepEqual(peopleTopic.validateCatalogue([]), []);
  assert.throws(() => peopleTopic.validateCatalogue({}), /expected an array/);
  for (const invalid of [
    { ...person, id: '' }, { ...person, id: '../bad' },
    { ...person, name: '' }, { ...person, photo: '' },
    { ...person, photo: '../bad.jpg' },
    { ...person, aliases: ['valid', 1] }, { ...person, tier: 'unknown' },
    { ...person, field: undefined }, { ...person, field: 'Artist' },
    { ...person, sourceUrl: undefined }, { ...person, sourceUrl: '' },
    { ...person, sourceUrl: 'not a URL' }, { ...person, sourceUrl: 'file:///photo.jpg' },
    { ...person, revealFractions: [0.1, 0.5, 1] },
    { ...person, revealFractions: [0, 0.3, 0.5, 0.8, 1] },
    { ...person, revealFractions: [0.1, 0.3, 0.5, 0.8, 0.9] },
    { ...person, revealFractions: [0.1, 0.5, 0.4, 0.8, 1] },
    { ...person, revealFractions: [0.1, NaN, 0.5, 0.8, 1] },
  ]) {
    assert.throws(() => peopleTopic.validateCatalogue([invalid]), /index 0/);
  }
  assert.throws(() => peopleTopic.validateCatalogue([person, person]), /Duplicate Person id/);
});

test('rejects Aliases equal to another Person name or Alias after accent folding', () => {
  const second = { ...person, id: 'son-tung', name: 'Sơn Tùng', aliases: ['M-TP'] };
  assert.throws(() => peopleTopic.validateCatalogue([person, { ...second, aliases: ['Hoa Minzy'] }]), /Alias collides/);
  assert.throws(() => peopleTopic.validateCatalogue([{ ...person, aliases: ['son tung'] }, second]), /name collides/);
  assert.throws(() => peopleTopic.validateCatalogue([person, { ...second, aliases: ['HOA NGUYEN'] }]), /Alias collides/);
  assert.deepEqual(peopleTopic.validateCatalogue([person, second]), [person, second]);
});
