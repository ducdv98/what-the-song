import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  repairMojibake,
  foldTonePlacement,
  stripDiacritics,
  cleanTitle,
  looseKey,
  toneKey,
  matchGuess,
} from './vietnamese.ts';

/**
 * Cases are numbered against docs/RESEARCH.md §3.1 so a failure points at the
 * reason the transform exists.
 */

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
  test('hoà and hòa collapse', () => {
    assert.equal(toneKey('hoà'), toneKey('hòa'));
  });

  test('thuý and thúy collapse', () => {
    assert.equal(toneKey('thuý'), toneKey('thúy'));
  });

  test('placement variant still counts as exact, not merely diacritics', () => {
    assert.equal(matchGuess('Hoà Tấu', { title: 'Hòa Tấu' }), 'exact');
  });

  test('tone folding does not erase the tone itself', () => {
    // hoa (flower) vs hòa (harmony) are different words and must not collapse.
    assert.notEqual(toneKey('hoa'), toneKey('hòa'));
  });

  test('vowel modifiers survive tone folding', () => {
    // ư keeps its horn; only the tone moves.
    assert.equal(foldTonePlacement('Mưa').normalize('NFC').includes('ư'), true);
  });
});

describe('§3.1.3 Unicode NFC vs NFD', () => {
  test('precomposed and decomposed input produce the same key', () => {
    const precomposed = 'Ước Hẹn';                  // single code points
    const decomposed = 'Ước Hẹn'.normalize('NFD');  // base + marks
    assert.notEqual(precomposed, decomposed);       // genuinely different strings
    assert.equal(looseKey(precomposed), looseKey(decomposed));
    assert.equal(toneKey(precomposed), toneKey(decomposed));
  });

  test('a three-codepoint syllable folds correctly', () => {
    // ờ = o + horn + grave: base vowel, vowel modifier, tone — three points
    // for one syllable nucleus, which is what makes Vietnamese awkward.
    const nfd = 'ờ'.normalize('NFD');
    assert.equal(nfd.length, 3);
    assert.equal(stripDiacritics(nfd), 'o');
    // And the tone survives folding while the modifier stays put.
    assert.equal(toneKey('ờ'), toneKey('ờ'.normalize('NFD')));
  });
});

describe('§3.1.4 legacy-encoding mojibake', () => {
  test('UTF-8 read as Latin-1 is repaired', () => {
    const correct = 'Hãy Trao Cho Anh';
    const bytes = new TextEncoder().encode(correct);
    const mojibake = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    assert.notEqual(mojibake, correct);
    assert.equal(repairMojibake(mojibake), correct);
  });

  test('clean input is left alone', () => {
    assert.equal(repairMojibake('Hãy Trao Cho Anh'), 'Hãy Trao Cho Anh');
    assert.equal(repairMojibake('Nơi Này Có Anh'), 'Nơi Này Có Anh');
  });
});

describe('§3.1.5 đ has no decomposition', () => {
  test('đ folds to d', () => {
    assert.equal(stripDiacritics('đường'), 'duong');
    assert.equal(stripDiacritics('Đen Vâu'), 'Den Vau');
  });

  test('stripping combining marks alone would not have caught it', () => {
    // This is the bug you get by trusting Postgres unaccent for Vietnamese.
    const naive = 'đường'.normalize('NFD').replace(/[̀-ͯ]/g, '');
    assert.equal(naive, 'đuong');          // đ survived
    assert.equal(stripDiacritics('đường'), 'duong'); // ours did not let it
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
  test('bracketed markers are stripped', () => {
    assert.equal(cleanTitle('Nơi Này Có Anh (Official MV)'), 'Nơi Này Có Anh');
    assert.equal(cleanTitle('Chạy Ngay Đi [Karaoke]'), 'Chạy Ngay Đi');
  });

  test('feat. lists are stripped', () => {
    assert.equal(cleanTitle('Bigcityboi feat. Someone Else'), 'Bigcityboi');
    assert.equal(cleanTitle('Track ft. A, B and C'), 'Track');
  });

  test('pipe-separated YouTube titles reduce to words', () => {
    assert.equal(
      looseKey('Sơn Tùng M-TP | HÃY TRAO CHO ANH | Official MV'),
      'son tung m tp hay trao cho anh',
    );
  });

  test('a guess without the noise still matches a noisy catalogue title', () => {
    assert.equal(
      matchGuess('nơi này có anh', { title: 'Nơi Này Có Anh (Official Audio)' }),
      'exact',
    );
  });
});

describe('§3.1.10 artist aliases', () => {
  test('diacritic-free artist forms normalise together', () => {
    assert.equal(looseKey('Sơn Tùng M-TP'), looseKey('Son Tung M-TP'));
    assert.equal(looseKey('Đen Vâu'), 'den vau');
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
