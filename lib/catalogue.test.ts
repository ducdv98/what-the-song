import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  indexCatalogue, searchCatalogue, clipUrl, clipKey, playableSongs,
  isExactSpelling, ladderFor, type Song,
} from './catalogue.ts';

const songs: Song[] = [
  { id: 'nnca', title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP', clips: { '100': 'aaa.m4a' } },
  { id: 'cnd', title: 'Chạy Ngay Đi', artist: 'Sơn Tùng M-TP', clips: { '100': 'bbb.m4a' } },
  { id: 'htca', title: 'Hãy Trao Cho Anh', artist: 'Sơn Tùng M-TP', aliases: ['Give It To Me'], clips: { '100': 'ccc.m4a' } },
  { id: 'bcb', title: 'Bigcityboi', artist: 'Binz', clips: { '100': 'ddd.m4a' } },
  { id: 'dv', title: 'Đường Về', artist: 'Đen Vâu', clips: { '100': 'eee.m4a' } },
];
const index = indexCatalogue(songs);

describe('autocomplete search', () => {
  test('finds a song typed without diacritics', () => {
    const hits = searchCatalogue('noi nay', index);
    assert.equal(hits[0]?.id, 'nnca');
  });

  test('finds a song typed with diacritics', () => {
    assert.equal(searchCatalogue('Nơi Này', index)[0]?.id, 'nnca');
  });

  test('matches on artist', () => {
    const ids = searchCatalogue('son tung', index).map((s) => s.id);
    assert.ok(ids.includes('nnca') && ids.includes('cnd') && ids.includes('htca'));
    assert.ok(!ids.includes('bcb'), 'Binz should not match "son tung"');
  });

  test('matches across the title/artist boundary', () => {
    assert.equal(searchCatalogue('chay ngay di son tung', index)[0]?.id, 'cnd');
  });

  test('matches an alias', () => {
    assert.equal(searchCatalogue('give it to me', index)[0]?.id, 'htca');
  });

  test('handles d-with-stroke in the query', () => {
    assert.equal(searchCatalogue('duong ve', index)[0]?.id, 'dv');
    assert.equal(searchCatalogue('Đường Về', index)[0]?.id, 'dv');
  });

  test('an exact title outranks a mere substring', () => {
    assert.equal(searchCatalogue('bigcityboi', index)[0]?.id, 'bcb');
  });

  test('empty and punctuation-only queries return nothing', () => {
    for (const q of ['', '   ', '()', '---']) {
      assert.deepEqual(searchCatalogue(q, index), [], `"${q}" returned hits`);
    }
  });

  test('no match returns empty, not everything', () => {
    assert.deepEqual(searchCatalogue('zzzzzzz', index), []);
  });

  test('respects the limit', () => {
    assert.equal(searchCatalogue('a', index, 2).length <= 2, true);
  });

  test('indexing is not order-dependent', () => {
    const reversed = indexCatalogue([...songs].reverse());
    assert.equal(searchCatalogue('noi nay', reversed)[0]?.id, 'nnca');
  });
});

describe('spelling feedback', () => {
  test('fully accented spelling is recognised', () => {
    assert.equal(isExactSpelling('Nơi Này Có Anh', songs[0]), true);
  });

  test('diacritic-free spelling is not "exact" but must not be treated as wrong here', () => {
    assert.equal(isExactSpelling('noi nay co anh', songs[0]), false);
  });
});

describe('clip URLs', () => {
  test('built from the opaque filename, never the title', () => {
    const url = clipUrl(songs[0], 0.1);
    assert.equal(url, '/clips/nnca/aaa.m4a');
    assert.ok(!/noi|nay|anh/i.test(url), 'URL must not leak the answer');
  });

  test('a missing rung fails loudly rather than producing a 404 URL', () => {
    assert.throws(() => clipUrl(songs[0], 16), /no clip/);
  });
});

describe('clip keys agree with tools/ingest.py', () => {
  test('whole seconds must not collapse — String(1.0) is "1" but Python writes "1.0"', () => {
    // This mismatch silently broke every rung from 1s up: the first two clues
    // played, then clipUrl threw. Milliseconds are integers in both languages.
    assert.deepEqual(
      [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0].map(clipKey),
      ['100', '500', '1000', '2000', '4000', '8000', '16000'],
    );
  });

  test('clipUrl resolves every rung of a real manifest', () => {
    const song: Song = {
      id: 'x', title: 'T', artist: 'A',
      clips: Object.fromEntries(
        [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0].map((s) => [clipKey(s), `${clipKey(s)}.m4a`]),
      ),
    };
    for (const s of [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0]) {
      assert.equal(clipUrl(song, s), `/clips/x/${clipKey(s)}.m4a`);
    }
  });
});

describe('per-song ladders derived from the manifest', () => {
  const full: Song = {
    id: 'full', title: 'Full', artist: 'A',
    clips: { '100': 'a.m4a', '500': 'b.m4a', '1000': 'c.m4a' },
  };

  test('ladder comes back in seconds, ascending', () => {
    assert.deepEqual(ladderFor(full), [0.1, 0.5, 1.0]);
  });

  test('manifest key order does not matter', () => {
    const jumbled: Song = {
      id: 'j', title: 'J', artist: 'A',
      clips: { '2000': 'd.m4a', '100': 'a.m4a', '16000': 'e.m4a', '500': 'b.m4a' },
    };
    assert.deepEqual(ladderFor(jumbled), [0.1, 0.5, 2.0, 16.0]);
  });

  test('a song may have its own shorter ladder — that is the point', () => {
    // A track with a long generic intro can start at 2s instead of 0.1s.
    const late: Song = {
      id: 'late', title: 'Late', artist: 'A',
      clips: { '2000': 'a.m4a', '4000': 'b.m4a', '8000': 'c.m4a' },
    };
    assert.deepEqual(ladderFor(late), [2.0, 4.0, 8.0]);
    const [ok, bad] = playableSongs([late]);
    assert.equal(ok.length, 1, 'a short ladder is still playable');
    assert.equal(bad.length, 0);
  });

  test('songs with no usable clips are skipped', () => {
    const [ok, bad] = playableSongs([
      full,
      { id: 'empty', title: 'E', artist: 'A', clips: {} },
      { id: 'junk', title: 'J', artist: 'A', clips: { notanumber: 'x.m4a' } },
    ]);
    assert.deepEqual(ok.map((s) => s.id), ['full']);
    assert.deepEqual(bad.map((s) => s.id), ['empty', 'junk']);
  });
});
