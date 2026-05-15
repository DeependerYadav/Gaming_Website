/* =============================================
   how-to-play.js — Shared "How to Play" Panel
   Mini Games Hub — Auto-injects into every game page
   
   Detects which game page is loaded and injects
   the appropriate rules, controls, and tips.
   ============================================= */

(function () {
  'use strict';

  /* ---- Game Rules Database ---- */
  const GAME_RULES = {
    snake: {
      title: 'Snake',
      icon: '🐍',
      rules: [
        'Guide the snake to eat the food that appears on the board.',
        'Each food item makes the snake grow longer.',
        'Don\'t crash into the walls or your own tail — the game ends if you do.',
        'The speed increases as your snake gets longer.',
        'Try to get the highest score possible!'
      ],
      controls: [
        ['↑ ↓ ← →', 'Move snake'],
        ['WASD', 'Alternative movement'],
        ['P', 'Pause / Resume'],
        ['Swipe', 'Touch controls (mobile)']
      ],
      tips: 'Plan ahead! Try to keep open paths and avoid boxing yourself into corners.'
    },

    memory: {
      title: 'Memory Match',
      icon: '🧠',
      rules: [
        'Flip two cards at a time to find matching pairs.',
        'If the two cards match, they stay face-up.',
        'If they don\'t match, both cards flip back face-down.',
        'Find all pairs to complete the game.',
        'Try to use as few moves as possible and finish quickly!'
      ],
      controls: [
        ['Click/Tap', 'Flip a card'],
        ['Memory', 'Remember card positions']
      ],
      tips: 'Focus on remembering positions! Start with corners and edges to build a mental map.'
    },

    tictactoe: {
      title: 'Tic Tac Toe',
      icon: '✖',
      rules: [
        'Two players take turns placing X or O on a 3×3 grid.',
        'The first player to get 3 marks in a row (horizontal, vertical, or diagonal) wins.',
        'If all 9 squares are filled and no one has 3 in a row, it\'s a draw.',
        'In AI mode, the computer plays as O with adjustable difficulty.',
        'The starting player alternates each round.'
      ],
      controls: [
        ['Click/Tap', 'Place your mark'],
        ['Mode', 'Choose 2P or vs AI'],
        ['Difficulty', 'Easy / Medium / Hard']
      ],
      tips: 'Take the center square first! It gives you the most winning opportunities.'
    },

    '2048': {
      title: '2048',
      icon: '🔢',
      rules: [
        'Slide tiles on a 4×4 grid in any of 4 directions.',
        'When two tiles with the same number touch, they merge into one tile with their sum.',
        'A new tile (2 or 4) appears after each move.',
        'Reach the 2048 tile to win — or keep going for an even higher score!',
        'The game ends when no more moves are possible.'
      ],
      controls: [
        ['↑ ↓ ← →', 'Slide tiles'],
        ['WASD', 'Alternative controls'],
        ['Swipe', 'Touch controls (mobile)']
      ],
      tips: 'Keep your highest tile in a corner and build up along the edges. Never move it away from the corner!'
    },

    minesweeper: {
      title: 'Minesweeper',
      icon: '💣',
      rules: [
        'Click cells to reveal them. Numbers show how many adjacent mines there are.',
        'Use numbers as clues to figure out where the mines are hidden.',
        'Right-click (or long press) to flag a cell you think contains a mine.',
        'Reveal all non-mine cells to win the game.',
        'Clicking a mine ends the game immediately!'
      ],
      controls: [
        ['Left Click', 'Reveal cell'],
        ['Right Click', 'Flag/unflag cell'],
        ['Long Press', 'Flag (mobile)'],
        ['Difficulty', 'Easy / Medium / Hard']
      ],
      tips: 'Start by clicking the center or corners. When you see a "1" next to a single hidden cell, that cell is a mine!'
    },

    flappy: {
      title: 'Flappy Bird',
      icon: '🐦',
      rules: [
        'Tap or press Space to make the bird flap and fly upward.',
        'Navigate through the gaps between the green pipes.',
        'Don\'t touch the pipes or the ground — it\'s instant game over!',
        'Each pipe pair you pass through scores 1 point.',
        'The pipes are randomly positioned — stay focused!'
      ],
      controls: [
        ['Space', 'Flap wings'],
        ['Click/Tap', 'Flap wings'],
        ['Timing', 'Key to survival!']
      ],
      tips: 'Small, gentle taps work better than big flaps. Aim for the center of each gap.'
    },

    tetris: {
      title: 'Tetris',
      icon: '🟦',
      rules: [
        'Falling tetrominoes (blocks) must be arranged to fill complete horizontal rows.',
        'Completed rows disappear and score points.',
        'Clearing multiple rows at once scores more points (Tetris = 4 rows!).',
        'The game speeds up as you level up.',
        'The game ends when blocks stack up to the top of the board.'
      ],
      controls: [
        ['← →', 'Move left/right'],
        ['↑', 'Rotate piece'],
        ['↓', 'Soft drop (faster)'],
        ['Space', 'Hard drop (instant)'],
        ['P', 'Pause']
      ],
      tips: 'Keep the board flat and avoid creating holes. Save the I-piece (long bar) for clearing 4 rows at once!'
    },

    pingpong: {
      title: 'Ping Pong',
      icon: '🏓',
      rules: [
        'Move your paddle up and down to hit the ball back.',
        'Score points when your opponent misses the ball.',
        'First player to reach the winning score wins the match.',
        'The ball speeds up after each hit, making rallies more intense!',
        'In AI mode, the computer controls the opposite paddle.'
      ],
      controls: [
        ['↑ ↓', 'Move paddle'],
        ['W S', 'Alternative controls'],
        ['Touch/Drag', 'Move paddle (mobile)']
      ],
      tips: 'Hit the ball with the edge of your paddle to change its angle. Anticipate where the ball will go!'
    },

    whack: {
      title: 'Whack-a-Mole',
      icon: '🔨',
      rules: [
        'Moles pop up randomly from holes in the ground.',
        'Click or tap each mole as fast as you can to score points.',
        'Each mole only stays up for a short time before hiding.',
        'The moles appear faster as the game progresses.',
        'Score as many points as possible before time runs out!'
      ],
      controls: [
        ['Click/Tap', 'Whack a mole'],
        ['Speed', 'React quickly!'],
        ['Timer', 'Beat the clock']
      ],
      tips: 'Keep your cursor near the center of the grid and react to movement in your peripheral vision.'
    },

    typing: {
      title: 'Typing Speed Test',
      icon: '⌨️',
      rules: [
        'Type the displayed words as quickly and accurately as possible.',
        'Each correctly typed word scores points.',
        'Accuracy matters — mistakes reduce your score.',
        'Your WPM (Words Per Minute) is calculated in real-time.',
        'Choose between 15, 30, or 60 second time limits.'
      ],
      controls: [
        ['Keyboard', 'Type the words'],
        ['Tab', 'Restart test'],
        ['Timer', '15 / 30 / 60 seconds']
      ],
      tips: 'Focus on accuracy over speed first. Speed will naturally improve with fewer mistakes.'
    },

    sudoku: {
      title: 'Sudoku',
      icon: '🔢',
      rules: [
        'Fill the 9×9 grid so each row, column, and 3×3 box contains digits 1-9.',
        'Each number can only appear once per row, column, and box.',
        'Some numbers are pre-filled as clues — these cannot be changed.',
        'Use logic and elimination to determine the correct numbers.',
        'The puzzle is solved when all 81 cells are correctly filled.'
      ],
      controls: [
        ['Click/Tap', 'Select a cell'],
        ['1-9', 'Enter a number'],
        ['Delete', 'Clear a cell'],
        ['Hint', 'Reveal one cell']
      ],
      tips: 'Start with rows, columns, or boxes that have the most filled numbers. Look for "naked singles" — cells where only one number is possible.'
    },

    blockpuzzle: {
      title: 'Block Puzzle',
      icon: '🧩',
      rules: [
        'Drag and drop block shapes onto the 8×8 board.',
        'Complete full rows or columns to clear them and score points.',
        'Three new block shapes appear each round.',
        'Plan ahead — the game ends if no pieces can be placed!',
        'Clearing multiple lines at once gives bonus points.'
      ],
      controls: [
        ['Drag', 'Pick up a piece'],
        ['Drop', 'Place on the board'],
        ['Touch', 'Drag & drop (mobile)']
      ],
      tips: 'Try to fill rows AND columns simultaneously for combo bonuses. Keep the center area clear for flexibility.'
    },

    bubble: {
      title: 'Bubble Shooter',
      icon: '🫧',
      rules: [
        'Aim and shoot colored bubbles toward the cluster at the top.',
        'Match 3 or more bubbles of the same color to pop them.',
        'Bubbles hanging with no support also fall and score bonus points.',
        'Clear all bubbles from the board to win the level.',
        'If bubbles reach the bottom line, the game is over!'
      ],
      controls: [
        ['Mouse/Touch', 'Aim direction'],
        ['Click/Tap', 'Shoot bubble'],
        ['Angle', 'Bounce off walls']
      ],
      tips: 'Aim for clusters of the same color! Bouncing bubbles off the side walls lets you reach tricky spots.'
    },

    wordsearch: {
      title: 'Word Search',
      icon: '🔍',
      rules: [
        'Find all the hidden words in the letter grid.',
        'Words can be placed horizontally, vertically, or diagonally.',
        'Words may also be spelled backwards.',
        'Click/tap the first letter and drag to the last letter to select a word.',
        'Find all words to complete the puzzle!'
      ],
      controls: [
        ['Click + Drag', 'Select a word'],
        ['Touch + Drag', 'Select (mobile)'],
        ['Word List', 'Shows remaining words']
      ],
      tips: 'Scan for uncommon letters first (Q, X, Z). Once you find the first letter of a word, check all 8 directions.'
    },

    breakout: {
      title: 'Breakout',
      icon: '🧱',
      rules: [
        'Move the paddle left and right to bounce the ball upward.',
        'Break all the colored bricks to complete each level.',
        'Don\'t let the ball fall past your paddle — you\'ll lose a life!',
        'Different colored bricks may take multiple hits to break.',
        'Power-ups may drop from broken bricks for special abilities.'
      ],
      controls: [
        ['← →', 'Move paddle'],
        ['Mouse', 'Move paddle (desktop)'],
        ['Touch', 'Drag paddle (mobile)'],
        ['Space', 'Launch ball']
      ],
      tips: 'Aim the ball toward the top corners to trigger chain reactions. Catching the ball on the paddle edge changes its angle.'
    },

    connectfour: {
      title: 'Connect Four',
      icon: '🔴',
      rules: [
        'Players take turns dropping colored discs into a 7-column grid.',
        'Discs fall to the lowest available row in the chosen column.',
        'Connect 4 discs of your color in a row — horizontally, vertically, or diagonally — to win!',
        'If the board fills up with no winner, it\'s a draw.',
        'In AI mode, the computer plays as Yellow with smart strategy.'
      ],
      controls: [
        ['Click/Tap', 'Drop disc in column'],
        ['1-7', 'Select column (keyboard)'],
        ['Mode', 'vs AI or 2 Player']
      ],
      tips: 'Control the center column! It gives you the most connecting opportunities. Watch for your opponent\'s 3-in-a-row setups.'
    },

    hangman: {
      title: 'Hangman',
      icon: '📝',
      rules: [
        'A random word is chosen — you see only blank spaces for each letter.',
        'Guess one letter at a time by clicking or pressing a key.',
        'Correct guesses reveal all instances of that letter in the word.',
        'Wrong guesses draw a part of the hangman — you have 6 wrong guesses!',
        'Guess the full word before the hangman is fully drawn to win.'
      ],
      controls: [
        ['A-Z Keys', 'Guess a letter'],
        ['Click', 'On-screen keyboard'],
        ['Difficulty', 'Easy / Medium / Hard']
      ],
      tips: 'Start with common vowels (E, A, I, O) and consonants (T, N, S, R). The category hint narrows down possibilities!'
    },

    simon: {
      title: 'Simon Says',
      icon: '🎨',
      rules: [
        'Watch carefully as the colored pads light up in a sequence.',
        'After the sequence plays, repeat it by clicking the pads in the same order.',
        'Each round adds one more color to the sequence.',
        'One wrong click and the game is over!',
        'The sequence plays faster as you reach higher rounds.'
      ],
      controls: [
        ['Click/Tap', 'Press a color pad'],
        ['Watch', 'Memorize the sequence'],
        ['Repeat', 'Click in order']
      ],
      tips: 'Try associating each color with a spatial position rather than its name. Chunking the sequence into groups of 3-4 helps with longer patterns!'
    },

    checkers: {
      title: 'Checkers',
      icon: '♟️',
      rules: [
        'Red (you) and Black (AI) take turns moving pieces diagonally on dark squares.',
        'Regular pieces can only move forward (toward the opponent).',
        'Jump over an adjacent opponent piece to capture it — jumps are mandatory!',
        'If a multi-jump is available, you must continue jumping.',
        'Reach the opposite end of the board to promote your piece to a King, which can move backward too.'
      ],
      controls: [
        ['Click', 'Select your piece'],
        ['Click', 'Move to highlighted square'],
        ['Blue dots', 'Valid move positions'],
        ['Red dots', 'Capture moves']
      ],
      tips: 'Control the center of the board and try to get Kings early. Keep pieces on the back row as long as possible for defense!'
    },

    sliding: {
      title: 'Sliding Puzzle',
      icon: '🧩',
      rules: [
        'The board contains numbered tiles (1 to N²-1) with one empty space.',
        'Click or tap any tile directly adjacent (up, down, left, or right) to the empty space to slide it there.',
        'Arrange all tiles in numerical order from left to right, top to bottom.',
        'The empty space should end up in the bottom-right corner when you win.',
        'Complete the puzzle in as few moves and as little time as possible!'
      ],
      controls: [
        ['Click / Tap', 'Slide adjacent tile into empty space'],
        ['3×3', '8 tiles — Easy mode'],
        ['4×4', '15 tiles — Medium mode'],
        ['5×5', '24 tiles — Hard mode'],
        ['Shuffle', 'Generate a new puzzle']
      ],
      tips: 'Solve the top rows first, then work down row by row. For the last two positions in a row, use a rotation trick: slide pieces into an L-shape and rotate them into place!'
    },

    rps: {
      title: 'Rock Paper Scissors',
      icon: '✊',
      rules: [
        'Choose Rock ✊, Paper ✋, or Scissors ✌️ as your move each round.',
        'Rock crushes Scissors, Scissors cuts Paper, Paper covers Rock.',
        'In Best of 3, the first player to win 2 rounds wins the match.',
        'In Best of 5, the first player to win 3 rounds wins the match.',
        'In Endless mode, play as many rounds as you like — the score keeps accumulating!'
      ],
      controls: [
        ['✊ Rock', 'Beats Scissors'],
        ['✋ Paper', 'Beats Rock'],
        ['✌️ Scissors', 'Beats Paper'],
        ['Click / Tap', 'Choose your move'],
        ['Mode bar', 'Switch Best of 3 / 5 / Endless']
      ],
      tips: 'The AI tracks your last 5 moves and occasionally tries to counter your most-used choice. Mix up your picks to keep it guessing — and watch the round pips to see who\'s ahead!'
    }
  };

  /* ---- Detect Current Game ---- */
  function detectGame() {
    const path = window.location.pathname.toLowerCase();
    for (const key of Object.keys(GAME_RULES)) {
      if (path.includes('/games/' + key + '/') || path.includes('/games/' + key + '\\')) {
        return key;
      }
    }
    // Fallback: try matching folder name
    const match = path.match(/\/games\/([^/\\]+)/);
    if (match && GAME_RULES[match[1]]) return match[1];
    return null;
  }

  /* ---- Build Panel HTML ---- */
  function buildPanel(game) {
    const data = GAME_RULES[game];
    if (!data) return;

    // Build rules list
    const rulesHTML = data.rules.map(r => `<li>${r}</li>`).join('');

    // Build controls grid
    const controlsHTML = data.controls.map(([key, desc]) =>
      `<span class="htp-key">${key}</span><span class="htp-key-desc">${desc}</span>`
    ).join('');

    // Build tip
    const tipHTML = data.tips
      ? `<div class="htp-tip"><i class="fa-solid fa-lightbulb"></i><span>${data.tips}</span></div>`
      : '';

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'htp-toggle';
    toggleBtn.id = 'htp-toggle';
    toggleBtn.title = 'How to Play';
    toggleBtn.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    document.body.appendChild(toggleBtn);

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'htp-backdrop';
    backdrop.id = 'htp-backdrop';
    document.body.appendChild(backdrop);

    // Create panel
    const panel = document.createElement('aside');
    panel.className = 'htp-panel';
    panel.id = 'htp-panel';
    panel.innerHTML = `
      <div class="htp-header">
        <h2><i class="fa-solid fa-circle-question"></i> How to Play</h2>
        <button class="htp-close" id="htp-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="htp-body">
        <div class="htp-section">
          <div class="htp-section-title"><i class="fa-solid fa-gamepad"></i> ${data.title} — Rules</div>
          <ul class="htp-list">${rulesHTML}</ul>
        </div>
        <div class="htp-section">
          <div class="htp-section-title"><i class="fa-solid fa-keyboard"></i> Controls</div>
          <div class="htp-controls-grid">${controlsHTML}</div>
        </div>
        ${tipHTML ? `<div class="htp-section"><div class="htp-section-title"><i class="fa-solid fa-lightbulb"></i> Pro Tip</div>${tipHTML}</div>` : ''}
      </div>
    `;
    document.body.appendChild(panel);

    // Bind events
    toggleBtn.addEventListener('click', togglePanel);
    backdrop.addEventListener('click', closePanel);
    document.getElementById('htp-close').addEventListener('click', closePanel);

    // ESC key closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        closePanel();
      }
    });
  }

  function togglePanel() {
    const panel = document.getElementById('htp-panel');
    const toggle = document.getElementById('htp-toggle');
    const backdrop = document.getElementById('htp-backdrop');

    if (panel.classList.contains('open')) {
      closePanel();
    } else {
      panel.classList.add('open');
      toggle.classList.add('active');
      backdrop.classList.add('show');
    }
  }

  function closePanel() {
    const panel = document.getElementById('htp-panel');
    const toggle = document.getElementById('htp-toggle');
    const backdrop = document.getElementById('htp-backdrop');

    panel.classList.remove('open');
    toggle.classList.remove('active');
    backdrop.classList.remove('show');
  }

  /* ---- Init ---- */
  function init() {
    const game = detectGame();
    if (game) {
      buildPanel(game);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
