import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_NAME, APP_DESCRIPTION, socialPreview } from './brand.ts';

test('brand and preview image describe the multi-topic app', () => {
  assert.equal(APP_NAME, 'Bạn có tài mà');
  assert.match(APP_DESCRIPTION, /chủ đề/);
  const png = readFileSync('public/social-preview.png');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const offline = readFileSync('public/offline.html', 'utf8');
  assert.match(offline, /Bạn có tài mà/);
  assert.doesNotMatch(offline, /what the song/i);
});

test('configured public origin produces an absolute banner URL', () => {
  const preview = socialPreview('https://example.com/play/');
  assert.equal(preview.origin?.href, 'https://example.com/play/');
  assert.equal(preview.image, 'https://example.com/social-preview.png');
  assert.equal(preview.card, 'summary_large_image');
});

test('missing or invalid origin produces a text-only card', () => {
  for (const value of [undefined, '', 'not-a-url', 'ftp://example.com']) {
    const preview = socialPreview(value);
    assert.equal(preview.image, undefined);
    assert.equal(preview.card, 'summary');
  }
});
