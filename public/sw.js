// Minimal service worker for production PWA behavior.
// It caches only static assets (icons, images) to avoid interfering with dynamic SSR and RSC streaming.

const CACHE_NAME = 'prado-v2';

const APP_SHELL = [
  '/icon.png',
  '/apple-icon.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
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

// Network-first strategy for static files only.
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache HTML navigations, Next internals, API calls, or React Server Component (RSC) streams.
  const isNavigation = event.request.mode === 'navigate';
  const isNextInternal = url.pathname.startsWith('/_next/');
  const isApi = url.pathname.startsWith('/api/');
  const isRSC =
    event.request.headers.get('RSC') === '1' ||
    event.request.headers.has('Next-Router-State-Tree') ||
    url.searchParams.has('_rsc') ||
    (event.request.headers.get('Accept') && event.request.headers.get('Accept').includes('text/x-component'));

  if (isNavigation || isNextInternal || isApi || isRSC) {
    return;
  }

  // Only cache known static asset types (images, fonts, icons)
  const isStaticAsset = /\.(png|jpe?g|svg|gif|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname);
  if (!isStaticAsset) {
    return;
  }

  // Cache-first for static files; update cache in the background.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
