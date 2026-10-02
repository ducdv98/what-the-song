import { CosAssetUrls, LocalAssetUrls, isSignableAssetKey } from './asset-urls.js';

describe('signable asset keys', () => {
  it('accepts Food photos and catalogue', () => {
    expect(isSignableAssetKey('food/bun-bo-hue/0123456789abcdef01234567.jpg')).toBe(true);
    expect(isSignableAssetKey('food/catalogue.json')).toBe(true);
  });

  it('rejects other Food paths', () => {
    expect(isSignableAssetKey('food/bun-bo-hue/0123456789abcdef01234567.mp3')).toBe(false);
    expect(isSignableAssetKey('food/bun-bo-hue/../0123456789abcdef01234567.jpg')).toBe(false);
  });
});

describe('asset URL adapters', () => {
  it('serves local assets from Caddy unchanged', () => {
    expect(
      new LocalAssetUrls().sign(['songs/nnca/0123456789abcdef01234567.mp3']),
    ).toEqual({
      urls: {
        'songs/nnca/0123456789abcdef01234567.mp3':
          '/assets/songs/nnca/0123456789abcdef01234567.mp3',
      },
      expiresAt: { 'songs/nnca/0123456789abcdef01234567.mp3': null },
    });
  });

  it('signs COS assets offline with a shorter catalogue lifetime', () => {
    const adapter = new CosAssetUrls(
      'library-1250000000',
      'ap-hongkong',
      'id',
      'key',
    );
    const now = Date.now();
    const { urls, expiresAt } = adapter.sign([
      'songs/nnca/0123456789abcdef01234567.mp3',
      'songs/catalogue.json',
      'food/bun-bo-hue/0123456789abcdef01234567.jpg',
      'food/catalogue.json',
    ]);
    expect(urls['songs/nnca/0123456789abcdef01234567.mp3']).toContain(
      'q-signature=',
    );
    expect(urls['songs/nnca/0123456789abcdef01234567.mp3']).toContain(
      'library-1250000000.cos.ap-hongkong.myqcloud.com',
    );
    const asset = new URL(urls['songs/nnca/0123456789abcdef01234567.mp3']);
    const catalogue = new URL(urls['songs/catalogue.json']);
    const lifetime = (url: URL) =>
      Number(url.searchParams.get('q-sign-time')?.split(';')[1]) -
      Number(url.searchParams.get('q-sign-time')?.split(';')[0]);
    expect(lifetime(asset)).toBe(1800);
    expect(lifetime(catalogue)).toBe(300);
    expect(lifetime(new URL(urls['food/bun-bo-hue/0123456789abcdef01234567.jpg']))).toBe(1800);
    expect(lifetime(new URL(urls['food/catalogue.json']))).toBe(300);
    expect(
      expiresAt['songs/nnca/0123456789abcdef01234567.mp3'],
    ).toBeGreaterThanOrEqual(now + 1_800_000);
    expect(
      expiresAt['songs/nnca/0123456789abcdef01234567.mp3'],
    ).toBeLessThanOrEqual(Date.now() + 1_800_000);
    expect(expiresAt['songs/catalogue.json']).toBeGreaterThanOrEqual(
      now + 300_000,
    );
    expect(expiresAt['songs/catalogue.json']).toBeLessThanOrEqual(
      Date.now() + 300_000,
    );
  });
});
