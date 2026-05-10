/* =============================================
   blockpuzzle.js — Block Puzzle Game Logic
   Mini Games Hub — Premium Upgrade
   Features: drag & drop, neon colors,
   clear animations, combo scoring,
   mobile touch support
   ============================================= */
'use strict';

const BlockPuzzle = (() => {
  const GRID = 9;
  const PIECE_COLORS = [
    '#00d4ff', '#a78bfa', '#f72585', '#00f5a0', '#f7c948', '#ff6b35',
  ];

  const SHAPES = [
    [[1]], [[1,1]], [[1,1,1]], [[1,1,1,1]],
    [[1],[1]], [[1],[1],[1]], [[1],[1],[1],[1]],
    [[1,1],[1,1]],
    [[1,1,1],[0,0,1]], [[1,1,1],[1,0,0]],
    [[1,0],[1,1]], [[0,1],[1,1]],
    [[1,1],[1,0]], [[1,1],[0,1]],
    [[1,1,1],[0,1,0]],
    [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]],
    [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]],
    [[1,1,1],[1,1,1],[1,1,1]],
  ];

  let board = [];
  let pieces = [];
  let score = 0;
  let best = 0;
  let linesCleared = 0;
  let dragPiece = null;
  let dragOffset = { x: 0, y: 0 };

  const gridEl = document.getElementById('grid');
  const piecesEl = document.getElementById('pr');
  const scoreEl = document.getElementById('sv');
  const bestEl = document.getElementById('bv');
  const linesEl = document.getElementById('lv');
  const overlay = document.getElementById('ov');
  const ovScore = document.getElementById('ov-score');

  function init() {
    best = parseInt(localStorage.getItem('blockpuzzle-best') || '0');
    if (bestEl) bestEl.textContent = best;

    document.getElementById('new-game-btn')?.addEventListener('click', startGame);
    document.getElementById('retry-btn')?.addEventListener('click', startGame);

    startGame();
  }

  function startGame() {
    board = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    score = 0;
    linesCleared = 0;
    if (overlay) overlay.classList.add('hidden');
    generatePieces();
    renderGrid();
    updateUI();
    if (window.AppStorage) AppStorage.incrementPlays();
  }

  function generatePieces() {
    pieces = [];
    for (let i = 0; i < 3; i++) {
      const shapeIdx = Math.floor(Math.random() * SHAPES.length);
      const color = PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
      pieces.push({
        shape: SHAPES[shapeIdx],
        color,
        used: false,
        id: i,
      });
    }
    renderPieces();
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = document.createElement('div');
        cell.className = 'bp-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        if (board[r][c]) {
          cell.classList.add('filled');
          cell.style.background = board[r][c];
        }

        // Drop target events
        cell.addEventListener('dragover', e => {
          e.preventDefault();
          highlightPlacement(r, c);
        });
        cell.addEventListener('dragleave', clearHighlights);
        cell.addEventListener('drop', e => {
          e.preventDefault();
          clearHighlights();
          placePiece(r, c);
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function renderPieces() {
    piecesEl.innerHTML = '';
    pieces.forEach((piece, idx) => {
      if (piece.used) return;

      const rows = piece.shape.length;
      // Compute max columns across all rows
      const cols = Math.max(...piece.shape.map(r => r.length));
      const el = document.createElement('div');
      el.className = 'bp-piece';
      el.style.gridTemplateColumns = `repeat(${cols}, 22px)`;
      el.draggable = true;
      el.dataset.idx = idx;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'bp-piece-cell';
          const val = piece.shape[r][c] || 0;
          if (val) {
            cell.classList.add('filled');
            cell.style.background = piece.color;
          } else {
            cell.classList.add('empty');
          }
          el.appendChild(cell);
        }
      }

      // Desktop drag
      el.addEventListener('dragstart', e => {
        dragPiece = piece;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Use transparent image as drag image
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        e.dataTransfer.setDragImage(img, 0, 0);
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        dragPiece = null;
        clearHighlights();
      });

      // Touch drag
      let touchStartX, touchStartY;
      el.addEventListener('touchstart', e => {
        e.preventDefault();
        dragPiece = piece;
        el.classList.add('dragging');
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: false });

      el.addEventListener('touchmove', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const gridRect = gridEl.getBoundingClientRect();
        const cellSize = gridRect.width / GRID;
        const col = Math.floor((touch.clientX - gridRect.left) / cellSize);
        const row = Math.floor((touch.clientY - gridRect.top) / cellSize);
        clearHighlights();
        if (row >= 0 && col >= 0) highlightPlacement(row, col);
      }, { passive: false });

      el.addEventListener('touchend', e => {
        e.preventDefault();
        el.classList.remove('dragging');
        const touch = e.changedTouches[0];
        const gridRect = gridEl.getBoundingClientRect();
        const cellSize = gridRect.width / GRID;
        const col = Math.floor((touch.clientX - gridRect.left) / cellSize);
        const row = Math.floor((touch.clientY - gridRect.top) / cellSize);
        clearHighlights();
        if (row >= 0 && col >= 0) placePiece(row, col);
        dragPiece = null;
      }, { passive: false });

      piecesEl.appendChild(el);
    });
  }

  function canPlace(piece, row, col) {
    const shape = piece.shape;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;
        const gr = row + r, gc = col + c;
        if (gr < 0 || gr >= GRID || gc < 0 || gc >= GRID) return false;
        if (board[gr][gc]) return false;
      }
    }
    return true;
  }

  function highlightPlacement(row, col) {
    if (!dragPiece) return;
    clearHighlights();
    const shape = dragPiece.shape;
    const valid = canPlace(dragPiece, row, col);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;
        const gr = row + r, gc = col + c;
        if (gr < GRID && gc < GRID) {
          const cell = gridEl.children[gr * GRID + gc];
          if (cell) {
            cell.classList.add('highlight');
            cell.style.background = valid
              ? dragPiece.color + '33'
              : 'rgba(255,71,87,0.2)';
          }
        }
      }
    }
  }

  function clearHighlights() {
    gridEl.querySelectorAll('.highlight').forEach(cell => {
      cell.classList.remove('highlight');
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      cell.style.background = board[r][c] || '';
    });
  }

  function placePiece(row, col) {
    if (!dragPiece || !canPlace(dragPiece, row, col)) return;

    const shape = dragPiece.shape;
    let cellsPlaced = 0;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (!shape[r][c]) continue;
        board[row + r][col + c] = dragPiece.color;
        cellsPlaced++;
      }
    }

    score += cellsPlaced;
    dragPiece.used = true;
    dragPiece = null;

    playSound('click');

    // Check for line clears
    const cleared = checkClears();
    if (cleared > 0) {
      const bonus = cleared * cleared * 10;
      score += bonus;
      linesCleared += cleared;
      playSound('match');
    }

    if (score > best) {
      best = score;
      localStorage.setItem('blockpuzzle-best', best);
      if (window.AppStorage) AppStorage.saveScore('blockpuzzle', score);
    }

    updateUI();

    // Check if all pieces used, generate new ones
    if (pieces.every(p => p.used)) {
      generatePieces();
    } else {
      renderPieces();
    }

    renderGrid();

    // Check game over
    if (!hasValidMove()) {
      setTimeout(gameOver, 400);
    }
  }

  function checkClears() {
    let cleared = 0;
    const rowsToClear = [];
    const colsToClear = [];

    // Check rows
    for (let r = 0; r < GRID; r++) {
      if (board[r].every(cell => cell !== null)) {
        rowsToClear.push(r);
      }
    }

    // Check columns
    for (let c = 0; c < GRID; c++) {
      let full = true;
      for (let r = 0; r < GRID; r++) {
        if (!board[r][c]) { full = false; break; }
      }
      if (full) colsToClear.push(c);
    }

    // Animate clearing
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID; c++) {
        const cell = gridEl.children[r * GRID + c];
        if (cell) cell.classList.add('clearing');
      }
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < GRID; r++) {
        const cell = gridEl.children[r * GRID + c];
        if (cell) cell.classList.add('clearing');
      }
    });

    // Clear the board data
    rowsToClear.forEach(r => {
      for (let c = 0; c < GRID; c++) board[r][c] = null;
    });
    colsToClear.forEach(c => {
      for (let r = 0; r < GRID; r++) board[r][c] = null;
    });

    cleared = rowsToClear.length + colsToClear.length;
    return cleared;
  }

  function hasValidMove() {
    for (const piece of pieces) {
      if (piece.used) continue;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (canPlace(piece, r, c)) return true;
        }
      }
    }
    return false;
  }

  function gameOver() {
    if (ovScore) ovScore.textContent = `Score: ${score} · Lines: ${linesCleared}`;
    if (overlay) overlay.classList.remove('hidden');
    playSound('fail');
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
    if (linesEl) linesEl.textContent = linesCleared;
  }

  function playSound(type) {
    if (window.Utils) window.Utils.playSound(type);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BlockPuzzle.init);
} else {
  BlockPuzzle.init();
}
