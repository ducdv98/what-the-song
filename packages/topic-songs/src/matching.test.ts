import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchGuess } from './matching.ts';

/** Song matching cases from docs/RESEARCH.md §3.1. */

describe('§3.1.1 players type with no diacritics', () => {
  test('diacritic-free guess matches an accented title', () => {
    assert.equal(
      matchGuess('em cua ngay hom qua', { title: 'Em Của Ngày Hôm Qua' }),
      'diacritics',
    );
  });
  test('fully accented guess is reported as exact', () => {
    assert.equal(
      matchGuess('Em Của Ngày Hôm Qua', { title: 'Em Của Ngày Hôm Qua' }),
      'exact',
    );
  });
});

describe('§3.1.2 tone mark placement variants', () => {
  test('placement variant still counts as exact, not merely diacritics', () => {
    assert.equal(matchGuess('Hoà Tấu', { title: 'Hòa Tấu' }), 'exact');
  });
});

describe('§3.1.6 Telex input with the IME off', () => {
  test('trailing tone keys are not a match (ADR-0001)', () => {
    assert.equal(
      matchGuess('em cuar ngayf hom qua', { title: 'Em Của Ngày Hôm Qua' }),
      'none',
    );
  });
  test('a typo is not a match', () => {
    assert.equal(matchGuess('noi nay co han', { title: 'Nơi Này Có Anh' }), 'none');
  });
  test('accent-free input matches an accented title', () => {
    assert.equal(matchGuess('nơi này co anh', { title: 'Nơi Này Có Anh' }), 'diacritics');
  });
});

describe('§3.1.7 bilingual titles', () => {
  test('the English alias is accepted', () => {
    const song = { title: 'Hãy Trao Cho Anh', aliases: ['Give It To Me'] };
    assert.equal(matchGuess('give it to me', song), 'alias');
    assert.equal(matchGuess('hay trao cho anh', song), 'diacritics');
  });
});

describe('§3.1.8 parenthetical and release noise', () => {
  test('a guess without the noise still matches a noisy catalogue title', () => {
    assert.equal(
      matchGuess('nơi này có anh', { title: 'Nơi Này Có Anh (Official Audio)' }),
      'exact',
    );
  });
});

describe('guards against over-matching', () => {
  test('different songs do not collide', () => {
    assert.equal(matchGuess('Chạy Ngay Đi', { title: 'Nơi Này Có Anh' }), 'none');
  });
  test('empty and whitespace guesses are rejected', () => {
    assert.equal(matchGuess('', { title: 'Nơi Này Có Anh' }), 'none');
    assert.equal(matchGuess('   ', { title: 'Nơi Này Có Anh' }), 'none');
    assert.equal(matchGuess('()', { title: 'Nơi Này Có Anh' }), 'none');
  });
  test('a substring is not a match', () => {
    assert.equal(matchGuess('nơi này', { title: 'Nơi Này Có Anh' }), 'none');
  });
});
