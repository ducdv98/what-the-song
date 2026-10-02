import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { detectLang, isLang, LANGUAGES, DEFAULT_LANG } from './detect.ts';
import { translate, viMessages, enMessages, type MessageKey } from './messages.ts';

describe('language detection', () => {
  test('a Vietnamese browser gets Vietnamese', () => {
    assert.equal(detectLang(['vi']), 'vi');
    assert.equal(detectLang(['vi-VN', 'en-US']), 'vi');
    assert.equal(detectLang(['VI-vn']), 'vi', 'case must not matter');
  });

  test('an English browser gets English', () => {
    assert.equal(detectLang(['en-US']), 'en');
    assert.equal(detectLang(['en-GB', 'fr']), 'en');
  });

  test('browser language beats time zone — a stated preference wins', () => {
    // Someone in Vietnam who has deliberately set an English browser.
    assert.equal(detectLang(['en-US'], 'Asia/Ho_Chi_Minh'), 'en');
    // And a Vietnamese browser abroad.
    assert.equal(detectLang(['vi-VN'], 'America/Los_Angeles'), 'vi');
  });

  test('time zone decides only when the language list says nothing', () => {
    assert.equal(detectLang(['fr-FR'], 'Asia/Ho_Chi_Minh'), 'vi');
    assert.equal(detectLang(['ja-JP'], 'Asia/Saigon'), 'vi', 'deprecated alias');
    assert.equal(detectLang(['fr-FR'], 'Europe/Paris'), 'en');
  });

  test('preference order is respected, not just the first entry', () => {
    assert.equal(detectLang(['fr', 'vi', 'en']), 'vi');
    assert.equal(detectLang(['de', 'en', 'vi']), 'en');
  });

  test('a language prefix must not match a longer word', () => {
    assert.equal(detectLang(['vintage'], 'Europe/Paris'), 'en');
  });

  test('no signals at all falls back to the default', () => {
    assert.equal(detectLang([], undefined), DEFAULT_LANG);
    assert.equal(detectLang([], null), DEFAULT_LANG);
  });

  test('isLang guards stored values', () => {
    assert.equal(isLang('vi'), true);
    assert.equal(isLang('en'), true);
    assert.equal(isLang('de'), false);
    assert.equal(isLang(null), false);
    assert.equal(isLang(42), false);
  });
});

describe('message catalogue', () => {
  const keys = Object.keys(viMessages) as MessageKey[];

  test('every language has every key, with no blanks', () => {
    for (const lang of LANGUAGES) {
      for (const k of keys) {
        const s = translate(lang, k);
        assert.ok(s.length > 0, `${lang}/${k} is empty`);
      }
    }
  });

  test('English has no leftover Vietnamese, and vice versa', () => {
    assert.equal(Object.keys(enMessages).length, keys.length);
    for (const k of keys) {
      // Only flag entries that are byte-identical AND contain Vietnamese
      // diacritics — "Bolero" being the same in both is fine.
      const a = viMessages[k];
      const b = enMessages[k];
      if (a === b && /[ăâđêôơưĂÂĐÊÔƠƯ]/.test(a.normalize('NFC'))) {
        assert.fail(`${k} was not translated: "${a}"`);
      }
    }
  });

  test('placeholders are substituted', () => {
    assert.equal(
      translate('en', 'round.timeline', { at: '2s', max: '16s' }),
      '2s unlocked of 16s',
    );
    assert.equal(
      translate('vi', 'result.wonAt', { at: '0.1s' }),
      'Đoạn 0.1s',
    );
  });

  test('both languages declare the same placeholders', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of keys) {
      assert.deepEqual(
        names(enMessages[k]), names(viMessages[k]),
        `${k} has mismatched placeholders`,
      );
    }
  });

  test('an unknown placeholder is left alone rather than printing undefined', () => {
    assert.equal(
      translate('en', 'round.timeline', { at: '2s' }),
      '2s unlocked of {max}',
    );
  });

  test('a missing message degrades to the key, not "undefined"', () => {
    const out = translate('en', 'no.such.key' as MessageKey);
    assert.equal(out, 'no.such.key');
  });

  test('both languages explain Tier multipliers and the picker hints at points', () => {
    for (const lang of LANGUAGES) {
      const answer = translate(lang, 'faq.score.answer');
      for (const multiplier of ['0.4', '0.6', '0.8', '0.9', '1.0']) {
        assert.ok(answer.includes(multiplier), `${lang} omits ${multiplier}`);
      }
      assert.ok(translate(lang, 'picker.tierScoreHint' as MessageKey).length > 20);
    }
  });
});
