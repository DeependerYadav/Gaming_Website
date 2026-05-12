/* =============================================
   Service Worker — UNINSTALLER
   Mini Games Hub is now ONLINE ONLY.
   
   This service worker does ONE thing:
   - Unregisters itself and clears ALL old caches
   - This ensures old devices that had the PWA cached
     will get cleaned up automatically.
   ============================================= */

// On install: skip waiting to activate immediately
self.addEventListener('install', () => self.skipWaiting());

// On activate: delete ALL caches and unregister this service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(name => caches.delete(name))))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open tabs to reload
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_CLEARED' }));
        });
      })
      .then(() => self.registration.unregister())
      .then(() => console.log('[SW] All caches cleared. Service worker unregistered. Site is now online-only.'))
  );
});

// Don't intercept any fetches — let the browser handle everything normally
self.addEventListener('fetch', () => {});
