// ===== SUDOKU GAME =====
const DIFF = { easy: 36, medium: 27, hard: 20 };
let diff = 'easy', puzzle = [], solution = [], selected = -1, errors = 0, pencilMode = false;
let timerInterval, seconds = 0, history = [];

function solveSudoku(board) {
  const empty = board.indexOf(0);
  if (empty === -1) return true;
  const row = Math.floor(empty / 9), col = empty % 9;
  const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - .5);
  for (const n of nums) {
    if (isValid(board, row, col, n)) {
      board[empty] = n;
      if (solveSudoku(board)) return true;
      board[empty] = 0;
    }
  }
  return false;
}

function isValid(b, r, c, n) {
  for (let i = 0; i < 9; i++) {
    if (b[r*9+i] === n || b[i*9+c] === n) return false;
    const br = 3*Math.floor(r/3) + Math.floor(i/3), bc = 3*Math.floor(c/3) + i%3;
    if (b[br*9+bc] === n) return false;
  }
  return true;
}

function generatePuzzle(clues) {
  const sol = Array(81).fill(0);
  solveSudoku(sol);
  solution = [...sol];
  const puz = [...sol];
  let removed = 81 - clues;
  const indices = Array.from({length:81},(_,i)=>i).sort(()=>Math.random()-.5);
  for (const idx of indices) {
    if (removed <= 0) break;
    puz[idx] = 0; removed--;
  }
  return puz;
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.idx = i;
    cell.dataset.row = Math.floor(i/9);
    cell.dataset.col = i%9;
    if (puzzle[i] !== 0) {
      cell.textContent = puzzle[i];
      if (solution[i] !== 0 && puzzle[i] === solution[i]) cell.classList.add('given');
    }
    cell.addEventListener('click', () => selectCell(i));
    board.appendChild(cell);
  }
  highlightRelated();
}

function selectCell(idx) {
  selected = idx;
  highlightRelated();
}

function highlightRelated() {
  const cells = document.querySelectorAll('.cell');
  cells.forEach(c => c.classList.remove('selected','highlight','same-val'));
  if (selected < 0) return;
  const r = Math.floor(selected/9), co = selected%9;
  const val = puzzle[selected];
  cells.forEach((c, i) => {
    const cr = Math.floor(i/9), cc = i%9;
    const sameBox = Math.floor(cr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(co/3);
    if (i === selected) c.classList.add('selected');
    else if (cr===r || cc===co || sameBox) c.classList.add('highlight');
    if (val && puzzle[i] === val && i !== selected) c.classList.add('same-val');
  });
}

function inputNum(n) {
  if (selected < 0) return;
  const cells = document.querySelectorAll('.cell');
  const cell = cells[selected];
  if (cell.classList.contains('given')) return;
  history.push({idx: selected, old: puzzle[selected], pencils: cell.dataset.pencils || ''});
  if (pencilMode && n !== 0) {
    let pencils = cell.dataset.pencils ? cell.dataset.pencils.split(',').map(Number) : [];
    const pi = pencils.indexOf(n);
    if (pi >= 0) pencils.splice(pi,1); else pencils.push(n);
    pencils.sort();
    cell.dataset.pencils = pencils.join(',');
    cell.textContent = pencils.join(' ');
    cell.classList.add('pencil');
    return;
  }
  cell.dataset.pencils = '';
  cell.classList.remove('pencil','error');
  if (n === 0) { puzzle[selected] = 0; cell.textContent = ''; highlightRelated(); return; }
  puzzle[selected] = n;
  if (n !== solution[selected]) {
    errors++;
    document.getElementById('errors-val').textContent = errors;
    cell.classList.add('error');
    setTimeout(() => cell.classList.remove('error'), 600);
    puzzle[selected] = 0; cell.textContent = '';
  } else {
    cell.textContent = n;
    checkWin();
  }
  highlightRelated();
}

function undo() {
  if (!history.length) return;
  const h = history.pop();
  puzzle[h.idx] = h.old;
  const cells = document.querySelectorAll('.cell');
  const cell = cells[h.idx];
  cell.dataset.pencils = h.pencils;
  cell.textContent = h.pencils ? h.pencils.replace(/,/g,' ') : (h.old || '');
  if (h.pencils) cell.classList.add('pencil'); else cell.classList.remove('pencil');
  highlightRelated();
}

function getHint() {
  const empties = [];
  for (let i = 0; i < 81; i++) if (!puzzle[i] && !document.querySelectorAll('.cell')[i].classList.contains('given')) empties.push(i);
  if (!empties.length) return;
  const idx = empties[Math.floor(Math.random()*empties.length)];
  selected = idx;
  inputNum(solution[idx]);
}

function solve() {
  for (let i = 0; i < 81; i++) puzzle[i] = solution[i];
  renderBoard();
  checkWin();
}

function togglePencil() {
  pencilMode = !pencilMode;
  document.getElementById('pencil-btn').classList.toggle('pencil-on', pencilMode);
}

function checkWin() {
  if (puzzle.every((v,i) => v === solution[i])) {
    clearInterval(timerInterval);
    const key = 'sudoku-best-' + diff;
    const best = localStorage.getItem(key);
    if (!best || seconds < Number(best)) localStorage.setItem(key, seconds);
    updateBest();
    document.getElementById('win-msg').textContent = `Solved in ${formatTime(seconds)} with ${errors} error${errors!==1?'s':''}!`;
    setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 300);
  }
}

function formatTime(s) { return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); }

function startTimer() {
  clearInterval(timerInterval);
  seconds = 0;
  document.getElementById('timer-val').textContent = '00:00';
  timerInterval = setInterval(() => {
    seconds++;
    document.getElementById('timer-val').textContent = formatTime(seconds);
  }, 1000);
}

function updateBest() {
  const best = localStorage.getItem('sudoku-best-' + diff);
  document.getElementById('best-val').textContent = best ? formatTime(Number(best)) : '--';
}

function buildNumpad() {
  const np = document.getElementById('numpad');
  np.innerHTML = '';
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.textContent = n;
    btn.addEventListener('click', () => inputNum(n));
    np.appendChild(btn);
  }
  const erase = document.createElement('button');
  erase.className = 'num-btn erase';
  erase.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
  erase.addEventListener('click', () => inputNum(0));
  np.appendChild(erase);
}

document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') inputNum(Number(e.key));
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputNum(0);
  const dirs = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
  if (dirs[e.key] !== undefined && selected >= 0) {
    const ns = Math.max(0, Math.min(80, selected + dirs[e.key]));
    selectCell(ns);
    e.preventDefault();
  }
});

function setDiff(d, btn) {
  diff = d;
  document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  newGame();
}

function newGame() {
  errors = 0; history = []; pencilMode = false;
  document.getElementById('errors-val').textContent = '0';
  document.getElementById('pencil-btn').classList.remove('pencil-on');
  document.getElementById('win-overlay').classList.remove('show');
  puzzle = generatePuzzle(DIFF[diff]);
  updateBest();
  renderBoard();
  startTimer();
  selected = -1;
  highlightRelated();
}

buildNumpad();
newGame();
