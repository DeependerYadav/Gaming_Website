// ===== BREAKOUT GAME =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const BRICK_COLS = 10;
const COLORS = ['#f72585','#ff6b35','#f7c948','#00f5a0','#00d4ff','#a78bfa'];
const BALL_R = 9;

let W, H, paddle, ball, bricks, score, best, level, lives, animId, launched, mX, particles;

// ===== RESIZE =====
function resize() {
  W = Math.min(window.innerWidth, 620);
  H = window.innerHeight - 56 - 46 - 28;
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener('resize', () => { resize(); if (!launched) resetBall(); });

// ===== PARTICLES =====
function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      color, life: 1, decay: 0.03 + Math.random() * 0.04, r: 2 + Math.random() * 3 });
  }
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.08;
    p.life -= p.decay;
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.restore();
  });
}

// ===== BRICKS =====
function makeBricks() {
  bricks = [];
  const BRICK_ROWS = 4 + Math.min(level - 1, 3);
  const BRICK_H = 20;
  const BRICK_PAD = 5;
  const BRICK_TOP = 30;
  const bw = (W - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;

  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const x = BRICK_PAD + c * (bw + BRICK_PAD);
      const y = BRICK_TOP + r * (BRICK_H + BRICK_PAD);
      const hp = r < 2 ? 1 : r < 4 ? 2 : 3;
      const color = COLORS[r % COLORS.length];
      bricks.push({ x, y, w: bw, h: BRICK_H, color, alive: true, hp, maxHp: hp, flash: 0 });
    }
  }
}

// ===== INIT =====
function initGame() {
  resize();
  score = 0; level = 1; lives = 3; launched = false; particles = [];
  best = Number(localStorage.getItem('breakout-best') || 0);
  setupLevel();
  updateHUD();
  document.getElementById('ov').classList.remove('show');
  if (animId) cancelAnimationFrame(animId);
  update();
}

function setupLevel() {
  const pw = Math.max(55, 110 - level * 6);
  paddle = { x: W / 2 - pw / 2, y: H - 28, w: pw, h: 12 };
  resetBall();
  makeBricks();
  particles = [];
}

function resetBall() {
  const speed = 4 + level * 0.4;
  ball = {
    x: W / 2, y: H - 55,
    vx: speed * (Math.random() > 0.5 ? 1 : -1),
    vy: -speed, r: BALL_R, trail: []
  };
  launched = false;
}

function updateHUD() {
  document.getElementById('sv').textContent = score;
  document.getElementById('bv').textContent = best;
  document.getElementById('lv').textContent = level;
  document.getElementById('lf').textContent = '❤️'.repeat(lives);
}

// ===== INPUT =====
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mX = e.clientX - r.left;
});
canvas.addEventListener('click', () => { launched = true; });
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  mX = e.touches[0].clientX - r.left;
}, { passive: false });
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  launched = true;
  const r = canvas.getBoundingClientRect();
  mX = e.touches[0].clientX - r.left;
}, { passive: false });
document.addEventListener('keydown', e => {
  if (e.key === ' ' || e.key === 'Enter') launched = true;
  if (e.key === 'ArrowLeft') mX = Math.max(0, (mX || W / 2) - 18);
  if (e.key === 'ArrowRight') mX = Math.min(W, (mX || W / 2) + 18);
});

// ===== DRAW =====
function drawBrick(b) {
  if (!b.alive) return;
  ctx.save();
  const pct = b.hp / b.maxHp;
  // gradient fill
  const grd = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  grd.addColorStop(0, b.color + 'ff');
  grd.addColorStop(1, b.color + '88');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
  // hp damage overlay
  if (pct < 1) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(b.x, b.y, b.w * (1 - pct), b.h);
  }
  // glow
  if (b.flash > 0) {
    ctx.shadowColor = b.color; ctx.shadowBlur = 20 * b.flash;
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.stroke();
    b.flash = Math.max(0, b.flash - 0.1);
  }
  // border
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.stroke();
  ctx.restore();
}

function drawPaddle() {
  ctx.save();
  const g = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
  g.addColorStop(0, '#00d4ff'); g.addColorStop(0.5, '#a78bfa'); g.addColorStop(1, '#00d4ff');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 15;
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.stroke();
  ctx.restore();
}

function drawBall() {
  // trail
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) ball.trail.shift();
  ball.trail.forEach((p, i) => {
    const alpha = i / ball.trail.length;
    ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * alpha * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,212,255,${alpha * 0.35})`; ctx.fill();
  });
  // ball
  const g = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r);
  g.addColorStop(0, '#fff');
  g.addColorStop(0.4, '#00d4ff');
  g.addColorStop(1, '#a78bfa');
  ctx.save();
  ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = 'rgba(5,5,20,.96)';
  ctx.fillRect(0, 0, W, H);
  // subtle grid
  ctx.strokeStyle = 'rgba(0,212,255,.035)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

// ===== GAME LOOP =====
function update() {
  animId = requestAnimationFrame(update);
  ctx.clearRect(0, 0, W, H);
  drawBackground();

  // move paddle
  if (mX !== undefined) {
    paddle.x = Math.max(0, Math.min(W - paddle.w, mX - paddle.w / 2));
  }
  drawPaddle();

  // ball
  if (!launched) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
    ball.trail = [];
    // show "Click to launch" text
    ctx.save();
    ctx.font = 'bold 13px Poppins';
    ctx.fillStyle = 'rgba(0,212,255,.6)';
    ctx.textAlign = 'center';
    ctx.fillText('Click / Tap to Launch', W / 2, H / 2);
    ctx.restore();
  } else {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // wall collisions
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // paddle collision
    if (ball.vy > 0 &&
        ball.y + ball.r >= paddle.y &&
        ball.y - ball.r <= paddle.y + paddle.h &&
        ball.x >= paddle.x - 4 &&
        ball.x <= paddle.x + paddle.w + 4) {
      ball.vy = -Math.abs(ball.vy);
      const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = rel * (5 + level * 0.3);
      spawnParticles(ball.x, paddle.y, '#00d4ff', 5);
    }

    // brick collisions
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.hp--;
        b.flash = 1;
        spawnParticles(ball.x, ball.y, b.color, b.hp <= 0 ? 12 : 6);
        if (b.hp <= 0) {
          b.alive = false;
          score += (10 + level * 5);
          if (score > best) { best = score; localStorage.setItem('breakout-best', best); }
        }
        // determine bounce direction
        const overlapLeft = ball.x + ball.r - b.x;
        const overlapRight = b.x + b.w - (ball.x - ball.r);
        const overlapTop = ball.y + ball.r - b.y;
        const overlapBottom = b.y + b.h - (ball.y - ball.r);
        const minH = Math.min(overlapLeft, overlapRight);
        const minV = Math.min(overlapTop, overlapBottom);
        if (minH < minV) ball.vx *= -1; else ball.vy *= -1;
        updateHUD();
        break;
      }
    }

    // ball lost
    if (ball.y - ball.r > H) {
      lives--;
      updateHUD();
      if (lives <= 0) { showEnd(false); return; }
      resetBall();
      mX = undefined;
    }

    // level complete
    if (bricks.every(b => !b.alive)) {
      level++;
      showLevelAnnounce();
      setupLevel();
      updateHUD();
    }
  }

  bricks.forEach(drawBrick);
  drawBall();
  updateParticles();
}

function showLevelAnnounce() {
  const el = document.getElementById('lvl-announce');
  el.textContent = `Level ${level}!`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1200);
}

function showEnd(win) {
  cancelAnimationFrame(animId);
  document.getElementById('ov-title').textContent = win ? '🏆 You Win!' : '💥 Game Over';
  document.getElementById('ov-title').style.color = win ? '#00f5a0' : '#f72585';
  document.getElementById('ov-score').textContent = score;
  document.getElementById('ov-best').textContent = `Best: ${best}`;
  document.getElementById('ov').classList.add('show');
}

initGame();
