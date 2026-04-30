/* =============================================
   sounds.js — Web Audio API Sound Engine
   Mini Games Hub
   All sounds are synthesized — no files needed
   ============================================= */

const SoundEngine = (() => {
  let ctx = null;
  let _enabled = localStorage.getItem('soundEnabled') !== 'false';

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume suspended context (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone({ freq = 440, type = 'sine', gain = 0.3, duration = 0.15, delay = 0, fadeOut = true } = {}) {
    if (!_enabled) return;
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const gn  = ac.createGain();

      osc.type      = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
      gn.gain.setValueAtTime(gain, ac.currentTime + delay);

      if (fadeOut) {
        gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
      }

      osc.connect(gn);
      gn.connect(ac.destination);

      osc.start(ac.currentTime + delay);
      osc.stop(ac.currentTime + delay + duration + 0.05);
    } catch (e) {
      // Silently ignore audio errors
    }
  }

  /* ---- Public Sound API ---- */

  /** Short UI click tick */
  function click() {
    playTone({ freq: 600, type: 'square', gain: 0.15, duration: 0.06 });
  }

  /** Ascending win fanfare */
  function win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      playTone({ freq: f, type: 'triangle', gain: 0.25, duration: 0.18, delay: i * 0.14 });
    });
  }

  /** Descending lose tone */
  function lose() {
    const notes = [523, 415, 330, 262];
    notes.forEach((f, i) => {
      playTone({ freq: f, type: 'sawtooth', gain: 0.2, duration: 0.2, delay: i * 0.15 });
    });
  }

  /** Low rumble game-over */
  function gameOver() {
    playTone({ freq: 220,  type: 'sawtooth', gain: 0.3,  duration: 0.25, delay: 0 });
    playTone({ freq: 185,  type: 'sawtooth', gain: 0.25, duration: 0.3,  delay: 0.2 });
    playTone({ freq: 130,  type: 'sawtooth', gain: 0.2,  duration: 0.5,  delay: 0.45 });
  }

  /** Very short move blip */
  function move() {
    playTone({ freq: 880, type: 'sine', gain: 0.1, duration: 0.05 });
  }

  /** Tile merge bump */
  function merge() {
    playTone({ freq: 1100, type: 'triangle', gain: 0.15, duration: 0.1 });
  }

  /** Card flip */
  function flip() {
    playTone({ freq: 700, type: 'sine', gain: 0.12, duration: 0.08 });
  }

  /** Score point (e.g. Ping Pong, Whack) */
  function score() {
    playTone({ freq: 660, type: 'triangle', gain: 0.2, duration: 0.12, delay: 0 });
    playTone({ freq: 880, type: 'triangle', gain: 0.15, duration: 0.1,  delay: 0.1 });
  }

  /** Jump / flap */
  function jump() {
    const ac = _enabled ? getCtx() : null;
    if (!ac) return;
    try {
      const osc = ac.createOscillator();
      const gn  = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.1);
      gn.gain.setValueAtTime(0.2, ac.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.connect(gn);
      gn.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.18);
    } catch (e) {}
  }

  /** Toggle sound on/off */
  function toggle(enabled) {
    _enabled = enabled;
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
  }

  /** Returns current state */
  function isEnabled() {
    return _enabled;
  }

  return { click, win, lose, gameOver, move, merge, flip, score, jump, toggle, isEnabled };
})();

// Make globally available
window.SoundEngine = SoundEngine;
