/* =============================================
   typing.js — Typing Speed Test (15 / 30 / 60s)
   Mini Games Hub — Premium Gaming UI
   ============================================= */
'use strict';

// ── Word bank (shorter words for fast 15s tests) ──
const WORDS = [
  'the','be','to','of','and','a','in','that','have','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','say',
  'her','she','or','an','will','my','one','all','would','there','their','what',
  'so','up','out','if','about','who','get','which','go','me','when','make','can',
  'like','time','no','just','him','know','take','people','into','year','your',
  'good','some','could','them','see','other','than','then','now','look','only',
  'come','its','over','think','also','back','after','use','two','how','our','work',
  'first','well','way','even','new','want','because','any','these','give','day',
  'most','us','great','between','need','large','often','hand','high','place',
  'hold','turn','same','tell','next','call','feel','try','ask','keep','light',
  'small','number','off','always','move','live','far','hard','start','might',
  'should','real','seem','give','open','find','still','close','face','set','put',
  'run','learn','plant','cover','food','sun','four','thought','head','under',
  'story','saw','left','while','along','might','show','form','every','stand',
  'own','page','found','still','answer','school','grow','study','plant','care',
  'line','set','own','end','home','read','hand','port','large','spell','add',
  'land','here','must','big','high','such','follow','act','why','asked','men',
  'change','went','light','kind','off','play','spell','air','away','animal','house',
  'point','page','letter','mother','answer','found','study','still','learn','should',
  'earth','world','father','keep','children','feet','carry','took','science','eat',
  'room','friend','began','idea','fish','mountain','stop','once','base','hear',
  'horse','cut','sure','watch','color','face','wood','main','enough','plain','girl',
  'usual','young','ready','above','ever','red','list','though','feel','talk','bird',
  'soon','body','dog','family','direct','pose','leave','song','measure','door',
  'product','black','short','numeral','class','wind','question','happen','complete',
  'ship','area','half','rock','order','fire','south','problem','piece','told',
  'knew','pass','since','top','whole','king','space','heard','best','hour','better',
  'true','during','hundred','five','remember','step','early','hold','west','ground',
  'interest','reach','fast','five','sing','listen','six','table','travel','less',
  'morning','ten','simple','several','vowel','toward','war','lay','against','pattern',
  'slow','center','love','person','money','serve','appear','road','map','rain','rule',
  'govern','pull','cold','notice','voice','unit','power','town','fine','drive','wrote',
  'industry','wash','block','spread','cattle','wife','sharp','company','radio','until',
  'though','language','shape','deep','thousands','yes','clear','equation','yet','government',
  'filled','heat','full','hot','check','object','am','rule','among','noun','power',
  'cannot','able','six','size','dark','ball','material','special','heavy','fine','pair',
  'circle','include','built','can\'t','matter','square','syllables','perhaps','bill',
  'felt','suddenly','test','direction','centre','farmers','ready','anything','divided',
  'general','energy','subject','Europe','moon','region','return','believe','dance','members',
  'picked','simple','cells','paint','mind','love','cause','rain','exercise','eggs',
  'train','blue','wish','drop','developed','window','difference','distance','heart','sit',
  'sum','summer','wall','forest','probably','legs','sat','main','winter','wide','written',
  'length','reason','kept','interest','arms','brother','race','present','beautiful','store',
  'job','edge','past','sign','record','finished','discovered','wild','happy','beside',
  'gone','sky','glass','million','west','lay','weather','root','instruments','meet'
];

// ── Config per mode ──
const MODE_CFG = {
  15:  { label: '15-Second Sprint', words: 30  },
  30:  { label: '30-Second Rush',   words: 60  },
  60:  { label: '60-Second Test',   words: 120 },
};

// ── DOM refs ──
const textDisplay  = document.getElementById('text-display');
const typingInput  = document.getElementById('typing-input');
const wpmEl        = document.getElementById('wpm');
const accuracyEl   = document.getElementById('accuracy');
const countdownEl  = document.getElementById('countdown');
const bestWpmEl    = document.getElementById('best-wpm');
const resultPanel  = document.getElementById('result-panel');
const passageTitle = document.getElementById('passage-title');
const rWpm         = document.getElementById('r-wpm');
const rAcc         = document.getElementById('r-acc');
const rCorrect     = document.getElementById('r-correct');
const rErrors      = document.getElementById('r-errors');
const newBestBanner= document.getElementById('new-best-banner');
const timerCard    = document.querySelector('.typing-timer-card');

// ── State ──
let words = [];
let passageText = '';
let gameTime = 15;
let startTime = null;
let timerRAF  = null;
let running   = false;
let bestWpm   = parseInt(localStorage.getItem('typing-best') || '0', 10);

if (bestWpmEl) bestWpmEl.textContent = bestWpm;

// ── Build word passage ──
function buildPassage() {
  const cfg = MODE_CFG[gameTime] || MODE_CFG[15];
  const needed = cfg.words;
  words = [];
  const pool = [...WORDS];
  for (let i = 0; i < needed; i++) {
    words.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  passageText = words.join(' ');
  if (passageTitle) passageTitle.textContent = cfg.label;
}

// ── Render characters ──
function renderText() {
  textDisplay.innerHTML = '';
  for (let i = 0; i < passageText.length; i++) {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = passageText[i];
    span.dataset.index = i;
    textDisplay.appendChild(span);
  }
  updateDisplay('');
}

function updateDisplay(inputVal) {
  const chars = textDisplay.querySelectorAll('.char');
  let currentEl = null;
  chars.forEach((ch, i) => {
    ch.classList.remove('correct', 'wrong', 'current');
    if (i < inputVal.length) {
      ch.classList.add(inputVal[i] === passageText[i] ? 'correct' : 'wrong');
    } else if (i === inputVal.length) {
      ch.classList.add('current');
      currentEl = ch;
    }
  });
  if (!currentEl && chars.length && inputVal.length >= passageText.length) {
    currentEl = chars[chars.length - 1];
  }
  currentEl?.scrollIntoView({ block: 'nearest' });
}

// ── Stats calc ──
function getStats(inputVal) {
  let correct = 0, errors = 0;
  for (let i = 0; i < inputVal.length; i++) {
    inputVal[i] === passageText[i] ? correct++ : errors++;
  }
  const elapsedMin = startTime ? Math.max((Date.now() - startTime) / 60000, 1 / 60000) : 0;
  const wpm        = elapsedMin > 0 ? Math.round((correct / 5) / elapsedMin) : 0;
  const accuracy   = inputVal.length > 0 ? Math.round((correct / inputVal.length) * 100) : 100;
  return { correct, errors, wpm, accuracy };
}

function updateStats() {
  const { wpm, accuracy } = getStats(typingInput.value);
  if (wpmEl)      wpmEl.textContent      = wpm;
  if (accuracyEl) accuracyEl.textContent = accuracy + '%';
}

// ── Format countdown ──
function formatCountdown(secs) {
  const s = Math.max(0, Math.ceil(secs));
  if (gameTime <= 60) return s + 's';
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ── RAF-based timer loop ──
function timerLoop() {
  if (!running || !startTime) return;
  const elapsed   = (Date.now() - startTime) / 1000;
  const remaining = gameTime - elapsed;
  if (countdownEl) countdownEl.textContent = formatCountdown(remaining);

  // Urgent last 5 seconds
  if (timerCard) timerCard.classList.toggle('urgent', remaining <= 5);

  updateStats();

  if (remaining <= 0) {
    endGame();
    return;
  }
  timerRAF = requestAnimationFrame(timerLoop);
}

// ── Init ──
function init() {
  cancelAnimationFrame(timerRAF);
  buildPassage();
  renderText();

  running   = false;
  startTime = null;
  if (wpmEl)        wpmEl.textContent        = '0';
  if (accuracyEl)   accuracyEl.textContent   = '100%';
  if (countdownEl)  countdownEl.textContent  = formatCountdown(gameTime);
  if (timerCard)    timerCard.classList.remove('urgent');
  if (resultPanel)  resultPanel.classList.add('hidden');
  if (newBestBanner)newBestBanner.classList.add('hidden');
  typingInput.value    = '';
  typingInput.disabled = false;
  textDisplay.scrollTop = 0;
  typingInput.focus();
}

// ── Start ──
function startRun() {
  if (running) return;
  running   = true;
  startTime = Date.now();
  if (window.AppStorage) AppStorage.incrementPlays?.();
  timerRAF = requestAnimationFrame(timerLoop);
}

// ── End ──
function endGame(completed = false) {
  if (!running && !startTime) return;
  running = false;
  cancelAnimationFrame(timerRAF);
  typingInput.disabled = true;
  if (timerCard) timerCard.classList.remove('urgent');
  if (countdownEl && !completed) countdownEl.textContent = '0s';

  const { correct, errors, wpm, accuracy } = getStats(typingInput.value);
  const isNewBest = wpm > bestWpm;
  if (isNewBest) {
    bestWpm = wpm;
    localStorage.setItem('typing-best', String(bestWpm));
    if (bestWpmEl) bestWpmEl.textContent = bestWpm;
  }

  if (rWpm)    rWpm.textContent    = wpm;
  if (rAcc)    rAcc.textContent    = accuracy + '%';
  if (rCorrect)rCorrect.textContent= correct;
  if (rErrors) rErrors.textContent = errors;

  if (newBestBanner) newBestBanner.classList.toggle('hidden', !isNewBest);
  if (resultPanel)   resultPanel.classList.remove('hidden');
}

// ── Input handler ──
typingInput.addEventListener('input', () => {
  let val = typingInput.value.replace(/\r/g, '');
  if (val.length > passageText.length) {
    val = val.slice(0, passageText.length);
    typingInput.value = val;
  }
  if (!running && val.length > 0) startRun();
  updateDisplay(val);
  updateStats();
  if (val.length >= passageText.length) endGame(true);
});

// ── Mode buttons ──
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameTime = parseInt(btn.dataset.time, 10);
    init();
  });
});

// ── Restart ──
document.getElementById('restart-btn')?.addEventListener('click', init);
document.getElementById('retry-btn')?.addEventListener('click', init);

// ── Boot ──
init();
