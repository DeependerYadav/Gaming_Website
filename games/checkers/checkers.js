/* =============================================
   checkers.js — Checkers Game Engine (Clean Rewrite)
   Mini Games Hub
   ============================================= */
(function () {
  'use strict';

  /* Constants */
  var E = 0, R = 1, B = 2, RK = 3, BK = 4;

  /* State */
  var board, turn, sel, moves, alive, stats, jumping;

  /* DOM */
  var dom = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    dom.board = $('chk-board');
    dom.turnText = $('chk-turn-text');
    dom.turnBox = $('chk-turn');
    dom.redCount = $('red-pieces');
    dom.blackCount = $('black-pieces');
    dom.wins = $('chk-wins');
    dom.overlay = $('chk-overlay');
    dom.gameover = $('chk-gameover');
    dom.goTitle = $('chk-go-title');
    dom.goScore = $('chk-go-score');
    dom.goEmoji = $('chk-go-emoji');

    stats = { wins: 0 };
    try {
      var s = JSON.parse(localStorage.getItem('checkers-stats'));
      if (s && s.wins) stats.wins = s.wins;
    } catch (e) {}
    dom.wins.textContent = stats.wins;

    $('btn-start-chk').addEventListener('click', start);
    $('btn-retry-chk').addEventListener('click', start);
    $('btn-restart-chk').addEventListener('click', start);
  }

  /* ---- Start ---- */
  function start() {
    board = [];
    for (var r = 0; r < 8; r++) {
      board[r] = [];
      for (var c = 0; c < 8; c++) {
        board[r][c] = E;
        if ((r + c) % 2 === 1) {
          if (r < 3) board[r][c] = B;
          else if (r > 4) board[r][c] = R;
        }
      }
    }
    turn = R;
    sel = null;
    moves = [];
    alive = true;
    jumping = null;
    dom.overlay.classList.add('hidden');
    dom.gameover.classList.add('hidden');
    draw();
  }

  /* ---- Draw Board ---- */
  function draw() {
    dom.board.innerHTML = '';

    // Count pieces
    var rc = 0, bc = 0;
    for (var i = 0; i < 8; i++)
      for (var j = 0; j < 8; j++) {
        var v = board[i][j];
        if (v === R || v === RK) rc++;
        if (v === B || v === BK) bc++;
      }
    dom.redCount.textContent = rc;
    dom.blackCount.textContent = bc;

    // Turn indicator
    var disc = dom.turnBox.querySelector('.chk-disc');
    if (turn === R) {
      disc.className = 'chk-disc chk-disc-red small';
      dom.turnText.textContent = 'Your Turn';
    } else {
      disc.className = 'chk-disc chk-disc-black small';
      dom.turnText.textContent = 'AI Thinking...';
    }

    // Find which red pieces MUST jump (mandatory capture rule)
    var forcedJumpers = [];
    if (turn === R && alive && !jumping) {
      forcedJumpers = findPiecesWithJumps(R);
    }

    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var cell = document.createElement('div');
        cell.className = 'chk-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

        // Draw move dots
        var moveHere = null;
        for (var mi = 0; mi < moves.length; mi++) {
          if (moves[mi].tr === r && moves[mi].tc === c) { moveHere = moves[mi]; break; }
        }
        if (moveHere) {
          cell.classList.add(moveHere.cr !== undefined ? 'capture-highlight' : 'highlight');
          (function (m) {
            cell.addEventListener('click', function () { doMove(m); });
          })(moveHere);
        }

        // Draw pieces
        var p = board[r][c];
        if (p !== E) {
          var el = document.createElement('div');
          var isRed = (p === R || p === RK);
          el.className = 'chk-piece ' + (isRed ? 'red' : 'black');
          if (p === RK || p === BK) el.classList.add('king');
          if (sel && sel.r === r && sel.c === c) el.classList.add('selected');

          // Make red pieces clickable on player turn
          if (isRed && turn === R && alive) {
            var canClick = true;
            // If we're mid-multi-jump, only that piece is clickable
            if (jumping) {
              canClick = (jumping.r === r && jumping.c === c);
            }
            // If forced jumps exist, only those pieces are clickable
            else if (forcedJumpers.length > 0) {
              canClick = false;
              for (var fi = 0; fi < forcedJumpers.length; fi++) {
                if (forcedJumpers[fi].r === r && forcedJumpers[fi].c === c) { canClick = true; break; }
              }
            }

            if (canClick) {
              el.classList.add('selectable');
              (function (row, col) {
                el.addEventListener('click', function (e) {
                  e.stopPropagation();
                  pickPiece(row, col);
                });
              })(r, c);
            }
          }
          cell.appendChild(el);
        }

        dom.board.appendChild(cell);
      }
    }
  }

  /* ---- Get Moves for a Piece ---- */
  function getMoves(r, c) {
    var p = board[r][c];
    if (p === E) return [];
    var isRed = (p === R || p === RK);
    var isKing = (p === RK || p === BK);

    var dirs = [];
    if (isRed || isKing) { dirs.push([-1, -1]); dirs.push([-1, 1]); }
    if (!isRed || isKing) { dirs.push([1, -1]); dirs.push([1, 1]); }

    var result = [];
    for (var d = 0; d < dirs.length; d++) {
      var dr = dirs[d][0], dc = dirs[d][1];
      var nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;

      if (board[nr][nc] === E) {
        // Normal move
        result.push({ fr: r, fc: c, tr: nr, tc: nc });
      } else {
        // Check jump
        var target = board[nr][nc];
        var enemy = isRed ? (target === B || target === BK) : (target === R || target === RK);
        if (enemy) {
          var jr = nr + dr, jc = nc + dc;
          if (jr >= 0 && jr <= 7 && jc >= 0 && jc <= 7 && board[jr][jc] === E) {
            result.push({ fr: r, fc: c, tr: jr, tc: jc, cr: nr, cc: nc });
          }
        }
      }
    }
    return result;
  }

  /* Find all pieces of a player that have jumps */
  function findPiecesWithJumps(player) {
    var pieces = [];
    var seen = {};
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        var own = (player === R) ? (p === R || p === RK) : (p === B || p === BK);
        if (!own) continue;
        var m = getMoves(r, c);
        for (var i = 0; i < m.length; i++) {
          if (m[i].cr !== undefined) {
            var key = r + ',' + c;
            if (!seen[key]) { seen[key] = true; pieces.push({ r: r, c: c }); }
            break;
          }
        }
      }
    }
    return pieces;
  }

  /* Check if player has ANY legal moves */
  function hasAnyMoves(player) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        var own = (player === R) ? (p === R || p === RK) : (p === B || p === BK);
        if (own && getMoves(r, c).length > 0) return true;
      }
    }
    return false;
  }

  /* ---- Pick Piece ---- */
  function pickPiece(r, c) {
    if (!alive || turn !== R) return;

    sel = { r: r, c: c };
    var allMoves = getMoves(r, c);

    // If ANY red piece has a jump, we must only show jumps
    var forcedJumpers = jumping ? [jumping] : findPiecesWithJumps(R);
    if (forcedJumpers.length > 0) {
      // Filter to only capture moves
      moves = [];
      for (var i = 0; i < allMoves.length; i++) {
        if (allMoves[i].cr !== undefined) moves.push(allMoves[i]);
      }
    } else {
      moves = allMoves;
    }

    draw();
  }

  /* ---- Execute Move ---- */
  function doMove(m) {
    if (!alive || turn !== R) return;

    // Move the piece
    var piece = board[m.fr][m.fc];
    board[m.fr][m.fc] = E;
    board[m.tr][m.tc] = piece;

    // Remove captured piece
    if (m.cr !== undefined) {
      board[m.cr][m.cc] = E;
    }

    // King promotion
    if (m.tr === 0 && piece === R) {
      board[m.tr][m.tc] = RK;
    }

    // Check multi-jump
    if (m.cr !== undefined) {
      var nextJumps = getMoves(m.tr, m.tc);
      var moreJumps = [];
      for (var i = 0; i < nextJumps.length; i++) {
        if (nextJumps[i].cr !== undefined) moreJumps.push(nextJumps[i]);
      }
      if (moreJumps.length > 0) {
        sel = { r: m.tr, c: m.tc };
        moves = moreJumps;
        jumping = { r: m.tr, c: m.tc };
        draw();
        return; // Player must continue jumping
      }
    }

    // End player turn
    sel = null;
    moves = [];
    jumping = null;

    // Check win conditions
    if (checkEnd()) return;

    // Switch to AI
    turn = B;
    draw();

    if (!hasAnyMoves(B)) {
      gameOver(R);
      return;
    }

    setTimeout(aiTurn, 450);
  }

  /* ---- AI Turn ---- */
  function aiTurn() {
    if (!alive || turn !== B) return;

    // Gather all AI moves
    var allMoves = [];
    var allJumps = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (p !== B && p !== BK) continue;
        var m = getMoves(r, c);
        for (var i = 0; i < m.length; i++) {
          allMoves.push(m[i]);
          if (m[i].cr !== undefined) allJumps.push(m[i]);
        }
      }
    }

    // Must jump if possible
    var pool = allJumps.length > 0 ? allJumps : allMoves;

    if (pool.length === 0) {
      gameOver(R);
      return;
    }

    // Simple scoring (no board mutation — just static evaluation)
    var best = [];
    var bestScore = -9999;

    for (var i = 0; i < pool.length; i++) {
      var score = 0;
      var mv = pool[i];

      if (mv.cr !== undefined) score += 10;
      if (mv.tr === 7 && board[mv.fr][mv.fc] === B) score += 8;
      if (mv.tc >= 2 && mv.tc <= 5) score += 2;
      if (mv.fr === 0 && board[mv.fr][mv.fc] === B && mv.cr === undefined) score -= 3;

      if (score > bestScore) { bestScore = score; best = [mv]; }
      else if (score === bestScore) { best.push(mv); }
    }

    var chosen = best[Math.floor(Math.random() * best.length)];
    executeAI(chosen);
  }

  function executeAI(m) {
    var piece = board[m.fr][m.fc];
    board[m.fr][m.fc] = E;
    board[m.tr][m.tc] = piece;

    if (m.cr !== undefined) {
      board[m.cr][m.cc] = E;
    }

    // King promotion
    if (m.tr === 7 && piece === B) {
      board[m.tr][m.tc] = BK;
    }

    // Multi-jump for AI
    if (m.cr !== undefined) {
      var nextJumps = getMoves(m.tr, m.tc);
      var moreJumps = [];
      for (var i = 0; i < nextJumps.length; i++) {
        if (nextJumps[i].cr !== undefined) moreJumps.push(nextJumps[i]);
      }
      if (moreJumps.length > 0) {
        draw();
        var next = moreJumps[Math.floor(Math.random() * moreJumps.length)];
        setTimeout(function () { executeAI(next); }, 350);
        return;
      }
    }

    // Check win
    if (checkEnd()) return;

    // Switch to player
    turn = R;
    sel = null;
    moves = [];
    jumping = null;
    draw();

    if (!hasAnyMoves(R)) {
      gameOver(B);
    }
  }

  /* ---- Win Check ---- */
  function checkEnd() {
    var rc = 0, bc = 0;
    for (var r = 0; r < 8; r++)
      for (var c = 0; c < 8; c++) {
        if (board[r][c] === R || board[r][c] === RK) rc++;
        if (board[r][c] === B || board[r][c] === BK) bc++;
      }
    if (bc === 0) { gameOver(R); return true; }
    if (rc === 0) { gameOver(B); return true; }
    return false;
  }

  function gameOver(winner) {
    alive = false;
    draw();
    if (winner === R) {
      stats.wins++;
      localStorage.setItem('checkers-stats', JSON.stringify(stats));
      dom.wins.textContent = stats.wins;
      dom.goEmoji.textContent = '🏆';
      dom.goTitle.textContent = 'You Win!';
      dom.goScore.textContent = 'You captured all enemy pieces!';
    } else {
      dom.goEmoji.textContent = '💀';
      dom.goTitle.textContent = 'AI Wins!';
      dom.goScore.textContent = 'Better luck next time!';
    }
    setTimeout(function () { dom.gameover.classList.remove('hidden'); }, 600);
  }

  /* ---- Boot ---- */
  init();
})();
