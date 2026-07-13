const CACHE = 'alertlingo-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './i18n.js',
  './app.js',
  './manifest.json',
  './data/announcements.json',
  './data/shelters.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first for the "backend" data feeds, so a demo edit shows up live;
// falls back to the last cached copy when offline.
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if (url.includes('/data/')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
