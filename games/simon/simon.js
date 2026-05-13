/* =============================================
   simon.js — Simon Says Game Engine
   Mini Games Hub — Premium Gaming UI
   
   Features:
   - Progressively longer color sequences
   - Audio tones for each color
   - Speed increases with rounds
   - High score tracking
   ============================================= */

(function () {
  'use strict';

  const COLORS = ['green', 'red', 'yellow', 'blue'];
  const TONES = { green: 261.63, red: 329.63, yellow: 392.00, blue: 523.25 };

  let sequence = [];
  let playerIndex = 0;
  let round = 0;
  let bestScore = 0;
  let gameActive = false;
  let acceptingInput = false;
  let audioCtx = null;
  let idleFlickerTimer = null;

  const pads = {};
  const roundEl = document.getElementById('simon-round');
  const bestEl = document.getElementById('simon-best');
  const centerRound = document.getElementById('center-round');
  const statusEl = document.getElementById('simon-status');
  const board = document.getElementById('simon-board');
  const overlay = document.getElementById('simon-overlay');
  const gameover = document.getElementById('simon-gameover');
  const goTitle = document.getElementById('simon-go-title');
  const goScore = document.getElementById('simon-go-score');
  const goEmoji = document.getElementById('simon-go-emoji');

  function init() {
    COLORS.forEach(c => { pads[c] = document.getElementById('pad-' + c); });
    loadBest();
    bindEvents();
    enablePads(false);
    updateDisplay();
    startIdleFlicker();
  }

  function bindEvents() {
    document.getElementById('btn-start-simon').addEventListener('click', startGame);
    document.getElementById('btn-retry-simon').addEventListener('click', startGame);
    document.getElementById('btn-restart-simon').addEventListener('click', startGame);

    COLORS.forEach(color => {
      pads[color].addEventListener('click', () => handleInput(color));
      pads[color].addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(color); }, { passive: false });
    });
  }

  function startGame() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    stopIdleFlicker();
    sequence = [];
    playerIndex = 0;
    round = 0;
    gameActive = true;
    acceptingInput = false;
    overlay.classList.add('hidden');
    gameover.classList.add('hidden');
    enablePads(false);
    updateDisplay();
    nextRound();
  }

  function nextRound() {
    round++;
    playerIndex = 0;
    updateDisplay();
    sequence.push(COLORS[Math.floor(Math.random() * 4)]);
    statusEl.textContent = 'Watch carefully...';
    statusEl.className = 'simon-status watching';
    enablePads(false);

    setTimeout(() => playSequence(), 600);
  }

  function playSequence() {
    const speed = Math.max(250, 600 - round * 20);
    let i = 0;

    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        setTimeout(() => {
          statusEl.textContent = 'Your turn!';
          statusEl.className = 'simon-status your-turn';
          acceptingInput = true;
          enablePads(true);
        }, 300);
        return;
      }
      flashPad(sequence[i], speed * 0.7);
      playTone(sequence[i], speed * 0.6);
      i++;
    }, speed);
  }

  function handleInput(color) {
    if (!gameActive || !acceptingInput) return;

    flashPad(color, 200);
    playTone(color, 150);

    if (color === sequence[playerIndex]) {
      playerIndex++;
      if (playerIndex >= sequence.length) {
        acceptingInput = false;
        enablePads(false);
        statusEl.textContent = 'Correct! 🎉';
        statusEl.className = 'simon-status correct';
        setTimeout(() => nextRound(), 800);
      }
    } else {
      // Wrong!
      gameActive = false;
      acceptingInput = false;
      enablePads(false);
      board.classList.add('wrong');
      setTimeout(() => board.classList.remove('wrong'), 500);

      if (round - 1 > bestScore) {
        bestScore = round - 1;
        saveBest();
      }

      statusEl.textContent = 'Wrong!';
      statusEl.className = 'simon-status';

      setTimeout(() => {
        const finalScore = round - 1;
        goScore.textContent = `You reached round ${finalScore}`;
        if (finalScore >= 15) {
          goEmoji.textContent = '🏆';
          goTitle.textContent = 'Amazing!';
        } else if (finalScore >= 8) {
          goEmoji.textContent = '🌟';
          goTitle.textContent = 'Great Job!';
        } else {
          goEmoji.textContent = '💀';
          goTitle.textContent = 'Game Over!';
        }
        updateDisplay();
        gameover.classList.remove('hidden');
        startIdleFlicker();
      }, 700);
    }
  }

  function flashPad(color, duration, className = 'flash') {
    const pad = pads[color];
    pad.classList.add(className);
    setTimeout(() => pad.classList.remove(className), duration);
  }

  function startIdleFlicker() {
    if (shouldReduceMotion() || idleFlickerTimer) return;
    board.classList.add('idle-flicker');
    scheduleIdleFlicker();
  }

  function scheduleIdleFlicker() {
    idleFlickerTimer = setTimeout(() => {
      idleFlickerTimer = null;
      if (gameActive || acceptingInput) {
        stopIdleFlicker();
        return;
      }

      const flashes = Math.random() < 0.25 ? 2 : 1;
      const used = [];

      for (let i = 0; i < flashes; i++) {
        let color = randomColor();
        while (used.includes(color)) color = randomColor();
        used.push(color);
        flashPad(color, randomInt(120, 260), 'idle-flash');
      }

      scheduleIdleFlicker();
    }, randomInt(160, 620));
  }

  function stopIdleFlicker() {
    if (idleFlickerTimer) {
      clearTimeout(idleFlickerTimer);
      idleFlickerTimer = null;
    }
    board.classList.remove('idle-flicker');
    COLORS.forEach(color => pads[color].classList.remove('idle-flash'));
  }

  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shouldReduceMotion() {
    return window.Utils && window.Utils.prefersReducedMotion && window.Utils.prefersReducedMotion();
  }

  function enablePads(enabled) {
    COLORS.forEach(c => {
      pads[c].classList.toggle('disabled', !enabled);
    });
  }

  function playTone(color, duration) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = TONES[color];
      gain.gain.value = 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
      osc.start();
      osc.stop(audioCtx.currentTime + duration / 1000);
    } catch (e) { /* audio not supported */ }
  }

  function updateDisplay() {
    const score = Math.max(0, round - (gameActive ? 0 : 1));
    roundEl.textContent = gameActive ? round : score;
    centerRound.textContent = gameActive ? round : score;
    bestEl.textContent = bestScore;
  }

  function saveBest() { localStorage.setItem('simon-best', bestScore); }
  function loadBest() {
    const s = localStorage.getItem('simon-best');
    if (s) bestScore = parseInt(s) || 0;
  }

  init();
})();
