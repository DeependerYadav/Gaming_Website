/* =============================================
   pingpong.js — Advanced Ping Pong vs AI
   Features: rally counter, power hits, screen
   shake, particle trails, AI difficulty ramp,
   neon visuals, keyboard + touch + mouse
   ============================================= */
'use strict';

const PingPong = (() => {
  const canvas  = document.getElementById('canvas');
  const ctx     = canvas.getContext('2d');
  const W = 680, H = 420;
  canvas.width = W; canvas.height = H;

  // ── Config ──────────────────────────────────
  const WIN_SCORE = 7;
  const AI_CFG = {
    easy:   { spd: 2.6, predict: 0.55, mistake: 0.18 },
    medium: { spd: 4.2, predict: 0.75, mistake: 0.08 },
    hard:   { spd: 6.5, predict: 0.95, mistake: 0.02 },
  };
  let diff = 'easy';

  // ── State ───────────────────────────────────
  let player, ai, ball, pScore, aScore, rally;
  let running, paused, animId;
  let particles, screenShake, shakeFrames;
  let aiPredictY, aiErr;

  // ── DOM ─────────────────────────────────────
  const overlay      = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg   = document.getElementById('overlay-msg');
  const startBtn     = document.getElementById('start-btn');
  const pScoreEl     = document.getElementById('p-score');
  const aScoreEl     = document.getElementById('a-score');
  const rallyEl      = document.getElementById('rally-val');
  const diffBtns     = document.querySelectorAll('.diff-btn');

  // ── Helpers ─────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 1 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: 0.04 + Math.random() * 0.04,
        r: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function triggerShake(intensity = 6, frames = 8) {
    screenShake = intensity;
    shakeFrames = frames;
  }

  // ── Reset ball ──────────────────────────────
  function resetBall(dir = 1) {
    const angle = (Math.random() * 40 - 20) * Math.PI / 180;
    const spd = 5.5;
    ball = {
      x: W / 2, y: H / 2, r: 9,
      vx: spd * dir * Math.cos(angle),
      vy: spd * Math.sin(angle),
      trail: [],
    };
    rally = 0;
    if (rallyEl) rallyEl.textContent = '0';
  }

  // ── Init ────────────────────────────────────
  function startGame() {
    const PW = 13, PH = 90;
    player = { x: 20,         y: H/2 - PH/2, w: PW, h: PH };
    ai     = { x: W - 20 - PW, y: H/2 - PH/2, w: PW, h: PH };
    pScore = 0; aScore = 0; rally = 0;
    particles = []; screenShake = 0; shakeFrames = 0;

    const cfg = AI_CFG[diff];
    aiErr = (Math.random() - 0.5) * cfg.mistake * H;
    aiPredictY = H / 2;

    resetBall(1);
    running = true; paused = false;
    overlay.classList.add('hidden');
    if (pScoreEl) pScoreEl.textContent = '0';
    if (aScoreEl) aScoreEl.textContent = '0';
    if (rallyEl) rallyEl.textContent = '0';

    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  // ── AI ──────────────────────────────────────
  function updateAI() {
    const cfg = AI_CFG[diff];
    // Predict where ball will be when it reaches AI's side
    if (ball.vx > 0) {
      const timeToAI = (ai.x - ball.x) / ball.vx;
      let predY = ball.y + ball.vy * timeToAI * cfg.predict;
      // Bounce prediction (simple)
      while (predY < 0 || predY > H) {
        if (predY < 0) predY = -predY;
        if (predY > H) predY = 2 * H - predY;
      }
      aiPredictY = predY + aiErr;
    }

    const center = ai.y + ai.h / 2;
    const diff_  = aiPredictY - center;
    const move   = clamp(diff_, -cfg.spd, cfg.spd);
    ai.y = clamp(ai.y + move, 0, H - ai.h);
  }

  // ── Ball physics ────────────────────────────
  function updateBall() {
    // Trail
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();

    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall bounce
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
    if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy *= -1; }

    // Paddle helper
    function paddleHit(paddle, dir) {
      const rel   = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
      const angle = rel * 65 * Math.PI / 180;
      const curSpd = Math.hypot(ball.vx, ball.vy);
      const newSpd = Math.min(curSpd * 1.06, 16);
      ball.vx = dir * newSpd * Math.cos(angle);
      ball.vy = newSpd * Math.sin(angle);
      rally++;
      if (rallyEl) rallyEl.textContent = rally;
      // Hot rally glow when things get intense
      const rallyCard = document.getElementById('rally-card');
      if (rallyCard) rallyCard.classList.toggle('hot', rally >= 5);

      // Re-randomise AI error
      const cfg = AI_CFG[diff];
      aiErr = (Math.random() - 0.5) * cfg.mistake * H;

      const color = dir > 0 ? '#00d4ff' : '#ff6b6b';
      spawnParticles(ball.x, ball.y, color);
      triggerShake(rally > 5 ? 5 : 2, 5);
    }

    // Player paddle
    if (ball.vx < 0 &&
        ball.x - ball.r < player.x + player.w &&
        ball.x + ball.r > player.x &&
        ball.y > player.y - 2 && ball.y < player.y + player.h + 2) {
      ball.x = player.x + player.w + ball.r;
      paddleHit(player, 1);
    }

    // AI paddle
    if (ball.vx > 0 &&
        ball.x + ball.r > ai.x &&
        ball.x - ball.r < ai.x + ai.w &&
        ball.y > ai.y - 2 && ball.y < ai.y + ai.h + 2) {
      ball.x = ai.x - ball.r;
      paddleHit(ai, -1);
    }

    // Score
    if (ball.x - ball.r < 0) {
      aScore++;
      if (aScoreEl) aScoreEl.textContent = aScore;
      triggerShake(10, 12);
      checkWin(-1);
      if (running) resetBall(1);
    }
    if (ball.x + ball.r > W) {
      pScore++;
      if (pScoreEl) pScoreEl.textContent = pScore;
      triggerShake(10, 12);
      checkWin(1);
      if (running) resetBall(-1);
    }
  }

  function checkWin(scorer) {
    if (pScore >= WIN_SCORE || aScore >= WIN_SCORE) {
      running = false;
      cancelAnimationFrame(animId);
      const won = pScore >= WIN_SCORE;
      setTimeout(() => {
        overlayTitle.textContent = won ? '🎉 You Win!' : '🤖 AI Wins!';
        overlayMsg.innerHTML = `Final Score: <strong>${pScore} – ${aScore}</strong>`;
        startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Play Again';
        overlay.classList.remove('hidden');
      }, 400);
    }
  }

  // ── Draw ────────────────────────────────────
  function draw() {
    // Screen shake
    ctx.save();
    if (shakeFrames > 0) {
      const sx = (Math.random() - 0.5) * screenShake;
      const sy = (Math.random() - 0.5) * screenShake;
      ctx.translate(sx, sy);
      shakeFrames--;
      if (shakeFrames <= 0) screenShake = 0;
    }

    // Background
    ctx.fillStyle = '#050c18';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // Arena lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.stroke();
    ctx.restore();

    // Center dashes
    ctx.save();
    ctx.setLineDash([12, 12]);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Score display on canvas
    ctx.save();
    ctx.font = `900 64px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillText(pScore, W/4, 80);
    ctx.fillText(aScore, 3*W/4, 80);
    ctx.restore();

    // Player label
    ctx.save();
    ctx.font = `600 12px 'Outfit', sans-serif`;
    ctx.fillStyle = 'rgba(0,212,255,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', player.x + player.w + 10, 22);
    ctx.fillStyle = 'rgba(255,107,107,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('AI', ai.x - 10, 22);
    ctx.restore();

    // Ball trail
    ball.trail.forEach((t, i) => {
      const alpha = (i / ball.trail.length) * 0.35;
      const r     = ball.r * (i / ball.trail.length) * 0.7;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Paddles
    function drawPaddle(p, color, glow) {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 22;
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(255,255,255,0.6)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 7);
      ctx.fill();
      ctx.restore();
    }
    drawPaddle(player, '#00d4ff', 'rgba(0,212,255,0.7)');
    drawPaddle(ai,     '#ff6b6b', 'rgba(255,107,107,0.7)');

    // Ball
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 20;
    const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(1, '#b0e0ff');
    ctx.fillStyle = ballGrad;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);

    ctx.restore(); // end shake
  }

  // ── Input ────────────────────────────────────
  function setPlayerY(clientY) {
    const rect  = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    const my    = (clientY - rect.top) * scaleY;
    player.y    = clamp(my - player.h / 2, 0, H - player.h);
  }

  canvas.addEventListener('mousemove', e => { if (running) setPlayerY(e.clientY); });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (running) setPlayerY(e.touches[0].clientY);
  }, { passive: false });

  // Keyboard
  const keys = {};
  document.addEventListener('keydown', e => { keys[e.key] = true; });
  document.addEventListener('keyup',   e => { keys[e.key] = false; });

  function applyKeys() {
    if (!running || !player) return;
    const spd = 7;
    if (keys['w'] || keys['W'] || keys['ArrowUp'])   player.y = clamp(player.y - spd, 0, H - player.h);
    if (keys['s'] || keys['S'] || keys['ArrowDown']) player.y = clamp(player.y + spd, 0, H - player.h);
  }

  // Mobile touch buttons
  const pingUp   = document.getElementById('ping-up');
  const pingDown = document.getElementById('ping-down');
  let upInterval, downInterval;

  function holdUp()   { if (running && player) player.y = clamp(player.y - 7, 0, H - player.h); }
  function holdDown() { if (running && player) player.y = clamp(player.y + 7, 0, H - player.h); }

  pingUp?.addEventListener('touchstart',   e => { e.preventDefault(); upInterval   = setInterval(holdUp,   30); }, { passive: false });
  pingUp?.addEventListener('touchend',     () => clearInterval(upInterval));
  pingDown?.addEventListener('touchstart', e => { e.preventDefault(); downInterval = setInterval(holdDown, 30); }, { passive: false });
  pingDown?.addEventListener('touchend',   () => clearInterval(downInterval));

  // Single unified loop (with keyboard support)
  function loop() {
    if (!running) return;
    applyKeys();
    if (!paused) {
      updateAI();
      updateBall();
      draw();
    }
    animId = requestAnimationFrame(loop);
  }

  // Difficulty
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diff = btn.dataset.diff;
      diffBtns.forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  startBtn?.addEventListener('click', startGame);

  function init() {}
  return { init };
})();
