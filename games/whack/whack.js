/* =============================================
   whack.js — Advanced Whack-a-Mole
   Features: bomb moles (-1pt), golden moles
   (+3pts), combo multiplier, score floats,
   progressive speed ramp, global design system
   ============================================= */
'use strict';

const WhackGame = (() => {
  // ── DOM ─────────────────────────────────────
  const grid     = document.getElementById('mole-grid');
  const scoreEl  = document.getElementById('score');
  const bestEl   = document.getElementById('best');
  const timerEl  = document.getElementById('timer');
  const comboEl  = document.getElementById('combo');
  const startBtn = document.getElementById('start-btn');
  const resultEl = document.getElementById('result');
  const timerCard = document.querySelector('.whack-timer-card');

  const HOLES    = 9;
  const GAME_TIME = 30;

  // ── State ────────────────────────────────────
  let score, best, timeLeft, running;
  let moleTimer, countdownTimer;
  let moleSpeed, activeHole, holeType;
  let combo, comboResetTimer;
  let speedRamp;

  best = parseInt(localStorage.getItem('whack-best') || '0');
  if (bestEl) bestEl.textContent = best;

  // ── Build 9 holes ────────────────────────────
  const holes = [];
  for (let i = 0; i < HOLES; i++) {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.innerHTML = `
      <span class="mole">🐹</span>
      <span class="mole-bomb">💣</span>
      <span class="mole-gold">⭐</span>
    `;
    hole.addEventListener('click',      () => whack(i));
    hole.addEventListener('touchstart', e => { e.preventDefault(); whack(i); }, { passive: false });
    grid.appendChild(hole);
    holes.push(hole);
  }

  // ── Whack handler ───────────────────────────
  function whack(i) {
    if (!running) return;
    if (i !== activeHole) return;

    const type = holeType;
    clearTimeout(moleTimer);

    if (type === 'bomb') {
      // Hit a bomb — lose combo and -2
      score = Math.max(0, score - 2);
      combo = 1;
      updateCombo();
      showFloat(holes[i], '-2', '#ff4757');
      holes[i].classList.add('bonk');
      addRipple(holes[i], 'rgba(255,71,87,0.4)');
    } else {
      // Normal or golden
      const pts = type === 'golden' ? 3 * combo : 1 * combo;
      score += pts;
      combo = Math.min(combo + 1, 8);
      clearTimeout(comboResetTimer);
      comboResetTimer = setTimeout(() => {
        combo = 1;
        updateCombo();
      }, 2500);
      updateCombo();
      showFloat(holes[i], `+${pts}`, type === 'golden' ? '#ffd166' : '#57e05b');
      holes[i].classList.add('bonk');
      addRipple(holes[i], type === 'golden' ? 'rgba(255,209,102,0.5)' : 'rgba(87,224,91,0.4)');
    }

    if (scoreEl) scoreEl.textContent = score;
    setTimeout(() => holes[i].classList.remove('bonk'), 300);
    hideMole();
  }

  function addRipple(hole, color) {
    const r = document.createElement('div');
    r.className = 'whack-ripple';
    r.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
    hole.appendChild(r);
    setTimeout(() => r.remove(), 450);
  }

  function showFloat(hole, text, color) {
    const f = document.createElement('div');
    f.className = 'score-float';
    f.style.color  = color;
    f.style.left   = '50%';
    f.style.top    = '10%';
    f.style.transform = 'translateX(-50%)';
    f.textContent  = text;
    hole.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function updateCombo() {
    if (!comboEl) return;
    comboEl.textContent = `x${combo}`;
    comboEl.classList.remove('combo-pop');
    void comboEl.offsetWidth;
    comboEl.classList.add('combo-pop');
  }

  // ── Mole spawning ───────────────────────────
  function showMole() {
    if (!running) return;

    let idx;
    do { idx = Math.floor(Math.random() * HOLES); } while (idx === activeHole);
    activeHole = idx;

    // 15% bomb, 10% golden, 75% normal
    const rng = Math.random();
    if (rng < 0.15) {
      holeType = 'bomb';
      holes[idx].classList.add('bomb-hole');
    } else if (rng < 0.25) {
      holeType = 'golden';
      holes[idx].classList.add('golden-hole');
    } else {
      holeType = 'normal';
      holes[idx].classList.add('active');
    }

    // Speed ramps up over game time
    const elapsed  = GAME_TIME - timeLeft;
    const curSpeed = Math.max(moleSpeed - elapsed * speedRamp, 300);

    moleTimer = setTimeout(() => {
      hideMole();
    }, curSpeed);
  }

  function hideMole() {
    if (activeHole !== null) {
      holes[activeHole].classList.remove('active', 'bomb-hole', 'golden-hole', 'bonk');
      activeHole = null;
      holeType   = null;
    }
    clearTimeout(moleTimer);
    if (running) {
      moleTimer = setTimeout(showMole, 200 + Math.random() * 250);
    }
  }

  // ── Game lifecycle ───────────────────────────
  function startGame() {
    score      = 0;
    timeLeft   = GAME_TIME;
    running    = true;
    activeHole = null;
    holeType   = null;
    combo      = 1;

    // Read difficulty
    const active = document.querySelector('.diff-btn.active');
    moleSpeed    = parseInt(active ? active.dataset.spd : '1200');
    speedRamp    = moleSpeed < 600 ? 8 : moleSpeed < 900 ? 6 : 4;

    if (scoreEl)  scoreEl.textContent = '0';
    if (timerEl)  timerEl.textContent = GAME_TIME;
    if (comboEl)  comboEl.textContent = 'x1';
    if (resultEl) resultEl.classList.add('hidden');
    if (timerCard) timerCard.classList.remove('urgent');
    if (startBtn) startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Restart';

    clearTimeout(moleTimer);
    clearInterval(countdownTimer);

    showMole();

    countdownTimer = setInterval(() => {
      timeLeft--;
      if (timerEl) timerEl.textContent = timeLeft;
      if (timeLeft <= 5 && timerCard) timerCard.classList.add('urgent');
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function endGame() {
    running = false;
    clearTimeout(moleTimer);
    clearInterval(countdownTimer);
    clearTimeout(comboResetTimer);
    hideMole();

    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      localStorage.setItem('whack-best', best);
      if (bestEl) bestEl.textContent = best;
    }

    if (resultEl) {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <h2>⏱ Time's Up!</h2>
        <p>You whacked <strong style="color:#f7c948;font-size:1.4rem">${score}</strong> moles!</p>
        ${isNewBest ? '<p class="result-best">🏆 New Best Score!</p>' : `<p style="color:var(--clr-text-muted)">Best: ${best}</p>`}
        <div style="margin-top:var(--space-4)">
          <button onclick="WhackGameStart()" class="btn-game btn-start" style="margin:0 auto">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      `;
    }
  }

  // ── Difficulty buttons ────────────────────────
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  startBtn?.addEventListener('click', startGame);

  // Expose restart for result button
  window.WhackGameStart = startGame;

  function init() {}
  return { init };
})();
