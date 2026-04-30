/* =============================================
   utils.js — Shared Utility Functions
   Mini Games Hub
   ============================================= */

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Format a time in seconds to MM:SS
 */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a timestamp to a readable date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Debounce a function call
 */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Lerp (linear interpolation) between two values
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Vibrate device if supported
 */
function vibrate(pattern = [50]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Play a sound effect using the Web Audio API
 * @param {string} type - 'click', 'success', 'fail', 'move', 'win'
 */
function playSound(type) {
  // Check if sound is enabled in settings
  const settings = window.AppStorage ? window.AppStorage.getSettings() : {};
  if (settings.soundEnabled === false) return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configure sound based on type
    const sounds = {
      click:   { type: 'sine',     freq: 440,  duration: 0.1,  vol: 0.3 },
      move:    { type: 'sine',     freq: 330,  duration: 0.08, vol: 0.2 },
      success: { type: 'triangle', freq: 523,  duration: 0.3,  vol: 0.4 },
      fail:    { type: 'sawtooth', freq: 150,  duration: 0.4,  vol: 0.3 },
      win:     { type: 'sine',     freq: 698,  duration: 0.6,  vol: 0.5 },
      eat:     { type: 'square',   freq: 660,  duration: 0.1,  vol: 0.25 },
      flip:    { type: 'sine',     freq: 400,  duration: 0.15, vol: 0.2 },
      match:   { type: 'triangle', freq: 880,  duration: 0.3,  vol: 0.35 },
    };

    const sound = sounds[type] || sounds.click;
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.freq, ctx.currentTime);

    // For win, do a quick rising arpeggio
    if (type === 'win') {
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.45);
    }

    gainNode.gain.setValueAtTime(sound.vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + sound.duration);
  } catch (e) {
    // Web Audio API not supported or blocked - silent fail
    console.warn('[Sound] Could not play sound:', e.message);
  }
}

/**
 * Create a particle burst animation at a given element
 */
function createParticleBurst(element) {
  if (prefersReducedMotion()) return;

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const colors = ['#6c63ff', '#e040fb', '#00e5ff', '#00e676', '#ffab40'];

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
      position: fixed;
      width: 8px;
      height: 8px;
      background: ${colors[i % colors.length]};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      left: ${centerX}px;
      top: ${centerY}px;
    `;
    document.body.appendChild(particle);

    const angle = (i / 12) * Math.PI * 2;
    const velocity = randomInt(60, 120);
    const dx = Math.cos(angle) * velocity;
    const dy = Math.sin(angle) * velocity;

    particle.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 }
    ], {
      duration: 600,
      easing: 'ease-out',
      fill: 'forwards'
    }).onfinish = () => particle.remove();
  }
}

/**
 * Animate a number counting up
 */
function animateCount(element, from, to, duration = 800) {
  if (!element) return;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    element.textContent = Math.round(lerp(from, to, eased));
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  toast.className = 'toast-notification';
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: var(--clr-bg-card);
    border: 1px solid var(--clr-border-hover);
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-primary, sans-serif);
    font-size: 14px;
    font-weight: 600;
    color: var(--clr-text-primary, #fff);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(30px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Export to global scope
window.Utils = {
  randomInt,
  shuffleArray,
  formatTime,
  formatDate,
  debounce,
  clamp,
  lerp,
  prefersReducedMotion,
  vibrate,
  playSound,
  createParticleBurst,
  animateCount,
  showToast
};
