/* =============================================
   tetris.js — Advanced Tetris Game Logic
   Mini Games Hub — Full Feature Upgrade
   Features: 7-bag randomizer, hold, ghost,
   next queue, wall kicks, animations, sounds
   ============================================= */
'use strict';

const TetrisGame = (() => {
  // ─── Constants ───────────────────────────────
  const COLS  = 10;
  const ROWS  = 20;
  const BLOCK = 30; // canvas pixels per cell

  const COLORS = [
    null,
    '#00d4ff', // I – cyan
    '#f7c948', // O – yellow
    '#e040fb', // T – purple
    '#57e05b', // S – green
    '#ff6b6b', // Z – red
    '#4361ee', // J – blue
    '#ff8c00', // L – orange
  ];

  const GLOW = [
    null,
    'rgba(0,212,255,0.7)',
    'rgba(247,201,72,0.7)',
    'rgba(224,64,251,0.7)',
    'rgba(87,224,91,0.7)',
    'rgba(255,107,107,0.7)',
    'rgba(67,97,238,0.7)',
    'rgba(255,140,0,0.7)',
  ];

  const SHAPES = [
    null,
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
    [[1,1],[1,1]],                               // O
    [[0,1,0],[1,1,1],[0,0,0]],                   // T
    [[0,1,1],[1,1,0],[0,0,0]],                   // S
    [[1,1,0],[0,1,1],[0,0,0]],                   // Z
    [[1,0,0],[1,1,1],[0,0,0]],                   // J
    [[0,0,1],[1,1,1],[0,0,0]],                   // L
  ];

  // Drop speeds ms per row (index = level-1, capped at 15)
  const DROP_SPEEDS = [800,700,600,500,420,350,290,240,190,150,120,100,85,70,60];

  // Score for cleared lines × level multiplier
  const LINE_SCORES = [0, 100, 300, 500, 800];

  // ─── State ───────────────────────────────────
  let board, current, held, bag, nextQueue;
  let score, best, level, lines;
  let dropAcc, dropInterval, lastTs;
  let paused, running, canHold;
  let animId;
  let lockDelay, lockDelayMax;

  // ─── DOM refs ────────────────────────────────
  let canvas, ctx, holdCvs, holdCtx, nextCvs, nextCtx;
  let scoreEl, bestEl, levelEl, linesEl, overlay, overlayTitle, overlayMsg, startBtn, restartBtn, restartBtn2, pauseBtn, flashEl;

  // ─── 7-bag randomizer ────────────────────────
  function refillBag() {
    const ids = [1,2,3,4,5,6,7];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    bag.push(...ids);
  }

  function nextPieceId() {
    if (bag.length < 5) refillBag();
    return bag.shift();
  }

  function makePiece(id) {
    return {
      id,
      shape: SHAPES[id].map(r => [...r]),
      x: id === 1 ? 3 : 3,
      y: 0,
    };
  }

  // ─── Board helpers ────────────────────────────
  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  // ─── Rotation with SRS wall kicks ────────────
  function rotate90(shape) {
    const N = shape.length;
    return shape[0].map((_, c) => shape.map((row, r) => row[N - 1 - c] ?? 0));
  }

  const KICKS = {
    default: [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]],
    I:       [[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  };

  function tryRotate(dir = 1) {
    const kicks = current.id === 1 ? KICKS.I : KICKS.default;
    let shape = current.shape;
    const times = dir > 0 ? 1 : 3;
    for (let t = 0; t < times; t++) shape = rotate90(shape);

    for (const [dx, dy] of kicks) {
      if (!collides(current, dx, dy, shape)) {
        current.shape = shape;
        current.x += dx;
        current.y += dy;
        resetLockDelay();
        return;
      }
    }
  }

  // ─── Lock delay ───────────────────────────────
  function resetLockDelay() {
    lockDelay = 0;
  }

  // ─── Ghost piece ─────────────────────────────
  function ghostY() {
    let gy = current.y;
    while (!collides(current, 0, gy - current.y + 1)) gy++;
    return gy;
  }

  // ─── Locking & clearing ───────────────────────
  function lockPiece() {
    current.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v && current.y + r >= 0) {
          board[current.y + r][current.x + c] = current.id;
        }
      });
    });
    clearLines();
    spawnNext();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(v => v)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (!cleared) return;

    lines += cleared;
    const pts = (LINE_SCORES[cleared] || 800) * level;
    score += pts;
    level = Math.floor(lines / 10) + 1;
    dropInterval = DROP_SPEEDS[Math.min(level - 1, DROP_SPEEDS.length - 1)];

    if (score > best) {
      best = score;
      localStorage.setItem('tetris-best', best);
      if (bestEl) {
        bestEl.textContent = best;
        bestEl.classList.add('best-flash');
        setTimeout(() => bestEl.classList.remove('best-flash'), 1600);
      }
    }

    updateUI();
    triggerLineClearFlash(cleared);
    playTetrisSound(cleared === 4 ? 'tetris' : 'clear');
  }

  function triggerLineClearFlash(count) {
    if (!flashEl) return;
    flashEl.classList.remove('flash');
    flashEl.style.background = count === 4
      ? 'radial-gradient(ellipse at center, rgba(255,209,102,0.5) 0%, transparent 70%)'
      : 'radial-gradient(ellipse at center, rgba(224,64,251,0.35) 0%, transparent 70%)';
    void flashEl.offsetWidth;
    flashEl.classList.add('flash');
  }

  function spawnNext() {
    current = nextQueue.shift();
    nextQueue.push(makePiece(nextPieceId()));
    canHold = true;
    lockDelay = 0;

    if (collides(current)) {
      gameOver();
    }
  }

  // ─── Hold ─────────────────────────────────────
  function holdPiece() {
    if (!canHold) return;
    canHold = false;

    if (!held) {
      held = { id: current.id, shape: SHAPES[current.id].map(r => [...r]) };
      current = nextQueue.shift();
      nextQueue.push(makePiece(nextPieceId()));
    } else {
      const tmp = held;
      held = { id: current.id, shape: SHAPES[current.id].map(r => [...r]) };
      current = makePiece(tmp.id);
    }
    lockDelay = 0;
    playTetrisSound('hold');
  }

  // ─── Hard drop ────────────────────────────────
  function hardDrop() {
    const drop = ghostY() - current.y;
    score += drop * 2;
    current.y = ghostY();
    lockPiece();
    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.classList.remove('score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pop');
    }
    playTetrisSound('drop');
  }

  // ─── Game init / over ─────────────────────────
  function init() {
    canvas   = document.getElementById('board');
    ctx      = canvas.getContext('2d');
    holdCvs  = document.getElementById('hold-canvas');
    holdCtx  = holdCvs.getContext('2d');
    nextCvs  = document.getElementById('next-canvas');
    nextCtx  = nextCvs.getContext('2d');
    scoreEl  = document.getElementById('score');
    bestEl   = document.getElementById('best');
    levelEl  = document.getElementById('level');
    linesEl  = document.getElementById('lines');
    overlay  = document.getElementById('overlay');
    overlayTitle = document.getElementById('overlay-title');
    overlayMsg   = document.getElementById('overlay-msg');
    startBtn     = document.getElementById('start-btn');
    restartBtn   = document.getElementById('restart-btn');
    restartBtn2  = document.getElementById('btn-restart2');
    pauseBtn     = document.getElementById('btn-pause');
    flashEl      = document.getElementById('line-clear-flash');

    best = parseInt(localStorage.getItem('tetris-best') || '0');
    if (bestEl) bestEl.textContent = best;

    bindKeys();
    bindTouch();
    bindButtons();
  }

  function startGame() {
    board        = createBoard();
    score        = 0;
    level        = 1;
    lines        = 0;
    bag          = [];
    held         = null;
    canHold      = true;
    dropAcc      = 0;
    dropInterval = DROP_SPEEDS[0];
    lockDelay    = 0;
    lockDelayMax = 500;
    paused       = false;
    running      = true;

    refillBag(); refillBag();
    nextQueue = [makePiece(nextPieceId()), makePiece(nextPieceId()), makePiece(nextPieceId())];
    current = makePiece(nextPieceId());

    if (overlay) overlay.classList.add('hidden');
    if (restartBtn) restartBtn.style.display = 'block';
    if (restartBtn2) restartBtn2.style.display = 'inline-flex';
    if (pauseBtn) pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';

    updateUI();
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(animId);

    if (overlayTitle) overlayTitle.textContent = 'Game Over';
    if (overlayMsg) overlayMsg.textContent = `Score: ${score} · Best: ${best}`;
    if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Play Again';
    if (overlay) overlay.classList.remove('hidden');
    playTetrisSound('fail');
  }

  function togglePause() {
    if (!running && !paused) return;
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(animId);
      pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
    } else {
      lastTs = performance.now();
      animId = requestAnimationFrame(loop);
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    }
  }

  // ─── Game loop ────────────────────────────────
  function loop(ts) {
    if (!running || paused) return;
    const dt = ts - lastTs;
    lastTs = ts;
    dropAcc += dt;

    const onFloor = collides(current, 0, 1);

    if (onFloor) {
      lockDelay += dt;
      if (lockDelay >= lockDelayMax) {
        lockDelay = 0;
        lockPiece();
      }
    } else {
      lockDelay = 0;
      if (dropAcc >= dropInterval) {
        dropAcc = 0;
        current.y++;
      }
    }

    draw();
    animId = requestAnimationFrame(loop);
  }

  // ─── Update UI ───────────────────────────────
  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl)  bestEl.textContent  = best;
    if (levelEl) levelEl.textContent = level;
    if (linesEl) linesEl.textContent = lines;
  }

  // ─── Drawing ─────────────────────────────────
  const BS = BLOCK; // block size alias

  function drawBlock(c, x, y, colorId, alpha = 1) {
    if (!colorId) return;
    const col = COLORS[colorId];
    const glow = GLOW[colorId];
    c.save();
    c.globalAlpha = alpha;
    // Glow shadow
    c.shadowColor = glow;
    c.shadowBlur = 10;
    // Main fill
    c.fillStyle = col;
    roundRect(c, x * BS + 1, y * BS + 1, BS - 2, BS - 2, 4);
    c.fill();
    // Inner shine highlight
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(x * BS + 2, y * BS + 2, BS - 4, 5);
    c.fillRect(x * BS + 2, y * BS + 2, 5, BS - 4);
    // Bottom shadow
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(x * BS + 2, y * BS + BS - 7, BS - 4, 5);
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawMiniBlock(c, x, y, colorId, size = 20) {
    if (!colorId) return;
    const col = COLORS[colorId];
    const glow = GLOW[colorId];
    c.save();
    c.shadowColor = glow;
    c.shadowBlur = 6;
    c.fillStyle = col;
    c.beginPath();
    c.roundRect(x * size + 1, y * size + 1, size - 2, size - 2, 3);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillRect(x * size + 2, y * size + 2, size - 4, 4);
    c.restore();
  }

  function draw() {
    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * BS); ctx.lineTo(COLS * BS, r * BS); ctx.stroke();
    }
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * BS, 0); ctx.lineTo(c * BS, ROWS * BS); ctx.stroke();
    }

    // Locked board
    board.forEach((row, r) => row.forEach((v, c) => drawBlock(ctx, c, r, v)));

    if (!running && !paused) {
      drawHold();
      drawNextQueue();
      return;
    }

    // Ghost
    const gy = ghostY();
    current.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (!v) return;
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = COLORS[current.id];
        ctx.beginPath();
        ctx.roundRect((current.x + c) * BS + 1, (gy + r) * BS + 1, BS - 2, BS - 2, 4);
        ctx.fill();
        ctx.restore();
      });
    });

    // Current piece
    current.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v && current.y + r >= 0) {
          drawBlock(ctx, current.x + c, current.y + r, current.id);
        }
      });
    });

    // Pause overlay
    if (paused) {
      ctx.fillStyle = 'rgba(13,13,26,0.78)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e040fb';
      ctx.font = `bold 28px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(224,64,251,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
    }

    drawHold();
    drawNextQueue();
  }

  function drawHold() {
    holdCtx.fillStyle = '#0d0d1a';
    holdCtx.fillRect(0, 0, holdCvs.width, holdCvs.height);
    if (!held) return;
    const s = held.shape;
    const size = 20;
    const ox = Math.floor((4 - s[0].length) / 2);
    const oy = Math.floor((4 - s.length) / 2);
    s.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) drawMiniBlock(holdCtx, ox + c, oy + r, held.id, size);
      });
    });
  }

  function drawNextQueue() {
    nextCtx.fillStyle = '#0d0d1a';
    nextCtx.fillRect(0, 0, nextCvs.width, nextCvs.height);
    const size = 18;
    const slotH = Math.floor(nextCvs.height / 3);
    nextQueue.slice(0, 3).forEach((piece, idx) => {
      const s = piece.shape;
      const ox = Math.floor((5 - s[0].length) / 2);
      const oy = Math.floor((3 - s.length) / 2) + idx * Math.floor(slotH / size);
      s.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) drawMiniBlock(nextCtx, ox + c, oy + r, piece.id, size);
        });
      });
    });
  }

  // ─── Sound ───────────────────────────────────
  function playTetrisSound(type) {
    if (window.Utils) window.Utils.playSound(type);
    else if (window.SoundEngine) {
      try {
        const map = { clear: 'eat', drop: 'click', fail: 'fail', hold: 'click', tetris: 'bonus' };
        window.SoundEngine.play(map[type] || type);
      } catch(e) {}
    }
  }

  // ─── Input ───────────────────────────────────
  function bindKeys() {
    document.addEventListener('keydown', e => {
      const preventKeys = ['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '];
      if (preventKeys.includes(e.key)) e.preventDefault();

      if (!running) {
        if (e.code === 'Space' || e.key === 'Enter') startGame();
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':  moveSide(-1); break;
        case 'ArrowRight': moveSide(1);  break;
        case 'ArrowDown':  softDrop();   break;
        case 'ArrowUp':    tryRotate(1); break;
        case ' ':          hardDrop();   break;
        case 'z': case 'Z': tryRotate(-1); break;
        case 'c': case 'C': holdPiece(); break;
        case 'p': case 'P': togglePause(); break;
      }
    });
  }

  function moveSide(dx) {
    if (paused) return;
    if (!collides(current, dx)) {
      current.x += dx;
      resetLockDelay();
    }
  }

  function softDrop() {
    if (paused) return;
    if (!collides(current, 0, 1)) {
      current.y++;
      score += 1;
      if (scoreEl) scoreEl.textContent = score;
      dropAcc = 0;
      resetLockDelay();
    }
  }

  function bindTouch() {
    const actions = {
      't-left':     () => moveSide(-1),
      't-right':    () => moveSide(1),
      't-down':     softDrop,
      't-up':       () => tryRotate(1),
      't-harddrop': hardDrop,
      't-hold':     holdPiece,
    };
    Object.entries(actions).forEach(([id, fn]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        if (!running || paused) return;
        fn();
      }, { passive: false });
      btn.addEventListener('click', () => {
        if (!running || paused) return;
        fn();
      });
    });

    // Swipe on canvas
    let tx = 0, ty = 0;
    canvas.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (!running) { startGame(); return; }
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 18 && !collides(current, 1)) { current.x++; }
        if (dx < -18 && !collides(current, -1)) { current.x--; }
      } else {
        if (dy > 18) hardDrop();
        if (dy < -18) tryRotate(1);
      }
    }, { passive: true });
  }

  function bindButtons() {
    startBtn?.addEventListener('click', startGame);
    restartBtn?.addEventListener('click', startGame);
    restartBtn2?.addEventListener('click', startGame);
    pauseBtn?.addEventListener('click', togglePause);
  }

  // ─── Public ───────────────────────────────────
  return { init };
})();

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TetrisGame.init);
} else {
  TetrisGame.init();
}
