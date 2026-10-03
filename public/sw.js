// Service worker for Prado ERP PWA with Caching and Web Push Notifications support.

const CACHE_NAME = 'prado-v3';

const APP_SHELL = [
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
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

// ==========================================
// Web Push Notifications
// ==========================================

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Prado ERP',
    body: 'You have a new update.',
    url: '/dashboard',
    badgeCount: 1,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const title = payload.title || 'Prado ERP';
  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    data: {
      url: payload.url || '/dashboard',
    },
    tag: payload.tag || 'prado-update',
    renotify: true,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);

      // Update home screen app badge if supported by browser/OS
      if ('setAppBadge' in navigator) {
        try {
          if (typeof payload.badgeCount === 'number') {
            await navigator.setAppBadge(payload.badgeCount);
          } else {
            await navigator.setAppBadge();
          }
        } catch {
          // Ignore badging errors
        }
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (async () => {
      // Clear or decrement badge count
      if ('clearAppBadge' in navigator) {
        try {
          await navigator.clearAppBadge();
        } catch {
          // Ignore
        }
      }

      const windowClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Find matching client or any active dashboard window
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }

      // If no window is open, open a new standalone window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })()
  );
});
