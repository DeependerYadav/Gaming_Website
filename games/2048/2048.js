/* =============================================
   2048.js — Advanced 2048 Game
   Features: undo, move counter, merge animations,
   win celebration, score pop-ups, smooth swipe
   ============================================= */
'use strict';

const G2048 = (() => {
  const SIZE = 4;

  // ── DOM ─────────────────────────────────────
  const scoreEl   = document.getElementById('score');
  const bestEl    = document.getElementById('best');
  const movesEl   = document.getElementById('moves');
  const targetEl  = document.getElementById('target-val');
  const tileEl    = document.getElementById('tile-container');
  const gridBg    = document.getElementById('grid-background');
  const overlay   = document.getElementById('game-over-overlay');
  const overTitle = document.getElementById('over-title');
  const overEmoji = document.getElementById('over-emoji');
  const finalSc   = document.getElementById('final-score');
  const scoreAdd  = document.getElementById('score-add');

  // ── State ────────────────────────────────────
  let board, score, best, moves, isOver, hasWon;
  let prevBoard, prevScore, prevMoves; // undo snapshot
  let target = 2048;

  // ── Init ─────────────────────────────────────
  function init() {
    // Build grid cells
    gridBg.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
      const c = document.createElement('div');
      c.className = 'grid-cell';
      gridBg.appendChild(c);
    }

    board   = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score   = 0;
    moves   = 0;
    isOver  = false;
    hasWon  = false;
    prevBoard = null;

    best = parseInt(localStorage.getItem('2048-best') || '0');
    if (bestEl) bestEl.textContent = best;
    if (overlay) overlay.classList.add('hidden');

    updateUI();
    addRandom();
    addRandom();
    renderTiles();
  }

  // ── UI ──────────────────────────────────────
  function updateUI() {
    if (scoreEl) {
      const old = parseInt(scoreEl.textContent) || 0;
      if (score > old) {
        scoreEl.classList.remove('score-pop');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('score-pop');
      }
      scoreEl.textContent = score;
    }
    if (score > best) {
      best = score;
      localStorage.setItem('2048-best', best);
      if (bestEl) bestEl.textContent = best;
    }
    if (movesEl) movesEl.textContent = moves;
  }

  // ── Score add float ──────────────────────────
  function showScoreAdd(points) {
    if (!scoreAdd || !points) return;
    scoreAdd.textContent = `+${points}`;
    // Position near score card
    const rect = scoreEl?.getBoundingClientRect();
    if (rect) {
      scoreAdd.style.left = `${rect.left + rect.width / 2}px`;
      scoreAdd.style.top  = `${rect.top}px`;
    }
    scoreAdd.classList.remove('pop');
    void scoreAdd.offsetWidth;
    scoreAdd.classList.add('pop');
  }

  // ── Random tile ──────────────────────────────
  function addRandom() {
    const empty = [];
    board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    board[r][c] = Math.random() < 0.88 ? 2 : 4;
  }

  // ── Render ───────────────────────────────────
  function renderTiles(mergedSet = new Set()) {
    tileEl.innerHTML = '';
    board.forEach((row, r) => {
      row.forEach((val, c) => {
        if (!val) return;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('data-val', Math.min(val, 8192));

        // Font-size class
        const d = String(val).length;
        tile.classList.add(`digits-${Math.min(6, Math.max(1, d))}`);

        // Merge flash
        const key = `${r},${c}`;
        if (mergedSet.has(key)) tile.classList.add('tile-merge');

        tile.textContent = val;
        tile.style.gridRow    = r + 1;
        tile.style.gridColumn = c + 1;
        tileEl.appendChild(tile);
      });
    });
  }

  // ── Slide & merge ────────────────────────────
  function slideRow(row) {
    let arr = row.filter(v => v);
    let gained = 0;
    const merges = new Set();
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        merges.add(i);
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < SIZE) arr.push(0);
    return { arr, gained, merges };
  }

  function applyMove(dir) {
    let totalGained = 0;
    const mergedPositions = new Set();

    function processRows(getRow, setRow, toKey) {
      for (let i = 0; i < SIZE; i++) {
        const { arr, gained, merges } = slideRow(getRow(i));
        setRow(i, arr);
        totalGained += gained;
        merges.forEach(mi => mergedPositions.add(toKey(i, mi)));
      }
    }

    if (dir === 'left') {
      processRows(
        i => board[i],
        (i, arr) => { board[i] = arr; },
        (i, mi) => `${i},${mi}`
      );
    } else if (dir === 'right') {
      processRows(
        i => [...board[i]].reverse(),
        (i, arr) => { board[i] = [...arr].reverse(); },
        (i, mi) => `${i},${SIZE - 1 - mi}`
      );
    } else if (dir === 'up') {
      processRows(
        c => board.map(r => r[c]),
        (c, arr) => { arr.forEach((v, r) => { board[r][c] = v; }); },
        (c, mi) => `${mi},${c}`
      );
    } else if (dir === 'down') {
      processRows(
        c => board.map(r => r[c]).reverse(),
        (c, arr) => { arr.reverse().forEach((v, r) => { board[r][c] = v; }); },
        (c, mi) => `${SIZE - 1 - mi},${c}`
      );
    }

    return { gained: totalGained, mergedPositions };
  }

  function boardEqual(a, b) {
    return a.every((row, r) => row.every((v, c) => v === b[r][c]));
  }

  function move(dir) {
    if (isOver) return;
    const before = board.map(r => [...r]);
    const { gained, mergedPositions } = applyMove(dir);

    if (boardEqual(before, board)) return; // nothing moved

    // Save undo snapshot
    prevBoard = before;
    prevScore = score - gained; // the score before this move
    prevMoves = moves;

    score += gained;
    moves++;

    addRandom();
    renderTiles(mergedPositions);
    updateUI();
    if (gained) showScoreAdd(gained);
    checkEnd();
  }

  // ── Undo ────────────────────────────────────
  function undo() {
    if (!prevBoard || isOver) return;
    board  = prevBoard.map(r => [...r]);
    score  = prevScore;
    moves  = prevMoves;
    prevBoard = null;
    renderTiles();
    updateUI();
  }

  // ── End check ───────────────────────────────
  function checkEnd() {
    // Win
    if (!hasWon && board.some(r => r.some(v => v >= target))) {
      hasWon = true;
      showOverlay('winner');
      return;
    }
    // Loss
    if (board.flat().includes(0)) return;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (c < SIZE-1 && board[r][c] === board[r][c+1]) return;
        if (r < SIZE-1 && board[r][c] === board[r+1][c]) return;
      }
    }
    isOver = true;
    showOverlay('over');
  }

  function showOverlay(type) {
    if (!overlay) return;
    if (type === 'winner') {
      overTitle.textContent = 'You Reached 2048!';
      overEmoji.textContent = '🏆';
      overlay.classList.remove('hidden');
      setTimeout(() => overlay.classList.add('hidden'), 2800);
    } else {
      overTitle.textContent = 'Game Over!';
      overEmoji.textContent = '😵';
      if (finalSc) finalSc.textContent = score;
      overlay.classList.remove('hidden');
    }
  }

  // ── Input ────────────────────────────────────
  document.addEventListener('keydown', e => {
    const map = {
      ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down',
      a:'left', d:'right', w:'up', s:'down',
    };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    if (e.key === 'z' || e.key === 'Z') undo();
  });

  let tx = 0, ty = 0;
  document.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  document.getElementById('restart-btn')?.addEventListener('click', init);
  document.getElementById('retry-btn')?.addEventListener('click', init);
  document.getElementById('undo-btn')?.addEventListener('click', undo);

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', G2048.init);
} else {
  G2048.init();
}
