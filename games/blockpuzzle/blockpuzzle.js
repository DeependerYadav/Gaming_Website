// ===== BLOCK PUZZLE GAME =====
const COLS = 10, ROWS = 10;
const COLORS = ['#00d4ff','#a78bfa','#f72585','#00f5a0','#f7c948','#ff6b35','#4cc9f0','#7bed9f'];
const SHAPES = [
  [[1,1,1],[1,0,0],[1,0,0]], [[1,1,1],[0,0,1],[0,0,1]],
  [[1,1],[1,1]],
  [[1,1,1,1]], [[1],[1],[1],[1]],
  [[1,1,1]], [[1],[1],[1]],
  [[1,0],[1,0],[1,1]], [[0,1],[0,1],[1,1]],
  [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
  [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]],
  [[1,1,1],[0,1,0]], [[0,1,0],[1,1,1]],
  [[1]], [[1,1],[1,0]], [[1,0],[1,1]],
  [[1,1,1],[1,1,1]]
];

let board, score, lines, best, pieces, dragging, dragIdx;
let previewEls = []; // currently highlighted grid cells

// ===== INIT =====
function startGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  score = 0; lines = 0;
  best = Number(localStorage.getItem('bp-best') || 0);
  dragging = null; dragIdx = null; previewEls = [];
  updateHUD();
  renderBoard();
  spawnPieces();
  document.getElementById('ov').classList.remove('show');
}

function updateHUD() {
  document.getElementById('sv').textContent = score;
  document.getElementById('bv').textContent = best;
  document.getElementById('lv').textContent = lines;
  ['sv','bv','lv'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('bump'); void el.offsetWidth;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 200);
  });
}

// ===== BOARD RENDER =====
// Only call this on full redraws — NOT during hover/preview
function renderBoard() {
  const g = document.getElementById('grid');
  g.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'gc';
      cell.dataset.r = r; cell.dataset.c = c;
      if (board[r][c]) {
        cell.classList.add('filled');
        cell.style.background = board[r][c];
        cell.style.boxShadow = `0 0 6px ${board[r][c]}66`;
      }
      g.appendChild(cell);
    }
  }
}

// ===== IN-PLACE PREVIEW (no DOM rebuild) =====
function showPreview(r, c) {
  clearPreview();
  if (!dragging) return;
  const cells = getCells(dragging.shape, r, c);
  const ok = canPlace(dragging.shape, r, c);
  cells.forEach(([pr, pc]) => {
    const el = document.querySelector(`#grid .gc[data-r="${pr}"][data-c="${pc}"]`);
    if (el) {
      el.classList.add('preview');
      el.style.background = ok ? dragging.color : 'rgba(247,37,133,0.35)';
      el.style.boxShadow = ok ? `0 0 8px ${dragging.color}88` : '';
      el.style.opacity = ok ? '0.65' : '0.4';
      previewEls.push(el);
    }
  });
}

function clearPreview() {
  previewEls.forEach(el => {
    const r = Number(el.dataset.r), c = Number(el.dataset.c);
    el.classList.remove('preview');
    if (board[r][c]) {
      // Restore the existing block's color
      el.style.background = board[r][c];
      el.style.boxShadow = `0 0 6px ${board[r][c]}66`;
      el.style.opacity = '';
    } else {
      // Restore empty cell
      el.style.background = '';
      el.style.boxShadow = '';
      el.style.opacity = '';
    }
  });
  previewEls = [];
}

// ===== PIECES =====
function randPiece() {
  return {
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
}

function spawnPieces() {
  pieces = [randPiece(), randPiece(), randPiece()];
  renderPieces();
}

function renderPieces() {
  const pr = document.getElementById('pr');
  pr.innerHTML = '';
  pieces.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'piece-slot' + (!p ? ' used' : '');
    slot.dataset.pi = i;
    if (!p) { pr.appendChild(slot); return; }

    // Build mini grid preview
    const mini = document.createElement('div');
    mini.className = 'piece-mini';
    mini.style.gridTemplateColumns = `repeat(${p.shape[0].length}, 17px)`;
    p.shape.forEach(row => row.forEach(v => {
      const cell = document.createElement('div');
      cell.className = 'pm-cell';
      if (v) { cell.style.background = p.color; cell.style.boxShadow = `0 0 6px ${p.color}88`; }
      mini.appendChild(cell);
    }));
    slot.appendChild(mini);

    // ===== POINTER EVENTS (mouse + touch, no HTML5 drag-and-drop) =====
    slot.addEventListener('pointerdown', e => {
      e.preventDefault();
      dragging = p; dragIdx = i;
      slot.setPointerCapture(e.pointerId);
      slot.classList.add('dragging-active');
    });

    slot.addEventListener('pointermove', e => {
      if (!dragging || dragIdx !== i) return;
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.dataset.r !== undefined) {
        showPreview(Number(el.dataset.r), Number(el.dataset.c));
      } else {
        clearPreview();
      }
    });

    slot.addEventListener('pointerup', e => {
      if (!dragging || dragIdx !== i) return;
      slot.classList.remove('dragging-active');
      clearPreview();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.dataset.r !== undefined) {
        doDrop(Number(el.dataset.r), Number(el.dataset.c));
      } else {
        dragging = null; dragIdx = null;
      }
    });

    slot.addEventListener('pointercancel', () => {
      slot.classList.remove('dragging-active');
      clearPreview();
      dragging = null; dragIdx = null;
    });

    pr.appendChild(slot);
  });
}

// ===== PLACEMENT =====
function getCells(shape, sr, sc) {
  const cells = [];
  shape.forEach((row, dr) => row.forEach((v, dc) => {
    if (v) cells.push([sr + dr, sc + dc]);
  }));
  return cells;
}

function canPlace(shape, sr, sc) {
  return getCells(shape, sr, sc).every(([r, c]) =>
    r >= 0 && r < ROWS && c >= 0 && c < COLS && !board[r][c]
  );
}

function doDrop(r, c) {
  if (!dragging) return;
  const idx = dragIdx;
  dragging = null; dragIdx = null;
  if (!canPlace(pieces[idx].shape, r, c)) return;

  const piece = pieces[idx];
  getCells(piece.shape, r, c).forEach(([rr, cc]) => board[rr][cc] = piece.color);
  score += piece.shape.flat().filter(Boolean).length * 2;
  pieces[idx] = null;

  renderBoard(); // show placed piece; DOM ready for clearing animation
  const hadLines = clearLines();
  if (!hadLines) {
    if (pieces.every(p => !p)) spawnPieces();
    else { renderPieces(); checkGameOver(); }
  }
}

// ===== LINE CLEAR =====
function clearLines() {
  const rowsToClear = [], colsToClear = [];
  for (let r = 0; r < ROWS; r++) if (board[r].every(Boolean)) rowsToClear.push(r);
  for (let c = 0; c < COLS; c++) if (board.every(row => row[c])) colsToClear.push(c);
  const n = rowsToClear.length + colsToClear.length;
  if (!n) return false;

  const allCells = [];
  rowsToClear.forEach(r => { for (let c = 0; c < COLS; c++) allCells.push([r, c]); });
  colsToClear.forEach(c => { for (let r = 0; r < ROWS; r++) allCells.push([r, c]); });

  allCells.forEach(([r, c]) => {
    const el = document.querySelector(`#grid .gc[data-r="${r}"][data-c="${c}"]`);
    if (el) el.classList.add('clearing');
  });

  setTimeout(() => {
    rowsToClear.forEach(r => board[r].fill(null));
    colsToClear.forEach(c => board.forEach(row => row[c] = null));
    lines += n;
    score += n > 1 ? n * n * 10 : 10;
    if (score > best) { best = score; localStorage.setItem('bp-best', best); }
    updateHUD();
    renderBoard();
    if (pieces.every(p => !p)) spawnPieces();
    else { renderPieces(); checkGameOver(); }
  }, 380);

  return true;
}

// ===== GAME OVER =====
function checkGameOver() {
  const available = pieces.filter(Boolean);
  for (const p of available)
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (canPlace(p.shape, r, c)) return;

  document.getElementById('ov-score').textContent = score;
  document.getElementById('ov').classList.add('show');
}

startGame();
