/* =============================================
   offline.js — Service Worker Cleanup
   Mini Games Hub — ONLINE ONLY
   
   This script unregisters any old service workers
   and clears cached data from devices that
   previously used the PWA version.
   ============================================= */

(function cleanupOldServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Unregister any existing service workers
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.unregister().then(() => {
        console.log('[Cleanup] Old service worker unregistered.');
      });
    });
  });

  // Clear all caches left behind by old service workers
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
        console.log('[Cleanup] Deleted cache:', name);
      });
    });
  }

  // Listen for messages from the uninstalling service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_CLEARED') {
      console.log('[Cleanup] Service worker confirmed cache cleared.');
    }
  });
})();
