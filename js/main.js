/* =============================================
   main.js — App Entry Point & Homepage Logic
   Mini Games Hub — Premium Gaming UI
   ============================================= */

/* =============================================
   SPLASH SCREEN
   ============================================= */
function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  const app    = document.getElementById('app');

  if (!splash || !app) return;

  // Show app after 1.8 seconds
  setTimeout(() => {
    splash.classList.add('fade-out');
    app.style.display = 'block';
    app.style.animation = 'fadeIn 0.4s ease';

    // Remove splash from DOM after animation
    setTimeout(() => splash.remove(), 600);
  }, 1800);
}

/* =============================================
   NAVBAR SCROLL EFFECT
   ============================================= */
function initNavbar() {
  const header = document.getElementById('main-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // Hamburger menu
  const hamburger = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });

    // Close on mobile nav link click
    mobileNav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }
}

/* =============================================
   GLOBAL SOUND TOGGLE
   ============================================= */
function initSoundToggle() {
  const btn  = document.getElementById('sound-toggle-btn');
  const icon = document.getElementById('sound-icon');
  if (!btn) return;

  // SoundEngine reads its own state from localStorage
  updateSoundIcon(btn, icon, window.SoundEngine ? SoundEngine.isEnabled() : true);

  btn.addEventListener('click', () => {
    if (!window.SoundEngine) return;
    const newVal = !SoundEngine.isEnabled();
    SoundEngine.toggle(newVal);
    updateSoundIcon(btn, icon, newVal);
    if (newVal) SoundEngine.click(); // confirm sound is on
  });
}

function updateSoundIcon(btn, icon, enabled) {
  if (icon) {
    icon.className = enabled
      ? 'fa-solid fa-volume-high'
      : 'fa-solid fa-volume-xmark';
  }
  if (btn) {
    btn.classList.toggle('sound-off', !enabled);
    btn.title = enabled ? 'Mute Sound' : 'Unmute Sound';
  }
  const wrap = document.getElementById('sound-btn-wrap');
  if (wrap) wrap.dataset.tip = enabled ? 'Mute Sound' : 'Unmute Sound';
}

/* =============================================
   HERO PARTICLES
   ============================================= */
function initHeroParticles() {
  const container = document.getElementById('particles-container');
  if (!container || Utils.prefersReducedMotion()) return;

  const colors = ['#00d4ff', '#9b5de5', '#f72585', '#00f5a0', '#ff9500'];

  for (let i = 0; i < 24; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');

    const size  = Utils.randomInt(5, 18);
    const color = colors[i % colors.length];
    const left  = Utils.randomInt(0, 100);
    const delay = Utils.randomInt(0, 12);
    const dur   = Utils.randomInt(9, 22);

    particle.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      bottom: -${size}px;
      animation-duration: ${dur}s;
      animation-delay: -${delay}s;
      box-shadow: 0 0 ${size * 2}px ${color};
    `;

    container.appendChild(particle);
  }
}

/* =============================================
   GAME SEARCH
   ============================================= */
function initGameSearch() {
  const searchInput = document.getElementById('game-search');
  const searchClear = document.getElementById('search-clear');
  const noResults   = document.getElementById('no-results');
  const gameCards   = document.querySelectorAll('.game-card');

  if (!searchInput) return;

  const doSearch = Utils.debounce((query) => {
    const q = query.toLowerCase().trim();
    let visibleCount = 0;

    gameCards.forEach(card => {
      const tags  = card.dataset.tags || '';
      const title = card.querySelector('.game-title')?.textContent || '';
      const desc  = card.querySelector('.game-desc')?.textContent  || '';
      const match = !q || tags.includes(q) || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);

      card.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });

    // Show/hide "no results"
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // Show/hide clear button
    if (searchClear) {
      searchClear.classList.toggle('visible', q.length > 0);
    }
  }, 250);

  searchInput.addEventListener('input', (e) => doSearch(e.target.value));

  // Clear button
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      doSearch('');
      searchInput.focus();
    });
  }
}

/* =============================================
   HERO "Play Now" SMOOTH SCROLL
   ============================================= */
function initHeroScroll() {
  const playBtn = document.getElementById('btn-play-now');
  if (!playBtn) return;

  playBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('games-section');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

/* =============================================
   SCORE PREVIEWS ON CARDS
   ============================================= */
function updateScorePreviews() {
  const scores = AppStorage.getScores();
  const previewMap = {
    'snake-best': scores.snake || 0,
    'memory-best': scores.memory ? Utils.formatTime(scores.memory) : '--:--',
    'ttt-best': scores.tictactoe || 0,
    'g2048-best': localStorage.getItem('2048-best') || '0',
    'mine-best': formatMineBest(localStorage.getItem('mine-best')),
    'flappy-best': localStorage.getItem('flappy-best') || '0',
    'tetris-best': localStorage.getItem('tetris-best') || '0',
    'whack-best': localStorage.getItem('whack-best') || '0',
    'typing-best': localStorage.getItem('typing-best') || '0',
  };

  Object.entries(previewMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function formatMineBest(rawValue) {
  const seconds = parseInt(rawValue || '', 10);
  return Number.isFinite(seconds) && seconds > 0
    ? Utils.formatTime(seconds)
    : '--:--';
}

/* =============================================
   TOTAL PLAYS COUNTER IN HERO
   ============================================= */
function updateTotalPlays() {
  const countEl = document.getElementById('total-plays-count');
  if (!countEl) return;

  const total = AppStorage.getTotalPlays();
  countEl.textContent = total;
}

/* =============================================
   CARD HOVER SHINE EFFECT
   ============================================= */
function initCardShine() {
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect  = card.getBoundingClientRect();
      const x     = ((e.clientX - rect.left) / rect.width)  * 100;
      const y     = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
    });
  });
}

/* =============================================
   INTERSECTION OBSERVER — Animate On Scroll
   ============================================= */
function initScrollAnimations() {
  if (Utils.prefersReducedMotion()) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity    = '1';
        entry.target.style.transform  = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  // Animate game cards & feature cards on scroll
  document.querySelectorAll('.game-card, .feature-card').forEach((el, i) => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
    observer.observe(el);
  });
}

/* =============================================
   APP INIT
   ============================================= */
function initApp() {
  // Initialize router
  if (window.Router) Router.init();

  // Init all homepage features
  initSplashScreen();
  initNavbar();
  initSoundToggle();
  initHeroParticles();
  initGameSearch();
  initHeroScroll();
  initCardShine();
  initScrollAnimations();
  updateScorePreviews();
  updateTotalPlays();

  // Add click sound to all play buttons
  document.querySelectorAll('.btn-play').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.SoundEngine) SoundEngine.click();
    });
  });

  console.log('🎮 Mini Games Hub initialized!');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
