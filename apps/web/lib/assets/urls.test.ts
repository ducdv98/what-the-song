import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AssetUrlClient } from './urls.ts';

test('a stale signed URL is refreshed and a COS 403 gets one fresh URL', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 1_000_000;
  let signs = 0;
  const fetched: string[] = [];
  Date.now = () => now;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === '/api/assets/urls') {
      signs++;
      return Response.json({
        urls: {
          'songs/nnca/0123456789abcdef01234567.mp3': `https://cos.example/clip?sign=${signs}`,
        },
        expiresAt: { 'songs/nnca/0123456789abcdef01234567.mp3': now + 60_000 },
      });
    }
    fetched.push(url);
    return new Response(null, { status: url.endsWith('sign=2') ? 403 : 200 });
  };
  try {
    const client = new AssetUrlClient();
    const path = '/assets/songs/nnca/0123456789abcdef01234567.mp3';
    assert.equal((await client.fetch(path)).status, 200);
    assert.equal(signs, 1);
    now += 31_000;
    assert.equal((await client.fetch(path)).status, 200);
    assert.equal(signs, 3);
    assert.deepEqual(fetched, [
      'https://cos.example/clip?sign=1',
      'https://cos.example/clip?sign=2',
      'https://cos.example/clip?sign=3',
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test('an older signing response cannot replace a forced refresh for the same key', async () => {
  const originalFetch = globalThis.fetch;
  const path = '/assets/songs/nnca/0123456789abcdef01234567.mp3';
  const key = path.slice('/assets/'.length);
  const replies: Array<(response: Response) => void> = [];
  globalThis.fetch = async () =>
    new Promise<Response>((resolve) => replies.push(resolve));
  try {
    const client = new AssetUrlClient();
    const first = client.prepare([path]);
    const refreshed = client.prepare([path], true);
    assert.equal(replies.length, 2);
    replies[1](
      Response.json({
        urls: { [key]: 'https://cos.example/new' },
        expiresAt: { [key]: Date.now() + 60_000 },
      }),
    );
    await refreshed;
    assert.equal(await client.resolve(path), 'https://cos.example/new');
    replies[0](
      Response.json({
        urls: { [key]: 'https://cos.example/old' },
        expiresAt: { [key]: Date.now() + 60_000 },
      }),
    );
    await Promise.all([first, refreshed]);
    assert.equal(await client.resolve(path), 'https://cos.example/new');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
