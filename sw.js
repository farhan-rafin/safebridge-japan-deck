// SafeBridge Japan — Service Worker
// Caches the app shell so it opens even with no connection.
// Live data (alerts, shelters) still needs network; last-seen data
// is cached separately in localStorage by index.html as a fallback.

const CACHE_NAME = 'safebridge-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // network-first for API calls (Supabase, OpenStreetMap tiles) so data stays live when online
  const url = event.request.url;
  if (url.includes('supabase.co') || url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  // cache-first for the app shell itself
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
