import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const out = join(import.meta.dirname, '..', 'out');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? files(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}
const staticFiles = await files(join(out, '_next', 'static'));
const fontFiles = await files(join(out, 'fonts'));
const urls = [
  '/songs', '/offline.html', '/manifest.webmanifest', '/favicon.svg',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png',
  ...staticFiles, ...fontFiles,
].map((file) => file.startsWith(out) ? `/${relative(out, file).split(sep).join('/')}` : file);
urls.sort();
const hash = createHash('sha256').update(JSON.stringify(urls));
for (const url of urls) {
  const file = url === '/songs' ? 'songs.html' : url.slice(1);
  hash.update(url).update(await readFile(join(out, file)));
}
for (const file of ['service-worker.js', 'sw-routing.js']) {
  hash.update(file).update(await readFile(join(out, file)));
}
const version = hash.digest('hex').slice(0, 16);
await writeFile(join(out, 'sw-precache.js'),
  `self.PWA_BUILD_VERSION = ${JSON.stringify(version)};\nself.PWA_PRECACHE_URLS = ${JSON.stringify(urls)};\n`);
