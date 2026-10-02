import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Topic } from '@wts/core';
import { foodTopic } from './topic.ts';
import { ZOOM_FRACTIONS, type Dish, type Zoom } from './catalogue.ts';

const dish: Dish = {
  id: 'bun-bo-hue', name: 'Bún bò Huế', aliases: ['Hue beef noodle soup'],
  tier: 'medium', region: 'Trung', photo: 'photo-a1.jpg',
  credit: { author: 'A Photographer', licence: 'CC BY-SA 4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bun_bo_Hue.jpg' },
};

test('Food satisfies the Topic contract and returns five Zoom Clues', () => {
  const topic: Topic<Dish, Zoom> = foodTopic;
  assert.equal(topic.id, 'food');
  assert.deepEqual(topic.ladder(dish), ZOOM_FRACTIONS.map((fraction) => ({ photo: dish.photo, fraction })));
  const focalPoint = { x: 0, y: 1 };
  assert.deepEqual(topic.ladder({ ...dish, focalPoint }), ZOOM_FRACTIONS.map((fraction) => ({
    photo: dish.photo, fraction, focalPoint,
  })));
  assert.equal(topic.matches(dish, 'bun bo hue'), true);
  assert.equal(topic.matches(dish, 'bun bo'), false);
});

test('region Facet has bilingual labels and counts only present values', () => {
  const facet = foodTopic.facets?.[0];
  assert.equal(foodTopic.facets?.length, 1);
  assert.equal(facet?.id, 'region');
  assert.deepEqual(facet?.labels, { vi: 'Vùng miền', en: 'Region' });
  assert.equal(facet?.value(dish), 'trung');
  assert.equal(facet?.value({ ...dish, region: undefined }), 'toan-quoc');
  assert.deepEqual(facet?.options([
    dish, { ...dish, id: 'another', region: 'Bắc' },
    { ...dish, id: 'third', region: 'Nam' },
    { ...dish, id: 'fourth', region: 'Tây Nguyên' },
    { ...dish, id: 'fifth', region: null }, { ...dish, id: 'sixth', region: undefined },
  ]), [
    { value: 'bac', labels: { vi: 'Bắc', en: 'North' }, count: 1 },
    { value: 'trung', labels: { vi: 'Trung', en: 'Central' }, count: 1 },
    { value: 'nam', labels: { vi: 'Nam', en: 'South' }, count: 1 },
    { value: 'tay-nguyen', labels: { vi: 'Tây Nguyên', en: 'Central Highlands' }, count: 1 },
    { value: 'toan-quoc', labels: { vi: 'Toàn quốc', en: 'Nationwide' }, count: 2 },
  ]);
});

test('validates a catalogue and its required Dish fields', () => {
  assert.deepEqual(foodTopic.validateCatalogue([dish]), [dish]);
  assert.deepEqual(foodTopic.validateCatalogue([]), []);
  assert.throws(() => foodTopic.validateCatalogue({}), /expected an array/);
  for (const invalid of [
    { ...dish, id: '' }, { ...dish, id: '../bad' },
    { ...dish, name: '' }, { ...dish, photo: '' },
    { ...dish, photo: '..' }, { ...dish, photo: '../bad.jpg' },
    { ...dish, aliases: ['valid', 1] }, { ...dish, tier: 'unknown' },
    { ...dish, focalPoint: { x: -0.01, y: 0.5 } },
    { ...dish, focalPoint: { x: 0.5, y: 1.01 } },
    { ...dish, focalPoint: { x: NaN, y: 0.5 } },
  ]) {
    assert.throws(() => foodTopic.validateCatalogue([invalid]), /index 0/);
  }
});

test('rejects missing or invalid Credit', () => {
  for (const credit of [
    undefined,
    { ...dish.credit, author: '' },
    { ...dish.credit, sourceUrl: 'not a URL' },
    { ...dish.credit, licence: 'All rights reserved' },
    { ...dish.credit, licence: 'CC BY-NC 4.0' },
  ]) {
    assert.throws(() => foodTopic.validateCatalogue([{ ...dish, credit }]), /index 0/);
  }
  for (const licence of ['CC BY', 'CC BY-SA', 'CC0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC0 1.0']) {
    assert.equal(foodTopic.validateCatalogue([{ ...dish, credit: { ...dish.credit, licence } }]).length, 1);
  }
});

test('rejects an unknown region and duplicate ids', () => {
  assert.throws(() => foodTopic.validateCatalogue([{ ...dish, region: 'East' }]), /index 0/);
  assert.throws(() => foodTopic.validateCatalogue([dish, { ...dish, name: 'Phở' }]), /Duplicate Dish id/);
});

test('rejects Aliases equal to another Dish name or Alias after accent folding', () => {
  const second = { ...dish, id: 'pho', name: 'Phở', aliases: ['Vietnamese noodle soup'] };
  assert.throws(() => foodTopic.validateCatalogue([dish, { ...second, aliases: ['bun bo hue'] }]), /Alias collides/);
  assert.throws(() => foodTopic.validateCatalogue([{ ...dish, aliases: ['pho'] }, second]), /name collides/);
  assert.throws(() => foodTopic.validateCatalogue([dish, { ...second, aliases: ['HUE BEEF NOODLE SOUP'] }]), /Alias collides/);
  assert.deepEqual(foodTopic.validateCatalogue([dish, second]), [dish, second]);
});
