/* =============================================
   wordsearch.js — Word Search Game Logic
   Mini Games Hub — Premium Upgrade
   Features: 4 themes, drag selection,
   timer, found animation, responsive grid
   ============================================= */
'use strict';

const WordSearchGame = (() => {
  const THEMES = {
    animals:   ['TIGER','EAGLE','SHARK','SNAKE','PANDA','WHALE','HORSE','MOUSE','ZEBRA','CRANE'],
    space:     ['COMET','ORBIT','LUNAR','SOLAR','QUASAR','NEBULA','TITAN','VENUS','EARTH','PLUTO'],
    food:      ['MANGO','PIZZA','PASTA','SUSHI','BREAD','STEAK','CANDY','SALAD','GRAPE','MELON'],
    sports:    ['RUGBY','GOLF','SWIM','DIVE','SURF','CLIMB','VAULT','FENCING','SKATE','TRACK'],
  };

  const DIRS = [
    [0,1], [1,0], [1,1], [0,-1], [-1,0], [-1,-1], [1,-1], [-1,1],
  ];

  const SIZE = 12;
  let grid = [];
  let words = [];
  let foundWords = new Set();
  let selecting = false;
  let selection = [];
  let timerInterval = null;
  let elapsedSecs = 0;

  const gridEl = document.getElementById('ws-grid');
  const wordListEl = document.getElementById('word-list-items');
  const timerEl = document.getElementById('timer');
  const foundEl = document.getElementById('found-c');
  const overlay = document.getElementById('ov');
  const ovMsg = document.getElementById('ov-msg');

  function init() {
    document.getElementById('new-game-btn')?.addEventListener('click', newGame);
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      overlay?.classList.add('hidden');
      newGame();
    });
    newGame();
  }

  function newGame() {
    // Pick random theme
    const themeKeys = Object.keys(THEMES);
    const theme = themeKeys[Math.floor(Math.random() * themeKeys.length)];
    words = [...THEMES[theme]].sort(() => Math.random() - 0.5).slice(0, 8);
    foundWords = new Set();
    selection = [];
    selecting = false;

    // Stop old timer
    clearInterval(timerInterval);
    elapsedSecs = 0;
    if (timerEl) timerEl.textContent = '00:00';

    // Build grid
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    placeWords();
    fillRandom();
    renderGrid();
    renderWordList();
    updateStats();

    // Start timer
    timerInterval = setInterval(() => {
      elapsedSecs++;
      if (timerEl) timerEl.textContent = formatTime(elapsedSecs);
    }, 1000);

    if (window.AppStorage) AppStorage.incrementPlays();
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function placeWords() {
    words.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 200) {
        attempts++;
        const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);

        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const nr = r + dir[0] * i;
          const nc = c + dir[1] * i;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) { ok = false; break; }
          if (grid[nr][nc] && grid[nr][nc] !== word[i]) { ok = false; break; }
        }
        if (ok) {
          for (let i = 0; i < word.length; i++) {
            grid[r + dir[0] * i][c + dir[1] * i] = word[i];
          }
          placed = true;
        }
      }
    });
  }

  function fillRandom() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) {
          grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = grid[r][c];
        cell.dataset.row = r;
        cell.dataset.col = c;

        // Mouse events
        cell.addEventListener('mousedown', e => {
          e.preventDefault();
          startSelect(r, c);
        });
        cell.addEventListener('mouseenter', () => {
          if (selecting) updateSelect(r, c);
        });
        cell.addEventListener('mouseup', () => endSelect());

        // Touch events
        cell.addEventListener('touchstart', e => {
          e.preventDefault();
          startSelect(r, c);
        }, { passive: false });

        cell.addEventListener('touchmove', e => {
          e.preventDefault();
          const touch = e.touches[0];
          const el = document.elementFromPoint(touch.clientX, touch.clientY);
          if (el?.classList.contains('ws-cell')) {
            updateSelect(parseInt(el.dataset.row), parseInt(el.dataset.col));
          }
        }, { passive: false });

        cell.addEventListener('touchend', () => endSelect());

        gridEl.appendChild(cell);
      }
    }

    // Global mouseup to catch edge cases
    document.addEventListener('mouseup', () => {
      if (selecting) endSelect();
    });
  }

  function startSelect(r, c) {
    selecting = true;
    selection = [{ r, c }];
    highlightSelection();
  }

  function updateSelect(r, c) {
    if (!selecting || selection.length === 0) return;
    const start = selection[0];

    // Must be in a valid direction (straight line)
    const dr = Math.sign(r - start.r);
    const dc = Math.sign(c - start.c);
    if (dr === 0 && dc === 0) { selection = [start]; highlightSelection(); return; }

    // Only allow 8 directions
    const absDr = Math.abs(r - start.r);
    const absDc = Math.abs(c - start.c);
    if (absDr !== absDc && absDr !== 0 && absDc !== 0) return;

    const len = Math.max(absDr, absDc) + 1;
    selection = [];
    for (let i = 0; i < len; i++) {
      selection.push({ r: start.r + dr * i, c: start.c + dc * i });
    }
    highlightSelection();
  }

  function highlightSelection() {
    gridEl.querySelectorAll('.ws-cell').forEach(cell => {
      cell.classList.remove('selecting');
    });
    selection.forEach(({ r, c }) => {
      const cell = gridEl.children[r * SIZE + c];
      if (cell) cell.classList.add('selecting');
    });
  }

  function endSelect() {
    if (!selecting) return;
    selecting = false;

    const selectedWord = selection.map(({ r, c }) => grid[r][c]).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    let matchedWord = null;
    for (const word of words) {
      if (!foundWords.has(word) && (selectedWord === word || reversedWord === word)) {
        matchedWord = word;
        break;
      }
    }

    if (matchedWord) {
      foundWords.add(matchedWord);
      // Mark cells as found
      selection.forEach(({ r, c }) => {
        const cell = gridEl.children[r * SIZE + c];
        if (cell) cell.classList.add('found');
      });
      // Mark word in list
      const wordItem = wordListEl.querySelector(`[data-word="${matchedWord}"]`);
      if (wordItem) wordItem.classList.add('found');

      updateStats();
      playSound('match');

      if (foundWords.size === words.length) {
        victory();
      }
    } else {
      playSound('fail');
    }

    // Clear selection highlights
    gridEl.querySelectorAll('.selecting').forEach(cell => {
      cell.classList.remove('selecting');
    });
    selection = [];
  }

  function renderWordList() {
    wordListEl.innerHTML = '';
    words.forEach(word => {
      const item = document.createElement('div');
      item.className = 'ws-word-item';
      item.textContent = word;
      item.dataset.word = word;
      wordListEl.appendChild(item);
    });
  }

  function updateStats() {
    if (foundEl) foundEl.textContent = `${foundWords.size} / ${words.length}`;
  }

  function victory() {
    clearInterval(timerInterval);
    if (ovMsg) ovMsg.textContent = `All ${words.length} words found in ${formatTime(elapsedSecs)}!`;
    if (overlay) overlay.classList.remove('hidden');
    playSound('win');
  }

  function playSound(type) {
    if (window.Utils) window.Utils.playSound(type);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', WordSearchGame.init);
} else {
  WordSearchGame.init();
}
