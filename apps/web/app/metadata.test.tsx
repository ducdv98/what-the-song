import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { metadata } from './layout';
import { generateMetadata } from './[topic]/page';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/brand';

describe('static page metadata', () => {
  test('app metadata uses the shared neutral name and description', () => {
    assert.deepEqual(metadata.title, { default: APP_NAME, template: `%s | ${APP_NAME}` });
    assert.equal(metadata.applicationName, APP_NAME);
    assert.equal(metadata.appleWebApp && typeof metadata.appleWebApp === 'object' && metadata.appleWebApp.title, APP_NAME);
    assert.equal(metadata.description, APP_DESCRIPTION);
    assert.equal(metadata.openGraph?.title, APP_NAME);
    assert.equal(metadata.twitter?.title, APP_NAME);
  });

  test('each topic has its own sensible social copy', async () => {
    const songs = await generateMetadata({ params: Promise.resolve({ topic: 'songs' }) });
    const food = await generateMetadata({ params: Promise.resolve({ topic: 'food' }) });
    assert.match(String(songs.openGraph?.title), /Bài hát/);
    assert.match(String(food.openGraph?.title), /Món ăn/);
    assert.match(String(songs.description), /bài hát/);
    assert.match(String(food.description), /món Việt/);
    for (const page of [songs, food]) {
      assert.match(String(page.openGraph?.title), /Bạn có tài mà/);
      assert.ok(page.twitter && 'card' in page.twitter);
      assert.equal(page.twitter.card, 'summary');
    }
  });
});
