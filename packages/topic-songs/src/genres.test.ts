import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENRES, findGenre, isKnownGenre, availableGenres, filterByGenre,
} from './genres.ts';

describe('genre taxonomy', () => {
  test('slugs are unique and url-safe', () => {
    const slugs = GENRES.map((g) => g.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'duplicate slug');
    for (const s of slugs) assert.match(s, /^[a-z-]+$/, s);
  });

  test('every genre has a Vietnamese label and an English gloss', () => {
    for (const g of GENRES) {
      assert.ok(g.label.length > 0, g.slug);
      assert.ok(g.gloss.length > 0, g.slug);
    }
  });

  test('the taxonomy is Vietnamese, not the Anglophone one', () => {
    const slugs = GENRES.map((g) => g.slug);
    assert.ok(slugs.includes('nhac-tre'));
    assert.ok(slugs.includes('rap-viet'));
    assert.ok(slugs.includes('bolero'));
    assert.ok(!slugs.includes('k-pop'), 'K-Pop does not belong here');
    assert.ok(!slugs.includes('country'));
  });

  test('lookup', () => {
    assert.equal(findGenre('bolero')?.label, 'Bolero');
    assert.equal(findGenre('nope'), undefined);
    assert.equal(findGenre(null), undefined);
    assert.equal(isKnownGenre('rap-viet'), true);
    assert.equal(isKnownGenre('jazz'), false);
    assert.equal(isKnownGenre(undefined), false);
  });
});

describe('available genres', () => {
  const songs = [
    { genre: 'nhac-tre' }, { genre: 'nhac-tre' }, { genre: 'rap-viet' },
    { genre: null }, { genre: 'not-a-genre' },
  ];

  test('only genres present are offered, with counts', () => {
    const got = availableGenres(songs);
    assert.deepEqual(
      got.map((g) => [g.genre.slug, g.count]),
      [['nhac-tre', 2], ['rap-viet', 1], ['khac', 2]],
    );
  });

  test('unknown and missing genres fall under khac, so no song is unreachable', () => {
    const khac = availableGenres(songs).find((g) => g.genre.slug === 'khac');
    assert.equal(khac?.count, 2);
  });

  test('order follows the taxonomy, not insertion', () => {
    const got = availableGenres([{ genre: 'bolero' }, { genre: 'nhac-tre' }]);
    assert.deepEqual(got.map((g) => g.genre.slug), ['nhac-tre', 'bolero']);
  });

  test('an empty catalogue offers nothing', () => {
    assert.deepEqual(availableGenres([]), []);
  });
});

describe('genre filtering', () => {
  const songs = [
    { id: 'a', genre: 'nhac-tre' },
    { id: 'b', genre: 'rap-viet' },
    { id: 'c', genre: null },
    { id: 'd', genre: 'bogus' },
  ];

  test('null selects everything', () => {
    assert.equal(filterByGenre(songs, null).length, 4);
  });

  test('a genre selects only its songs', () => {
    assert.deepEqual(filterByGenre(songs, 'nhac-tre').map((s) => s.id), ['a']);
  });

  test('khac collects unknown and missing tags', () => {
    assert.deepEqual(filterByGenre(songs, 'khac').map((s) => s.id), ['c', 'd']);
  });

  test('a genre with no songs yields an empty pool, not everything', () => {
    assert.deepEqual(filterByGenre(songs, 'vong-co'), []);
  });
});

