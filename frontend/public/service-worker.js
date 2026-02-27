const CACHE_NAME = 'cryptosmc-v1';
const APP_SHELL = [
  '/',
  '/src/main.tsx',
  '/manifest.json',
  '/assets/generated/app-icon-192.dim_192x192.png',
  '/assets/generated/app-icon.dim_512x512.png',
  '/assets/generated/app-icon-180.dim_180x180.png',
  '/assets/generated/app-wordmark.dim_600x120.png',
];

const API_DOMAINS = [
  'fapi.binance.com',
  'api.binance.com',
  'api.coingecko.com',
  'icp0.io',
  'ic0.app',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // Ignore cache failures during install
      });
    })
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For external API calls, always pass through to the network when online.
  // Only return a 503 offline error when the device is genuinely offline.
  const isApiCall = API_DOMAINS.some((d) => url.hostname.includes(d));
  if (isApiCall) {
    // If the device is online, do NOT intercept — let the browser handle it natively.
    if (navigator.onLine) {
      return; // bypass service worker entirely
    }
    // Device is offline: return an explicit 503 error instead of a network failure.
    event.respondWith(
      new Response(
        JSON.stringify({ error: 'No live data available offline. Please check your connection.' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    return;
  }

  // For app shell assets: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
