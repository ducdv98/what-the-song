import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const publicDir = join(process.cwd(), 'public');

test('manifest describes the guessing app with existing PNG icons', () => {
  const manifest = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'Bạn có tài mà');
  assert.equal(manifest.short_name, 'Bạn có tài mà');
  assert.equal(manifest.lang, 'vi');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/songs');
  assert.equal(manifest.scope, '/songs');
  assert.equal(manifest.theme_color, '#f9e549');
  assert.equal(manifest.background_color, '#f9e549');
  assert.deepEqual(manifest.icons.map((icon: { purpose: string }) => icon.purpose), ['any', 'any', 'maskable']);
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png');
    assert.ok(existsSync(join(publicDir, icon.src)));
    const png = readFileSync(join(publicDir, icon.src));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(existsSync(join(publicDir, 'apple-touch-icon.png')));
});

test('worker routes only same-origin shell and static files through cache', () => {
  const self: Record<string, unknown> = {};
  runInNewContext(readFileSync(join(publicDir, 'sw-routing.js'), 'utf8'), { self, URL });
  const classify = self.classifyRequest as (url: string, mode: string, origin: string) => string;
  const origin = 'https://game.example';
  assert.equal(classify(`${origin}/songs`, 'navigate', origin), 'navigation');
  assert.equal(classify(`${origin}/_next/static/chunks/a.js`, 'no-cors', origin), 'static');
  assert.equal(classify(`${origin}/fonts/Anton-Regular.ttf`, 'no-cors', origin), 'static');
  for (const url of [
    '/api/stats', '/api/assets/sign', '/assets/songs/catalogue.json',
    '/assets/memes/catalogue.json', '/assets/songs/clip.mp3',
    '/assets/songs/cover.jpg', '/assets/memes/win.webp', '/clips/old.mp3',
    '/other/catalogue.json',
  ]) assert.equal(classify(`${origin}${url}`, 'no-cors', origin), 'network');
  assert.equal(classify('https://cos.example/clip.mp3', 'no-cors', origin), 'network');
});
