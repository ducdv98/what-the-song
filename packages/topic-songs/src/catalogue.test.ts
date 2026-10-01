import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  clipUrl, clipKey, playableSongs,
  ladderFor, type Song, coverUrl,
} from './catalogue.ts';

const songs: Song[] = [
  { id: 'nnca', title: 'Nơi Này Có Anh', artist: 'Sơn Tùng M-TP', clips: { '100': 'aaa.mp3' } },
  { id: 'cnd', title: 'Chạy Ngay Đi', artist: 'Sơn Tùng M-TP', clips: { '100': 'bbb.mp3' } },
  { id: 'htca', title: 'Hãy Trao Cho Anh', artist: 'Sơn Tùng M-TP', aliases: ['Give It To Me'], clips: { '100': 'ccc.mp3' } },
  { id: 'bcb', title: 'Bigcityboi', artist: 'Binz', clips: { '100': 'ddd.mp3' } },
  { id: 'dv', title: 'Đường Về', artist: 'Đen Vâu', clips: { '100': 'eee.mp3' } },
];

describe('clip URLs', () => {
  test('built from the opaque filename, never the title', () => {
    const url = clipUrl(songs[0], 0.1);
    assert.equal(url, '/clips/nnca/aaa.mp3');
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
        [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0].map((s) => [clipKey(s), `${clipKey(s)}.mp3`]),
      ),
    };
    for (const s of [0.1, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0]) {
      assert.equal(clipUrl(song, s), `/clips/x/${clipKey(s)}.mp3`);
    }
  });
});

describe('per-song ladders derived from the manifest', () => {
  const full: Song = {
    id: 'full', title: 'Full', artist: 'A',
    clips: { '100': 'a.mp3', '500': 'b.mp3', '1000': 'c.mp3' },
  };

  test('ladder comes back in seconds, ascending', () => {
    assert.deepEqual(ladderFor(full), [0.1, 0.5, 1.0]);
  });

  test('manifest key order does not matter', () => {
    const jumbled: Song = {
      id: 'j', title: 'J', artist: 'A',
      clips: { '2000': 'd.mp3', '100': 'a.mp3', '16000': 'e.mp3', '500': 'b.mp3' },
    };
    assert.deepEqual(ladderFor(jumbled), [0.1, 0.5, 2.0, 16.0]);
  });

  test('a song may have its own shorter ladder — that is the point', () => {
    // A track with a long generic intro can start at 2s instead of 0.1s.
    const late: Song = {
      id: 'late', title: 'Late', artist: 'A',
      clips: { '2000': 'a.mp3', '4000': 'b.mp3', '8000': 'c.mp3' },
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
      { id: 'junk', title: 'J', artist: 'A', clips: { notanumber: 'x.mp3' } },
    ]);
    assert.deepEqual(ok.map((s) => s.id), ['full']);
    assert.deepEqual(bad.map((s) => s.id), ['empty', 'junk']);
  });

  test('seven clips play at the five target positions and end at the longest', () => {
    const song: Song = { id: 'seven', title: 'Seven', artist: 'A', clips: {
      '100': 'a', '500': 'b', '1000': 'c', '2000': 'd',
      '4000': 'e', '8000': 'f', '16000': 'g',
    } };
    assert.deepEqual(ladderFor(song), [0.1, 0.5, 2, 8, 16]);
  });
});

describe('cover art', () => {
  const base = { id: 'nnca', title: 't', artist: 'a', clips: {} };

  test('a cover filename becomes a URL in the song folder', () => {
    assert.equal(coverUrl({ ...base, cover: 'cover-3f9a.jpg' }), '/clips/nnca/cover-3f9a.jpg');
  });

  test('no cover means null, so the UI shows its fallback', () => {
    assert.equal(coverUrl(base), null);
    assert.equal(coverUrl({ ...base, cover: null }), null);
    assert.equal(coverUrl({ ...base, cover: '' }), null);
  });

  test('a cover that is not a bare filename is refused', () => {
    assert.equal(coverUrl({ ...base, cover: '../../etc/passwd' }), null);
    assert.equal(coverUrl({ ...base, cover: 'https://evil.example/x.jpg' }), null);
  });
});
