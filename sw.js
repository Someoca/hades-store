const OFFLINE_CACHE = 'hades-store-offline-v5';
const CATALOG_PATH = new URL('catalog/catalog.json', self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith('hades-store-offline-') && name !== OFFLINE_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isPage = request.mode === 'navigate';
  const isCatalog = url.origin === self.location.origin && url.pathname === CATALOG_PATH;

  if (request.method !== 'GET' || (!isPage && !isCatalog)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      throw error;
    }
  })());
});
