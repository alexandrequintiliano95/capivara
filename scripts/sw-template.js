/* Generated with the exact assets of each build; game progress stays in localStorage. */
const CACHE = '__CACHE_NAME__';
const ASSETS = __PRECACHE_LIST__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('capivaras-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Updates wait for the player's action or for all older app windows to close.
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html') ? '/index.html' : url.pathname;
  if (!ASSETS.includes(key)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(key)) || fetch(event.request)));
});
