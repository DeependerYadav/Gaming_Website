const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');

const gameContents = {
  'snake': `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About the Classic Snake Game</h2>
      <p style="margin-bottom: 1rem;">The Snake game is one of the most iconic and recognizable video games in history. Originally popularized in the late 1990s on Nokia mobile phones, it has since become a staple of casual gaming. In this modern web version, you guide a growing snake around the screen, consuming food to increase your length while carefully avoiding collisions with the walls and your own tail. It is a fantastic test of reflexes, spatial awareness, and strategic planning.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play Snake Online</h2>
      <p style="margin-bottom: 1rem;">Playing Snake is incredibly straightforward but difficult to master. When the game begins, your snake moves forward automatically. Use the arrow keys (Up, Down, Left, Right) or WASD keys on your keyboard to change the snake's direction. If you are playing on a mobile device, use the on-screen touch controls to navigate. Your primary objective is to eat the food blocks that spawn randomly on the grid. Each time you eat a piece of food, your score increases, and your snake grows one segment longer.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Tips and Strategies for High Scores</h2>
      <p style="margin-bottom: 1rem;">To achieve a massive high score in Snake, you need to think a few moves ahead. As your snake gets longer, the screen becomes more crowded, leaving you with less room to maneuver. Try to keep your snake moving in a zig-zag or coiled pattern to maximize space. Avoid rushing toward the food; instead, plan a safe route that doesn't trap your head. Look out for the special Golden Food! Eating it provides a significant score boost and a temporary speed surge, which can be thrilling but dangerous. If things get too intense, remember you can press the Spacebar to pause the game and plan your next move.</p>
    </div>
  `,
  'tetris': `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About Tetris</h2>
      <p style="margin-bottom: 1rem;">Tetris is a globally renowned puzzle game created in 1984 by Alexey Pajitnov. It challenges players to arrange falling blocks, known as tetrominoes, to form complete horizontal lines without any gaps. When a line is completed, it clears from the board, earning points and making room for new pieces. Over decades, Tetris has proven to be an addictive test of logic, quick thinking, and adaptability.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play Tetris Free Online</h2>
      <p style="margin-bottom: 1rem;">The mechanics of Tetris are simple yet deeply strategic. Use the Left and Right arrow keys to move the falling tetromino. Press the Up arrow to rotate the piece so it fits perfectly into the stack below. If you want the piece to fall faster, use the Down arrow for a Soft Drop. For an instant placement, press the Spacebar to execute a Hard Drop. You can also press 'C' to Hold a piece for later use. The game ends if your stack of blocks reaches the top of the playing field.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Tips to Improve Your Tetris Score</h2>
      <p style="margin-bottom: 1rem;">The key to a high score in Tetris is clearing multiple lines at once. Aim for a "Tetris" by clearing four lines simultaneously using the long, straight "I" block. Build a solid, flat foundation, leaving a single open column for the "I" block. Always keep an eye on the "NEXT" piece preview panel so you can plan your placements in advance. As you clear more lines, your level increases, and the pieces fall faster, requiring faster reflexes and sharper focus.</p>
    </div>
  `,
  '2048': `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About 2048</h2>
      <p style="margin-bottom: 1rem;">2048 is a mathematically engaging puzzle game that took the internet by storm. The objective is seemingly simple: slide numbered tiles on a 4x4 grid to combine matching numbers until you reach the elusive 2048 tile. Despite its simple premise, 2048 requires deep strategic thinking and foresight, making it a brilliant brain-training exercise that will keep you captivated for hours.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play 2048 Puzzle</h2>
      <p style="margin-bottom: 1rem;">Use the arrow keys on your keyboard (or swipe on a touchscreen) to move all tiles in a specific direction. When two tiles with the same number touch, they merge into one tile with double the value (e.g., two 4s merge into an 8). Every time you make a move, a new tile (either a 2 or a 4) spawns randomly on an empty spot on the board. The game ends when the board fills up entirely and no more valid moves are possible.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Winning Strategy & Tips</h2>
      <p style="margin-bottom: 1rem;">To consistently beat 2048, try the popular "corner strategy." Pick a specific corner (e.g., the bottom-right corner) and keep your highest-value tile there. Only use the Down and Right arrow keys as much as possible to keep the large tiles anchored. Avoid swiping Up or Left unless absolutely necessary, as this will move your large tile out of the corner and scramble your board. By building a cascading chain of numbers toward your corner, you can systematically merge tiles and eventually achieve 2048.</p>
    </div>
  `,
  'memory': `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About Memory Match</h2>
      <p style="margin-bottom: 1rem;">Memory Match, also known as Concentration or Pairs, is a classic brain-training game that challenges your short-term memory and focus. The goal is to find all the matching pairs of cards hidden face-down on the board. It's an excellent game for players of all ages, helping to improve cognitive function, pattern recognition, and visual memory in a fun, relaxed environment.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play</h2>
      <p style="margin-bottom: 1rem;">The game starts with a grid of cards placed face down. Click or tap any card to flip it over and reveal its icon. Then, select a second card. If the two cards have the identical icon, they remain face up, and you've found a match! If they do not match, both cards will flip back down after a brief pause. You must remember where specific icons are located as you continue flipping cards. The game is won when every pair has been matched.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Tips to Improve Your Memory Score</h2>
      <p style="margin-bottom: 1rem;">To beat your best time, try to develop a systematic approach. Instead of clicking randomly, flip cards in a specific order (like row by row) so you can mentally map the board. Say the names of the icons out loud when you reveal them; verbalizing the image can significantly boost your short-term recall. Minimize wild guesses and try to only flip cards when you are confident you remember where the matching pair is.</p>
    </div>
  `,
  'minesweeper': `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About Minesweeper</h2>
      <p style="margin-bottom: 1rem;">Minesweeper is a legendary logic puzzle game that became a household name in the 1990s as a built-in game on early Windows operating systems. It is a thrilling blend of careful deduction and pure luck. The objective is to clear a rectangular grid containing hidden "mines" or bombs without detonating any of them. It requires patience, analytical thinking, and the ability to calculate probabilities on the fly.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play the Classic Mine Game</h2>
      <p style="margin-bottom: 1rem;">Clicking a tile reveals what is underneath. If you click a mine, the game is over. If the tile is safe, it will display a number indicating exactly how many mines are hiding in the adjacent squares (including diagonals). Using these numbers, you must deduce which covered squares are safe to click and which contain bombs. When you identify a bomb, right-click (or long-press on mobile) to plant a flag and mark it as dangerous. The game is won when all safe squares are revealed.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Minesweeper Logic & Strategy</h2>
      <p style="margin-bottom: 1rem;">Always start with the corners or edges, as they usually open up large safe zones. Look for "1-2-1" or "1-2-2-1" patterns, which are common logical setups that reveal exact mine locations. If a tile shows a "1" and there is only one unrevealed square touching it, that square absolutely must be a mine. Conversely, if a tile shows a "1" and you have already flagged one mine touching it, all other adjacent squares are safe to click. Never guess unless you have exhausted all logical deduction!</p>
    </div>
  `
};

// Generic fallback content for games not explicitly listed above
const genericContent = `
    <div class="seo-content" style="margin-top: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; line-height: 1.6; color: var(--clr-text-secondary);">
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">About This Mini Game</h2>
      <p style="margin-bottom: 1rem;">Welcome to one of our classic browser mini games! This game is designed to be highly engaging, fast-loading, and completely free to play. Whether you are looking to kill some time on your commute or want to challenge your reflexes and brainpower, this arcade-style experience offers endless entertainment right in your browser with no downloads required.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">How to Play Free Online</h2>
      <p style="margin-bottom: 1rem;">The controls are intuitive and designed for both desktop and mobile devices. Use your mouse, keyboard, or touchscreen to interact with the game. Your goal is to maximize your score, beat your personal best, and survive as long as possible. Pay attention to the in-game control hints provided on the screen, and don't be afraid to pause the game if you need a breather.</p>
      
      <h2 style="color: var(--clr-text-primary); font-family: var(--font-display); font-size: 1.2rem; margin-bottom: 0.8rem;">Tips for High Scores</h2>
      <p style="margin-bottom: 1rem;">Practice makes perfect! In fast-paced arcade games, quick reflexes and spatial awareness are key. Keep your eyes focused on the center of the screen to maintain maximum visibility. In puzzle or strategy games, take your time to plan your moves ahead rather than rushing. Remember that your high scores are saved locally in your browser, so you can always come back tomorrow and try to beat your own record.</p>
    </div>
`;

function processGames() {
  const folders = fs.readdirSync(gamesDir);
  let updatedCount = 0;
  
  for (const folder of folders) {
    const indexPath = path.join(gamesDir, folder, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      
      if (html.includes('class="seo-content"')) {
        console.log("Skipping " + folder + ", already has SEO content.");
        continue;
      }

      // Determine content to inject
      const content = gameContents[folder] || genericContent;
      
      // Inject before the AD banner or closing game-container
      const injectionTarget = '<!-- AD: Game Page Bottom Banner';
      
      if (html.includes(injectionTarget)) {
        html = html.replace(injectionTarget, content + '\\n    ' + injectionTarget);
        fs.writeFileSync(indexPath, html, 'utf-8');
        console.log("Successfully updated " + folder);
        updatedCount++;
      } else {
         // Fallback if the AD comment is missing
         const fallbackTarget = '</div><!-- /game-container -->';
         if (html.includes(fallbackTarget)) {
            html = html.replace(fallbackTarget, content + '\\n' + fallbackTarget);
            fs.writeFileSync(indexPath, html, 'utf-8');
            console.log("Successfully updated " + folder + " (using fallback target)");
            updatedCount++;
         } else {
            console.log("Could not find injection target in " + folder);
         }
      }
    }
  }
  
  console.log("\\nDone! Updated " + updatedCount + " game pages.");
}

processGames();
