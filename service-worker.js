/* =============================================
   Service Worker - Mini Games Hub
   Handles caching for offline functionality
   ============================================= */

const CACHE_NAME = 'minigames-hub-v1.1';
const STATIC_CACHE = 'static-v1.1';
const DYNAMIC_CACHE = 'dynamic-v1.1';

// Files to cache on install (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/home.css',
  '/css/games.css',
  '/assets/banners/2048.png',
  '/assets/banners/flappy.png',
  '/assets/banners/memory.png',
  '/assets/banners/minesweeper.png',
  '/assets/banners/pingpong.png',
  '/assets/banners/snake.png',
  '/assets/banners/tetris.png',
  '/assets/banners/tictactoe.png',
  '/assets/banners/typing.png',
  '/assets/banners/whack.png',
  '/js/main.js',
  '/js/router.js',
  '/js/storage.js',
  '/js/offline.js',
  '/js/utils.js',
  '/pages/home.html',
  '/pages/leaderboard.html',
  '/pages/settings.html',
  '/games/snake/index.html',
  '/games/snake/snake.css',
  '/games/snake/snake.js',
  '/games/memory/index.html',
  '/games/memory/memory.css',
  '/games/memory/memory.js',
  '/games/tictactoe/index.html',
  '/games/tictactoe/tictactoe.css',
  '/games/tictactoe/tictactoe.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Press+Start+2P&display=swap'
];

/* ---- Install Event: Cache all static assets ---- */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache each file individually to avoid one failure blocking all
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ---- Activate Event: Clean old caches ---- */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ---- Fetch Event: Serve from cache, fallback to network ---- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests except Google Fonts
  if (url.origin !== location.origin && !url.hostname.includes('fonts.google')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache (stale-while-revalidate for non-HTML)
        if (!request.url.endsWith('.html')) {
          return cachedResponse;
        }
      }

      // Fetch from network and update dynamic cache
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        if (request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        return cachedResponse; // Return cached version if network fails
      });
    })
  );
});

/* ---- Background Sync: Sync scores when back online ---- */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    console.log('[SW] Background sync: scores');
  }
});

/* ---- Push Notifications (future use) ---- */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'Mini Games Hub', {
    body: data.body || 'Come play a game!',
    icon: '/assets/icons/icon-192x192.png'
  });
});
