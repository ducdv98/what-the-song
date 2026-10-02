/* Generated sw-precache.js supplies a build-specific version and static export URLs. */
importScripts('/sw-precache.js', '/sw-routing.js');
const CACHE = `what-the-song-shell-${self.PWA_BUILD_VERSION}`;
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(self.PWA_PRECACHE_URLS)));
  // Do not skipWaiting: the active worker keeps a Round uninterrupted.
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('what-the-song-shell-') && name !== CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const kind = self.classifyRequest(event.request.url, event.request.mode, self.location.origin);
  if (kind === 'network') return;
  if (kind === 'static') {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }));
    return;
  }
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) return response;
      return response;
    } catch {
      const cache = await caches.open(CACHE);
      const path = new URL(event.request.url).pathname;
      return (await cache.match(path)) || (await cache.match(OFFLINE));
    }
  })());
});
