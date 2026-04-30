/* =============================================
   offline.js — PWA & Offline Manager
   Mini Games Hub
   ============================================= */

/**
 * OfflineManager — Handles:
 * - Service Worker registration
 * - Online/offline status detection
 * - PWA install banner
 * - Network status indicator
 */
const OfflineManager = (() => {

  let deferredInstallPrompt = null; // Saved PWA install prompt event

  /* ---- Service Worker Registration ---- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service Workers not supported');
      return;
    }

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[SW] Registered successfully. Scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateBanner();
            }
          });
        });
      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
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
    updateStatus(); // Run on init
  }

  /* ---- PWA Install Banner ---- */

  function initInstallBanner() {
    const banner  = document.getElementById('install-banner');
    const btnInstall  = document.getElementById('btn-install');
    const btnDismiss  = document.getElementById('btn-dismiss-install');

    if (!banner || !btnInstall || !btnDismiss) return;

    // Listen for the install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;

      // Don't show if already dismissed in this session
      if (sessionStorage.getItem('pwa-dismissed')) return;

      // Show banner after a short delay
      setTimeout(() => {
        banner.style.display = 'flex';
      }, 3000);
    });

    // Install button click
    btnInstall.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      banner.style.display = 'none';
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      deferredInstallPrompt = null;
    });

    // Dismiss button
    btnDismiss.addEventListener('click', () => {
      banner.style.display = 'none';
      sessionStorage.setItem('pwa-dismissed', 'true');
    });

    // Hide banner if app is already installed
    window.addEventListener('appinstalled', () => {
      banner.style.display = 'none';
      console.log('[PWA] App installed successfully!');
    });
  }

  /* ---- Update Banner ---- */

  function showUpdateBanner() {
    if (window.Utils) {
      window.Utils.showToast('🔄 New version available! Refresh to update.', 'info', 8000);
    }
  }

  /* ---- Init ---- */

  function init() {
    registerServiceWorker();
    initNetworkDetection();
    initInstallBanner();
  }

  return { init, registerServiceWorker };
})();

// Auto-init
window.OfflineManager = OfflineManager;
OfflineManager.init();
