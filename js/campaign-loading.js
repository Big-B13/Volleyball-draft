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
  const fullDuration = 10000;
  const screens = [
    { image: './assets/loading/court.jpeg', title: 'THE GOMI CUP', sub: 'Every point starts somewhere.' },
    { image: './assets/loading/city.jpeg', title: 'BUILD YOUR LEGACY', sub: 'Your campaign is waiting.' },
    { image: './assets/store/night-counter.jpeg', title: 'THE NIGHTS COUNTER', sub: 'Open packs. Build your team.' },
  ];
  const overlay = document.createElement('div'); overlay.id = 'campaign-loading-overlay';
  overlay.innerHTML = `<div class="gomi-load-image"></div><div class="gomi-load-shade"></div><div class="gomi-load-copy"><b></b><span></span><i></i></div>`;
  document.body.appendChild(overlay);
  if (!document.getElementById('gomi-loading-v2')) { const style=document.createElement('style'); style.id='gomi-loading-v2'; style.textContent=`#campaign-loading-overlay{position:fixed;inset:0;z-index:999999;background:#050914;overflow:hidden;color:white;font-family:system-ui;opacity:1;transition:opacity .6s}.gomi-load-image{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .7s}.gomi-load-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.72),transparent 65%),linear-gradient(0deg,rgba(0,0,0,.7),transparent 55%)}.gomi-load-copy{position:absolute;left:8vw;bottom:10vh;display:flex;flex-direction:column;gap:8px;text-shadow:0 3px 15px #000}.gomi-load-copy b{font-size:clamp(2rem,5vw,5rem);letter-spacing:.08em}.gomi-load-copy span{font-size:1rem;color:#fbbf24}.gomi-load-copy i{width:180px;height:3px;background:#fbbf24;animation:gomi-progress 10s linear}@keyframes gomi-progress{from{width:0}to{width:180px}}`; document.head.appendChild(style); }
  const image=overlay.querySelector('.gomi-load-image'), title=overlay.querySelector('.gomi-load-copy b'), sub=overlay.querySelector('.gomi-load-copy span');
  for (let i=0;i<screens.length;i++){ const x=screens[i]; image.style.backgroundImage=`url("${x.image}")`; image.style.opacity='1'; title.textContent=x.title; sub.textContent=x.sub; await new Promise(r=>setTimeout(r,i<2?4000:2000)); image.style.opacity='0'; await new Promise(r=>setTimeout(r,650)); }
  overlay.style.opacity='0'; await new Promise(r=>setTimeout(r,650)); overlay.remove();
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
