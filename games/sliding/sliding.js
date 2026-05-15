/* =============================================
   sliding.js — Sliding Puzzle Game Engine
   Mini Games Hub — Premium Gaming UI

   Features:
   - 3×3 / 4×4 / 5×5 difficulty modes
   - Guaranteed-solvable shuffles (parity-safe)
   - Move counter & live timer
   - Best-time persistence per grid size
   - Correct-tile highlighting
   - Win animation + overlay
   ============================================= */

(function () {
  'use strict';

  /* ── State ── */
  let size        = 3;      // current grid dimension
  let tiles       = [];     // flat array, 0 = empty
  let moves       = 0;
  let timerSec    = 0;
  let timerHandle = null;
  let gameActive  = false;
  let audioCtx    = null;

  /* ── DOM refs ── */
  const boardEl   = document.getElementById('slide-board');
  const movesEl   = document.getElementById('slide-moves');
  const timerEl   = document.getElementById('slide-timer');
  const bestEl    = document.getElementById('slide-best');
  const overlay   = document.getElementById('slide-overlay');
  const winPanel  = document.getElementById('slide-win');
  const winEmoji  = document.getElementById('slide-win-emoji');
  const winTitle  = document.getElementById('slide-win-title');
  const winScore  = document.getElementById('slide-win-score');

  /* ── Tile pixel size per grid (responsive) ── */
  function tileSize() {
    const vw = Math.min(window.innerWidth, 520);
    const gap = 6;
    const pad = 20;
    return Math.floor((vw - pad * 2 - gap * (size - 1)) / size);
  }

  /* ── Init ── */
  function init() {
    loadBest();

    /* Pre-render solved board so the board-wrap has real dimensions
       BEFORE the game starts — this keeps the overlay correctly
       contained inside the board boundary. */
    tiles = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
    renderBoard();

    document.getElementById('btn-start-slide').addEventListener('click', startGame);
    document.getElementById('btn-replay-slide').addEventListener('click', startGame);
    document.getElementById('btn-restart-slide').addEventListener('click', shuffleAndRender);

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        size = parseInt(btn.dataset.size, 10);
        loadBest();
        /* Re-render placeholder for the new size */
        tiles = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
        renderBoard();
        if (gameActive) shuffleAndRender();
      });
    });
  }

  /* ── Start Game ── */
  function startGame() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    overlay.classList.add('hidden');
    winPanel.classList.add('hidden');
    shuffleAndRender();
  }

  /* ── Shuffle (parity-safe) ── */
  function shuffleAndRender() {
    stopTimer();
    moves      = 0;
    timerSec   = 0;
    gameActive = true;
    updateHUD();
    tiles = makeSolvable();
    renderBoard();
    startTimer();
  }

  /* ── Generate a solvable permutation ── */
  function makeSolvable() {
    const n = size * size;
    let arr;
    do {
      arr = shuffle(Array.from({ length: n }, (_, i) => i));
    } while (!isSolvable(arr) || isSolved(arr));
    return arr;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* Parity check for n-puzzle solvability */
  function isSolvable(arr) {
    const n    = size;
    let inv    = 0;
    const flat = arr.filter(x => x !== 0);

    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        if (flat[i] > flat[j]) inv++;
      }
    }

    if (n % 2 === 1) {
      return inv % 2 === 0;
    } else {
      const blankRow = Math.floor(arr.indexOf(0) / n);
      const rowFromBottom = n - blankRow;
      return (rowFromBottom % 2 === 0) ? (inv % 2 === 1) : (inv % 2 === 0);
    }
  }

  function isSolved(arr) {
    const n = size * size;
    for (let i = 0; i < n - 1; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[n - 1] === 0;
  }

  /* ── Render Board ── */
  function renderBoard() {
    const ts  = tileSize();
    const gap = 6;
    boardEl.style.gridTemplateColumns = `repeat(${size}, ${ts}px)`;
    boardEl.style.gridTemplateRows    = `repeat(${size}, ${ts}px)`;
    boardEl.style.gap                 = `${gap}px`;
    boardEl.innerHTML                 = '';
    boardEl.classList.remove('win-flash');

    const total = size * size;
    tiles.forEach((val, idx) => {
      const el = document.createElement('div');
      el.className = 'slide-tile';
      el.style.width  = ts + 'px';
      el.style.height = ts + 'px';

      if (val === 0) {
        el.classList.add('empty');
      } else {
        el.textContent = val;
        el.style.fontSize = ts * 0.38 + 'px';

        /* Zone colouring (4 zones across the range 1–(n*n-1)) */
        const zone = Math.ceil(val / Math.ceil((total - 1) / 4));
        el.classList.add(`zone-${Math.min(zone, 4)}`);

        /* Highlight correctly-placed tiles */
        if (val === idx + 1) el.classList.add('correct');

        el.addEventListener('click', () => handleClick(idx));
      }

      boardEl.appendChild(el);
    });
  }

  /* ── Handle Tile Click ── */
  function handleClick(idx) {
    if (!gameActive) return;

    const emptyIdx = tiles.indexOf(0);
    if (!isAdjacent(idx, emptyIdx)) return;

    /* Swap */
    tiles[emptyIdx] = tiles[idx];
    tiles[idx]      = 0;
    moves++;
    updateHUD();

    playTick();

    /* Re-render with slide animation hint */
    renderBoard();
    const justMoved = boardEl.children[emptyIdx];
    if (justMoved) justMoved.classList.add('slide-anim');

    /* Check win */
    if (isSolved(tiles)) handleWin();
  }

  function isAdjacent(a, b) {
    const ar = Math.floor(a / size), ac = a % size;
    const br = Math.floor(b / size), bc = b % size;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  /* ── Win ── */
  function handleWin() {
    gameActive = false;
    stopTimer();
    playWin();

    boardEl.classList.add('win-flash');

    const timeStr = formatTime(timerSec);
    const best    = getBest();
    const isNew   = best === null || timerSec < best;

    if (isNew) saveBest(timerSec);
    loadBest();

    winEmoji.textContent = moves < size * size * 3 ? '🏆' : '🎉';
    winTitle.textContent = isNew ? 'New Best Time! 🌟' : 'Puzzle Solved!';
    winScore.textContent = `${moves} moves · ${timeStr}`;

    setTimeout(() => winPanel.classList.remove('hidden'), 800);
  }

  /* ── Timer ── */
  function startTimer() {
    timerHandle = setInterval(() => {
      timerSec++;
      timerEl.textContent = formatTime(timerSec);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  /* ── HUD ── */
  function updateHUD() {
    movesEl.textContent = moves;
    timerEl.textContent = formatTime(timerSec);
  }

  /* ── Best Time (per size) ── */
  function storageKey() { return `sliding-best-${size}`; }

  function getBest() {
    const v = localStorage.getItem(storageKey());
    return v !== null ? parseInt(v, 10) : null;
  }

  function saveBest(s) { localStorage.setItem(storageKey(), s); }

  function loadBest() {
    const b = getBest();
    bestEl.textContent = b !== null ? formatTime(b) : '--:--';
  }

  /* ── Audio ── */
  function playTick() {
    if (!audioCtx) return;
    try {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.value = 0.06;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (_) {}
  }

  function playWin() {
    if (!audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0.12;
        const t = audioCtx.currentTime + i * 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      } catch (_) {}
    });
  }

  /* ── Responsive resize ── */
  window.addEventListener('resize', () => { if (gameActive) renderBoard(); });

  init();
})();
