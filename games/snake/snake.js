/* =============================================
   snake.js - Snake Game Logic
   Mini Games Hub
   ============================================= */

const SnakeGame = (() => {
  const GRID_SIZE = 20;
  const BOARD_CELLS = 25;
  const CANVAS_SIZE = GRID_SIZE * BOARD_CELLS;
  const BONUS_WINDOW_MS = 4500;
  const STREAK_WINDOW_MS = 3500;
  const BONUS_FOOD_EVERY = 4;

  const MODES = {
    classic: { label: 'Classic' },
    portal: { label: 'Portal' },
  };

  const COLORS = {
    bg: '#0b1a12',
    grid: 'rgba(255,255,255,0.03)',
    snakeHead: '#00e676',
    snakeBody: '#00c853',
    snakeShadow: 'rgba(0,230,118,0.4)',
    food: '#ff5252',
    foodGlow: 'rgba(255,82,82,0.5)',
    foodInner: '#ff8a80',
    bonusFood: '#ffd166',
    bonusGlow: 'rgba(255,209,102,0.65)',
    bonusInner: '#fff1a6',
    eye: '#ffffff',
    eyePupil: '#0b1a12',
  };

  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let food = null;
  let score = 0;
  let highScore = 0;
  let streak = 1;
  let foodsEaten = 0;
  let lastFoodAt = 0;
  let mode = 'classic';
  let gameState = 'idle';
  let animId = null;
  let lastTime = 0;
  let speed = 5;

  // Particle system
  let particles = [];
  const PARTICLE_COLORS = ['#f7c948','#ff8c00','#00e676','#00d4ff','#ff6b6b','#a8ff3e'];

  let canvas;
  let ctx;
  let scoreEl;
  let highScoreEl;
  let levelEl;
  let streakEl;
  let startOverlay;
  let gameOverOverlay;
  let finalScoreEl;
  let newBestEl;
  let modeButtons = [];

  function init() {
    canvas = document.getElementById('snake-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    scoreEl = document.getElementById('score-val');
    highScoreEl = document.getElementById('high-score-val');
    levelEl = document.getElementById('level-val');
    streakEl = document.getElementById('streak-val');
    finalScoreEl = document.getElementById('final-score');
    newBestEl = document.getElementById('new-best-label');
    startOverlay = document.getElementById('snake-overlay');
    gameOverOverlay = document.getElementById('game-over-overlay');
    modeButtons = Array.from(document.querySelectorAll('.mode-chip'));

    highScore = AppStorage.getScores().snake || 0;
    if (highScoreEl) highScoreEl.textContent = highScore;

    const settings = AppStorage.getSettings();
    speed = clampSpeed(settings.snakeSpeed || 5);
    mode = settings.snakeMode === 'portal' ? 'portal' : 'classic';

    updateModeUI();
    updateStreakDisplay();
    updateLevelDisplay();
    drawIdleScreen();

    bindKeyboard();
    bindTouchControls();
    bindButtons();
  }

  function clampSpeed(value) {
    return Math.max(1, Math.min(10, parseInt(value, 10) || 5));
  }

  function startGame() {
    const center = Math.floor(BOARD_CELLS / 2);
    snake = [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    streak = 1;
    foodsEaten = 0;
    lastFoodAt = 0;
    speed = clampSpeed(AppStorage.getSettings().snakeSpeed || 5);
    food = null;
    particles = [];

    spawnFood(false);
    gameState = 'playing';
    lastTime = 0;

    if (startOverlay) startOverlay.classList.add('hidden');
    if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
    if (scoreEl) scoreEl.textContent = '0';

    updateStreakDisplay();
    updateLevelDisplay();
    setPauseButtonLabel(false);
    AppStorage.incrementPlays();

    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    if (gameState === 'playing') {
      gameState = 'paused';
      cancelAnimationFrame(animId);
      drawPauseScreen();
      setPauseButtonLabel(true);
      return;
    }

    if (gameState === 'paused') {
      gameState = 'playing';
      lastTime = 0;
      animId = requestAnimationFrame(gameLoop);
      setPauseButtonLabel(false);
    }
  }

  function gameOver(reason = 'crash') {
    gameState = 'over';
    cancelAnimationFrame(animId);

    const isNewBest = AppStorage.saveScore('snake', score);
    if (isNewBest) {
      highScore = score;
      if (highScoreEl) {
        highScoreEl.textContent = highScore;
        highScoreEl.classList.add('high-score-flash');
        setTimeout(() => highScoreEl.classList.remove('high-score-flash'), 1600);
      }
    }

    if (finalScoreEl) {
      const reasonText = reason === 'wall' ? 'Wall hit' : reason === 'self' ? 'Tail hit' : 'Run ended';
      finalScoreEl.textContent = `${MODES[mode].label} | ${reasonText} | Score: ${score} | Best: ${highScore}`;
    }
    if (newBestEl) newBestEl.style.display = isNewBest ? 'block' : 'none';
    if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');

    setPauseButtonLabel(false);
    playSound('fail');
  }

  function gameLoop(timestamp) {
    if (gameState !== 'playing') return;

    const interval = 1000 / speed;
    const delta = timestamp - lastTime;

    if (delta >= interval) {
      lastTime = timestamp - (delta % interval);
      update();
    }

    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  function update() {
    expireBonusFood();
    direction = { ...nextDirection };

    const nextHead = getNextHead();
    if (!nextHead) {
      gameOver('wall');
      return;
    }

    const eatingFood = food && nextHead.x === food.x && nextHead.y === food.y;
    const bodyToCheck = eatingFood ? snake : snake.slice(0, -1);
    if (bodyToCheck.some(segment => segment.x === nextHead.x && segment.y === nextHead.y)) {
      gameOver('self');
      return;
    }

    snake.unshift(nextHead);

    if (eatingFood) {
      eatFood();
    } else {
      snake.pop();
    }
  }

  function getNextHead() {
    const rawX = snake[0].x + direction.x;
    const rawY = snake[0].y + direction.y;

    if (mode === 'classic' && (rawX < 0 || rawX >= BOARD_CELLS || rawY < 0 || rawY >= BOARD_CELLS)) {
      return null;
    }

    return {
      x: (rawX + BOARD_CELLS) % BOARD_CELLS,
      y: (rawY + BOARD_CELLS) % BOARD_CELLS,
    };
  }

  function eatFood() {
    const now = performance.now();
    streak = now - lastFoodAt <= STREAK_WINDOW_MS ? Math.min(streak + 1, 9) : 1;
    lastFoodAt = now;
    foodsEaten += 1;

    const ateBonus = food?.type === 'bonus';
    let points = 10 + Math.floor(speed) + Math.max(0, streak - 1) * 2;

    if (ateBonus) {
      points += 20 + streak * 3;
      speed = Math.min(speed + 0.6, 14);
      window.Utils?.showToast(`Bonus bite! +${points}`, 'success', 1200);
      window.Utils?.vibrate([25, 40, 25]);
      spawnFoodParticles(food.x, food.y, true);
    } else {
      if (foodsEaten % 5 === 0) speed = Math.min(speed + 0.35, 12);
      spawnFoodParticles(food.x, food.y, false);
    }

    score += points;
    if (scoreEl) scoreEl.textContent = score;

    playSound('eat');
    spawnFood();
    updateLevelDisplay();
    updateStreakDisplay();
  }

  function shouldSpawnBonus() {
    return foodsEaten > 0 && foodsEaten % BONUS_FOOD_EVERY === 0;
  }

  function expireBonusFood() {
    if (food?.type === 'bonus' && performance.now() >= food.expiresAt) {
      food = createFood('normal');
    }
  }

  function spawnFood(forceBonus = shouldSpawnBonus()) {
    food = createFood(forceBonus ? 'bonus' : 'normal');
    if (food.type === 'bonus') {
      window.Utils?.showToast('Golden food spawned!', 'success', 1100);
    }
  }

  function createFood(type = 'normal') {
    const occupied = new Set(snake.map(segment => `${segment.x},${segment.y}`));
    const available = [];

    for (let y = 0; y < BOARD_CELLS; y++) {
      for (let x = 0; x < BOARD_CELLS; x++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    const pos = available[Math.floor(Math.random() * available.length)] || { x: 12, y: 12 };
    return {
      ...pos,
      type,
      expiresAt: type === 'bonus' ? performance.now() + BONUS_WINDOW_MS : 0,
    };
  }

  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    drawGrid();
    drawFood();
    drawSnake();
    drawParticles();
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
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18;   // gravity
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
  }

  function spawnFoodParticles(gridX, gridY, isBonus) {
    const cx = gridX * GRID_SIZE + GRID_SIZE / 2;
    const cy = gridY * GRID_SIZE + GRID_SIZE / 2;
    const count = isBonus ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd   = (isBonus ? 2.5 : 1.5) + Math.random() * 2.5;
      const color = isBonus
        ? PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
        : (Math.random() < 0.5 ? COLORS.food : COLORS.foodInner);
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        life: 1,
        decay: 0.028 + Math.random() * 0.025,
        r: 3 + Math.random() * 3,
        color,
      });
    }
  }

  function drawGrid() {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= CANVAS_SIZE; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_SIZE);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_SIZE; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_SIZE, y);
      ctx.stroke();
    }
  }

  function drawSnake() {
    snake.forEach((segment, index) => {
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      const size = GRID_SIZE - 2;
      const ratio = index / Math.max(snake.length, 1);
      const alpha = 1 - ratio * 0.5;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (index === 0) {
        ctx.shadowColor = COLORS.snakeShadow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = COLORS.snakeHead;
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.snakeBody;
      }

      roundRect(ctx, x + 1, y + 1, size, size, 4);
      ctx.fill();
      ctx.restore();

      if (index === 0) {
        drawSnakeEye(x, y);
      }
    });
  }

  function drawSnakeEye(x, y) {
    const radius = 2.5;
    const pupilRadius = 1.2;
    let eye1;
    let eye2;

    if (direction.x === 1) {
      eye1 = { x: x + 14, y: y + 5 };
      eye2 = { x: x + 14, y: y + 13 };
    } else if (direction.x === -1) {
      eye1 = { x: x + 4, y: y + 5 };
      eye2 = { x: x + 4, y: y + 13 };
    } else if (direction.y === -1) {
      eye1 = { x: x + 5, y: y + 4 };
      eye2 = { x: x + 13, y: y + 4 };
    } else {
      eye1 = { x: x + 5, y: y + 14 };
      eye2 = { x: x + 13, y: y + 14 };
    }

    [eye1, eye2].forEach(eye => {
      ctx.fillStyle = COLORS.eye;
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.eyePupil;
      ctx.beginPath();
      ctx.arc(eye.x, eye.y, pupilRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawFood() {
    if (!food) return;

    const x = food.x * GRID_SIZE + GRID_SIZE / 2;
    const y = food.y * GRID_SIZE + GRID_SIZE / 2;
    const radius = GRID_SIZE / 2 - 2;
    const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.15;
    const isBonus = food.type === 'bonus';
    const outer = isBonus ? COLORS.bonusFood : COLORS.food;
    const inner = isBonus ? COLORS.bonusInner : COLORS.foodInner;
    const glow = isBonus ? COLORS.bonusGlow : COLORS.foodGlow;

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = isBonus ? 22 : 15;

    ctx.beginPath();
    ctx.arc(x, y, radius * pulse, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, radius * pulse);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fill();

    if (isBonus) {
      const remaining = Math.max(food.expiresAt - performance.now(), 0);
      const ratio = remaining / BONUS_WINDOW_MS;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255, 209, 102, ${0.2 + ratio * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawIdleScreen() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawGrid();

    const demoSnake = [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
    ];

    demoSnake.forEach((segment, index) => {
      ctx.globalAlpha = 1 - index * 0.15;
      ctx.fillStyle = index === 0 ? COLORS.snakeHead : COLORS.snakeBody;
      roundRect(
        ctx,
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2,
        4
      );
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    food = { x: 15, y: 12, type: 'normal', expiresAt: 0 };
    drawFood();
  }

  function drawPauseScreen() {
    draw();
    ctx.fillStyle = 'rgba(13, 13, 26, 0.72)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#f0f0ff';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function updateLevelDisplay() {
    const level = Math.floor(score / 60) + 1;
    if (levelEl) levelEl.textContent = `${Math.round(speed)} | Lv.${level}`;
  }

  function updateStreakDisplay() {
    if (streakEl) streakEl.textContent = `x${Math.max(streak, 1)}`;
  }

  function updateModeUI() {
    modeButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.mode === mode);
    });
  }

  function setPauseButtonLabel(paused) {
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  }

  function setMode(nextMode, announce = false) {
    mode = MODES[nextMode] ? nextMode : 'classic';
    AppStorage.setSetting('snakeMode', mode);
    updateModeUI();

    if (announce) {
      const message =
        gameState === 'playing' || gameState === 'paused'
          ? `${MODES[mode].label} mode will apply on the next run.`
          : `${MODES[mode].label} mode ready.`;
      window.Utils?.showToast(message, 'info', 1200);
    }

    if (gameState === 'idle' || gameState === 'over') {
      if (startOverlay) startOverlay.classList.remove('hidden');
      if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
      drawIdleScreen();
    }
  }

  function canTurn(newDirection) {
    const baseDirection = nextDirection || direction;
    return (
      newDirection.x !== -baseDirection.x ||
      newDirection.y !== -baseDirection.y
    );
  }

  function bindKeyboard() {
    const directionMap = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };

    document.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || event.code === 'Space') {
        event.preventDefault();
      }

      if (event.code === 'Space') {
        if (gameState === 'idle' || gameState === 'over') startGame();
        else pauseGame();
        return;
      }

      const loweredKey = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const newDirection = directionMap[event.key] || directionMap[loweredKey];
      if (!newDirection || gameState !== 'playing') return;

      if (canTurn(newDirection)) {
        nextDirection = newDirection;
      }
    });
  }

  function bindTouchControls() {
    const directionMap = {
      'touch-up': { x: 0, y: -1 },
      'touch-down': { x: 0, y: 1 },
      'touch-left': { x: -1, y: 0 },
      'touch-right': { x: 1, y: 0 },
    };

    Object.entries(directionMap).forEach(([id, touchDirection]) => {
      const button = document.getElementById(id);
      if (!button) return;

      button.addEventListener(
        'touchstart',
        (event) => {
          event.preventDefault();

          if (gameState === 'idle' || gameState === 'over') {
            startGame();
            return;
          }

          if (gameState === 'playing' && canTurn(touchDirection)) {
            nextDirection = touchDirection;
          }
        },
        { passive: false }
      );
    });

    let touchStartX = null;
    let touchStartY = null;

    canvas.addEventListener(
      'touchstart',
      (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    canvas.addEventListener(
      'touchend',
      (event) => {
        if (touchStartX === null || touchStartY === null) return;

        const dx = event.changedTouches[0].clientX - touchStartX;
        const dy = event.changedTouches[0].clientY - touchStartY;
        const minSwipe = 30;

        if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
          if (gameState === 'idle' || gameState === 'over') startGame();
          else pauseGame();
          touchStartX = null;
          touchStartY = null;
          return;
        }

        const newDirection =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? { x: 1, y: 0 }
              : { x: -1, y: 0 }
            : dy > 0
              ? { x: 0, y: 1 }
              : { x: 0, y: -1 };

        if (gameState === 'playing' && canTurn(newDirection)) {
          nextDirection = newDirection;
        }

        touchStartX = null;
        touchStartY = null;
      },
      { passive: true }
    );
  }

  function bindButtons() {
    document.getElementById('btn-start-snake')?.addEventListener('click', startGame);
    document.getElementById('btn-pause')?.addEventListener('click', pauseGame);
    document.getElementById('btn-restart-snake')?.addEventListener('click', startGame);
    document.getElementById('btn-restart-gameover')?.addEventListener('click', startGame);

    modeButtons.forEach(button => {
      button.addEventListener('click', () => setMode(button.dataset.mode, true));
    });
  }

  return { init };
})();

function playSound(type) {
  if (window.Utils) window.Utils.playSound(type);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', SnakeGame.init);
} else {
  SnakeGame.init();
}
