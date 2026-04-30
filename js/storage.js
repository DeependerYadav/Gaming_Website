/* =============================================
   storage.js — LocalStorage Manager
   Mini Games Hub
   ============================================= */

/**
 * AppStorage — Centralized storage manager for all game data.
 * Uses localStorage with JSON serialization and graceful error handling.
 */
const AppStorage = (() => {
  // Storage keys
  const KEYS = {
    SCORES:        'mgh_scores',
    SETTINGS:      'mgh_settings',
    TOTAL_PLAYS:   'mgh_total_plays',
    HISTORY:       'mgh_history',
  };

  // Default settings
  const DEFAULT_SETTINGS = {
    soundEnabled:       true,
    animationsEnabled:  true,
    difficulty:         'medium',
    snakeSpeed:         5,
  };

  /* ----- Low-level Helpers ----- */

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Storage] Read error:', e);
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[Storage] Write error:', e);
      return false;
    }
  }

  /* ----- Scores API ----- */

  /**
   * Get all stored scores
   * @returns {Object} { snake: number, memory: number|null, tictactoe: number }
   */
  function getScores() {
    return read(KEYS.SCORES) || {
      snake:     0,
      memory:    null,  // Best time in seconds (lower = better)
      tictactoe: 0,
    };
  }

  /**
   * Save a score for a specific game.
   * For snake and tictactoe: higher is better.
   * For memory: lower (seconds) is better.
   *
   * @param {string} game - 'snake' | 'memory' | 'tictactoe'
   * @param {number} score - The score value
   * @returns {boolean} Whether this is a new high score
   */
  function saveScore(game, score) {
    const scores = getScores();
    let isNewBest = false;

    if (game === 'memory') {
      // Lower time = better
      if (scores.memory === null || score < scores.memory) {
        scores.memory = score;
        isNewBest = true;
      }
    } else {
      // Higher score = better
      if (score > (scores[game] || 0)) {
        scores[game] = score;
        isNewBest = true;
      }
    }

    write(KEYS.SCORES, scores);

    // Save to history
    addToHistory(game, score, isNewBest);

    return isNewBest;
  }

  /**
   * Clear all scores for all games
   */
  function clearAllScores() {
    write(KEYS.SCORES, {
      snake:     0,
      memory:    null,
      tictactoe: 0,
    });
    write(KEYS.HISTORY, []);
    write(KEYS.TOTAL_PLAYS, 0);
  }

  /* ----- History API ----- */

  /**
   * Add an entry to the play history
   */
  function addToHistory(game, score, isNewBest = false) {
    const history = getHistory();
    history.unshift({
      game,
      score,
      isNewBest,
      timestamp: Date.now()
    });

    // Keep only last 50 entries
    if (history.length > 50) history.pop();

    write(KEYS.HISTORY, history);
  }

  /**
   * Get the full play history
   */
  function getHistory() {
    return read(KEYS.HISTORY) || [];
  }

  /**
   * Get history filtered by game
   */
  function getGameHistory(game) {
    return getHistory().filter(entry => entry.game === game);
  }

  /* ----- Total Plays Counter ----- */

  /**
   * Increment and return the total play count
   */
  function incrementPlays() {
    const count = (read(KEYS.TOTAL_PLAYS) || 0) + 1;
    write(KEYS.TOTAL_PLAYS, count);
    return count;
  }

  /**
   * Get total play count
   */
  function getTotalPlays() {
    return read(KEYS.TOTAL_PLAYS) || 0;
  }

  /* ----- Settings API ----- */

  /**
   * Get user settings, merged with defaults
   */
  function getSettings() {
    const saved = read(KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  }

  /**
   * Save a single setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  function setSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    write(KEYS.SETTINGS, settings);
  }

  /**
   * Save multiple settings at once
   */
  function saveSettings(partial) {
    const settings = getSettings();
    Object.assign(settings, partial);
    write(KEYS.SETTINGS, settings);
  }

  /**
   * Reset settings to defaults
   */
  function resetSettings() {
    write(KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  }

  /* ----- Public API ----- */
  return {
    getScores,
    saveScore,
    clearAllScores,
    addToHistory,
    getHistory,
    getGameHistory,
    incrementPlays,
    getTotalPlays,
    getSettings,
    setSetting,
    saveSettings,
    resetSettings,
    KEYS
  };
})();

// Expose globally
window.AppStorage = AppStorage;
