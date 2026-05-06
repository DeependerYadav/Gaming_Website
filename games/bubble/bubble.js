// ===== BUBBLE SHOOTER GAME =====
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const COLORS = ['#00d4ff','#a78bfa','#f72585','#00f5a0','#f7c948','#ff6b35'];
const RADIUS = 18;
let W, H, COLS_B;
let grid, shooter, bullet, score, best, level, shotsLeft, animId;

function resize() {
  W = Math.min(window.innerWidth, 520);
  H = window.innerHeight - 56 - 52;
  canvas.width = W; canvas.height = H;
  COLS_B = Math.floor(W / (RADIUS * 2));
}

function initGame() {
  resize();
  score = 0; level = 1; shotsLeft = 3;
  best = Number(localStorage.getItem('bubble-best') || 0);
  bullet = null; grid = [];
  buildGrid(6);
  shooter = { x: W / 2, y: H - 40, angle: -Math.PI / 2, color: randColor() };
  upd(); draw();
}

function buildGrid(rows) {
  grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    const offset = (r % 2) * RADIUS;
    for (let c = 0; c < COLS_B; c++) {
      row.push({ color: randColor(), x: offset + RADIUS + c * RADIUS * 2, y: RADIUS + r * RADIUS * 1.73, alive: true });
    }
    grid.push(row);
  }
}

function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function upd() {
  document.getElementById('sv').textContent = score;
  document.getElementById('bv').textContent = best;
  document.getElementById('lv').textContent = level;
  document.getElementById('shv').textContent = shotsLeft;
}

function shoot(angle) {
  if (bullet) return;
  if (shotsLeft <= 0) return;
  shotsLeft--; upd();
  const speed = 10;
  bullet = { x: shooter.x, y: shooter.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: shooter.color, radius: RADIUS };
  shooter.color = randColor();
}

function getAngle(cx, cy) {
  const dx = cx - shooter.x, dy = cy - shooter.y;
  let a = Math.atan2(dy, dx);
  if (a > -Math.PI * 0.1) a = -Math.PI * 0.1;
  if (a < -Math.PI * 0.9) a = -Math.PI * 0.9;
  return a;
}

canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  shoot(getAngle(e.clientX - r.left, e.clientY - r.top));
});
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  shooter.angle = getAngle(e.clientX - r.left, e.clientY - r.top);
  draw();
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), t = e.touches[0];
  const a = getAngle(t.clientX - r.left, t.clientY - r.top);
  shooter.angle = a; shoot(a);
}, { passive: false });

function findNeighbors(r, c, color, visited) {
  const key = r + ',' + c;
  if (visited.has(key)) return [];
  if (r < 0 || r >= grid.length || c < 0 || c >= grid[r].length) return [];
  const b = grid[r][c];
  if (!b || !b.alive || b.color !== color) return [];
  visited.add(key);
  const result = [[r, c]];
  const offs = r % 2 === 0 ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]] : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
  for (const [dr, dc] of offs) result.push(...findNeighbors(r + dr, c + dc, color, visited));
  return result;
}

function snapBullet() {
  if (!bullet) return;
  let bestR = -1, bestC = -1, bestD = 1e9;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const b = grid[r][c];
      if (!b || !b.alive) continue;
      const d = Math.hypot(bullet.x - b.x, bullet.y - b.y);
      if (d < RADIUS * 2 && d < bestD) { bestD = d; bestR = r; bestC = c; }
    }
  }
  let placed = false;
  if (bestR >= 0) {
    const offs = bestR % 2 === 0 ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]] : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
    for (const [dr, dc] of offs) {
      const nr = bestR + dr, nc = bestC + dc;
      if (nr < 0) {
        const row = []; const off = (0 % 2) * RADIUS;
        for (let cc = 0; cc < COLS_B; cc++) row.push({ color: null, x: off + RADIUS + cc * RADIUS * 2, y: 0, alive: false });
        const nc2 = Math.round((bullet.x - (nr % 2 === 0 ? 0 : RADIUS)) / (RADIUS * 2));
        if (nc2 >= 0 && nc2 < COLS_B) { row[nc2] = { color: bullet.color, x: row[nc2].x, y: RADIUS, alive: true }; grid.unshift(row); placed = true; break; }
      }
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[nr].length && !grid[nr][nc].alive) {
        grid[nr][nc] = { ...grid[nr][nc], color: bullet.color, alive: true }; placed = true; break;
      }
    }
  }
  if (!placed) {
    const topRow = grid[0]; let nc = Math.round((bullet.x - RADIUS) / (RADIUS * 2));
    nc = Math.max(0, Math.min(topRow.length - 1, nc));
    if (!topRow[nc].alive) topRow[nc] = { ...topRow[nc], color: bullet.color, alive: true };
  }
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c].alive) continue;
      const group = findNeighbors(r, c, grid[r][c].color, new Set());
      if (group.length >= 3) {
        group.forEach(([gr, gc]) => { grid[gr][gc].alive = false; });
        score += group.length * 10 * (group.length > 3 ? 2 : 1);
        if (score > best) { best = score; localStorage.setItem('bubble-best', best); }
        shotsLeft = Math.min(shotsLeft + 1, 5);
        upd();
      }
    }
  }
  bullet = null;
  const maxY = grid.reduce((m, row) => Math.max(m, ...row.filter(b => b.alive).map(b => b.y)), 0);
  if (maxY > H - 100) { showOver(false); return; }
  const anyAlive = grid.some(row => row.some(b => b.alive));
  if (!anyAlive) { level++; buildGrid(5 + level); shotsLeft += 3; upd(); }
  if (shotsLeft <= 0 && bullet === null) { const a2 = grid.some(row => row.some(b => b.alive)); if (a2) showOver(false); }
}

function showOver(win) {
  cancelAnimationFrame(animId);
  document.getElementById('ov-title').textContent = win ? '🏆 You Win!' : '💥 Game Over';
  document.getElementById('ov-title').style.color = win ? '#00f5a0' : '#f72585';
  document.getElementById('ov-score').textContent = score;
  document.getElementById('ov-best').textContent = 'Best: ' + best;
  document.getElementById('ov').classList.add('show');
}

function drawBubble(x, y, color, r2 = RADIUS, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(x - r2 * .3, y - r2 * .3, r2 * .1, x, y, r2);
  g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(.5, color); g.addColorStop(1, color + 'aa');
  ctx.beginPath(); ctx.arc(x, y, r2 - .5, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(5,5,20,.6)'; ctx.fillRect(0, 0, W, H);
  grid.forEach(row => row.forEach(b => { if (b.alive) drawBubble(b.x, b.y, b.color); }));
  if (bullet) drawBubble(bullet.x, bullet.y, bullet.color);
  ctx.save();
  ctx.translate(shooter.x, shooter.y); ctx.rotate(shooter.angle + Math.PI / 2);
  const sg = ctx.createLinearGradient(-12, 0, 12, 0);
  sg.addColorStop(0, 'rgba(0,212,255,.6)'); sg.addColorStop(1, 'rgba(167,139,250,.6)');
  ctx.fillStyle = sg; ctx.fillRect(-8, -35, 16, 35);
  ctx.restore();
  ctx.save(); ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(shooter.x, shooter.y);
  ctx.lineTo(shooter.x + Math.cos(shooter.angle) * 120, shooter.y + Math.sin(shooter.angle) * 120);
  ctx.stroke(); ctx.restore();
  drawBubble(W - 35, H - 35, shooter.color, 14);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '11px Poppins';
  ctx.textAlign = 'left';
  ctx.fillText('Next', W - 60, H - 20);
}

function update() {
  animId = requestAnimationFrame(update);
  if (bullet) {
    bullet.x += bullet.vx; bullet.y += bullet.vy;
    if (bullet.x < RADIUS) { bullet.x = RADIUS; bullet.vx *= -1; }
    if (bullet.x > W - RADIUS) { bullet.x = W - RADIUS; bullet.vx *= -1; }
    if (bullet.y < RADIUS) { snapBullet(); return; }
    let hit = false;
    for (const row of grid) {
      for (const b of row) {
        if (b.alive && Math.hypot(bullet.x - b.x, bullet.y - b.y) < RADIUS * 1.9) { hit = true; break; }
      }
      if (hit) break;
    }
    if (hit) snapBullet();
  }
  draw();
}

window.addEventListener('resize', () => { resize(); draw(); });
initGame(); update();
