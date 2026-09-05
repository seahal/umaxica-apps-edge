const CACHE_NAME = 'offline-v1';
// Astro's route is `/offline`. Dev (`trailingSlash: 'ignore'`) 404s `/offline/`;
// production `auto-trailing-slash` may 307 `/offline` → `/offline/`. Precache
// whichever spelling returns 2xx; ignore the other.
const OFFLINE_URLS = ['/offline', '/offline/'];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(OFFLINE_URLS.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of OFFLINE_URLS) {
        const cached = await cache.match(url);
        if (cached) return cached;
      }
      return Response.error();
    }),
  );
});
