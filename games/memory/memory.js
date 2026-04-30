/* =============================================
   memory.js - Memory Match Game Logic
   Mini Games Hub
   ============================================= */

const MemoryGame = (() => {
  const CARD_SETS = {
    easy: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
    medium: ['🌵', '🌴', '🍀', '🌸', '🌺', '🌻', '🍄', '🌊', '🌙', '⭐'],
    hard: ['🎸', '🎹', '🎻', '🎺', '🎷', '🥁', '🎤', '🎧', '🎮', '🕹️', '🎲', '🃏'],
  };

  const PREVIEW_DURATION = {
    easy: 1100,
    medium: 1500,
    hard: 1900,
  };

  let cards = [];
  let flippedCards = [];
  let matchedPairs = 0;
  let totalPairs = 0;
  let moves = 0;
  let startTime = null;
  let timerInterval = null;
  let previewTimeout = null;
  let elapsedSecs = 0;
  let canFlip = false;
  let difficulty = 'medium';
  let gameActive = false;

  let boardEl;
  let movesEl;
  let timerEl;
  let pairsEl;
  let bestTimeEl;
  let winRatingEl;

  function init() {
    boardEl = document.getElementById('memory-board');
    movesEl = document.getElementById('memory-moves');
    timerEl = document.getElementById('memory-timer');
    pairsEl = document.getElementById('memory-pairs');
    bestTimeEl = document.getElementById('memory-best-time');
    winRatingEl = document.getElementById('win-rating');

    if (!boardEl) return;

    const settings = AppStorage.getSettings();
    difficulty = ['easy', 'medium', 'hard'].includes(settings.difficulty) ? settings.difficulty : 'medium';

    updateBestTime();
    bindButtons();
    updateDifficultyUI();
    buildBoard();
  }

  function buildBoard() {
    clearTimeout(previewTimeout);
    stopTimer();

    boardEl.innerHTML = '';
    boardEl.className = 'memory-board';
    if (difficulty !== 'easy') boardEl.classList.add(difficulty);

    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    totalPairs = 0;
    moves = 0;
    elapsedSecs = 0;
    startTime = null;
    canFlip = false;
    gameActive = false;

    hideWinOverlay();
    if (timerEl) timerEl.textContent = '00:00';
    updateStats();

    const emojis = CARD_SETS[difficulty] || CARD_SETS.medium;
    totalPairs = emojis.length;
    const pairs = [...emojis, ...emojis];
    Utils.shuffleArray(pairs);

    pairs.forEach((emoji, index) => {
      const card = {
        id: index,
        emoji,
        matched: false,
        flipped: false,
        el: null,
      };

      const el = document.createElement('div');
      el.className = 'memory-card';
      el.dataset.id = index;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `Card ${index + 1}`);
      el.innerHTML = `
        <div class="card-face card-back"></div>
        <div class="card-face card-front">${emoji}</div>
      `;

      el.addEventListener('click', () => flipCard(card));
      el.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          flipCard(card);
        }
      });

      card.el = el;
      cards.push(card);
      boardEl.appendChild(el);
    });

    updateStats();
    startPreview();
  }

  function startPreview() {
    boardEl.classList.add('previewing');
    cards.forEach((card) => {
      card.flipped = true;
      card.el.classList.add('flipped');
    });

    previewTimeout = setTimeout(() => {
      boardEl.classList.remove('previewing');
      cards.forEach((card) => {
        if (!card.matched) {
          card.flipped = false;
          card.el.classList.remove('flipped');
        }
      });
      canFlip = true;
    }, PREVIEW_DURATION[difficulty] || PREVIEW_DURATION.medium);
  }

  function flipCard(card) {
    if (!canFlip || card.flipped || card.matched) return;

    if (!gameActive) {
      gameActive = true;
      startTimer();
    }

    card.flipped = true;
    card.el.classList.add('flipped');
    flippedCards.push(card);
    Utils.playSound('flip');

    if (flippedCards.length === 2) {
      canFlip = false;
      moves += 1;
      updateStats();
      checkMatch();
    }
  }

  function checkMatch() {
    const [first, second] = flippedCards;
    if (!first || !second) {
      canFlip = true;
      return;
    }

    if (first.emoji === second.emoji) {
      setTimeout(() => {
        first.matched = true;
        second.matched = true;
        first.el.classList.add('matched');
        second.el.classList.add('matched');
        flippedCards = [];
        matchedPairs += 1;
        canFlip = true;
        updateStats();
        Utils.playSound('match');
        Utils.createParticleBurst(first.el);

        if (matchedPairs === totalPairs) {
          onVictory();
        }
      }, 320);
      return;
    }

    setTimeout(() => {
      first.flipped = false;
      second.flipped = false;
      first.el.classList.remove('flipped');
      second.el.classList.remove('flipped');
      first.el.classList.add('shake');
      second.el.classList.add('shake');
      setTimeout(() => {
        first.el.classList.remove('shake');
        second.el.classList.remove('shake');
      }, 320);
      flippedCards = [];
      canFlip = true;
      Utils.playSound('fail');
    }, 850);
  }

  function onVictory() {
    clearTimeout(previewTimeout);
    stopTimer();
    gameActive = false;

    boardEl.classList.add('all-matched');
    setTimeout(() => boardEl.classList.remove('all-matched'), 600);

    const isNewBest = AppStorage.saveScore('memory', elapsedSecs);
    AppStorage.incrementPlays();
    Utils.playSound('win');

    document.getElementById('win-time').textContent = Utils.formatTime(elapsedSecs);
    document.getElementById('win-moves').textContent = moves;
    if (winRatingEl) winRatingEl.textContent = calculateRating();
    document.getElementById('win-best-label').style.display = isNewBest ? 'block' : 'none';
    document.getElementById('memory-win-overlay')?.classList.remove('hidden');

    updateBestTime();
  }

  function calculateRating() {
    const efficientMoves = totalPairs * 2;

    if (moves <= efficientMoves) return 'Perfect memory';
    if (moves <= efficientMoves + Math.ceil(totalPairs / 2)) return 'Sharp recall';
    if (moves <= efficientMoves + totalPairs) return 'Steady pattern read';
    return 'Persistence unlocked';
  }

  function startTimer() {
    startTime = Date.now() - elapsedSecs * 1000;
    timerInterval = setInterval(() => {
      elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
      if (timerEl) timerEl.textContent = Utils.formatTime(elapsedSecs);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateStats() {
    if (movesEl) movesEl.textContent = moves;
    if (pairsEl) pairsEl.innerHTML = `${matchedPairs} / <strong>${totalPairs}</strong>`;
  }

  function updateBestTime() {
    const scores = AppStorage.getScores();
    if (bestTimeEl) {
      bestTimeEl.textContent = scores.memory ? Utils.formatTime(scores.memory) : '--:--';
    }
  }

  function setDifficulty(nextDifficulty) {
    difficulty = nextDifficulty;
    AppStorage.setSetting('difficulty', nextDifficulty);
    updateDifficultyUI();
    buildBoard();
  }

  function updateDifficultyUI() {
    document.querySelectorAll('#memory-difficulty .diff-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.val === difficulty);
    });
  }

  function hideWinOverlay() {
    const overlay = document.getElementById('memory-win-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function bindButtons() {
    document.querySelectorAll('.btn-restart-memory').forEach((button) => {
      button.addEventListener('click', () => buildBoard());
    });

    document.querySelectorAll('#memory-difficulty .diff-btn').forEach((button) => {
      button.addEventListener('click', () => setDifficulty(button.dataset.val));
    });
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', MemoryGame.init);
} else {
  MemoryGame.init();
}
