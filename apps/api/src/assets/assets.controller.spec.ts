import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation.js';
import { AssetsController } from './assets.controller.js';

function controller(bucket?: string) {
  const settings: Record<string, string | undefined> = {
    COS_BUCKET: bucket,
    COS_REGION: 'ap-hongkong',
    COS_SECRET_ID: 'id',
    COS_SECRET_KEY: 'key',
  };
  const config = {
    get: (key: string) => settings[key],
  } as ConfigService<Env, true>;
  return new AssetsController(config);
}

describe('asset signing', () => {
  const memeKeys = [
    'memes/0123456789abcdef01234567.webp',
    'memes/0123456789abcdef01234567.jpg',
    'memes/0123456789abcdef01234567.png',
    'memes/catalogue.json',
  ];

  it('serves meme images and the meme catalogue from Caddy', () => {
    expect(controller().sign({ keys: memeKeys })).toEqual({
      urls: Object.fromEntries(memeKeys.map((key) => [key, `/assets/${key}`])),
      expiresAt: Object.fromEntries(memeKeys.map((key) => [key, null])),
    });
  });

  it('signs meme images and the meme catalogue with their respective COS lifetimes', () => {
    const now = Date.now();
    const { urls, expiresAt } = controller('library-1250000000').sign({
      keys: memeKeys,
    });

    for (const key of memeKeys) {
      const url = new URL(urls[key]);
      expect(url.hostname).toBe(
        'library-1250000000.cos.ap-hongkong.myqcloud.com',
      );
      expect(url.pathname).toBe(`/${key}`);
      expect(url.searchParams.get('q-signature')).toBeTruthy();
      const [start, end] = url.searchParams
        .get('q-sign-time')!
        .split(';')
        .map(Number);
      const seconds = key === 'memes/catalogue.json' ? 300 : 1800;
      expect(end - start).toBe(seconds);
      expect(expiresAt[key]).toBeGreaterThanOrEqual(now + seconds * 1000);
      expect(expiresAt[key]).toBeLessThanOrEqual(Date.now() + seconds * 1000);
    }
  });

  it.each([undefined, 'library-1250000000'])(
    'keeps existing song and cover keys valid with bucket %s',
    (bucket) => {
      const keys = [
        'songs/nnca/0123456789abcdef01234567.mp3',
        'songs/nnca/cover-0123456789abcdef.jpg',
        'songs/catalogue.json',
      ];
      const { urls } = controller(bucket).sign({ keys });
      expect(Object.keys(urls)).toEqual(keys);
    },
  );

  it.each([undefined, 'library-1250000000'])(
    'rejects unsupported meme key shapes with bucket %s',
    (bucket) => {
      const invalid = [
        'memes/0123456789abcdef01234567.gif',
        'memes/0123456789abcdef01234567.svg',
        'memes/../0123456789abcdef01234567.png',
        'memes/nested/0123456789abcdef01234567.png',
        'memes/nested/0123456789abcdef01234567.mp3',
        'memes/nested/cover-0123456789abcdef.jpg',
        'memes/ABCDEF0123456789ABCDEF01.webp',
        'memes/0123456789abcdef0123456.webp',
        'memes/0123456789abcdef012345678.webp',
        'memes/other.json',
      ];
      const signer = controller(bucket);
      for (const key of invalid) {
        expect(() => signer.sign({ keys: [key] }), key).toThrowError(
          expect.objectContaining({
            response: { code: 'validation_failed', fields: ['keys'] },
          }),
        );
      }
    },
  );
});
