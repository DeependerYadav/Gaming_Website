/* =============================================
   sudoku.js — Sudoku Game Logic
   Mini Games Hub — Premium Upgrade
   Features: puzzle generator, pencil marks,
   undo, hints, solve, error highlighting,
   timer, cell selection highlighting
   ============================================= */
'use strict';

const SudokuGame = (() => {
  const SIZE = 9;
  const BOX = 3;

  const REMOVE_COUNTS = { easy: 36, medium: 46, hard: 54 };

  let solution = [];
  let puzzle = [];
  let pencils = [];
  let history = [];
  let selectedCell = null;
  let pencilMode = false;
  let errors = 0;
  let difficulty = 'easy';
  let timerInterval = null;
  let elapsedSecs = 0;

  const boardEl = document.getElementById('board');
  const numpadEl = document.getElementById('numpad');
  const timerEl = document.getElementById('timer-val');
  const errorsEl = document.getElementById('errors-val');
  const bestEl = document.getElementById('best-val');
  const winOverlay = document.getElementById('win-overlay');
  const winMsg = document.getElementById('win-msg');

  function init() {
    // Build numpad
    numpadEl.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'numpad-btn';
      btn.textContent = n;
      btn.dataset.num = n;
      btn.addEventListener('click', () => inputNumber(n));
      numpadEl.appendChild(btn);
    }

    // Difficulty buttons
    document.querySelectorAll('#diff-selector .diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        document.querySelectorAll('#diff-selector .diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        newGame();
      });
    });

    // Action buttons
    document.getElementById('pencil-btn')?.addEventListener('click', togglePencil);
    document.getElementById('undo-btn')?.addEventListener('click', undo);
    document.getElementById('hint-btn')?.addEventListener('click', getHint);
    document.getElementById('new-game-btn')?.addEventListener('click', newGame);
    document.getElementById('win-new-btn')?.addEventListener('click', () => {
      winOverlay?.classList.add('hidden');
      newGame();
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) inputNumber(num);
      if (e.key === 'Backspace' || e.key === 'Delete') clearCell();
      if (e.key === 'p' || e.key === 'P') togglePencil();
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) undo();
    });

    updateBest();
    newGame();
  }

  function newGame() {
    solution = generateSolution();
    puzzle = solution.map(row => [...row]);
    pencils = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => new Set())
    );
    history = [];
    selectedCell = null;
    pencilMode = false;
    errors = 0;

    // Remove cells
    const remove = REMOVE_COUNTS[difficulty] || REMOVE_COUNTS.easy;
    let removed = 0;
    const positions = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) positions.push([r, c]);
    }
    shuffleArray(positions);
    for (const [r, c] of positions) {
      if (removed >= remove) break;
      puzzle[r][c] = 0;
      removed++;
    }

    clearInterval(timerInterval);
    elapsedSecs = 0;
    if (timerEl) timerEl.textContent = '00:00';
    timerInterval = setInterval(() => {
      elapsedSecs++;
      if (timerEl) timerEl.textContent = formatTime(elapsedSecs);
    }, 1000);

    updatePencilBtn();
    updateUI();
    renderBoard();

    if (window.AppStorage) AppStorage.incrementPlays();
  }

  // ── Puzzle generator ─────────────────────
  function generateSolution() {
    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    fillGrid(grid);
    return grid;
  }

  function fillGrid(grid) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] !== 0) continue;
        const nums = shuffleArray([1,2,3,4,5,6,7,8,9]);
        for (const n of nums) {
          if (isValid(grid, r, c, n)) {
            grid[r][c] = n;
            if (fillGrid(grid)) return true;
            grid[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  function isValid(grid, row, col, num) {
    // Row check
    if (grid[row].includes(num)) return false;
    // Col check
    for (let r = 0; r < SIZE; r++) {
      if (grid[r][col] === num) return false;
    }
    // Box check
    const br = Math.floor(row / BOX) * BOX;
    const bc = Math.floor(col / BOX) * BOX;
    for (let r = br; r < br + BOX; r++) {
      for (let c = bc; c < bc + BOX; c++) {
        if (grid[r][c] === num) return false;
      }
    }
    return true;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ── Render ────────────────────────────────
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        // 3x3 box borders
        if (c % 3 === 2 && c < 8) cell.classList.add('border-right');
        if (r % 3 === 2 && r < 8) cell.classList.add('border-bottom');
        if (c % 3 === 0) cell.classList.add('border-left');
        if (r % 3 === 0) cell.classList.add('border-top');

        const val = puzzle[r][c];
        const isGiven = val !== 0 && solution[r][c] === val && originalHas(r, c);

        if (val !== 0) {
          cell.textContent = val;
          if (isGiven) {
            cell.classList.add('given');
          } else {
            cell.classList.add('user');
            if (val !== solution[r][c]) cell.classList.add('error');
          }
        } else if (pencils[r][c].size > 0) {
          const marks = document.createElement('div');
          marks.className = 'pencil-marks';
          for (let n = 1; n <= 9; n++) {
            const span = document.createElement('span');
            span.textContent = pencils[r][c].has(n) ? n : '';
            marks.appendChild(span);
          }
          cell.appendChild(marks);
        }

        // Selection
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
          cell.classList.add('selected');
        }
        if (selectedCell) {
          const sr = selectedCell.r, sc = selectedCell.c;
          if (r === sr || c === sc || (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3))) {
            cell.classList.add('highlighted');
          }
        }

        cell.addEventListener('click', () => selectCell(r, c));
        boardEl.appendChild(cell);
      }
    }
    updateNumpadCounts();
  }

  function originalHas(r, c) {
    // Check if the cell was part of the original puzzle
    // This is a simplified check - given cells are non-zero at start
    // We track this by checking if solution matches and no history entry modified it
    return !history.some(h => h.r === r && h.c === c);
  }

  function selectCell(r, c) {
    selectedCell = { r, c };
    renderBoard();
  }

  function inputNumber(num) {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const origVal = puzzle[r][c];

    // Can't modify given cells
    if (origVal !== 0 && origVal === solution[r][c] && originalHas(r, c)) return;

    if (pencilMode) {
      // Toggle pencil mark
      if (pencils[r][c].has(num)) {
        pencils[r][c].delete(num);
      } else {
        pencils[r][c].add(num);
      }
      puzzle[r][c] = 0; // Clear value if setting pencil marks
      playSound('click');
    } else {
      // Save undo
      history.push({ r, c, val: origVal, pencilMarks: new Set(pencils[r][c]) });

      puzzle[r][c] = num;
      pencils[r][c] = new Set(); // Clear pencil marks

      if (num !== solution[r][c]) {
        errors++;
        updateUI();
        playSound('fail');
      } else {
        playSound('click');
        // Remove this number from pencils in same row/col/box
        removePencilMarks(r, c, num);
      }

      // Check win
      if (checkWin()) {
        victory();
      }
    }

    renderBoard();
  }

  function clearCell() {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (puzzle[r][c] !== 0 && puzzle[r][c] === solution[r][c] && originalHas(r, c)) return;

    history.push({ r, c, val: puzzle[r][c], pencilMarks: new Set(pencils[r][c]) });
    puzzle[r][c] = 0;
    pencils[r][c] = new Set();
    renderBoard();
  }

  function removePencilMarks(row, col, num) {
    for (let i = 0; i < SIZE; i++) {
      pencils[row][i].delete(num);
      pencils[i][col].delete(num);
    }
    const br = Math.floor(row / BOX) * BOX;
    const bc = Math.floor(col / BOX) * BOX;
    for (let r = br; r < br + BOX; r++) {
      for (let c = bc; c < bc + BOX; c++) {
        pencils[r][c].delete(num);
      }
    }
  }

  function togglePencil() {
    pencilMode = !pencilMode;
    updatePencilBtn();
  }

  function updatePencilBtn() {
    const btn = document.getElementById('pencil-btn');
    if (btn) btn.classList.toggle('active', pencilMode);
  }

  function undo() {
    if (history.length === 0) return;
    const last = history.pop();
    puzzle[last.r][last.c] = last.val;
    pencils[last.r][last.c] = last.pencilMarks;
    renderBoard();
    playSound('click');
  }

  function getHint() {
    // Find first empty cell and fill it
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] === 0) {
          history.push({ r, c, val: 0, pencilMarks: new Set(pencils[r][c]) });
          puzzle[r][c] = solution[r][c];
          pencils[r][c] = new Set();
          selectedCell = { r, c };
          renderBoard();
          playSound('match');

          if (checkWin()) victory();
          return;
        }
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function victory() {
    clearInterval(timerInterval);
    const timeStr = formatTime(elapsedSecs);
    if (winMsg) winMsg.textContent = `Completed in ${timeStr} with ${errors} error${errors !== 1 ? 's' : ''}!`;
    if (winOverlay) winOverlay.classList.remove('hidden');

    // Save best time
    const bestKey = `sudoku-best-${difficulty}`;
    const prevBest = parseInt(localStorage.getItem(bestKey) || '999999');
    if (elapsedSecs < prevBest) {
      localStorage.setItem(bestKey, elapsedSecs);
    }
    if (window.AppStorage) AppStorage.saveScore('sudoku', elapsedSecs);
    updateBest();
    playSound('win');
  }

  function updateBest() {
    const bestKey = `sudoku-best-${difficulty}`;
    const bestTime = parseInt(localStorage.getItem(bestKey) || '0');
    if (bestEl) bestEl.textContent = bestTime ? formatTime(bestTime) : '--';
  }

  function updateUI() {
    if (errorsEl) errorsEl.textContent = errors;
  }

  function updateNumpadCounts() {
    // Gray out completed numbers
    for (let n = 1; n <= 9; n++) {
      let count = 0;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (puzzle[r][c] === n) count++;
        }
      }
      const btn = numpadEl.querySelector(`[data-num="${n}"]`);
      if (btn) btn.classList.toggle('completed', count >= 9);
    }
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function playSound(type) {
    if (window.Utils) window.Utils.playSound(type);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SudokuGame.init);
} else {
  SudokuGame.init();
}
