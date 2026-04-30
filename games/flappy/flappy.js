/* =============================================
   flappy.js — Advanced Flappy Bird
   Features: difficulty, day/night, stars,
   parallax layers, combo multiplier, medals,
   progressive speed, particle death effect
   ============================================= */
'use strict';

const FlappyGame = (() => {
  // ── Canvas ──────────────────────────────────
  const canvas = document.getElementById('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 380, H = 560;
  canvas.width = W; canvas.height = H;

  // ── Difficulty configs ───────────────────────
  const DIFFS = {
    easy:   { gravity: 0.38, flap: -8.5,  pipeSpd: 2.4, gap: 170, pipeInt: 100 },
    medium: { gravity: 0.45, flap: -9.0,  pipeSpd: 2.9, gap: 150, pipeInt: 90  },
    hard:   { gravity: 0.52, flap: -9.5,  pipeSpd: 3.5, gap: 128, pipeInt: 78  },
  };
  let diff = 'easy';
  let cfg  = DIFFS[diff];

  // ── State ────────────────────────────────────
  let bird, pipes, particles, stars, cloudLayers;
  let score, best, combo, comboTimer;
  let frame, raf, state; // idle | playing | dead
  let nightRatio; // 0=day, 1=night - cycles gradually
  let scoreFlash;

  // ── DOM ──────────────────────────────────────
  const startScreen   = document.getElementById('start-screen');
  const startBtn      = document.getElementById('start-btn');
  const scoreEl       = document.getElementById('current-score');
  const bestEl        = document.getElementById('best-score');
  const medalEl       = document.getElementById('medal-display');
  const comboEl       = document.getElementById('combo-display');
  const diffBtns      = document.querySelectorAll('.diff-btn');

  // ── Helpers ──────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  function getMedal(s) {
    if (s >= 100) return '💎';
    if (s >= 50)  return '🥇';
    if (s >= 25)  return '🥈';
    if (s >= 10)  return '🥉';
    return '—';
  }

  // ── Stars ────────────────────────────────────
  function createStars() {
    return Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.7,
      r: Math.random() * 1.4 + 0.4,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));
  }

  // ── Clouds ──────────────────────────────────
  function createClouds() {
    const layers = [];
    for (let i = 0; i < 3; i++) {
      layers.push(Array.from({ length: 4 }, (_, j) => ({
        x: j * (W * 0.4) + Math.random() * 60,
        y: 40 + Math.random() * 120,
        r: 22 + Math.random() * 18,
        spd: 0.2 + i * 0.15,
        alpha: 0.06 + i * 0.03,
      })));
    }
    return layers;
  }

  // ── Reset ────────────────────────────────────
  function resetGame() {
    cfg   = DIFFS[diff];
    bird  = { x: 80, y: H / 2, vy: 0, r: 16, angle: 0, flapTimer: 0 };
    pipes = [];
    particles = [];
    score = 0;
    combo = 1;
    comboTimer = 0;
    scoreFlash = 0;
    frame = 0;
    nightRatio = 0;
    state = 'playing';

    if (scoreEl) scoreEl.textContent = '0';
    if (comboEl) comboEl.textContent = 'x1';
    raf = requestAnimationFrame(loop);
  }

  // ── Flap ────────────────────────────────────
  function flap() {
    if (state === 'playing') {
      bird.vy = cfg.flap;
      bird.flapTimer = 8;
    } else if (state === 'dead') {
      cancelAnimationFrame(raf);
      resetGame();
    }
  }

  // ── Particles ───────────────────────────────
  function spawnParticles(x, y) {
    for (let i = 0; i < 22; i++) {
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.5;
      const spd   = 1.5 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        life: 1,
        decay: 0.025 + Math.random() * 0.03,
        r: 3 + Math.random() * 4,
        color: ['#f7c948','#ff8c00','#ff6b6b','#a8ff3e','#00d4ff'][Math.floor(Math.random() * 5)],
      });
    }
  }

  // ── Update ──────────────────────────────────
  function update() {
    frame++;

    // Night cycle (gradual 0→1→0 over 600 frames)
    nightRatio = (Math.sin(frame * Math.PI / 600) + 1) / 2;

    // Bird physics
    bird.vy    += cfg.gravity;
    bird.y     += bird.vy;
    bird.angle  = Math.min(Math.PI / 4, Math.max(-Math.PI / 3, bird.vy * 0.06));
    bird.flapTimer = Math.max(0, bird.flapTimer - 1);

    // Progressive speed boost every 10 points
    const speedBoost = Math.floor(score / 10) * 0.12;
    const curSpd = cfg.pipeSpd + speedBoost;

    // Combo timer decay
    comboTimer = Math.max(0, comboTimer - 1);
    if (comboTimer === 0 && combo > 1) {
      combo = 1;
      updateComboDisplay();
    }

    // Score flash decay
    scoreFlash = Math.max(0, scoreFlash - 1);

    // Spawn pipes
    if (frame % cfg.pipeInt === 0) {
      const gapShift = Math.floor(score / 15) * 5; // gap shrinks slightly at high scores
      const gap = Math.max(cfg.gap - gapShift, 100);
      const topH = 60 + Math.random() * (H - gap - 140);
      pipes.push({ x: W + 10, top: topH, gap, scored: false });
    }

    // Move pipes & score
    pipes.forEach(p => {
      p.x -= curSpd;
      if (!p.scored && p.x + 52 < bird.x) {
        score++;
        p.scored = true;

        // Combo
        comboTimer = 90;
        combo = Math.min(combo + 1, 8);
        updateComboDisplay();

        if (score > best) {
          best = score;
          localStorage.setItem('flappy-best-' + diff, best);
          if (bestEl) bestEl.textContent = best;
        }
        if (scoreEl) {
          scoreEl.textContent = score;
          scoreFlash = 12;
        }
        if (medalEl) medalEl.textContent = getMedal(score);
      }
    });
    pipes = pipes.filter(p => p.x + 52 > 0);

    // Clouds parallax
    cloudLayers.forEach(layer => {
      layer.forEach(c => {
        c.x -= c.spd;
        if (c.x + c.r * 2 < 0) c.x = W + c.r;
      });
    });

    // Stars twinkle
    stars.forEach(s => { s.twinkle += s.speed; });

    // Particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);

    // Collision
    if (bird.y - bird.r < 0 || bird.y + bird.r > H - 24) { die(); return; }
    for (const p of pipes) {
      if (bird.x + bird.r - 4 > p.x && bird.x - bird.r + 4 < p.x + 52) {
        if (bird.y - bird.r + 4 < p.top || bird.y + bird.r - 4 > p.top + p.gap) {
          die(); return;
        }
      }
    }
  }

  function updateComboDisplay() {
    if (!comboEl) return;
    comboEl.textContent = `x${combo}`;
    comboEl.classList.remove('combo-pop');
    void comboEl.offsetWidth;
    comboEl.classList.add('combo-pop');
  }

  function die() {
    state = 'dead';
    spawnParticles(bird.x, bird.y);
    cancelAnimationFrame(raf);
    // Keep animating particles then show overlay
    let dFrames = 0;
    function deathLoop() {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.life -= p.decay;
      });
      particles = particles.filter(p => p.life > 0);
      drawScene();
      dFrames++;
      if (dFrames < 60 && particles.length) requestAnimationFrame(deathLoop);
      else showGameOver();
    }
    requestAnimationFrame(deathLoop);
  }

  function showGameOver() {
    // Draw game-over text directly on canvas
    ctx.save();
    ctx.fillStyle = 'rgba(13,13,26,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    ctx.fillStyle = '#ff6b6b';
    ctx.font = "bold 36px 'Orbitron', sans-serif";
    ctx.shadowColor = 'rgba(255,107,107,0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 75);

    ctx.shadowBlur = 0;
    const medal = getMedal(score);
    ctx.font = "52px serif";
    ctx.fillText(medal, W / 2, H / 2 - 20);

    ctx.fillStyle = '#f0f0ff';
    ctx.font = "700 22px 'Outfit', sans-serif";
    ctx.fillText(`Score: ${score}`, W / 2, H / 2 + 30);

    ctx.fillStyle = '#a8ff3e';
    ctx.font = "600 17px 'Outfit', sans-serif";
    ctx.fillText(`Best: ${best}`, W / 2, H / 2 + 60);

    ctx.fillStyle = '#00d4ff';
    ctx.font = "bold 15px 'Outfit', sans-serif";
    ctx.fillText('Tap / Space to retry', W / 2, H / 2 + 100);
    ctx.restore();
  }

  // ── Draw ────────────────────────────────────
  function drawSky() {
    const dayTop = '#0d1b2a', dayBot = '#1a3a5c';
    const nightTop = '#050510', nightBot = '#0a0a28';
    const top = lerpColor(dayTop, nightTop, nightRatio);
    const bot = lerpColor(dayBot, nightBot, nightRatio);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
  }

  function lerpColor(a, b, t) {
    const parse = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const [ar,ag,ab] = parse(a);
    const [br,bg,bb] = parse(b);
    return `rgb(${Math.round(ar+t*(br-ar))},${Math.round(ag+t*(bg-ag))},${Math.round(ab+t*(bb-ab))})`;
  }

  function drawStars() {
    stars.forEach(s => {
      const twinkleAlpha = (Math.sin(s.twinkle) + 1) / 2;
      ctx.globalAlpha = twinkleAlpha * nightRatio * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawClouds() {
    cloudLayers.forEach(layer => {
      layer.forEach(c => {
        ctx.globalAlpha = c.alpha * (1 - nightRatio * 0.6);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.arc(c.x + c.r * 0.9, c.y - c.r * 0.3, c.r * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x - c.r * 0.7, c.y - c.r * 0.2, c.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
  }

  function drawPipes() {
    pipes.forEach(p => {
      const pipeColor1 = '#1a7a2a', pipeColor2 = '#57e05b';
      const grad = ctx.createLinearGradient(p.x, 0, p.x + 52, 0);
      grad.addColorStop(0, pipeColor1);
      grad.addColorStop(0.45, pipeColor2);
      grad.addColorStop(1, pipeColor1);
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(87,224,91,0.3)';
      ctx.shadowBlur = 10;

      // Top pipe
      ctx.beginPath();
      ctx.roundRect(p.x, 0, 52, p.top, [0,0,8,8]);
      ctx.fill();
      ctx.fillStyle = '#43c447';
      ctx.beginPath();
      ctx.roundRect(p.x - 5, p.top - 22, 62, 22, 6);
      ctx.fill();

      // Bottom pipe
      const btm = p.top + p.gap;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(p.x, btm, 52, H - btm, [8,8,0,0]);
      ctx.fill();
      ctx.fillStyle = '#43c447';
      ctx.beginPath();
      ctx.roundRect(p.x - 5, btm, 62, 22, 6);
      ctx.fill();

      ctx.shadowBlur = 0;
    });
  }

  function drawGround() {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, H - 24, W, 24);
    ctx.fillStyle = '#3a7a32';
    ctx.fillRect(0, H - 24, W, 6);
    // Ground detail stripes
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = (frame * 1.5) % 40 - 40; x < W; x += 40) {
      ctx.fillRect(x, H - 18, 20, 6);
    }
  }

  function drawBird() {
    const { x, y, angle, flapTimer } = bird;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Wing
    const wingAngle = flapTimer > 0 ? -0.6 : 0.3;
    ctx.save();
    ctx.translate(-4, 3);
    ctx.rotate(wingAngle);
    ctx.fillStyle = '#ff8c00';
    ctx.shadowColor = 'rgba(255,140,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.shadowColor = 'rgba(247,201,72,0.6)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
    ctx.fill();

    // Chest patch
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.ellipse(3, 4, 7, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye white
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(7, -5, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(8.5, -5, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(7.5, -6.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff6b00';
    ctx.beginPath();
    ctx.moveTo(bird.r - 1, 1);
    ctx.lineTo(bird.r + 11, -1);
    ctx.lineTo(bird.r + 11, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawScore() {
    ctx.save();
    ctx.textAlign = 'center';
    const s = score.toString();
    ctx.font = `900 32px 'Orbitron', sans-serif`;
    ctx.shadowColor = scoreFlash > 0 ? '#a8ff3e' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = scoreFlash > 0 ? 20 : 6;
    ctx.fillStyle = scoreFlash > 0 ? '#a8ff3e' : '#fff';
    ctx.fillText(s, W / 2, 52);
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawScene() {
    drawSky();
    drawStars();
    drawClouds();
    drawPipes();
    drawGround();
    if (state !== 'dead') drawBird();
    drawParticles();
    drawScore();
  }

  // ── Main loop ───────────────────────────────
  function loop() {
    if (state !== 'playing') return;
    update();
    drawScene();
    raf = requestAnimationFrame(loop);
  }

  // ── Input ────────────────────────────────────
  function handleInput() {
    if (state === 'idle') return;
    flap();
  }

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); handleInput(); }
  });
  canvas.addEventListener('click', handleInput);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); handleInput(); }, { passive: false });

  // ── Difficulty buttons ────────────────────────
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diff = btn.dataset.diff;
      cfg  = DIFFS[diff];
      diffBtns.forEach(b => b.classList.toggle('active', b === btn));
      best = parseInt(localStorage.getItem('flappy-best-' + diff) || '0');
      if (bestEl) bestEl.textContent = best;
    });
  });

  // ── Start button ─────────────────────────────
  startBtn?.addEventListener('click', () => {
    startScreen?.classList.add('hidden');
    best = parseInt(localStorage.getItem('flappy-best-' + diff) || '0');
    if (bestEl) bestEl.textContent = best;
    state = 'idle';
    stars = createStars();
    cloudLayers = createClouds();
    bird = { x: 80, y: H / 2, vy: 0, r: 16, angle: 0, flapTimer: 0 };
    pipes = []; particles = []; score = 0; frame = 0; nightRatio = 0; combo = 1;
    drawScene();
    resetGame();
  });

  // ── Initial idle draw ────────────────────────
  function initIdle() {
    state = 'idle';
    stars = createStars();
    cloudLayers = createClouds();
    bird = { x: 80, y: H / 2, vy: 0, r: 16, angle: 0, flapTimer: 0 };
    pipes = []; particles = []; score = 0; frame = 0; nightRatio = 0; combo = 1;
    drawScene();
  }

  return { init: initIdle };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', FlappyGame.init);
} else {
  FlappyGame.init();
}
