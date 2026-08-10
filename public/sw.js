// Minimal service worker for production PWA behavior.
// It caches only static assets to avoid serving stale HTML during hydration.

const CACHE_NAME = 'prado-v1';

const APP_SHELL = [
  '/',
  '/dashboard',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy: always try the network; fall back to cache.
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML documents or Next internals; this prevents stale SSR markup.
  const isNavigation = event.request.mode === 'navigate';
  const isNextInternal = url.pathname.startsWith('/_next/');
  if (isNavigation || isNextInternal) {
    return;
  }

  // Cache-first for static files; update cache in the background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
