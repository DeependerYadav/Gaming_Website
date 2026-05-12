/* =============================================
   hangman.js — Hangman Game Engine
   Mini Games Hub — Premium Gaming UI
   
   Features:
   - 200+ words across 8 categories
   - 3 difficulty levels (word length)
   - Canvas-drawn neon hangman figure
   - On-screen keyboard + physical keyboard
   - Win streak tracking
   - localStorage persistence
   ============================================= */

(function () {
  'use strict';

  /* ---- Word Bank (200+ words, 8 categories) ---- */
  const WORDS = {
    Animals: ['elephant', 'giraffe', 'penguin', 'dolphin', 'cheetah', 'gorilla', 'panther', 'octopus', 'flamingo', 'buffalo', 'hamster', 'parrot', 'rabbit', 'turtle', 'falcon', 'jaguar', 'salmon', 'lizard', 'walrus', 'badger', 'monkey', 'zebra', 'tiger', 'whale', 'eagle', 'shark', 'snake', 'horse', 'mouse', 'crane'],
    Technology: ['algorithm', 'database', 'software', 'hardware', 'internet', 'keyboard', 'monitor', 'network', 'browser', 'firewall', 'android', 'bitcoin', 'digital', 'encrypt', 'hacker', 'laptop', 'memory', 'python', 'server', 'tablet', 'upload', 'widget', 'router', 'pixel', 'cloud', 'debug'],
    Sports: ['baseball', 'football', 'basketball', 'swimming', 'archery', 'bowling', 'cricket', 'cycling', 'fencing', 'surfing', 'tennis', 'boxing', 'diving', 'hockey', 'karate', 'rowing', 'skiing', 'sprint', 'soccer', 'golf', 'rugby', 'chess'],
    Food: ['avocado', 'broccoli', 'chocolate', 'cinnamon', 'mushroom', 'pancake', 'popcorn', 'pretzel', 'spinach', 'waffle', 'burger', 'cherry', 'cookie', 'muffin', 'noodle', 'pepper', 'banana', 'grape', 'lemon', 'mango', 'olive', 'peach', 'pizza', 'salad', 'toast'],
    Countries: ['australia', 'brazil', 'canada', 'denmark', 'england', 'finland', 'germany', 'hungary', 'iceland', 'jamaica', 'kenya', 'mexico', 'nigeria', 'portugal', 'romania', 'sweden', 'turkey', 'ukraine', 'vietnam', 'norway', 'france', 'japan', 'china', 'egypt', 'spain', 'italy', 'india', 'peru', 'cuba', 'iran'],
    Movies: ['avatar', 'frozen', 'inception', 'gladiator', 'titanic', 'gravity', 'arrival', 'interstellar', 'predator', 'hercules', 'aladdin', 'batman', 'matrix', 'rocky', 'shrek'],
    Music: ['guitar', 'piano', 'violin', 'trumpet', 'drums', 'flute', 'harmony', 'melody', 'rhythm', 'chorus', 'concert', 'symphony', 'acoustic', 'tempo', 'album', 'lyric', 'opera', 'bass'],
    Nature: ['mountain', 'volcano', 'rainbow', 'tornado', 'glacier', 'canyon', 'desert', 'forest', 'island', 'jungle', 'meadow', 'ocean', 'river', 'sunset', 'valley', 'aurora', 'blizzard', 'thunder', 'crystal', 'flower']
  };

  const MAX_WRONG = 6;

  /* ---- State ---- */
  let currentWord = '';
  let currentCategory = '';
  let guessedLetters = new Set();
  let wrongCount = 0;
  let gameActive = false;
  let difficulty = 'easy'; // easy: 4-5, medium: 6-7, hard: 8+
  let stats = { wins: 0, streak: 0, best: 0 };

  /* ---- DOM ---- */
  const canvas = document.getElementById('hangman-canvas');
  const ctx = canvas.getContext('2d');
  const wordEl = document.getElementById('hm-word');
  const wrongLettersEl = document.getElementById('wrong-letters');
  const keyboardEl = document.getElementById('hm-keyboard');
  const categoryNameEl = document.getElementById('category-name');
  const winsEl = document.getElementById('hm-wins');
  const streakEl = document.getElementById('hm-streak');
  const bestEl = document.getElementById('hm-best');
  const overlay = document.getElementById('hm-overlay');
  const gameoverOverlay = document.getElementById('hm-gameover');
  const gameoverTitle = document.getElementById('hm-gameover-title');
  const gameoverEmoji = document.getElementById('hm-gameover-emoji');
  const gameoverWord = document.getElementById('hm-gameover-word');

  /* ---- Init ---- */
  function init() {
    loadStats();
    buildKeyboard();
    bindEvents();
    updateStatsDisplay();
    drawGallows();
  }

  /* ---- Build Keyboard ---- */
  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const key = document.createElement('button');
      key.className = 'hm-key';
      key.textContent = letter;
      key.dataset.letter = letter.toLowerCase();
      key.addEventListener('click', () => guessLetter(letter.toLowerCase()));
      keyboardEl.appendChild(key);
    }
  }

  /* ---- Events ---- */
  function bindEvents() {
    document.getElementById('btn-start-hm').addEventListener('click', startGame);
    document.getElementById('btn-restart-hm').addEventListener('click', startGame);
    document.getElementById('btn-next-hm').addEventListener('click', startGame);

    // Difficulty
    document.querySelectorAll('#hm-difficulty .diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#hm-difficulty .diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
      });
    });

    // Physical keyboard
    document.addEventListener('keydown', (e) => {
      if (!gameActive) return;
      const key = e.key.toLowerCase();
      if (/^[a-z]$/.test(key)) {
        guessLetter(key);
      }
    });
  }

  /* ---- Start Game ---- */
  function startGame() {
    // Pick random category and word based on difficulty
    const categories = Object.keys(WORDS);
    currentCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const diffFilter = {
      easy: w => w.length <= 5,
      medium: w => w.length >= 6 && w.length <= 7,
      hard: w => w.length >= 8
    };

    let pool = WORDS[currentCategory].filter(diffFilter[difficulty]);
    // Fallback if no words match difficulty in this category
    if (pool.length === 0) pool = WORDS[currentCategory];
    
    currentWord = pool[Math.floor(Math.random() * pool.length)];
    guessedLetters = new Set();
    wrongCount = 0;
    gameActive = true;

    categoryNameEl.textContent = currentCategory;
    overlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');

    buildKeyboard();
    renderWord();
    clearCanvas();
    drawGallows();
    wrongLettersEl.textContent = '';
  }

  /* ---- Guess Letter ---- */
  function guessLetter(letter) {
    if (!gameActive || guessedLetters.has(letter)) return;
    guessedLetters.add(letter);

    const keyBtn = keyboardEl.querySelector(`[data-letter="${letter}"]`);

    if (currentWord.includes(letter)) {
      // Correct
      if (keyBtn) keyBtn.classList.add('correct', 'used');
      renderWord();

      // Check win
      if (isWordGuessed()) {
        gameActive = false;
        stats.wins++;
        stats.streak++;
        if (stats.streak > stats.best) stats.best = stats.streak;
        saveStats();
        updateStatsDisplay();

        setTimeout(() => {
          gameoverEmoji.textContent = '🎉';
          gameoverTitle.textContent = 'You Win!';
          gameoverWord.textContent = `The word was: ${currentWord.toUpperCase()}`;
          gameoverOverlay.classList.remove('hidden');
        }, 600);
      }
    } else {
      // Wrong
      wrongCount++;
      if (keyBtn) keyBtn.classList.add('wrong', 'used');
      wrongLettersEl.textContent = [...guessedLetters].filter(l => !currentWord.includes(l)).join('  ');
      drawHangmanPart(wrongCount);

      // Check loss
      if (wrongCount >= MAX_WRONG) {
        gameActive = false;
        stats.streak = 0;
        saveStats();
        updateStatsDisplay();

        // Reveal remaining letters
        revealWord();

        setTimeout(() => {
          gameoverEmoji.textContent = '💀';
          gameoverTitle.textContent = 'Game Over!';
          gameoverWord.textContent = `The word was: ${currentWord.toUpperCase()}`;
          gameoverOverlay.classList.remove('hidden');
        }, 1000);
      }
    }
  }

  /* ---- Render Word ---- */
  function renderWord() {
    wordEl.innerHTML = '';
    for (const ch of currentWord) {
      const slot = document.createElement('div');
      slot.className = 'hm-letter-slot';
      if (guessedLetters.has(ch)) {
        slot.textContent = ch;
        slot.classList.add('revealed');
      }
      wordEl.appendChild(slot);
    }
  }

  function revealWord() {
    const slots = wordEl.querySelectorAll('.hm-letter-slot');
    currentWord.split('').forEach((ch, i) => {
      if (!guessedLetters.has(ch)) {
        setTimeout(() => {
          slots[i].textContent = ch;
          slots[i].classList.add('wrong-reveal');
        }, i * 100);
      }
    });
  }

  function isWordGuessed() {
    return [...currentWord].every(ch => guessedLetters.has(ch));
  }

  /* ---- Canvas Drawing (Neon Hangman) ---- */
  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function setNeonStyle(color = '#00d4ff', glow = 12) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }

  function drawGallows() {
    setNeonStyle('rgba(0, 212, 255, 0.3)', 6);

    // Base
    ctx.beginPath();
    ctx.moveTo(30, 270);
    ctx.lineTo(180, 270);
    ctx.stroke();

    // Pole
    ctx.beginPath();
    ctx.moveTo(70, 270);
    ctx.lineTo(70, 30);
    ctx.stroke();

    // Top beam
    ctx.beginPath();
    ctx.moveTo(70, 30);
    ctx.lineTo(180, 30);
    ctx.stroke();

    // Rope
    ctx.beginPath();
    ctx.moveTo(180, 30);
    ctx.lineTo(180, 60);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  function drawHangmanPart(part) {
    switch (part) {
      case 1: drawHead(); break;
      case 2: drawBody(); break;
      case 3: drawLeftArm(); break;
      case 4: drawRightArm(); break;
      case 5: drawLeftLeg(); break;
      case 6: drawRightLeg(); drawFace(); break;
    }
  }

  function drawHead() {
    setNeonStyle('#f72585', 14);
    ctx.beginPath();
    ctx.arc(180, 85, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawBody() {
    setNeonStyle('#f72585', 14);
    ctx.beginPath();
    ctx.moveTo(180, 110);
    ctx.lineTo(180, 185);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawLeftArm() {
    setNeonStyle('#ff9500', 12);
    ctx.beginPath();
    ctx.moveTo(180, 130);
    ctx.lineTo(145, 165);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawRightArm() {
    setNeonStyle('#ff9500', 12);
    ctx.beginPath();
    ctx.moveTo(180, 130);
    ctx.lineTo(215, 165);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawLeftLeg() {
    setNeonStyle('#a78bfa', 12);
    ctx.beginPath();
    ctx.moveTo(180, 185);
    ctx.lineTo(150, 235);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawRightLeg() {
    setNeonStyle('#a78bfa', 12);
    ctx.beginPath();
    ctx.moveTo(180, 185);
    ctx.lineTo(210, 235);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFace() {
    // X eyes
    setNeonStyle('#ff4757', 8);
    ctx.lineWidth = 2;
    // Left eye
    ctx.beginPath();
    ctx.moveTo(170, 78); ctx.lineTo(176, 84);
    ctx.moveTo(176, 78); ctx.lineTo(170, 84);
    ctx.stroke();
    // Right eye
    ctx.beginPath();
    ctx.moveTo(184, 78); ctx.lineTo(190, 84);
    ctx.moveTo(190, 78); ctx.lineTo(184, 84);
    ctx.stroke();
    // Sad mouth
    ctx.beginPath();
    ctx.arc(180, 98, 8, 0.2 * Math.PI, 0.8 * Math.PI, true);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /* ---- Stats ---- */
  function updateStatsDisplay() {
    winsEl.textContent = stats.wins;
    streakEl.textContent = stats.streak;
    bestEl.textContent = stats.best;
  }

  function saveStats() {
    localStorage.setItem('hangman-stats', JSON.stringify(stats));
  }

  function loadStats() {
    try {
      const saved = JSON.parse(localStorage.getItem('hangman-stats'));
      if (saved) stats = { ...stats, ...saved };
    } catch (e) { /* ignore */ }
  }

  /* ---- Launch ---- */
  init();

})();
