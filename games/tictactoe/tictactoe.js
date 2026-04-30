/* =============================================
   tictactoe.js - Tic Tac Toe Game Logic
   Mini Games Hub
   ============================================= */

const TicTacToe = (() => {
  const WIN_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let board = Array(9).fill('');
  let currentPlayer = 'X';
  let startingPlayer = 'X';
  let gameActive = false;
  let vsAI = false;
  let aiDifficulty = 'hard';
  let scores = { X: 0, Draw: 0, O: 0 };
  let awaitingAI = false;
  let aiTimerId = null;

  let cells = [];
  let resultBanner;
  let turnX;
  let turnO;
  let scoreXEl;
  let scoreDrawEl;
  let scoreOEl;
  let statusEl;

  function init() {
    cells = Array.from(document.querySelectorAll('.ttt-cell'));
    resultBanner = document.getElementById('ttt-result');
    turnX = document.getElementById('turn-x');
    turnO = document.getElementById('turn-o');
    scoreXEl = document.getElementById('score-x');
    scoreDrawEl = document.getElementById('score-draw');
    scoreOEl = document.getElementById('score-o');
    statusEl = document.getElementById('ttt-status');

    if (cells.length === 0) return;

    cells.forEach((cell, index) => {
      cell.setAttribute('tabindex', '0');
      cell.addEventListener('click', () => handleCellClick(index));
      cell.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCellClick(index);
        }
      });
    });

    bindButtons();
    loadScores();
    resetGame();
  }

  function resetGame() {
    clearTimeout(aiTimerId);
    board = Array(9).fill('');
    currentPlayer = startingPlayer;
    gameActive = true;
    awaitingAI = false;

    cells.forEach((cell, index) => {
      cell.textContent = '';
      delete cell.dataset.value;
      cell.classList.remove('win-cell', 'disabled');
      cell.setAttribute('aria-label', `Cell ${index + 1}`);
    });

    if (resultBanner) {
      resultBanner.textContent = '';
      resultBanner.className = 'ttt-result-banner';
      resultBanner.style.display = 'none';
    }

    updateTurnUI();
    updateStatus();

    if (vsAI && currentPlayer === 'O') {
      scheduleAIMove(350);
    }
  }

  function handleCellClick(index) {
    if (!gameActive || awaitingAI) return;
    if (board[index] !== '' || cells[index].classList.contains('disabled')) return;
    if (vsAI && currentPlayer === 'O') return;

    makeMove(index, currentPlayer);
    const result = checkWinner(board);
    if (result) {
      endGame(result);
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateTurnUI();

    if (vsAI && currentPlayer === 'O') {
      scheduleAIMove();
    } else {
      updateStatus();
    }
  }

  function makeMove(index, player) {
    board[index] = player;
    const cell = cells[index];
    cell.textContent = player;
    cell.dataset.value = player;
    cell.setAttribute('aria-label', `Cell ${index + 1} ${player}`);
    Utils.playSound('move');
    Utils.vibrate([25]);
  }

  function scheduleAIMove(delay = 450) {
    awaitingAI = true;
    updateStatus('AI is thinking...', true);
    clearTimeout(aiTimerId);
    aiTimerId = setTimeout(() => {
      awaitingAI = false;
      makeAIMove();
    }, delay);
  }

  function makeAIMove() {
    if (!gameActive) return;

    const moveIndex =
      aiDifficulty === 'easy'
        ? randomMove()
        : aiDifficulty === 'medium'
          ? mediumMove()
          : bestMove();

    if (moveIndex === null || moveIndex === undefined) return;

    makeMove(moveIndex, 'O');
    const result = checkWinner(board);
    if (result) {
      endGame(result);
      return;
    }

    currentPlayer = 'X';
    updateTurnUI();
    updateStatus();
  }

  function randomMove() {
    const available = getAvailableMoves(board);
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function mediumMove() {
    return (
      findWinningMove(board, 'O') ??
      findWinningMove(board, 'X') ??
      strategicMove() ??
      randomMove()
    );
  }

  function strategicMove() {
    if (board[4] === '') return 4;

    const corners = [0, 2, 6, 8].filter(index => board[index] === '');
    if (corners.length) {
      return corners[Math.floor(Math.random() * corners.length)];
    }

    const sides = [1, 3, 5, 7].filter(index => board[index] === '');
    return sides[0] ?? null;
  }

  function findWinningMove(state, player) {
    for (const index of getAvailableMoves(state)) {
      const nextBoard = [...state];
      nextBoard[index] = player;
      const result = checkWinner(nextBoard);
      if (result?.winner === player) return index;
    }
    return null;
  }

  function bestMove() {
    let bestScore = -Infinity;
    let chosenMove = null;

    getAvailableMoves(board).forEach((index) => {
      board[index] = 'O';
      const score = minimax(board, 0, false, -Infinity, Infinity);
      board[index] = '';

      if (score > bestScore) {
        bestScore = score;
        chosenMove = index;
      }
    });

    return chosenMove;
  }

  function minimax(state, depth, maximizing, alpha, beta) {
    const result = checkWinner(state);
    if (result?.winner === 'O') return 10 - depth;
    if (result?.winner === 'X') return depth - 10;
    if (result?.winner === 'Draw') return 0;

    if (maximizing) {
      let bestScore = -Infinity;
      for (const index of getAvailableMoves(state)) {
        state[index] = 'O';
        bestScore = Math.max(bestScore, minimax(state, depth + 1, false, alpha, beta));
        state[index] = '';
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      }
      return bestScore;
    }

    let bestScore = Infinity;
    for (const index of getAvailableMoves(state)) {
      state[index] = 'X';
      bestScore = Math.min(bestScore, minimax(state, depth + 1, true, alpha, beta));
      state[index] = '';
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
    return bestScore;
  }

  function getAvailableMoves(state) {
    return state.map((value, index) => (value === '' ? index : null)).filter((value) => value !== null);
  }

  function checkWinner(state) {
    for (const combo of WIN_COMBOS) {
      const [a, b, c] = combo;
      if (state[a] && state[a] === state[b] && state[a] === state[c]) {
        return { winner: state[a], combo };
      }
    }

    if (state.every((cell) => cell !== '')) {
      return { winner: 'Draw', combo: null };
    }

    return null;
  }

  function endGame(result) {
    clearTimeout(aiTimerId);
    gameActive = false;
    awaitingAI = false;

    cells.forEach((cell) => cell.classList.add('disabled'));

    if (result.winner !== 'Draw' && result.combo) {
      result.combo.forEach((index) => cells[index].classList.add('win-cell'));
      Utils.playSound(result.winner === 'X' ? 'win' : vsAI ? 'fail' : 'win');
      Utils.createParticleBurst(cells[result.combo[1]]);
    } else {
      Utils.playSound('success');
    }

    scores[result.winner] = (scores[result.winner] || 0) + 1;
    updateScoreUI();
    saveScores();

    if (result.winner === 'X') {
      AppStorage.saveScore('tictactoe', AppStorage.getScores().tictactoe + 1);
    }
    AppStorage.incrementPlays();

    showResult(result.winner);
    startingPlayer = startingPlayer === 'X' ? 'O' : 'X';
    updateStatus(`Round complete. ${startingPlayer === 'X' ? 'X' : vsAI ? 'AI' : 'O'} starts next.`, false);
  }

  function showResult(winner) {
    if (!resultBanner) return;

    resultBanner.style.display = 'block';
    if (winner === 'Draw') {
      resultBanner.textContent = 'Draw game';
      resultBanner.className = 'ttt-result-banner draw';
      return;
    }

    if (winner === 'X') {
      resultBanner.textContent = vsAI ? 'You win!' : 'Player X wins!';
      resultBanner.className = 'ttt-result-banner x-wins';
      return;
    }

    resultBanner.textContent = vsAI ? 'AI wins!' : 'Player O wins!';
    resultBanner.className = 'ttt-result-banner o-wins';
  }

  function updateTurnUI() {
    if (!turnX || !turnO) return;

    turnX.textContent = 'X Turn';
    turnO.textContent = vsAI ? 'AI Turn' : 'O Turn';
    turnX.classList.toggle('active', currentPlayer === 'X');
    turnO.classList.toggle('active', currentPlayer === 'O');

    document.querySelector('.ttt-score-box.x-box')?.classList.toggle('active-turn', currentPlayer === 'X');
    document.querySelector('.ttt-score-box.o-box')?.classList.toggle('active-turn', currentPlayer === 'O');
  }

  function updateScoreUI() {
    if (scoreXEl) scoreXEl.textContent = scores.X || 0;
    if (scoreDrawEl) scoreDrawEl.textContent = scores.Draw || 0;
    if (scoreOEl) scoreOEl.textContent = scores.O || 0;
  }

  function updateStatus(message, thinking = false) {
    if (!statusEl) return;

    if (message) {
      statusEl.textContent = message;
      statusEl.classList.toggle('thinking', thinking);
      return;
    }

    if (!gameActive) {
      statusEl.classList.remove('thinking');
      return;
    }

    if (vsAI) {
      statusEl.textContent =
        currentPlayer === 'X'
          ? `${capitalize(aiDifficulty)} AI active. Your move.`
          : 'AI turn.';
      statusEl.classList.toggle('thinking', currentPlayer === 'O');
      return;
    }

    statusEl.textContent = `Player ${currentPlayer} to move.`;
    statusEl.classList.remove('thinking');
  }

  function getSessionKey() {
    return vsAI ? 'ttt_session_scores_ai' : 'ttt_session_scores_2p';
  }

  function loadScores() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(getSessionKey()));
      scores = saved || { X: 0, Draw: 0, O: 0 };
    } catch {
      scores = { X: 0, Draw: 0, O: 0 };
    }
    updateScoreUI();
  }

  function saveScores() {
    try {
      sessionStorage.setItem(getSessionKey(), JSON.stringify(scores));
    } catch {
      // Ignore storage failures.
    }
  }

  function bindButtons() {
    document.getElementById('btn-restart-ttt')?.addEventListener('click', resetGame);

    document.querySelectorAll('.mode-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((node) => node.classList.remove('active'));
        button.classList.add('active');
        vsAI = button.dataset.mode === 'ai';
        startingPlayer = 'X';

        document.getElementById('ai-difficulty').style.display = vsAI ? 'flex' : 'none';
        const oLabel = document.getElementById('o-player-label');
        if (oLabel) oLabel.textContent = vsAI ? 'AI' : 'Player O';

        loadScores();
        resetGame();
      });
    });

    document.querySelectorAll('#ai-difficulty .diff-btn').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('#ai-difficulty .diff-btn').forEach((node) => node.classList.remove('active'));
        button.classList.add('active');
        aiDifficulty = button.dataset.val;
        if (vsAI) resetGame();
        else updateStatus();
      });
    });
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', TicTacToe.init);
} else {
  TicTacToe.init();
}
