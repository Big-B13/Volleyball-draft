// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — CAMPAIGN LOADING SEQUENCE
// Cinematic loading screen with mentor → storekeeper → captain
// Randomized order, club-specific content
// Spec: LOADING_SEQUENCE_README.md
// ═══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// PLAYER PORTRAIT MAP — Maps player IDs to their image files
// ─────────────────────────────────────────────────────────────────────
export const PLAYER_PORTRAITS = {
  // Captains
  'big-b': './assets/players/big-b.png',
  'nathan': './assets/players/burla.png',  // Nathan is Burla
  'zai': './assets/players/stratus.png',    // Zai is Stratus

  // Strigidae members
  'ibrahim': './assets/players/ibrahim.png',
  'skuppa': './assets/players/skuppa.png',
  'narcis': './assets/players/narcis.png',
  'mizu': './assets/players/mizu.png',
  'ihor': './assets/players/ihor.png',
  'ani': './assets/players/ani.png',
  'tabeeb': './assets/players/tabeeb.png',

  // Otters members
  'moon': './assets/players/moon.png',
  'floor': './assets/players/floor.png',
  'renars': './assets/players/renars.png',
  'rashid': './assets/players/rashid.png',
  'linus': './assets/players/linus.png',
  'joep': './assets/players/joep.png',
  'dawood': './assets/players/dawood.png',
  'max': './assets/players/max.png',
  'merel': './assets/players/merel.png',
  'mandie': './assets/players/mandie.png',

  // Shizuka members
  'luna': './assets/players/luna.png',
  'zakhar': './assets/players/zakhar.png',
  'gabshi': './assets/players/gabsche.png',  // Gabshi is Gabsche in repo
  'robin': './assets/players/robin.png',
  'pavel': './assets/players/pavel.png',
  'bouschra': './assets/players/bouschra.png',
  'aizaz': './assets/players/aizaz.png',
  'daan': './assets/players/daan.png',
  'ricardo': './assets/players/ricardo.png',

  // Other players
  'ayaz': './assets/players/ayaz.png',
  'steven': './assets/players/steven.png',
  'pato': './assets/players/pato.png',
  'tamara': './assets/players/tamara.png',
  'nikita-blond': './assets/players/nikita-blond.png',
  'nikita-brown': './assets/players/nikita-brown.png',
  'rei': './assets/players/rei.png',
  'jordan': './assets/players/joran.png',  // Jordan is Joran in repo
  'islom': './assets/players/islom.png',
  'anezka': './assets/players/anezka.png',

  // Storekeepers / Second-in-command
  'bader': './assets/portraits/Bader.png',
  'aiden': './assets/portraits/Aiden.png',
  'zandorah': './assets/portraits/Zandorah.png',
};

// ─────────────────────────────────────────────────────────────────────
// LOADING SEQUENCE DATA — Club-specific content
// ─────────────────────────────────────────────────────────────────────
export const LOADING_SEQUENCES = {
  strigidae: {
    mentor: {
      role: 'Mentor',
      name: 'Zakhar',
      portrait: PLAYER_PORTRAITS['zakhar'],
      quotes: [
        'You are not here to be welcomed. You are here to evolve.',
        'In Strigidae, watching is the first skill. Everything else comes after.',
        'I will make sure you evolve to the next level.',
      ],
      subtext: 'Loading training systems...',
    },
    storekeeper: {
      role: 'Second-in-Command',
      name: 'Bader',
      portrait: PLAYER_PORTRAITS['bader'],
      quotes: [
        'A box is potential. What matters is what you do with it.',
        "The Night's Counter is open. Choose wisely.",
        'Four cards. One upgrade. That is not destruction. That is investment.',
      ],
      subtext: "Opening The Night's Counter...",
    },
    captain: {
      role: 'Captain',
      name: 'Big-B',
      portrait: PLAYER_PORTRAITS['big-b'],
      quotes: [
        'I was here long before you were here and will be here long after you are gone.',
        'The court remembers everyone who played here. What will it remember of you?',
        'You beat my friends. Now face the one who taught them.',
      ],
      subtext: 'Entering Strigidae campaign...',
    },
  },
  otters: {
    mentor: {
      role: 'Mentor',
      name: 'Mandie',
      portrait: PLAYER_PORTRAITS['mandie'],
      quotes: [
        'Do not overthink it. Feel the court.',
        'Chaos is just precision you cannot see yet.',
        'We are going to have fun. I promise.',
      ],
      subtext: 'Loading Otters rhythm...',
    },
    storekeeper: {
      role: 'Second-in-Command',
      name: 'Aiden',
      portrait: PLAYER_PORTRAITS['aiden'],
      quotes: [
        'Could be trash. Could be fire. That is the whole point.',
        'The Otter Box is open. Let us see what you got.',
        'Sacrifice four, upgrade one. Sounds dramatic. I love it.',
      ],
      subtext: 'Opening The Otter Box...',
    },
    captain: {
      role: 'Captain',
      name: 'Nathan',
      portrait: PLAYER_PORTRAITS['nathan'],
      quotes: [
        'The moment you think you understand the play, we change it.',
        'I do not care about the wins. I care about the moments.',
        'Watch my eyes, not the ball.',
      ],
      subtext: 'Entering Kòrsou Otters campaign...',
    },
  },
  shizuka: {
    mentor: {
      role: 'Mentor',
      name: 'Bouschra',
      portrait: PLAYER_PORTRAITS['bouschra'],
      quotes: [
        'In Shizuka, the court talks. Most people do not listen.',
        'I will show you how to watch. How to see what the captain sees.',
        'Fast, light, gone before anyone realizes I was there.',
      ],
      subtext: 'Loading movement systems...',
    },
    storekeeper: {
      role: 'Second-in-Command',
      name: 'Zandorah',
      portrait: PLAYER_PORTRAITS['zandorah'],
      quotes: [
        'The Cafe is quiet for a reason. People make worse choices when they are loud.',
        'The Shizuka Cafe is open. Patience is also a resource.',
        'Evolution is not free. Decide what you are willing to lose.',
      ],
      subtext: 'Opening The Shizuka Cafe...',
    },
    captain: {
      role: 'Captain',
      name: 'Zai',
      portrait: PLAYER_PORTRAITS['zai'],
      quotes: [
        'The court does not lie.',
        'Every ball you hit that comes back — you are losing confidence.',
        'Make us doubt.',
      ],
      subtext: 'Entering Shizuka campaign...',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────
// CLUB THEMING
// ─────────────────────────────────────────────────────────────────────
export const CLUB_THEME = {
  strigidae: { accent: '#ef4444', storeBg: './assets/store/night-counter.jpeg' },
  otters:    { accent: '#22c55e', storeBg: './assets/store/otter-box.jpeg' },
  shizuka:   { accent: '#60a5fa', storeBg: './assets/store/cafe.jpeg' },
};
const GENERIC_BACKGROUNDS = ['./assets/loading/court.jpeg', './assets/loading/city.jpeg'];

const FULL_SCREEN_MS = 3300;   // ~10s total for the full cinematic
const QUICK_SCREEN_MS = 830;   // ~2.5s total for the quick version

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────────────
// LOADING SEQUENCE ENGINE
// ─────────────────────────────────────────────────────────────────────

/**
 * Show the cinematic loading sequence for a club.
 * Mentor / Second-in-Command / Captain screens in randomized order,
 * each with portrait, role, name, a random quote and a loading subtext.
 * @param {string} club - 'strigidae' | 'otters' | 'shizuka'
 * @param {object} options
 * @param {boolean} options.firstTime - Full ~10s cinematic when true, quick ~2.5s otherwise
 * @returns {Promise<void>}
 */
export async function showLoadingSequence(club = 'strigidae', options = {}) {
  const clubKey = LOADING_SEQUENCES[club] ? club : 'strigidae';
  const data = LOADING_SEQUENCES[clubKey];
  const theme = CLUB_THEME[clubKey];
  const full = !!options.firstTime;
  const screenMs = full ? FULL_SCREEN_MS : QUICK_SCREEN_MS;
  const totalMs = screenMs * 3;

  // Mentor / storekeeper / captain in randomized order (per spec).
  const screens = shuffle(['mentor', 'storekeeper', 'captain']).map((key) => {
    const c = data[key];
    return {
      ...c,
      quote: pickRandom(c.quotes),
      background: key === 'storekeeper' ? theme.storeBg : pickRandom(GENERIC_BACKGROUNDS),
    };
  });

  injectLoadingStyles();

  const overlay = document.createElement('div');
  overlay.id = 'campaign-loading-overlay';
  overlay.style.setProperty('--accent', theme.accent);
  overlay.innerHTML = `
    <div class="gomi-load-bg"></div>
    <div class="gomi-load-shade"></div>
    <div class="gomi-load-content">
      <div class="gomi-load-portrait"><img alt=""><span class="gomi-load-fallback">🏐</span></div>
      <div class="gomi-load-role"></div>
      <div class="gomi-load-name"></div>
      <div class="gomi-load-quote"></div>
      <div class="gomi-load-sub"></div>
    </div>
    <div class="gomi-load-progress"><i></i></div>
    <div class="gomi-load-skip">tap to skip</div>
  `;
  document.body.appendChild(overlay);

  const bgEl = overlay.querySelector('.gomi-load-bg');
  const portraitWrap = overlay.querySelector('.gomi-load-portrait');
  const img = overlay.querySelector('.gomi-load-portrait img');
  const roleEl = overlay.querySelector('.gomi-load-role');
  const nameEl = overlay.querySelector('.gomi-load-name');
  const quoteEl = overlay.querySelector('.gomi-load-quote');
  const subEl = overlay.querySelector('.gomi-load-sub');
  const bar = overlay.querySelector('.gomi-load-progress i');
  const content = overlay.querySelector('.gomi-load-content');

  // Overall progress bar over the whole sequence.
  requestAnimationFrame(() => {
    bar.style.transition = `width ${totalMs}ms linear`;
    bar.style.width = '100%';
  });

  // Click / tap anywhere skips the rest of the sequence.
  let skipped = false;
  overlay.addEventListener('click', () => { skipped = true; });

  const wait = (ms) => new Promise((resolve) => {
    const step = 50;
    let elapsed = 0;
    const tick = () => {
      elapsed += step;
      if (skipped || elapsed >= ms) resolve();
      else setTimeout(tick, step);
    };
    setTimeout(tick, step);
  });

  for (const screen of screens) {
    if (skipped) break;
    bgEl.style.backgroundImage = `url("${screen.background}")`;
    img.style.display = '';
    portraitWrap.classList.remove('no-image');
    img.onerror = () => { img.style.display = 'none'; portraitWrap.classList.add('no-image'); };
    img.src = screen.portrait || '';
    roleEl.textContent = screen.role;
    nameEl.textContent = screen.name;
    quoteEl.textContent = `“${screen.quote}”`;
    subEl.textContent = screen.subtext;

    bgEl.classList.add('shown');
    content.classList.add('shown');
    await wait(screenMs);
    content.classList.remove('shown');
    bgEl.classList.remove('shown');
    if (!skipped) await wait(280);
  }

  overlay.classList.add('done');
  await wait(500);
  overlay.remove();
}

function injectLoadingStyles() {
  if (document.getElementById('gomi-loading-v3')) return;
  const style = document.createElement('style');
  style.id = 'gomi-loading-v3';
  style.textContent = `
    #campaign-loading-overlay{position:fixed;inset:0;z-index:999999;background:#050914;overflow:hidden;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;opacity:1;transition:opacity .5s;cursor:pointer;}
    #campaign-loading-overlay.done{opacity:0;}
    .gomi-load-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .5s;filter:saturate(.9);}
    .gomi-load-bg.shown{opacity:.55;}
    .gomi-load-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,6,23,.9),rgba(2,6,23,.25) 60%),linear-gradient(0deg,rgba(2,6,23,.92),transparent 60%);}
    .gomi-load-content{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;width:min(560px,88vw);opacity:0;transition:opacity .35s;}
    .gomi-load-content.shown{opacity:1;}
    .gomi-load-portrait{width:150px;height:150px;border-radius:50%;border:3px solid var(--accent,#fbbf24);box-shadow:0 0 46px var(--accent,#fbbf24),0 22px 60px rgba(0,0,0,.65);overflow:hidden;background:#0f172a;display:flex;align-items:center;justify-content:center;}
    .gomi-load-portrait img{width:100%;height:100%;object-fit:cover;}
    .gomi-load-portrait .gomi-load-fallback{display:none;font-size:3.6rem;}
    .gomi-load-portrait.no-image .gomi-load-fallback{display:block;}
    .gomi-load-role{font-size:.74rem;font-weight:950;letter-spacing:.3em;text-transform:uppercase;color:var(--accent,#fbbf24);}
    .gomi-load-name{font-size:clamp(1.9rem,6vw,3.6rem);font-weight:1000;letter-spacing:.06em;text-shadow:0 4px 22px rgba(0,0,0,.8);}
    .gomi-load-quote{font-size:clamp(.94rem,2.4vw,1.15rem);color:#e2e8f0;line-height:1.55;font-style:italic;max-width:46ch;text-shadow:0 2px 10px rgba(0,0,0,.8);}
    .gomi-load-sub{margin-top:6px;font-size:.78rem;color:#fbbf24;letter-spacing:.12em;text-transform:uppercase;}
    .gomi-load-progress{position:absolute;left:0;right:0;bottom:0;height:5px;background:rgba(255,255,255,.08);}
    .gomi-load-progress i{display:block;height:100%;width:0;background:var(--accent,#fbbf24);box-shadow:0 0 14px var(--accent,#fbbf24);}
    .gomi-load-skip{position:absolute;right:18px;bottom:16px;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(226,232,240,.5);}
  `;
  document.head.appendChild(style);
}

export function shouldShowFullSequence() {
  const lastShown = localStorage.getItem('campaignLoadingLastShown');
  if (!lastShown) return true;

  const lastDate = new Date(lastShown);
  const now = new Date();
  const hoursSince = (now - lastDate) / (1000 * 60 * 60);

  return hoursSince >= 24; // Show full sequence once per day
}

/**
 * Mark that full sequence was shown
 */
export function markFullSequenceShown() {
  localStorage.setItem('campaignLoadingLastShown', new Date().toISOString());
}
