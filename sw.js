// Cache version bump forces any old cached index.html (like the one this fix is
// solving) to be discarded the moment this new worker activates on a device.
const CACHE_NAME = 'sabush-pos-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always try to fetch the latest version from the server first.
// Only fall back to the cached copy if the request actually fails (device is
// offline) — this is what makes new deploys reach devices that already have the
// app installed/cached, instead of getting stuck on whatever was first cached.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback for offline API state requests if needed
          if (event.request.url.includes('/api/state')) {
            return new Response(JSON.stringify({ success: false, offline: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })
      )
  );
});
