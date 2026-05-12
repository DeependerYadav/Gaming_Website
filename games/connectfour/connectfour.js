/* =============================================
   connectfour.js — Connect Four Game Engine
   Mini Games Hub — Premium Gaming UI
   
   Features:
   - 7x6 board with drop animation
   - Smart AI with minimax (depth 5)
   - 2-player mode
   - Win detection (horizontal, vertical, diagonal)
   - Keyboard support (1-7 keys)
   - Score tracking with localStorage
   ============================================= */

(function () {
  'use strict';

  /* ---- Constants ---- */
  const ROWS = 6;
  const COLS = 7;
  const EMPTY = 0;
  const RED = 1;     // Player 1 / Human
  const YELLOW = 2;  // Player 2 / AI

  /* ---- State ---- */
  let board = [];
  let currentPlayer = RED;
  let gameActive = false;
  let gameMode = 'ai'; // 'ai' or '2p'
  let scores = { red: 0, yellow: 0, draws: 0 };
  let aiThinking = false;

  /* ---- DOM References ---- */
  const boardEl = document.getElementById('c4-board');
  const overlay = document.getElementById('c4-overlay');
  const gameoverOverlay = document.getElementById('c4-gameover');
  const turnIndicator = document.getElementById('turn-indicator');
  const turnText = document.getElementById('turn-text');
  const redWinsEl = document.getElementById('red-wins');
  const yellowWinsEl = document.getElementById('yellow-wins');
  const drawCountEl = document.getElementById('draw-count');
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverEmoji = document.getElementById('gameover-emoji');
  const gameoverScore = document.getElementById('gameover-score');

  /* ---- Init ---- */
  function init() {
    loadScores();
    buildBoard();
    bindEvents();
    updateScoreDisplay();
  }

  /* ---- Board Construction ---- */
  function buildBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    boardEl.innerHTML = '';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.classList.add('c4-cell');
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.addEventListener('click', () => handleCellClick(c));
        cell.addEventListener('mouseenter', () => highlightColumn(c));
        cell.addEventListener('mouseleave', clearColumnHighlight);
        boardEl.appendChild(cell);
      }
    }
  }

  /* ---- Event Bindings ---- */
  function bindEvents() {
    document.getElementById('btn-start-c4').addEventListener('click', startGame);
    document.getElementById('btn-restart-c4').addEventListener('click', restartGame);
    document.getElementById('btn-restart-gameover').addEventListener('click', restartGame);

    // Mode toggle
    document.querySelectorAll('#mode-toggle .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameMode = btn.dataset.mode;
      });
    });

    // Keyboard support (1-7 for columns)
    document.addEventListener('keydown', (e) => {
      const col = parseInt(e.key) - 1;
      if (col >= 0 && col < 7 && gameActive && !aiThinking) {
        handleCellClick(col);
      }
    });
  }

  /* ---- Start Game ---- */
  function startGame() {
    buildBoard();
    currentPlayer = RED;
    gameActive = true;
    aiThinking = false;
    overlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    updateTurnIndicator();
  }

  function restartGame() {
    startGame();
  }

  /* ---- Handle Click ---- */
  function handleCellClick(col) {
    if (!gameActive || aiThinking) return;
    if (gameMode === 'ai' && currentPlayer === YELLOW) return;

    if (dropDisc(col, currentPlayer)) {
      const winner = checkWin(board);
      if (winner) {
        endGame(winner);
        return;
      }
      if (isBoardFull()) {
        endGame('draw');
        return;
      }

      // Switch turn
      currentPlayer = currentPlayer === RED ? YELLOW : RED;
      updateTurnIndicator();

      // AI move
      if (gameMode === 'ai' && currentPlayer === YELLOW) {
        aiThinking = true;
        setTimeout(() => {
          const aiCol = getAIMove();
          if (aiCol !== -1) {
            dropDisc(aiCol, YELLOW);
            const w = checkWin(board);
            if (w) { endGame(w); return; }
            if (isBoardFull()) { endGame('draw'); return; }
          }
          currentPlayer = RED;
          aiThinking = false;
          updateTurnIndicator();
        }, 400 + Math.random() * 300);
      }
    }
  }

  /* ---- Drop Disc ---- */
  function dropDisc(col, player) {
    // Find lowest empty row in column
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === EMPTY) {
        board[r][col] = player;
        const cell = getCellEl(r, col);
        cell.classList.add('filled');

        const disc = document.createElement('div');
        disc.classList.add('disc', player === RED ? 'red' : 'yellow', 'dropping');
        cell.appendChild(disc);

        return true;
      }
    }
    return false; // Column full
  }

  /* ---- Win Detection ---- */
  function checkWin(b) {
    const directions = [
      [0, 1],  // horizontal
      [1, 0],  // vertical
      [1, 1],  // diagonal down-right
      [1, -1]  // diagonal down-left
    ];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] === EMPTY) continue;
        const player = b[r][c];

        for (const [dr, dc] of directions) {
          const cells = [[r, c]];
          let count = 1;

          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === player) {
              cells.push([nr, nc]);
              count++;
            } else break;
          }

          if (count >= 4) {
            // Highlight winning cells
            cells.forEach(([wr, wc]) => {
              getCellEl(wr, wc).classList.add('win-cell');
            });
            return player;
          }
        }
      }
    }
    return null;
  }

  function isBoardFull() {
    return board[0].every(cell => cell !== EMPTY);
  }

  /* ---- AI (Minimax with Alpha-Beta) ---- */
  function getAIMove() {
    let bestScore = -Infinity;
    let bestCol = -1;
    const depth = 5;

    // Try center columns first (better heuristic ordering)
    const colOrder = [3, 2, 4, 1, 5, 0, 6];

    for (const col of colOrder) {
      const row = getLowestRow(board, col);
      if (row === -1) continue;

      board[row][col] = YELLOW;
      const score = minimax(board, depth - 1, -Infinity, Infinity, false);
      board[row][col] = EMPTY;

      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    return bestCol;
  }

  function minimax(b, depth, alpha, beta, isMaximizing) {
    const winner = checkWinFast(b);
    if (winner === YELLOW) return 1000 + depth;
    if (winner === RED) return -1000 - depth;
    if (isBoardFullFast(b) || depth === 0) return evaluateBoard(b);

    const colOrder = [3, 2, 4, 1, 5, 0, 6];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of colOrder) {
        const row = getLowestRow(b, col);
        if (row === -1) continue;
        b[row][col] = YELLOW;
        const eval_ = minimax(b, depth - 1, alpha, beta, false);
        b[row][col] = EMPTY;
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of colOrder) {
        const row = getLowestRow(b, col);
        if (row === -1) continue;
        b[row][col] = RED;
        const eval_ = minimax(b, depth - 1, alpha, beta, true);
        b[row][col] = EMPTY;
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  function evaluateBoard(b) {
    let score = 0;
    // Center column preference
    for (let r = 0; r < ROWS; r++) {
      if (b[r][3] === YELLOW) score += 3;
      if (b[r][3] === RED) score -= 3;
    }

    // Evaluate windows of 4
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of dirs) {
          const window = [];
          for (let i = 0; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              window.push(b[nr][nc]);
            }
          }
          if (window.length === 4) {
            score += evaluateWindow(window, YELLOW);
            score -= evaluateWindow(window, RED);
          }
        }
      }
    }
    return score;
  }

  function evaluateWindow(window, player) {
    const opp = player === RED ? YELLOW : RED;
    const pCount = window.filter(c => c === player).length;
    const eCount = window.filter(c => c === EMPTY).length;
    const oCount = window.filter(c => c === opp).length;

    if (pCount === 4) return 100;
    if (pCount === 3 && eCount === 1) return 5;
    if (pCount === 2 && eCount === 2) return 2;
    if (oCount === 3 && eCount === 1) return -4; // Block opponent
    return 0;
  }

  function checkWinFast(b) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] === EMPTY) continue;
        for (const [dr, dc] of dirs) {
          let count = 1;
          for (let i = 1; i < 4; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === b[r][c]) count++;
            else break;
          }
          if (count >= 4) return b[r][c];
        }
      }
    }
    return null;
  }

  function isBoardFullFast(b) { return b[0].every(c => c !== EMPTY); }
  function getLowestRow(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) { if (b[r][col] === EMPTY) return r; }
    return -1;
  }

  /* ---- End Game ---- */
  function endGame(result) {
    gameActive = false;

    if (result === 'draw') {
      scores.draws++;
      gameoverEmoji.textContent = '🤝';
      gameoverTitle.textContent = "It's a Draw!";
    } else if (result === RED) {
      scores.red++;
      gameoverEmoji.textContent = '🔴';
      gameoverTitle.textContent = gameMode === 'ai' ? 'You Win!' : 'Red Wins!';
    } else {
      scores.yellow++;
      gameoverEmoji.textContent = '🟡';
      gameoverTitle.textContent = gameMode === 'ai' ? 'AI Wins!' : 'Yellow Wins!';
    }

    gameoverScore.textContent = `Red ${scores.red} — ${scores.draws} — ${scores.yellow} Yellow`;
    updateScoreDisplay();
    saveScores();

    setTimeout(() => {
      gameoverOverlay.classList.remove('hidden');
    }, 800);
  }

  /* ---- UI Helpers ---- */
  function getCellEl(row, col) {
    return boardEl.children[row * COLS + col];
  }

  function updateTurnIndicator() {
    const discSpan = turnIndicator.querySelector('.c4-disc');
    turnIndicator.classList.remove('red-turn', 'yellow-turn');

    if (currentPlayer === RED) {
      discSpan.className = 'c4-disc c4-disc-red small';
      turnIndicator.classList.add('red-turn');
      turnText.textContent = gameMode === 'ai' ? 'Your Turn' : "Red's Turn";
    } else {
      discSpan.className = 'c4-disc c4-disc-yellow small';
      turnIndicator.classList.add('yellow-turn');
      turnText.textContent = gameMode === 'ai' ? 'AI Thinking...' : "Yellow's Turn";
    }
  }

  function highlightColumn(col) {
    if (!gameActive || aiThinking) return;
    boardEl.className = 'c4-board col-hover-' + col;
  }

  function clearColumnHighlight() {
    boardEl.className = 'c4-board';
  }

  function updateScoreDisplay() {
    redWinsEl.textContent = scores.red;
    yellowWinsEl.textContent = scores.yellow;
    drawCountEl.textContent = scores.draws;
  }

  /* ---- Storage ---- */
  function saveScores() {
    localStorage.setItem('c4-scores', JSON.stringify(scores));
  }

  function loadScores() {
    try {
      const saved = JSON.parse(localStorage.getItem('c4-scores'));
      if (saved) scores = { ...scores, ...saved };
    } catch (e) { /* ignore */ }
  }

  /* ---- Launch ---- */
  init();

})();
