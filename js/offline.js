/* =============================================
   offline.js — PWA & Offline Manager
   Mini Games Hub
   ============================================= */

/**
 * OfflineManager — Handles:
 * - Service Worker registration  (kept — enables offline caching)
 * - Online/offline status detection
 *
 * NOTE: PWA install banner is intentionally DISABLED.
 * The beforeinstallprompt popup was triggering Google Safe Browsing
 * "Deceptive pages" flags (install prompts look like software installs).
 * Users can still install via the browser's own address-bar icon.
 */
const OfflineManager = (() => {

  /* ---- Service Worker Registration ---- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[SW] Registered. Scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    });
  }

  /* ---- Silently suppress the install prompt ---- */
  // We capture and discard the event so no browser-level UI fires either.
  // The site still works fully offline via the Service Worker cache.
  function suppressInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // Prevent any automatic browser prompt
      // Do NOT show any custom banner — this was causing the Safe Browsing flag
    });
  }

  /* ---- Online / Offline Detection ---- */

  function initNetworkDetection() {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;

    function updateStatus() {
      if (navigator.onLine) {
        indicator.classList.remove('show');
      } else {
        indicator.classList.add('show');
      }
    }

    window.addEventListener('online',  updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  /* ---- Update Banner ---- */

  function showUpdateBanner() {
    if (window.Utils) {
      window.Utils.showToast('New version available! Refresh to update.', 'info', 8000);
    }
  }

  /* ---- Init ---- */

  function init() {
    registerServiceWorker();
    suppressInstallPrompt();
    initNetworkDetection();
  }

  return { init, registerServiceWorker };
})();

window.OfflineManager = OfflineManager;
OfflineManager.init();
