/* =============================================
   breakout.js — Breakout Game Logic
   Mini Games Hub — Premium Upgrade
   Features: particle effects, screen shake,
   power-ups, progressive difficulty,
   trail effects, proper game flow
   ============================================= */
'use strict';

// roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}


const BreakoutGame = (() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = 640, H = 480;
  canvas.width = W;
  canvas.height = H;

  const BRICK_ROWS = 6;
  const BRICK_COLS = 10;
  const BRICK_W = 56;
  const BRICK_H = 18;
  const BRICK_PAD = 4;
  const BRICK_TOP = 50;
  const BRICK_LEFT = (W - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;

  const PADDLE_W = 90;
  const PADDLE_H = 14;
  const BALL_R = 7;

  const BRICK_COLORS = [
    { fill: '#ff4757', glow: 'rgba(255,71,87,0.6)' },
    { fill: '#ff6b35', glow: 'rgba(255,107,53,0.6)' },
    { fill: '#f7c948', glow: 'rgba(247,201,72,0.6)' },
    { fill: '#00f5a0', glow: 'rgba(0,245,160,0.6)' },
    { fill: '#00d4ff', glow: 'rgba(0,212,255,0.6)' },
    { fill: '#a78bfa', glow: 'rgba(167,139,250,0.6)' },
  ];

  let paddle, ball, bricks;
  let score, best, level, lives;
  let state = 'idle'; // idle, ready, playing, dead
  let animId;
  let particles = [];
  let trail = [];
  let shakeTimer = 0;
  let shakeIntensity = 0;

  // DOM refs
  const scoreEl = document.getElementById('sv');
  const bestEl = document.getElementById('bv');
  const levelEl = document.getElementById('lv');
  const livesEl = document.getElementById('lf');
  const startOverlay = document.getElementById('start-overlay');
  const overOverlay = document.getElementById('ov');
  const ovTitle = document.getElementById('ov-title');
  const ovEmoji = document.getElementById('ov-emoji');
  const ovScore = document.getElementById('ov-score');
  const ovBest = document.getElementById('ov-best');
  const lvlAnnounce = document.getElementById('lvl-announce');

  function init() {
    best = parseInt(localStorage.getItem('breakout-best') || '0');
    if (bestEl) bestEl.textContent = best;

    drawIdleScreen();

    document.getElementById('start-btn')?.addEventListener('click', startGame);
    document.getElementById('retry-btn')?.addEventListener('click', startGame);

    // Mouse
    canvas.addEventListener('mousemove', e => {
      if (state !== 'playing' && state !== 'ready') return;
      const r = canvas.getBoundingClientRect();
      paddle.x = (e.clientX - r.left) * (W / r.width) - paddle.w / 2;
      clampPaddle();
    });

    // Touch
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (state !== 'playing' && state !== 'ready') return;
      const r = canvas.getBoundingClientRect();
      paddle.x = (e.touches[0].clientX - r.left) * (W / r.width) - paddle.w / 2;
      clampPaddle();
    }, { passive: false });

    canvas.addEventListener('click', () => {
      if (state === 'ready') launchBall();
    });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      if (state === 'ready') launchBall();
    }, { passive: false });

    // Keyboard
    const keys = {};
    document.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'ready') launchBall();
      }
    });
    document.addEventListener('keyup', e => { keys[e.key] = false; });

    // Keyboard movement loop
    setInterval(() => {
      if (state !== 'playing' && state !== 'ready') return;
      if (keys['ArrowLeft'] || keys['a']) paddle.x -= 8;
      if (keys['ArrowRight'] || keys['d']) paddle.x += 8;
      clampPaddle();
    }, 16);

    // Touch buttons
    let touchInterval;
    ['touch-left', 'touch-right'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const dir = id === 'touch-left' ? -1 : 1;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        touchInterval = setInterval(() => {
          paddle.x += dir * 8;
          clampPaddle();
        }, 16);
      }, { passive: false });
      btn.addEventListener('touchend', () => clearInterval(touchInterval));
      btn.addEventListener('touchcancel', () => clearInterval(touchInterval));
    });
    document.getElementById('touch-launch')?.addEventListener('touchstart', e => {
      e.preventDefault();
      if (state === 'ready') launchBall();
    }, { passive: false });
  }

  function clampPaddle() {
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    if (state === 'ready') {
      ball.x = paddle.x + paddle.w / 2;
    }
  }

  function startGame() {
    score = 0;
    level = 1;
    lives = 3;
    particles = [];
    trail = [];

    paddle = { x: W / 2 - PADDLE_W / 2, y: H - 35, w: PADDLE_W, h: PADDLE_H };
    buildBricks();
    resetBall();

    state = 'ready';
    if (startOverlay) startOverlay.classList.add('hidden');
    if (overOverlay) overOverlay.classList.add('hidden');
    updateUI();
    announceLevel();

    if (window.AppStorage) AppStorage.incrementPlays();

    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  function buildBricks() {
    bricks = [];
    const rows = Math.min(BRICK_ROWS + Math.floor(level / 3), 10);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_LEFT + c * (BRICK_W + BRICK_PAD),
          y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
          w: BRICK_W,
          h: BRICK_H,
          alive: true,
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          hits: r < 2 && level > 2 ? 2 : 1, // Top rows are tougher at higher levels
        });
      }
    }
  }

  function resetBall() {
    const speed = 4.5 + level * 0.3;
    ball = {
      x: paddle.x + paddle.w / 2,
      y: paddle.y - BALL_R - 2,
      vx: 0,
      vy: 0,
      speed,
      r: BALL_R,
    };
  }

  function launchBall() {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    ball.vx = Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
    state = 'playing';
    playSound('click');
  }

  function announceLevel() {
    if (!lvlAnnounce) return;
    lvlAnnounce.textContent = `Level ${level}`;
    lvlAnnounce.classList.remove('show');
    void lvlAnnounce.offsetWidth;
    lvlAnnounce.classList.add('show');
  }

  function updateUI() {
    if (scoreEl) scoreEl.textContent = score;
    if (bestEl) bestEl.textContent = best;
    if (levelEl) levelEl.textContent = level;
    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(lives, 0));
  }

  // ── Game Loop ──────────────────────────────
  function gameLoop() {
    if (state === 'dead' || state === 'idle') return;
    update();
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function update() {
    if (state !== 'playing') return;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Trail
    trail.push({ x: ball.x, y: ball.y, life: 1 });
    if (trail.length > 20) trail.shift();
    trail.forEach(t => { t.life -= 0.06; });
    trail = trail.filter(t => t.life > 0);

    // Wall bounces
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // Paddle collision
    if (ball.vy > 0 &&
      ball.y + ball.r >= paddle.y &&
      ball.y + ball.r <= paddle.y + paddle.h + ball.speed &&
      ball.x >= paddle.x - ball.r &&
      ball.x <= paddle.x + paddle.w + ball.r) {

      ball.y = paddle.y - ball.r;
      const hitPos = (ball.x - paddle.x) / paddle.w;
      const angle = -Math.PI * 0.8 + hitPos * Math.PI * 0.6;
      ball.vx = Math.cos(angle) * ball.speed;
      ball.vy = Math.sin(angle) * ball.speed;
      if (ball.vy > -1) ball.vy = -1; // Never go completely horizontal

      playSound('click');
      spawnPaddleParticles();
    }

    // Ball lost
    if (ball.y - ball.r > H) {
      lives--;
      updateUI();
      if (lives <= 0) {
        gameOver();
        return;
      }
      playSound('fail');
      shakeScreen(6);
      resetBall();
      state = 'ready';
      return;
    }

    // Brick collision
    for (const brick of bricks) {
      if (!brick.alive) continue;

      if (ball.x + ball.r > brick.x &&
        ball.x - ball.r < brick.x + brick.w &&
        ball.y + ball.r > brick.y &&
        ball.y - ball.r < brick.y + brick.h) {

        brick.hits--;
        if (brick.hits <= 0) {
          brick.alive = false;
          score += 10 * level;
          spawnBrickParticles(brick);
        } else {
          score += 5;
        }

        // Determine bounce direction
        const overlapLeft = ball.x + ball.r - brick.x;
        const overlapRight = brick.x + brick.w - (ball.x - ball.r);
        const overlapTop = ball.y + ball.r - brick.y;
        const overlapBottom = brick.y + brick.h - (ball.y - ball.r);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }

        if (score > best) {
          best = score;
          localStorage.setItem('breakout-best', best);
          if (window.AppStorage) AppStorage.saveScore('breakout', score);
        }

        updateUI();
        playSound('eat');
        shakeScreen(3);
        break;
      }
    }

    // Check level clear
    if (bricks.every(b => !b.alive)) {
      level++;
      buildBricks();
      resetBall();
      state = 'ready';
      announceLevel();
      updateUI();
      playSound('win');
    }

    // Shake decay
    if (shakeTimer > 0) shakeTimer--;

    // Update particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
  }

  function shakeScreen(intensity) {
    shakeTimer = 8;
    shakeIntensity = intensity;
  }

  function spawnBrickParticles(brick) {
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const spd = 2 + Math.random() * 3;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1.5,
        life: 1,
        decay: 0.028 + Math.random() * 0.02,
        r: 2 + Math.random() * 3,
        color: brick.color.fill,
      });
    }
  }

  function spawnPaddleParticles() {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: ball.x + (Math.random() - 0.5) * 20,
        y: paddle.y,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        life: 1,
        decay: 0.04,
        r: 1.5 + Math.random() * 2,
        color: '#00d4ff',
      });
    }
  }

  function gameOver() {
    state = 'dead';
    cancelAnimationFrame(animId);

    if (ovTitle) ovTitle.textContent = 'Game Over';
    if (ovEmoji) ovEmoji.textContent = '💥';
    if (ovScore) ovScore.textContent = `Score: ${score} · Level: ${level}`;
    if (ovBest) ovBest.textContent = `Best: ${best}`;
    if (overOverlay) overOverlay.classList.remove('hidden');
    playSound('fail');
  }

  // ── Drawing ──────────────────────────────
  function draw() {
    ctx.save();

    // Screen shake
    if (shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(sx, sy);
    }

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080818');
    bg.addColorStop(1, '#0a0a1e');
    ctx.fillStyle = bg;
    ctx.fillRect(-5, -5, W + 10, H + 10);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.save();
      ctx.shadowColor = b.color.glow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color.fill;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 4);
      ctx.fill();

      // Inner shine
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 4);

      // Multi-hit indicator
      if (b.hits > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = "bold 9px 'Outfit', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(b.hits.toString(), b.x + b.w / 2, b.y + b.h / 2 + 3);
      }
      ctx.restore();
    });

    // Ball trail
    trail.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.life * 0.4;
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * t.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Ball
    ctx.save();
    ctx.shadowColor = 'rgba(0,212,255,0.7)';
    ctx.shadowBlur = 16;
    const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
    ballGrad.addColorStop(0, '#fff');
    ballGrad.addColorStop(0.5, '#00d4ff');
    ballGrad.addColorStop(1, '#0099cc');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Paddle
    ctx.save();
    const padGrad = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
    padGrad.addColorStop(0, '#00d4ff');
    padGrad.addColorStop(0.5, '#a78bfa');
    padGrad.addColorStop(1, '#00d4ff');
    ctx.shadowColor = 'rgba(0,212,255,0.5)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = padGrad;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 7);
    ctx.fill();
    // Paddle highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(paddle.x + 4, paddle.y + 2, paddle.w - 8, 3);
    ctx.restore();

    // Particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore(); // end shake translate
  }

  function drawIdleScreen() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#080818');
    bg.addColorStop(1, '#0a0a1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Draw demo bricks
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        const color = BRICK_COLORS[r % BRICK_COLORS.length];
        const bx = BRICK_LEFT + c * (BRICK_W + BRICK_PAD);
        const by = BRICK_TOP + r * (BRICK_H + BRICK_PAD);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = color.fill;
        ctx.beginPath();
        ctx.roundRect(bx, by, BRICK_W, BRICK_H, 4);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function playSound(type) {
    if (window.Utils) window.Utils.playSound(type);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BreakoutGame.init);
} else {
  BreakoutGame.init();
}
