// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — CAMPAIGN LOADING SEQUENCE
// Cinematic loading screen with mentor → storekeeper → captain
// Randomized order, club-specific content
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
// LOADING SEQUENCE ENGINE
// ─────────────────────────────────────────────────────────────────────

/**
 * Show the cinematic loading sequence for a club.
 * Randomizes the order of mentor/storekeeper/captain.
 * @param {string} club - 'strigidae' | 'otters' | 'shizuka'
 * @param {object} options
 * @param {number} options.minDuration - Minimum display time in ms (default 2500)
 * @param {number} options.fullDuration - Full cinematic duration in ms (default 10000)
 * @param {boolean} options.firstTime - Whether to show full sequence (default false)
 * @returns {Promise<void>}
 */
export async function showLoadingSequence(club = 'strigidae', options = {}) {
  const {
    minDuration = 2500,
    fullDuration = 10000,
    firstTime = false,
  } = options;

  const sequence = LOADING_SEQUENCES[club] || LOADING_SEQUENCES.strigidae;
  const roles = ['mentor', 'storekeeper', 'captain'];

  // Randomize order
  const shuffled = roles.sort(() => Math.random() - 0.5);

  // Determine duration
  const duration = firstTime ? fullDuration : minDuration;
  const perScreen = duration / shuffled.length;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'campaign-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: radial-gradient(circle at center, #172554 0%, #050914 55%, #000 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  `;

  document.body.appendChild(overlay);

  // Show each screen
  for (let i = 0; i < shuffled.length; i++) {
    const role = shuffled[i];
    const data = sequence[role];
    const quote = data.quotes[Math.floor(Math.random() * data.quotes.length)];

    await showLoadingScreen(overlay, data, quote, perScreen);
  }

  // Fade out
  overlay.style.animation = 'fadeOut 0.3s ease forwards';
  setTimeout(() => overlay.remove(), 300);
}

/**
 * Show a single loading screen
 */
async function showLoadingScreen(overlay, data, quote, duration) {
  return new Promise((resolve) => {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      opacity: 0;
      animation: fadeIn 0.4s ease forwards;
    `;

    // Portrait
    const portraitContainer = document.createElement('div');
    portraitContainer.style.cssText = `
      width: 180px;
      height: 180px;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid #fbbf24;
      box-shadow: 0 0 60px rgba(251, 191, 36, 0.4);
      margin-bottom: 30px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    if (data.portrait) {
      const img = document.createElement('img');
      img.src = data.portrait;
      img.alt = data.name;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      img.onerror = () => {
        portraitContainer.innerHTML = '<div style="font-size: 4rem;">🏐</div>';
      };
      portraitContainer.appendChild(img);
    } else {
      portraitContainer.innerHTML = '<div style="font-size: 4rem;">🏐</div>';
    }

    // Role label
    const roleLabel = document.createElement('div');
    roleLabel.textContent = data.role;
    roleLabel.style.cssText = `
      font-size: 0.85rem;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #fbbf24;
      margin-bottom: 8px;
      font-weight: 900;
    `;

    // Name
    const name = document.createElement('div');
    name.textContent = data.name;
    name.style.cssText = `
      font-size: 2rem;
      font-weight: 900;
      color: #fff;
      margin-bottom: 24px;
    `;

    // Quote
    const quoteEl = document.createElement('div');
    quoteEl.textContent = `"${quote}"`;
    quoteEl.style.cssText = `
      font-size: 1.3rem;
      color: #cbd5e1;
      text-align: center;
      max-width: 600px;
      line-height: 1.6;
      margin-bottom: 40px;
      font-style: italic;
    `;

    // Subtext
    const subtext = document.createElement('div');
    subtext.textContent = data.subtext;
    subtext.style.cssText = `
      font-size: 0.9rem;
      color: #64748b;
      letter-spacing: 1px;
    `;

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: 200px;
      height: 4px;
      background: #1e293b;
      border-radius: 2px;
      margin-top: 12px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #38bdf8, #22c55e);
      width: 0%;
      animation: progressFill ${duration}ms linear forwards;
    `;
    progressBar.appendChild(progressFill);

    screen.appendChild(portraitContainer);
    screen.appendChild(roleLabel);
    screen.appendChild(name);
    screen.appendChild(quoteEl);
    screen.appendChild(subtext);
    screen.appendChild(progressBar);

    overlay.appendChild(screen);

    // Fade out after duration
    setTimeout(() => {
      screen.style.animation = 'fadeOut 0.4s ease forwards';
      setTimeout(() => {
        screen.remove();
        resolve();
      }, 400);
    }, duration - 400);
  });
}

/**
 * Inject animation keyframes
 */
function injectLoadingStyles() {
  if (document.getElementById('campaign-loading-styles')) return;

  const style = document.createElement('style');
  style.id = 'campaign-loading-styles';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes progressFill {
      from { width: 0%; }
      to { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}

// Inject styles on load
injectLoadingStyles();

/**
 * Check if full loading sequence should be shown
 */
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
