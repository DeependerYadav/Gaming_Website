/* =============================================
   minesweeper.js — Advanced Minesweeper
   Mini Games Hub — Premium Gaming UI
   Features: emoji mines/flags, animated reveals,
   win/lose overlays, per-difficulty best times,
   long-press flagging for mobile
   ============================================= */
'use strict';

const CONFIGS = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

let cfg, board, revealed, flagged;
let firstClick, gameActive;
let timerInterval, elapsed, bestTime;
let currentDiff = 'easy';
let flagCount = 0;

// ── DOM refs ──
const boardEl      = document.getElementById('board');
const mineCountEl  = document.getElementById('mine-count');
const timerEl      = document.getElementById('timer');
const bestTimeEl   = document.getElementById('best-time');
const flagCountEl  = document.getElementById('flag-count');
const statusEl     = document.getElementById('status-line');
const overlay      = document.getElementById('mine-overlay');
const overlayEmoji = document.getElementById('mine-overlay-emoji');
const overlayTitle = document.getElementById('mine-overlay-title');
const overlayMsg   = document.getElementById('mine-overlay-msg');
const overlayBtn   = document.getElementById('mine-overlay-btn');

// ── Init ──
function init(difficulty) {
  difficulty   = difficulty || currentDiff;
  currentDiff  = difficulty;
  cfg          = CONFIGS[difficulty];
  board        = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(0));
  revealed     = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(false));
  flagged      = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(false));
  firstClick   = true;
  gameActive   = false;
  elapsed      = 0;
  flagCount    = 0;
  bestTime     = parseInt(localStorage.getItem('mine-best-' + difficulty) || '0', 10) || 0;

  clearInterval(timerInterval);
  if (timerEl)     timerEl.textContent     = '0s';
  if (mineCountEl) mineCountEl.textContent = cfg.mines;
  if (flagCountEl) flagCountEl.textContent = '0';
  if (bestTimeEl)  bestTimeEl.textContent  = bestTime > 0 ? bestTime + 's' : '--';
  if (overlay)     overlay.classList.add('hidden');
  setStatus('<i class="fa-solid fa-circle-info"></i> Click any tile to start · Right-click / long-press to flag', '');
  renderBoard();
}

// ── Mine placement (safe first-click zone) ──
function placeMines(safeRow, safeCol) {
  let placed = 0;
  while (placed < cfg.mines) {
    const r = Math.floor(Math.random() * cfg.rows);
    const c = Math.floor(Math.random() * cfg.cols);
    const safe = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1;
    if (board[r][c] !== -1 && !safe) { board[r][c] = -1; placed++; }
  }
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      if (board[r][c] === -1) continue;
      board[r][c] = neighbors(r, c).filter(([nr, nc]) => board[nr][nc] === -1).length;
    }
  }
}

// ── Neighbors ──
function neighbors(row, col) {
  const list = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = row + dr, nc = col + dc;
      if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols) list.push([nr, nc]);
    }
  }
  return list;
}

// ── Render board ──
function renderBoard() {
  boardEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 1fr)';
  boardEl.innerHTML = '';

  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'mine-cell';
      cell.dataset.r = r;
      cell.dataset.c = c;

      if (revealed[r][c]) {
        cell.classList.add('revealed');
        if (board[r][c] === -1) {
          cell.textContent = '💣';
          cell.classList.add('mine-revealed');
        } else if (board[r][c] > 0) {
          cell.textContent = board[r][c];
          cell.setAttribute('data-n', board[r][c]);
        }
      } else if (flagged[r][c]) {
        cell.classList.add('flagged');
        cell.textContent = '🚩';
      }

      // Events
      cell.addEventListener('click',        () => handleClick(r, c));
      cell.addEventListener('contextmenu',  e  => { e.preventDefault(); handleFlag(r, c); });

      // Long-press for mobile flagging
      let lp;
      cell.addEventListener('touchstart', () => { lp = setTimeout(() => handleFlag(r, c), 500); }, { passive: true });
      cell.addEventListener('touchend',   () => clearTimeout(lp), { passive: true });
      cell.addEventListener('touchmove',  () => clearTimeout(lp), { passive: true });

      boardEl.appendChild(cell);
    }
  }
}

// ── Click ──
function handleClick(row, col) {
  if (!gameActive && !firstClick) return;
  if (revealed[row][col] || flagged[row][col]) return;

  if (firstClick) {
    firstClick  = false;
    gameActive  = true;
    placeMines(row, col);
    window.AppStorage?.incrementPlays?.();
    timerInterval = setInterval(() => {
      elapsed++;
      if (timerEl) timerEl.textContent = elapsed + 's';
    }, 1000);
  }

  if (board[row][col] === -1) {
    // Reveal all mines
    for (let r = 0; r < cfg.rows; r++)
      for (let c = 0; c < cfg.cols; c++)
        if (board[r][c] === -1) revealed[r][c] = true;
    revealed[row][col] = true;
    gameActive = false;
    clearInterval(timerInterval);
    renderBoard();

    // Highlight the hit mine in red
    const hitCell = boardEl.querySelector('[data-r="' + row + '"][data-c="' + col + '"]');
    if (hitCell) hitCell.classList.add('mine-hit');

    setStatus('<i class="fa-solid fa-skull"></i> Boom! You hit a mine after ' + elapsed + 's.', 'lose');
    setTimeout(() => showOverlay('lose'), 600);
    return;
  }

  flood(row, col);
  renderBoard();
  checkWin();
}

// ── Flood fill ──
function flood(row, col) {
  if (row < 0 || row >= cfg.rows || col < 0 || col >= cfg.cols) return;
  if (revealed[row][col] || flagged[row][col]) return;
  revealed[row][col] = true;
  if (board[row][col] === 0) {
    neighbors(row, col).forEach(([nr, nc]) => flood(nr, nc));
  }
}

// ── Flag ──
function handleFlag(row, col) {
  if (!gameActive && !firstClick) return;
  if (revealed[row][col]) return;

  flagged[row][col] = !flagged[row][col];
  flagCount = flagged.flat().filter(Boolean).length;
  const remaining = cfg.mines - flagCount;
  if (mineCountEl) mineCountEl.textContent = remaining;
  if (flagCountEl) flagCountEl.textContent = flagCount;
  renderBoard();
}

// ── Win check ──
function checkWin() {
  const total    = cfg.rows * cfg.cols;
  const revealed_count = revealed.flat().filter(Boolean).length;
  if (revealed_count !== total - cfg.mines) return;

  gameActive = false;
  clearInterval(timerInterval);

  const isNewBest = !bestTime || elapsed < bestTime;
  if (isNewBest) {
    bestTime = elapsed;
    localStorage.setItem('mine-best-' + currentDiff, String(bestTime));
    // Also update global key read by home page
    const globalBest = parseInt(localStorage.getItem('mine-best') || '0', 10);
    if (!globalBest || elapsed < globalBest) {
      localStorage.setItem('mine-best', String(bestTime));
    }
    if (bestTimeEl) bestTimeEl.textContent = bestTime + 's';
  }

  const msg = isNewBest
    ? 'Board cleared in ' + elapsed + 's — New best! 🎉'
    : 'Board cleared in ' + elapsed + 's. Best: ' + bestTime + 's';
  setStatus('<i class="fa-solid fa-check-circle"></i> ' + msg, 'win');
  setTimeout(() => showOverlay('win', elapsed, isNewBest), 500);
}

// ── Overlays ──
function showOverlay(type, time, isNewBest) {
  if (!overlay) return;
  if (type === 'win') {
    overlayEmoji.textContent = isNewBest ? '🏆' : '✅';
    overlayTitle.textContent = isNewBest ? 'New Best!' : 'Board Cleared!';
    overlayMsg.innerHTML = 'You cleared the ' + currentDiff + ' board in <strong>' + time + 's</strong>' +
      (isNewBest ? '<br><span style="color:#f7c948">🌟 New personal best!</span>' : '');
  } else {
    overlayEmoji.textContent = '💥';
    overlayTitle.textContent = 'Boom!';
    overlayMsg.innerHTML = 'You hit a mine after <strong>' + elapsed + 's</strong>.<br>Try again?';
  }
  overlay.classList.remove('hidden');
}

// ── Status helper ──
function setStatus(html, type) {
  if (!statusEl) return;
  statusEl.innerHTML = html;
  statusEl.className = 'mine-status' + (type ? ' ' + type : '');
}

// ── Difficulty buttons ──
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    clearInterval(timerInterval);
    init(btn.dataset.diff);
  });
});

document.getElementById('restart-btn')?.addEventListener('click', () => {
  clearInterval(timerInterval);
  init(currentDiff);
});

overlayBtn?.addEventListener('click', () => {
  overlay.classList.add('hidden');
  init(currentDiff);
});

// ── Boot ──
init('easy');
