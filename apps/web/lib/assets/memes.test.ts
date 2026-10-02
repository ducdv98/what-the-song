import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  MemePool, prepareRoundAssets, retryMemeImage, visibleResultMeme,
  type Meme, type ResolvedMeme,
} from './memes.ts';

const wonA: Meme = { file: 'memes/aaaaaaaaaaaaaaaaaaaaaaaa.webp', outcome: 'won', source: 'a' };
const wonB: Meme = { file: 'memes/bbbbbbbbbbbbbbbbbbbbbbbb.jpg', outcome: 'won', source: 'b' };
const lost: Meme = { file: 'memes/cccccccccccccccccccccccc.png', outcome: 'lost', source: 'c' };

describe('MemePool', () => {
  test('picks by outcome without repeating the last shown Meme', async () => {
    const pool = new MemePool({ fetch: async () => Response.json([wonA, wonB, lost]) }, () => 0);
    await pool.load();
    assert.deepEqual(pool.pick('won'), wonA);
    pool.markShown('won', wonA);
    assert.deepEqual(pool.pick('won'), wonB);
    pool.markShown('lost', lost);
    assert.deepEqual(pool.pick('won'), wonB);
    assert.deepEqual(pool.pick('lost'), lost);
  });

  test('a failed catalogue load is retried on the next load', async () => {
    let calls = 0;
    const pool = new MemePool({
      fetch: async () => {
        if (++calls === 1) throw new Error('offline');
        return Response.json([wonA]);
      },
    });
    await pool.load();
    assert.equal(pool.pick('won'), null);
    await pool.load();
    assert.deepEqual(pool.pick('won'), wonA);
  });

  test('an empty outcome pool returns no Meme', async () => {
    const pool = new MemePool({ fetch: async () => Response.json([wonA]) });
    await pool.load();
    assert.equal(pool.pick('lost'), null);
  });

  test('duplicate file entries are treated as one Meme', async () => {
    const pool = new MemePool({ fetch: async () => Response.json([wonA, { ...wonA, source: 'duplicate' }]) });
    await pool.load();
    assert.deepEqual(pool.pick('won'), wonA);
    assert.deepEqual(pool.pick('won'), wonA);
  });

  test('published catalogue filenames get a memes path', async () => {
    const published = { ...wonA, file: 'aaaaaaaaaaaaaaaaaaaaaaaa.webp' };
    const pool = new MemePool({ fetch: async () => Response.json([published]) });
    const calls: string[][] = [];
    await prepareRoundAssets([], true, async (paths) => { calls.push(paths); }, pool);
    assert.deepEqual(calls, [['/assets/memes/aaaaaaaaaaaaaaaaaaaaaaaa.webp']]);
  });

  for (const [name, payload, status] of [
    ['unsafe path', [{ ...wonA, file: '../bad.png' }], 200],
    ['invalid outcome', [{ ...wonA, outcome: 'playing' }], 200],
    ['non-array payload', { entries: [wonA] }, 200],
    ['unreachable catalogue', [], 404],
  ] as const) {
    test('treats ' + name + ' as an empty catalogue', async () => {
      const pool = new MemePool({ fetch: async () => Response.json(payload, { status }) });
      await pool.load();
      assert.equal(pool.pick('won'), null);
    });
  }
});

describe('prepareRoundAssets', () => {
  test('signs both outcome images with the round assets', async () => {
    const calls: string[][] = [];
    const pool = new MemePool({ fetch: async () => Response.json([wonA, lost]) });
    const selected = await prepareRoundAssets(
      ['/assets/songs/x/aaaaaaaaaaaaaaaaaaaaaaaa.mp3'], true,
      async (paths) => { calls.push(paths); }, pool,
    );
    assert.deepEqual(selected, { won: wonA, lost });
    assert.deepEqual(calls, [[
      '/assets/songs/x/aaaaaaaaaaaaaaaaaaaaaaaa.mp3',
      '/assets/memes/aaaaaaaaaaaaaaaaaaaaaaaa.webp',
      '/assets/memes/cccccccccccccccccccccccc.png',
    ]]);
  });

  test('does not load or sign memes when off', async () => {
    let fetched = false;
    const calls: string[][] = [];
    const pool = new MemePool({ fetch: async () => { fetched = true; return Response.json([wonA]); } });
    const selected = await prepareRoundAssets(
      ['/assets/songs/x/clip.mp3'], false,
      async (paths) => { calls.push(paths); }, pool,
    );
    assert.deepEqual(selected, { won: null, lost: null });
    assert.equal(fetched, false);
    assert.deepEqual(calls, [['/assets/songs/x/clip.mp3']]);
  });

  test('falls back to round assets if the meme batch cannot be signed', async () => {
    const calls: string[][] = [];
    const pool = new MemePool({ fetch: async () => Response.json([wonA, lost]) });
    const selected = await prepareRoundAssets(['/assets/songs/x/clip.mp3'], true, async (paths) => {
      calls.push(paths);
      if (paths.some((path) => path.startsWith('/assets/memes/'))) throw new Error('unsupported key');
    }, pool);
    assert.deepEqual(selected, { won: null, lost: null });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], ['/assets/songs/x/clip.mp3']);
  });

  test('keeps the round usable when the catalogue cannot be fetched', async () => {
    const pool = new MemePool({ fetch: async () => { throw new Error('offline'); } });
    const calls: string[][] = [];
    const selected = await prepareRoundAssets(['/assets/songs/x/clip.mp3'], true,
      async (paths) => { calls.push(paths); }, pool);
    assert.deepEqual(selected, { won: null, lost: null });
    assert.deepEqual(calls, [['/assets/songs/x/clip.mp3']]);
  });
});

test('retries a failed Meme once and then removes it', async () => {
  const paths: string[] = [];
  const resolve = async (path: string) => { paths.push(path); return 'https://cos.example/new'; };
  assert.equal(await retryMemeImage(wonA, 'https://cos.example/old', false, resolve), 'https://cos.example/new');
  assert.equal(await retryMemeImage(wonA, 'https://cos.example/new', true, resolve), null);
  assert.deepEqual(paths, ['/assets/memes/aaaaaaaaaaaaaaaaaaaaaaaa.webp']);
  assert.equal(await retryMemeImage(wonA, 'https://cos.example/new', false, resolve), null);
});

test('selects only the visible result Meme', () => {
  const won: ResolvedMeme = { meme: wonA, url: '/assets/memes/won.webp' };
  const loss: ResolvedMeme = { meme: lost, url: '/assets/memes/lost.png' };
  const both = { won, lost: loss };
  assert.deepEqual(visibleResultMeme('won', both, null, false), won);
  assert.deepEqual(visibleResultMeme('lost', both, null, false), loss);
  assert.deepEqual(visibleResultMeme('won', both, 'https://cos.example/fresh', false),
    { meme: wonA, url: 'https://cos.example/fresh' });
  assert.equal(visibleResultMeme('playing', both, null, false), null);
  assert.equal(visibleResultMeme('won', { won: null, lost: null }, null, false), null);
  assert.equal(visibleResultMeme('won', both, null, true), null);
  assert.equal(visibleResultMeme('won', undefined, null, false), null);
});
