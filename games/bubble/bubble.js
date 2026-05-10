/* =============================================
   bubble.js — Bubble Shooter Game Logic
   Mini Games Hub — Premium Upgrade
   Features: particle effects, aim line,
   combo scoring, progressive levels, 
   proper start/game-over flow
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


const BubbleGame = (() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const COLORS = [
    { fill: '#00d4ff', glow: 'rgba(0,212,255,0.6)' },
    { fill: '#a78bfa', glow: 'rgba(167,139,250,0.6)' },
    { fill: '#f72585', glow: 'rgba(247,37,133,0.6)' },
    { fill: '#00f5a0', glow: 'rgba(0,245,160,0.6)' },
    { fill: '#f7c948', glow: 'rgba(247,201,72,0.6)' },
    { fill: '#ff6b35', glow: 'rgba(255,107,53,0.6)' },
  ];

  const RADIUS = 17;
  const W = 480;
  const H = 600;

  let grid = [];
  let shooter = null;
  let bullet = null;
  let nextColor = null;
  let score = 0;
  let best = 0;
  let level = 1;
  let shotsLeft = 5;
  let combo = 0;
  let particles = [];
  let floatingTexts = [];
  let animId = null;
  let state = 'idle'; // idle, playing, dead
  let COLS_B = 0;
  let aimAngle = -Math.PI / 2;

  // DOM refs
  const scoreEl = document.getElementById('sv');
  const bestEl = document.getElementById('bv');
  const levelEl = document.getElementById('lv');
  const shotsEl = document.getElementById('shv');
  const startOverlay = document.getElementById('start-overlay');
  const overOverlay = document.getElementById('ov');
  const ovTitle = document.getElementById('ov-title');
  const ovEmoji = document.getElementById('ov-emoji');
  const ovScore = document.getElementById('ov-score');
  const ovBest = document.getElementById('ov-best');

  function init() {
    canvas.width = W;
    canvas.height = H;
    COLS_B = Math.floor(W / (RADIUS * 2));
    best = parseInt(localStorage.getItem('bubble-best') || '0');
    if (bestEl) bestEl.textContent = best;

    // Draw idle screen
    drawIdleScreen();

    // Bind events
    document.getElementById('start-btn')?.addEventListener('click', startGame);
    document.getElementById('retry-btn')?.addEventListener('click', startGame);

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  }

  function startGame() {
    score = 0;
    level = 1;
    shotsLeft = 5;
    combo = 0;
    bullet = null;
    particles = [];
    floatingTexts = [];
    grid = [];

    buildGrid(6);
    nextColor = randColorObj();
    shooter = { x: W / 2, y: H - 45, color: randColorObj() };

    state = 'playing';
    if (startOverlay) startOverlay.classList.add('hidden');
    if (overOverlay) overOverlay.classList.add('hidden');
    updateUI();

    if (window.AppStorage) AppStorage.incrementPlays();

    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  function buildGrid(rows) {
    grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      const offset = (r % 2) * RADIUS;
      for (let c = 0; c < COLS_B; c++) {
        row.push({
          color: randColorObj(),
          x: offset + RADIUS + c * RADIUS * 2,
          y: RADIUS + r * RADIUS * 1.73,
          alive: true,
        });
      }
      grid.push(row);
    }
  }

  function randColorObj() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function updateUI() {
    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.classList.remove('score-pop');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-pop');
    }
    if (bestEl) bestEl.textContent = best;
    if (levelEl) levelEl.textContent = level;
    if (shotsEl) shotsEl.textContent = shotsLeft;
  }

  // ── Input ─────────────────────────────────
  function getAngle(cx, cy) {
    const dx = cx - shooter.x;
    const dy = cy - shooter.y;
    let a = Math.atan2(dy, dx);
    if (a > -Math.PI * 0.08) a = -Math.PI * 0.08;
    if (a < -Math.PI * 0.92) a = -Math.PI * 0.92;
    return a;
  }

  function handleClick(e) {
    if (state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    const cx = (e.clientX - r.left) * scaleX;
    const cy = (e.clientY - r.top) * scaleY;
    shoot(getAngle(cx, cy));
  }

  function handleMouseMove(e) {
    if (state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    aimAngle = getAngle(
      (e.clientX - r.left) * scaleX,
      (e.clientY - r.top) * scaleY
    );
  }

  function handleTouchStart(e) {
    e.preventDefault();
    if (state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    const cx = (t.clientX - r.left) * scaleX;
    const cy = (t.clientY - r.top) * scaleY;
    const a = getAngle(cx, cy);
    aimAngle = a;
    shoot(a);
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (state !== 'playing') return;
    const r = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const scaleX = W / r.width;
    const scaleY = H / r.height;
    aimAngle = getAngle(
      (t.clientX - r.left) * scaleX,
      (t.clientY - r.top) * scaleY
    );
  }

  function shoot(angle) {
    if (bullet || shotsLeft <= 0) return;
    shotsLeft--;
    combo = 0;
    updateUI();

    const speed = 12;
    bullet = {
      x: shooter.x,
      y: shooter.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: shooter.color,
    };

    shooter.color = nextColor;
    nextColor = randColorObj();
    playSound('click');
  }

  // ── Matching ─────────────────────────────
  function findNeighbors(r, c, color, visited) {
    const key = `${r},${c}`;
    if (visited.has(key)) return [];
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return [];
    const b = grid[r][c];
    if (!b || !b.alive || b.color.fill !== color.fill) return [];
    visited.add(key);
    const result = [[r, c]];
    const offs = r % 2 === 0
      ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
      : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
    for (const [dr, dc] of offs) {
      result.push(...findNeighbors(r + dr, c + dc, color, visited));
    }
    return result;
  }

  function findFloating() {
    // BFS from top row to find all connected bubbles
    const connected = new Set();
    const queue = [];
    for (let c = 0; c < (grid[0]?.length || 0); c++) {
      if (grid[0]?.[c]?.alive) {
        const key = `0,${c}`;
        connected.add(key);
        queue.push([0, c]);
      }
    }
    while (queue.length) {
      const [r, c] = queue.shift();
      const offs = r % 2 === 0
        ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
        : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
      for (const [dr, dc] of offs) {
        const nr = r + dr, nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[nr].length
          && grid[nr][nc]?.alive && !connected.has(key)) {
          connected.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    // Remove floating bubbles
    const floating = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c]?.alive && !connected.has(`${r},${c}`)) {
          floating.push([r, c]);
          grid[r][c].alive = false;
        }
      }
    }
    return floating;
  }

  function snapBullet() {
    if (!bullet) return;

    // Find closest alive bubble
    let bestR = -1, bestC = -1, bestD = 1e9;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const b = grid[r][c];
        if (!b || !b.alive) continue;
        const d = Math.hypot(bullet.x - b.x, bullet.y - b.y);
        if (d < RADIUS * 2.1 && d < bestD) {
          bestD = d;
          bestR = r;
          bestC = c;
        }
      }
    }

    let placed = false;
    if (bestR >= 0) {
      const offs = bestR % 2 === 0
        ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
        : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
      // Find best empty neighbor closest to bullet
      let closestDist = 1e9;
      let placeR = -1, placeC = -1;
      for (const [dr, dc] of offs) {
        const nr = bestR + dr, nc = bestC + dc;
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[nr].length && !grid[nr][nc].alive) {
          const d = Math.hypot(bullet.x - grid[nr][nc].x, bullet.y - grid[nr][nc].y);
          if (d < closestDist) {
            closestDist = d;
            placeR = nr;
            placeC = nc;
          }
        }
      }
      if (placeR >= 0) {
        grid[placeR][placeC] = { ...grid[placeR][placeC], color: bullet.color, alive: true };
        placed = true;
      }
    }

    // If we couldn't place next to existing bubble, place at top
    if (!placed && grid.length > 0) {
      const topRow = grid[0];
      let nc = Math.round((bullet.x - RADIUS) / (RADIUS * 2));
      nc = Math.max(0, Math.min(topRow.length - 1, nc));
      if (!topRow[nc]?.alive) {
        topRow[nc] = { ...topRow[nc], color: bullet.color, alive: true };
        placed = true;
      }
    }

    // Check for matches
    let totalPopped = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!grid[r][c]?.alive) continue;
        const group = findNeighbors(r, c, grid[r][c].color, new Set());
        if (group.length >= 3) {
          group.forEach(([gr, gc]) => {
            spawnPopParticles(grid[gr][gc].x, grid[gr][gc].y, grid[gr][gc].color);
            grid[gr][gc].alive = false;
          });
          totalPopped += group.length;
        }
      }
    }

    // Remove floating bubbles
    const floating = findFloating();
    floating.forEach(([r, c]) => {
      if (grid[r]?.[c]) {
        spawnPopParticles(grid[r][c].x, grid[r][c].y, grid[r][c].color);
      }
    });
    totalPopped += floating.length;

    if (totalPopped > 0) {
      combo++;
      const comboMultiplier = Math.min(combo, 5);
      const points = totalPopped * 10 * comboMultiplier;
      score += points;

      // Show floating text
      spawnFloatingText(`+${points}`, bullet.x, bullet.y - 30, totalPopped > 5 ? '#f7c948' : '#00f5a0');

      if (score > best) {
        best = score;
        localStorage.setItem('bubble-best', best);
        if (window.AppStorage) AppStorage.saveScore('bubble', score);
      }

      shotsLeft = Math.min(shotsLeft + Math.ceil(totalPopped / 3), 8);
      playSound('match');
    }

    bullet = null;
    updateUI();

    // Check game over — bubbles too low
    const maxY = grid.reduce(
      (m, row) => Math.max(m, ...row.filter(b => b.alive).map(b => b.y)),
      0
    );
    if (maxY > H - 120) {
      gameOver(false);
      return;
    }

    // Check level cleared
    const anyAlive = grid.some(row => row.some(b => b.alive));
    if (!anyAlive) {
      level++;
      buildGrid(Math.min(5 + level, 12));
      shotsLeft += 3;
      spawnFloatingText(`Level ${level}!`, W / 2, H / 2, '#00d4ff');
      playSound('win');
      updateUI();
    }

    // Check out of shots
    if (shotsLeft <= 0 && bullet === null) {
      const stillAlive = grid.some(row => row.some(b => b.alive));
      if (stillAlive) {
        gameOver(false);
      }
    }
  }

  function gameOver(win) {
    state = 'dead';
    cancelAnimationFrame(animId);

    if (ovTitle) ovTitle.textContent = win ? '🏆 You Win!' : 'Game Over';
    if (ovEmoji) ovEmoji.textContent = win ? '🏆' : '💥';
    if (ovScore) ovScore.textContent = `Score: ${score} · Level: ${level}`;
    if (ovBest) ovBest.textContent = `Best: ${best}`;
    if (overOverlay) overOverlay.classList.remove('hidden');
    playSound('fail');
  }

  // ── Particles ─────────────────────────────
  function spawnPopParticles(x, y, colorObj) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const spd = 2 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        r: 3 + Math.random() * 3,
        color: colorObj.fill,
      });
    }
  }

  function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({
      text, x, y, color,
      vy: -1.5,
      life: 1,
      decay: 0.018,
    });
  }

  // ── Drawing ──────────────────────────────
  function drawBubble(x, y, colorObj, r2 = RADIUS, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Glow
    ctx.shadowColor = colorObj.glow;
    ctx.shadowBlur = 12;

    // Gradient fill
    const g = ctx.createRadialGradient(x - r2 * 0.3, y - r2 * 0.3, r2 * 0.1, x, y, r2);
    g.addColorStop(0, 'rgba(255,255,255,0.45)');
    g.addColorStop(0.4, colorObj.fill);
    g.addColorStop(1, colorObj.fill + 'aa');
    ctx.beginPath();
    ctx.arc(x, y, r2 - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    // Border shine
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x - r2 * 0.25, y - r2 * 0.3, r2 * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawAimLine() {
    if (!shooter || bullet) return;
    ctx.save();
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shooter.x, shooter.y);

    // Simulate bounces for aim preview
    let px = shooter.x, py = shooter.y;
    let vx = Math.cos(aimAngle), vy = Math.sin(aimAngle);
    const len = 200;
    for (let i = 0; i < len; i++) {
      px += vx * 2;
      py += vy * 2;
      if (px < RADIUS) { px = RADIUS; vx *= -1; }
      if (px > W - RADIUS) { px = W - RADIUS; vx *= -1; }
      if (py < RADIUS) break;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawShooter() {
    if (!shooter) return;
    ctx.save();

    // Shooter base platform
    const g = ctx.createLinearGradient(shooter.x - 30, H - 20, shooter.x + 30, H - 20);
    g.addColorStop(0, 'rgba(0,212,255,0.15)');
    g.addColorStop(0.5, 'rgba(167,139,250,0.2)');
    g.addColorStop(1, 'rgba(0,212,255,0.15)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(shooter.x - 35, H - 16, 70, 16, 8);
    ctx.fill();

    // Cannon
    ctx.translate(shooter.x, shooter.y);
    ctx.rotate(aimAngle + Math.PI / 2);
    const cg = ctx.createLinearGradient(-10, 0, 10, 0);
    cg.addColorStop(0, 'rgba(0,212,255,0.5)');
    cg.addColorStop(0.5, 'rgba(167,139,250,0.6)');
    cg.addColorStop(1, 'rgba(0,212,255,0.5)');
    ctx.fillStyle = cg;
    ctx.shadowColor = 'rgba(0,212,255,0.3)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(-7, -38, 14, 38, 4);
    ctx.fill();
    ctx.restore();

    // Current bubble on shooter
    drawBubble(shooter.x, shooter.y, shooter.color, 14);

    // Next bubble preview
    if (nextColor) {
      drawBubble(W - 40, H - 40, nextColor, 11, 0.7);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = "600 10px 'Outfit', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Next', W - 40, H - 22);
    }
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
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
  }

  function drawFloatingTexts() {
    floatingTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.font = `bold 18px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
      ft.y += ft.vy;
      ft.life -= ft.decay;
    });
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);
  }

  function drawDangerLine() {
    const dangerY = H - 120;
    const alpha = 0.15 + Math.sin(Date.now() / 400) * 0.08;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 71, 87, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(W, dangerY);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050510');
    bg.addColorStop(0.5, '#0a0820');
    bg.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += RADIUS * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    drawDangerLine();

    // Grid bubbles
    grid.forEach(row => {
      row.forEach(b => {
        if (b.alive) drawBubble(b.x, b.y, b.color);
      });
    });

    // Bullet
    if (bullet) drawBubble(bullet.x, bullet.y, bullet.color);

    drawAimLine();
    drawShooter();
    drawParticles();
    drawFloatingTexts();
  }

  function drawIdleScreen() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050510');
    bg.addColorStop(0.5, '#0a0820');
    bg.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Draw some demo bubbles
    const demoColors = [COLORS[0], COLORS[1], COLORS[2], COLORS[3], COLORS[4]];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < COLS_B; c++) {
        const offset = (r % 2) * RADIUS;
        const x = offset + RADIUS + c * RADIUS * 2;
        const y = RADIUS + r * RADIUS * 1.73;
        drawBubble(x, y, demoColors[(r + c) % demoColors.length], RADIUS, 0.4);
      }
    }
  }

  // ── Game Loop ──────────────────────────────
  function gameLoop() {
    if (state !== 'playing') return;

    // Update bullet
    if (bullet) {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Wall bounce
      if (bullet.x < RADIUS) { bullet.x = RADIUS; bullet.vx *= -1; }
      if (bullet.x > W - RADIUS) { bullet.x = W - RADIUS; bullet.vx *= -1; }

      // Top ceiling
      if (bullet.y < RADIUS) {
        snapBullet();
      } else {
        // Check collision with grid bubbles
        let hit = false;
        for (const row of grid) {
          for (const b of row) {
            if (b.alive && Math.hypot(bullet.x - b.x, bullet.y - b.y) < RADIUS * 1.85) {
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
        if (hit) snapBullet();
      }
    }

    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function playSound(type) {
    if (window.Utils) window.Utils.playSound(type);
  }

  return { init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', BubbleGame.init);
} else {
  BubbleGame.init();
}
