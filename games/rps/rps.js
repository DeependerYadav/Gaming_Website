/* =============================================
   rps.js — Rock Paper Scissors Game Engine
   Mini Games Hub — Premium Gaming UI

   Features:
   - Best-of-3 / Best-of-5 / Endless modes
   - Animated "shake" reveal for both hands
   - Smart-random AI (slight tendency tracking)
   - Round pip tracker for best-of modes
   - Win/loss/draw overlay
   - Best wins persistence via localStorage
   ============================================= */

(function () {
  'use strict';

  /* ── Constants ── */
  const CHOICES  = ['rock', 'paper', 'scissors'];
  const EMOJI    = { rock: '✊', paper: '✋', scissors: '✌️' };
  const BEATS    = { rock: 'scissors', paper: 'rock', scissors: 'paper' }; // key beats value
  const NAMES    = { rock: 'Rock', paper: 'Paper', scissors: 'Scissors' };

  /* ── State ── */
  let playerScore  = 0;
  let aiScore      = 0;
  let drawCount    = 0;
  let roundHistory = []; // 'player' | 'ai' | 'draw' per round
  let mode         = 'best5'; // 'best3' | 'best5' | 'endless'
  let targetWins   = 3;       // wins needed for best-of modes
  let locked       = false;   // prevent clicks during animation
  let bestWins     = 0;
  let audioCtx     = null;

  /* ── AI tendency (slight counter-bias for fun) ── */
  let playerHistory = [];

  /* ── DOM refs ── */
  const playerScoreEl = document.getElementById('rps-score-player');
  const aiScoreEl     = document.getElementById('rps-score-ai');
  const drawEl        = document.getElementById('rps-score-draw');
  const aiHandEl      = document.getElementById('rps-ai-hand');
  const playerHandEl  = document.getElementById('rps-player-hand');
  const aiNameEl      = document.getElementById('rps-ai-name');
  const playerNameEl  = document.getElementById('rps-player-name');
  const vsTextEl      = document.getElementById('rps-vs-text');
  const resultTextEl  = document.getElementById('rps-result-text');
  const choicesEl     = document.getElementById('rps-choices');
  const gameoverEl    = document.getElementById('rps-gameover');
  const goEmojiEl     = document.getElementById('rps-go-emoji');
  const goTitleEl     = document.getElementById('rps-go-title');
  const goScoreEl     = document.getElementById('rps-go-score');
  const pips          = [0,1,2,3,4].map(i => document.getElementById(`pip-${i}`));

  /* ── Init ── */
  function init() {
    loadBest();
    bindEvents();
    resetGame();
    updatePips();
  }

  function bindEvents() {
    document.querySelectorAll('.rps-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => playerPick(btn.dataset.choice));
    });

    document.querySelectorAll('.rps-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rps-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mode = btn.dataset.mode;
        targetWins = mode === 'best3' ? 2 : mode === 'best5' ? 3 : Infinity;
        resetGame();
      });
    });

    document.getElementById('btn-replay-rps').addEventListener('click', () => {
      gameoverEl.classList.add('hidden');
      resetGame();
    });

    document.getElementById('btn-reset-rps').addEventListener('click', () => {
      gameoverEl.classList.add('hidden');
      resetGame();
    });
  }

  /* ── Reset ── */
  function resetGame() {
    playerScore  = 0;
    aiScore      = 0;
    drawCount    = 0;
    roundHistory = [];
    playerHistory = [];
    locked       = false;

    updateScores();
    updatePips();
    setHandsToDefault();
    vsTextEl.textContent    = 'VS';
    resultTextEl.textContent = '';
    resultTextEl.className   = 'rps-result-text';
    playerNameEl.textContent = 'Pick a move!';
    aiNameEl.textContent     = 'Waiting...';

    setChoicesDisabled(false);
  }

  /* ── Player picks ── */
  function playerPick(choice) {
    if (locked) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    locked = true;

    /* highlight chosen button */
    document.querySelectorAll('.rps-choice-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.choice === choice);
    });
    setChoicesDisabled(true);

    playerHistory.push(choice);

    /* Show "thinking" phase */
    aiHandEl.textContent     = '🤔';
    playerHandEl.textContent = EMOJI[choice];
    playerHandEl.classList.add('shake');
    aiHandEl.classList.add('shake');
    playerNameEl.textContent = NAMES[choice];
    aiNameEl.textContent     = 'Thinking...';
    vsTextEl.textContent     = '...';

    setTimeout(() => {
      const aiChoice = aiPick();
      revealResult(choice, aiChoice);
    }, 700);
  }

  /* ── AI pick (with mild counter-tendency) ── */
  function aiPick() {
    if (playerHistory.length >= 3 && Math.random() < 0.35) {
      /* Count most common player choice in last 5 moves */
      const recent = playerHistory.slice(-5);
      const freq   = {};
      CHOICES.forEach(c => freq[c] = 0);
      recent.forEach(c => freq[c]++);
      const mostCommon = CHOICES.reduce((a, b) => freq[a] >= freq[b] ? a : b);
      /* Play the counter */
      return CHOICES.find(c => BEATS[c] === mostCommon) || randomChoice();
    }
    return randomChoice();
  }

  function randomChoice() {
    return CHOICES[Math.floor(Math.random() * 3)];
  }

  /* ── Reveal result ── */
  function revealResult(player, ai) {
    aiHandEl.textContent  = EMOJI[ai];
    aiNameEl.textContent  = NAMES[ai];
    aiHandEl.classList.remove('shake');
    playerHandEl.classList.remove('shake');

    let outcome; // 'player' | 'ai' | 'draw'

    if (player === ai) {
      outcome = 'draw';
      drawCount++;
      resultTextEl.textContent = '🤝 Draw!';
      resultTextEl.className   = 'rps-result-text draw';
      vsTextEl.textContent     = '=';
      playSound('draw');
    } else if (BEATS[player] === ai) {
      outcome = 'player';
      playerScore++;
      resultTextEl.textContent = '🎉 You Win!';
      resultTextEl.className   = 'rps-result-text win';
      vsTextEl.textContent     = '>';
      playSound('win');
    } else {
      outcome = 'ai';
      aiScore++;
      resultTextEl.textContent = '💀 AI Wins!';
      resultTextEl.className   = 'rps-result-text lose';
      vsTextEl.textContent     = '<';
      playSound('lose');
    }

    roundHistory.push(outcome);
    updateScores();
    updatePips();

    /* Check game end for best-of modes */
    if (mode !== 'endless') {
      if (playerScore >= targetWins || aiScore >= targetWins) {
        setTimeout(() => endGame(), 900);
        return;
      }
    }

    /* Re-enable choices */
    setTimeout(() => {
      locked = false;
      document.querySelectorAll('.rps-choice-btn').forEach(b => b.classList.remove('selected'));
      setChoicesDisabled(false);
      playerNameEl.textContent = 'Pick a move!';
    }, 900);
  }

  /* ── Game end (best-of modes) ── */
  function endGame() {
    const playerWon = playerScore > aiScore;
    const draw      = playerScore === aiScore;

    if (playerWon) {
      goEmojiEl.textContent = '🏆';
      goTitleEl.textContent = 'You Win the Match!';
      if (playerScore > bestWins) { bestWins = playerScore; saveBest(); }
    } else if (draw) {
      goEmojiEl.textContent = '🤝';
      goTitleEl.textContent = "It's a Draw!";
    } else {
      goEmojiEl.textContent = '💀';
      goTitleEl.textContent = 'AI Wins the Match!';
    }

    goScoreEl.textContent = `${playerScore} – ${aiScore}`;
    gameoverEl.classList.remove('hidden');
  }

  /* ── Pips ── */
  function updatePips() {
    if (mode === 'endless') {
      pips.forEach(p => p.style.display = 'none');
      return;
    }

    const total = mode === 'best3' ? 3 : 5;
    pips.forEach((p, i) => {
      p.style.display = i < total ? 'block' : 'none';
      p.className = 'rps-pip';
    });

    let pi = 0, ai = 0;
    roundHistory.forEach(o => {
      if (o === 'player' && pi < total) { pips[pi].classList.add('pip-player'); pi++; }
      else if (o === 'ai' && ai < total) { pips[total - 1 - ai].classList.add('pip-ai'); ai++; }
    });
  }

  /* ── Helpers ── */
  function updateScores() {
    playerScoreEl.textContent = playerScore;
    aiScoreEl.textContent     = aiScore;
    drawEl.textContent        = drawCount;
  }

  function setHandsToDefault() {
    playerHandEl.textContent = '❓';
    aiHandEl.textContent     = '❓';
    playerHandEl.classList.remove('shake');
    aiHandEl.classList.remove('shake');
  }

  function setChoicesDisabled(disabled) {
    document.querySelectorAll('.rps-choice-btn').forEach(b => {
      b.classList.toggle('disabled', disabled);
    });
  }

  /* ── Audio ── */
  function playSound(type) {
    if (!audioCtx) return;
    const configs = {
      win:  [{ f: 523.25, t: 0 }, { f: 659.25, t: 0.12 }, { f: 783.99, t: 0.24 }],
      lose: [{ f: 330, t: 0 }, { f: 220, t: 0.15 }],
      draw: [{ f: 440, t: 0 }, { f: 440, t: 0.18 }]
    };
    (configs[type] || []).forEach(({ f, t }) => {
      try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type === 'lose' ? 'sawtooth' : 'sine';
        osc.frequency.value = f;
        gain.gain.value = 0.1;
        const start = audioCtx.currentTime + t;
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.start(start);
        osc.stop(start + 0.25);
      } catch (_) {}
    });
  }

  /* ── Persistence ── */
  function saveBest() { localStorage.setItem('rps-best-wins', bestWins); }
  function loadBest() {
    const v = localStorage.getItem('rps-best-wins');
    bestWins = v ? parseInt(v, 10) : 0;
  }

  init();
})();
