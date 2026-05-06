// ===== WORD SEARCH GAME =====
const SIZE = 12;
const WORD_BANK = [
  ['PYTHON','JAVA','SWIFT','RUBY','KOTLIN','RUST','REACT','ARRAY','LOOP','CLASS','OBJECT','FUNCTION'],
  ['APPLE','MANGO','GRAPE','PEACH','LEMON','BERRY','MELON','PLUM','GUAVA','KIWI','PAPAYA','CHERRY'],
  ['OCEAN','RIVER','CLOUD','STORM','EARTH','FLAME','FROST','STONE','PLANT','SOLAR','LUNAR','COMET'],
  ['LION','TIGER','PANDA','EAGLE','SHARK','WHALE','COBRA','GECKO','BISON','HYENA','ZEBRA','CRANE']
];
const HIGHLIGHT_COLORS = [
  'rgba(0,212,255,.35)','rgba(167,139,250,.35)','rgba(247,37,133,.35)',
  'rgba(0,245,160,.35)','rgba(247,201,72,.35)','rgba(255,107,53,.35)','rgba(76,201,240,.35)'
];
const DIRS = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];

let grid, placed, foundWords, selStart, selCells, timerSec, timerInt, words;

function newGame() {
  clearInterval(timerInt); timerSec = 0;
  const bank = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  words = bank.slice(0, 8);
  grid = Array.from({length: SIZE}, () => Array(SIZE).fill(''));
  placed = []; foundWords = new Set(); selStart = null; selCells = [];
  words.forEach(w => placeWord(w));
  fillRandom();
  renderGrid(); renderWordList();
  timerInt = setInterval(() => { timerSec++; document.getElementById('timer').textContent = fmt(timerSec); }, 1000);
  document.getElementById('found-c').textContent = `0 / ${words.length} found`;
}

function placeWord(word) {
  let tries = 200;
  while (tries-- > 0) {
    const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
    const r = Math.floor(Math.random() * SIZE), c = Math.floor(Math.random() * SIZE);
    const cells = []; let ok = true;
    for (let i = 0; i < word.length; i++) {
      const nr = r + dir[0]*i, nc = c + dir[1]*i;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) { ok = false; break; }
      if (grid[nr][nc] && grid[nr][nc] !== word[i]) { ok = false; break; }
      cells.push([nr, nc]);
    }
    if (ok) { cells.forEach(([rr,cc],i) => grid[rr][cc] = word[i]); placed.push({word, cells}); return; }
  }
}

function fillRandom() {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) grid[r][c] = abc[Math.floor(Math.random() * 26)];
}

function fmt(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }

function renderGrid() {
  const el = document.getElementById('ws-grid');
  el.innerHTML = '';
  el.style.gridTemplateColumns = `repeat(${SIZE},1fr)`;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'ws-cell';
      cell.textContent = grid[r][c];
      cell.dataset.r = r; cell.dataset.c = c;
      cell.addEventListener('pointerdown', e => { e.preventDefault(); startSel(r, c); });
      cell.addEventListener('pointerenter', e => { if (e.buttons) moveSel(r, c); });
      cell.addEventListener('pointerup', endSel);
      el.appendChild(cell);
    }
  }
  el.addEventListener('pointerleave', endSel);
}

function renderWordList() {
  const el = document.getElementById('word-list-items');
  el.innerHTML = '';
  words.forEach(w => {
    const d = document.createElement('div');
    d.className = 'word-item' + (foundWords.has(w) ? ' found' : '');
    d.textContent = w; d.id = 'wi-' + w;
    el.appendChild(d);
  });
}

function startSel(r, c) { selStart = {r, c}; selCells = [[r, c]]; highlight(); }

function moveSel(r, c) {
  if (!selStart) return;
  const dr = r - selStart.r, dc = c - selStart.c;
  const len = Math.max(Math.abs(dr), Math.abs(dc));
  if (len === 0) { selCells = [[selStart.r, selStart.c]]; highlight(); return; }
  let sr = 0, sc = 0;
  if (dr !== 0) sr = dr / Math.abs(dr);
  if (dc !== 0) sc = dc / Math.abs(dc);
  if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) { highlight(); return; }
  selCells = [];
  for (let i = 0; i <= len; i++) selCells.push([selStart.r + sr*i, selStart.c + sc*i]);
  highlight();
}

function endSel() {
  if (!selCells.length) { selStart = null; return; }
  checkWord(); selStart = null; selCells = []; highlight();
}

function highlight() {
  document.querySelectorAll('.ws-cell').forEach(c => {
    if (!c.classList.contains('found')) { c.classList.remove('selecting'); c.style.background = ''; }
  });
  selCells.forEach(([r, c]) => {
    const cell = document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
    if (cell && !cell.classList.contains('found')) cell.classList.add('selecting');
  });
}

function checkWord() {
  const str = selCells.map(([r,c]) => grid[r][c]).join('');
  const rev = str.split('').reverse().join('');
  for (const w of words) {
    if ((str === w || rev === w) && !foundWords.has(w)) {
      foundWords.add(w);
      const colorIdx = foundWords.size - 1;
      const color = HIGHLIGHT_COLORS[colorIdx % HIGHLIGHT_COLORS.length];
      selCells.forEach(([r, c]) => {
        const cell = document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
        if (cell) { cell.classList.add('found'); cell.classList.remove('selecting'); cell.style.background = color; }
      });
      document.getElementById('wi-' + w).classList.add('found');
      document.getElementById('found-c').textContent = `${foundWords.size} / ${words.length} found`;
      if (foundWords.size === words.length) {
        clearInterval(timerInt);
        document.getElementById('ov-msg').textContent = `Completed in ${fmt(timerSec)}!`;
        setTimeout(() => document.getElementById('ov').classList.add('show'), 400);
      }
      return;
    }
  }
}

newGame();
