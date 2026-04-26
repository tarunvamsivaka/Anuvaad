const CACHE_NAME = 'anuvaad-v15';
const STATIC_ASSETS = [
  '/styles.css?v=15',
  '/js/main.js?v=15',
  '/icon-512.png',
  '/manifest.json',
  '/robots.txt'
];

// Network-first pages — always try to fetch latest HTML
const NETWORK_FIRST = ['/', '/index.html'];

// Install — pre-cache static assets (not HTML)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — purge old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — smart caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls — always network
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for HTML pages (/, /index.html)
  // Ensures users always get the latest deploy
  if (NETWORK_FIRST.some(p => url.pathname === p) || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, images, fonts)
  // These use ?v= cache busting so stale versions are fine
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.status === 200 && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
  );
});
