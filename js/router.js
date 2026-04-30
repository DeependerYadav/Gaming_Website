/* =============================================
   router.js — Simple Hash-Based Router
   Mini Games Hub
   ============================================= */

/**
 * Router — Lightweight hash router for SPA-like navigation.
 * Handles active nav link states and page transitions.
 */
const Router = (() => {

  /* ---- Route Definitions ---- */
  const routes = {
    '':            { title: 'Mini Games Hub 🎮',         nav: 'home' },
    'home':        { title: 'Mini Games Hub 🎮',         nav: 'home' },
    'leaderboard': { title: 'Leaderboard | Mini Games Hub', nav: 'leaderboard' },
    'settings':    { title: 'Settings | Mini Games Hub',    nav: 'settings' },
    'snake':       { title: 'Snake Game | Mini Games Hub',  nav: '' },
    'memory':      { title: 'Memory Match | Mini Games Hub',nav: '' },
    'tictactoe':   { title: 'Tic Tac Toe | Mini Games Hub', nav: '' },
  };

  /* ---- Update Active Nav Link ---- */
  function updateActiveNav(navKey) {
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
      link.classList.remove('active');
    });

    const navMap = {
      home:        '#nav-home',
      leaderboard: '#nav-leaderboard',
      settings:    '#nav-settings',
    };

    if (navKey && navMap[navKey]) {
      const activeLink = document.querySelector(navMap[navKey]);
      if (activeLink) activeLink.classList.add('active');
    }
  }

  /* ---- Set Page Title ---- */
  function setTitle(title) {
    document.title = title;
  }

  /* ---- Handle Route Change ---- */
  function handleRoute() {
    const hash = window.location.hash.replace('#', '').toLowerCase().trim();
    const route = routes[hash] || routes[''];

    setTitle(route.title);
    updateActiveNav(route.nav);
  }

  /* ---- Init ---- */
  function init() {
    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
    // Handle initial load
    handleRoute();

    // Add smooth link-click transitions
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');

      // Only handle internal links (not full game pages)
      if (!href || href.startsWith('http') || href.startsWith('games/')) return;

      // Animate transition for external pages
      // (game pages handle their own loading)
    });
  }

  return { init, handleRoute, updateActiveNav };
})();

// Auto-init
window.Router = Router;
