const CACHE_NAME = 'umaxica-offline-v2';
const CACHE_PREFIX = 'umaxica-offline-';
const LEGACY_CACHE_NAME = 'offline-v1';
const OFFLINE_URL = '/offline';

/*
 * This response is deliberately independent of the application shell. The
 * cached document must not contain a request nonce, a preference, a session,
 * or an external stylesheet that was unavailable when the network failed.
 */
const OFFLINE_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>オフラインです — UMAXICA</title>
  </head>
  <body>
    <main>
      <h1>オフラインです</h1>
      <p>ネットワーク接続を確認して再読み込みしてください。</p>
      <a href="/">トップへ戻る</a>
    </main>
  </body>
</html>`;

const OFFLINE_HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'none'; base-uri 'none'; form-action 'none'; style-src 'none'",
  'content-type': 'text/html; charset=utf-8',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-robots-tag': 'noindex, nofollow',
};

function createOfflineResponse() {
  return new Response(OFFLINE_HTML, { headers: OFFLINE_HEADERS });
}

const RESERVED_NAVIGATION_EXACT = new Set([
  '/api',
  '/csp-violation-report',
  '/health',
  '/manifest.webmanifest',
  '/revision',
  '/robots.txt',
  '/service-worker.js',
  '/sign/out',
  '/sitemap.xml',
]);

const RESERVED_NAVIGATION_PREFIXES = [
  '/.well-known/',
  '/api/',
  '/edge/v0/',
  '/health/',
  '/oidc/',
  '/sign/out/',
  '/web/v0/',
];

function isReservedNavigation(pathname) {
  return (
    RESERVED_NAVIGATION_EXACT.has(pathname) ||
    RESERVED_NAVIGATION_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isEligibleNavigation(request) {
  if (request.method !== 'GET' || request.mode !== 'navigate') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return !isReservedNavigation(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.put(OFFLINE_URL, createOfflineResponse()))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME && (key === LEGACY_CACHE_NAME || key.startsWith(CACHE_PREFIX)),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  if (!isEligibleNavigation(event.request)) return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(OFFLINE_URL)) || createOfflineResponse();
    }),
  );
});
