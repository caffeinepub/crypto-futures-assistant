const CACHE_NAME = 'cryptosmc-v3';
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/assets/generated/app-icon-192.dim_192x192.png',
  '/assets/generated/app-icon.dim_512x512.png',
  '/assets/generated/app-icon-180.dim_180x180.png',
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
      return cache.addAll(APP_SHELL).catch(() => {});
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

  const isApiCall = API_DOMAINS.some((d) => url.hostname.includes(d));
  if (isApiCall) {
    if (navigator.onLine) {
      return;
    }
    event.respondWith(
      new Response(
        JSON.stringify({ error: 'Sem conexão. Verifique sua internet.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    );
    return;
  }

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
