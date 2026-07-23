// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — OC / CUSTOM CHARACTER SYSTEM
// Create, store, and render custom player characters
// ═══════════════════════════════════════════════════════════════════════

// Firebase is OPTIONAL — loaded lazily so OC system works offline
let _fb = null;
let _fbLoaded = false;
async function getFirebase() {
  if (_fbLoaded) return _fb;
  try {
    _fb = await import('./firebase-init.js');
    _fbLoaded = true;
    return _fb;
  } catch (e) {
    console.warn('Firebase unavailable — OC running offline', e);
    _fbLoaded = true;
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// NICKNAME POOL — All new, unique nicknames not in DEFAULT_PLAYERS
// ─────────────────────────────────────────────────────────────────────

export const OC_NICKNAMES = [
  // Attackers
  "Blaze", "Cannon", "Cobra", "Crossfire", "Cyclone", "Dart", "Dynamo",
  "Echo", "Fang", "Flare", "Flash", "Fury", "Ghost", "Glitch", "Havoc",
  "Haze", "Hex", "Hurricane", "Ion", "Jolt", "Karma", "Krypton", "Lunar",
  "Maverick", "Mirage", "Nexus", "Nitro", "Nova", "Orbit", "Phantom",
  "Phoenix", "Pulse", "Quake", "Razor", "Reaper", "Riptide", "Sage",
  "Shade", "Shift", "Signal", "Smoke", "Snap", "Solar", "Sonic", "Spark",
  "Specter", "Spike", "Spirit", "Splash", "Static", "Storm", "Strike",
  "Surge", "Swirl", "Tempest", "Thunder", "Titan", "Torch", "Tracker",
  "Turbo", "Twist", "Vandal", "Vector", "Venom", "Viper", "Volt",
  "Warden", "Whip", "Wildfire", "Wisp", "Wraith", "Zenith", "Zephyr", "Zoom",

  // Defenders
  "Anchor", "Armor", "Bastion", "Block", "Bunker", "Cement", "Chisel",
  "Citadel", "Crag", "Crater", "Crush", "Dune", "Echo", "Flint", "Forge",
  "Granite", "Grip", "Hammer", "Haven", "Iron", "Jaw", "Keystone", "Lens",
  "Lock", "Mesa", "Monolith", "Nudge", "Oak", "Onyx", "Pillar", "Plinth",
  "Quarry", "Rampart", "Ridge", "Rock", "Root", "Rubble", "Sentinel",
  "Shield", "Sill", "Slate", "Soak", "Spire", "Stone", "Strut", "Summit",
  "Termite", "Titan", "Torch", "Tower", "Vault", "Wall", "Watch",

  // Setters
  "Arbor", "Architect", "Axis", "Beacon", "Bravo", "Cadence", "Caller",
  "Channel", "Chord", "Clockwork", "Compass", "Conductor", "Crown", "Drift",
  "Engine", "Field", "Fulcrum", "Gear", "Genesis", "Grid", "Harbor",
  "Helix", "Hive", "Index", "Jungle", "Keeper", "Kernel", "Knot", "Lattice",
  "Ledge", "Level", "Link", "Loom", "Lucid", "Matrix", "Mesh", "Node",
  "Norm", "Omega", "Optic", "Orbit", "Patch", "Pivot", "Plank", "Point",

  // Mixed / Universal
  "Apex", "Axiom", "Bolt", "Cipher", "Delta", "Edge", "Equinox", "Factor",
  "Flux", "Gauge", "Hex", "Icon", "Ink", "Iso", "Jade", "Jet", "Kite",
  "Kyte", "Lumen", "Mixer", "Orbit", "Peak", "Prism", "Rune", "Sigma",
  "Slate", "Snap", "Sole", "Tap", "Trace", "Trix", "Ultra", "Vex", "Warp",
];

// ─────────────────────────────────────────────────────────────────────
// EXISTING NICKNAMES — Must not be reused
// ─────────────────────────────────────────────────────────────────────

export const TAKEN_NICKNAMES = new Set([
  'Big-B', 'Nathan', 'Zai',
  'The Trickster', 'The Mirror', 'Blackout',
  'Footie', 'Tiny Giant', 'Nishinoya', 'The Claw', 'Monster',
  'Tomorrow', 'Aim & Shoot', 'Winger', 'Nightmare', 'Grounded',
  'Short Stop', 'Forte', 'Upcomer', 'Axis Rotation', 'Guardian Angel',
  'Hold This', 'Weather Forecast', 'Brux', 'Rocket', 'The Dream',
  'DJ', 'RPG', 'Header', 'Gazelle', 'Navratilova', 'Blank',
  'Janitor', 'Bird', 'Bomber', 'Dahliah', 'Capitain', 'The Host',
  'Scope', 'Canon', 'Spark', 'Bullseye',
  // Lowercase versions
  'footie', 'tiny giant', 'nishinoya', 'the claw', 'monster',
  'tomorrow', 'aim & shoot', 'winger', 'nightmare', 'grounded',
  'short stop', 'forte', 'upcomer', 'axis rotation', 'guardian angel',
  'hold this', 'weather forecast', 'brux', 'rocket', 'the dream',
  'dj', 'rpg', 'header', 'gazelle', 'navratilova', 'blank',
  'janitor', 'bird', 'bomber', 'dahliah', 'capitain', 'the host',
  'scope', 'canon', 'spark', 'bullseye',
]);

// Filter available nicknames
export const AVAILABLE_NICKNAMES = OC_NICKNAMES.filter(
  n => !TAKEN_NICKNAMES.has(n.toLowerCase()) && !TAKEN_NICKNAMES.has(n)
);

// ─────────────────────────────────────────────────────────────────────
// OC DATA STRUCTURE
// ─────────────────────────────────────────────────────────────────────

export const DEFAULT_OC = {
  created: false,
  name: null,
  nickname: null,
  position: null,        // 'OH' | 'OP' | 'MB' | 'S' | 'L'
  club: null,            // 'strigidae' | 'otters' | 'shizuka'
  stats: {
    attack: 0,
    serve: 0,
    defense: 0,
    setting: 0,
    athletic: 0,
  },
  story: null,           // free text: "Why do you play volleyball?"
  avatar: null,          // base64 data URL or Firebase Storage URL
  avatarFileName: null,   // original filename for re-upload
  createdAt: null,
};

// Stat limits
export const OC_STAT_CONFIG = {
  pointsTotal: 30,
  pointsMin: 0,
  pointsMax: 11,
  pointsPerStat: 1,
};

// ─────────────────────────────────────────────────────────────────────
// OC PERSISTENCE
// ─────────────────────────────────────────────────────────────────────

const OC_LOCAL_KEY = 'gomi-oc-v1';

export async function loadOC() {
  // Try Firebase first
  try {
    const firebase = await getFirebase();
    const user = firebase?.auth?.currentUser;
    if (user && firebase) {
      const snap = await firebase.get(firebase.ref(firebase.db, `oc/${user.uid}`));
      const fb = snap.val();
      if (fb) {
        localStorage.setItem(OC_LOCAL_KEY, JSON.stringify(fb));
        return fb;
      }
    }
  } catch (e) {
    console.warn('OC Firebase load failed', e);
  }
  // Fall back to localStorage
  const local = localStorage.getItem(OC_LOCAL_KEY);
  if (local) return JSON.parse(local);
  return { ...DEFAULT_OC };
}

export async function saveOC(oc) {
  const data = { ...oc, createdAt: oc.createdAt || Date.now() };
  localStorage.setItem(OC_LOCAL_KEY, JSON.stringify(data));
  try {
    const firebase = await getFirebase();
    const user = firebase?.auth?.currentUser;
    if (user && firebase) {
      await firebase.set(firebase.ref(firebase.db, `oc/${user.uid}`), data);
    }
  } catch (e) {
    console.warn('OC Firebase save failed', e);
  }
  return data;
}

export async function deleteOC() {
  localStorage.removeItem(OC_LOCAL_KEY);
  try {
    const firebase = await getFirebase();
    const user = firebase?.auth?.currentUser;
    if (user && firebase) {
      firebase.set(firebase.ref(firebase.db, `oc/${user.uid}`), null).catch(() => {});
    }
  } catch (e) {
    console.warn('OC Firebase delete failed', e);
  }
}

// ─────────────────────────────────────────────────────────────────────
// NICKNAME VALIDATION & GENERATION
// ─────────────────────────────────────────────────────────────────────

/** Check if a nickname is available */
export function isNicknameAvailable(nickname) {
  if (!nickname || nickname.trim().length < 2) return false;
  const clean = nickname.trim();
  return !TAKEN_NICKNAMES.has(clean.toLowerCase());
}

/** Get suggested nicknames (shuffled) */
export function getSuggestedNicknames(count = 6) {
  const shuffled = [...AVAILABLE_NICKNAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/** Generate a single random nickname */
export function generateNickname() {
  const available = [...AVAILABLE_NICKNAMES];
  return available[Math.floor(Math.random() * available.length)];
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE HANDLING
// ─────────────────────────────────────────────────────────────────────

/**
 * Process an uploaded image file for the OC avatar.
 * Returns a base64 data URL (or stores in Firebase for larger deployments).
 * @param {File} file
 * @param {number} maxSize - max width/height in px (default 256)
 */
export function processAvatarImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    // Max file size: 2MB
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Image must be under 2MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Canvas for cropping to square and resizing
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height, maxSize);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center-crop to square
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get the display avatar for an OC.
 * Returns the custom avatar if set, or a generated initials avatar.
 */
export function getOCAvatar(oc, size = 128) {
  if (oc?.avatar) return oc.avatar;
  return generateInitialsAvatar(oc?.name || '?', oc?.club || 'strigidae', size);
}

/**
 * Generate a CSS/canvas avatar from initials and club color.
 */
export function generateInitialsAvatar(name, club, size = 128) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const clubColors = {
    strigidae: '#dc2626',
    otters: '#16a34a',
    shizuka: '#2563eb',
  };

  const color = clubColors[club] || '#94a3b8';

  // Create a canvas-based avatar
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, size / 2, size / 2);

  return canvas.toDataURL('image/png');
}

// ─────────────────────────────────────────────────────────────────────
// OC → MATCH ENGINE INTEGRATION
// Converts OC data into a player object the match engine can use
// ─────────────────────────────────────────────────────────────────────

export function ocToPlayer(oc) {
  if (!oc?.created) return null;

  const nickname = oc.nickname || '???';
  const name = oc.name || '???';
  const position = oc.position || 'OH';
  const { attack, serve, defense, setting, athletic } = oc.stats;

  return {
    id: 'player-oc',
    baseId: null,
    name,
    nickname,
    position,
    isOC: true,
    // Stats as used by the match engine
    attack: Math.round(attack * 10) / 10,
    serve: Math.round(serve * 10) / 10,
    defense: Math.round(defense * 10) / 10,
    setting: Math.round(setting * 10) / 10,
    athletic: Math.round(athletic * 10) / 10,
    // Campaign card equivalent
    rarity: 'common',
    stars: 1,
    level: 1,
    xp: 0,
    statBoosts: { attack: 0, serve: 0, defense: 0, setting: 0, athletic: 0 },
    // Signature move (OC doesn't have one by default, could be unlocked)
    signature: null,
    signatureName: null,
    signatureDesc: null,
    // Traits
    traits: [],
    // OC metadata
    _oc: true,
  };
}

/** Get the OC's position full name */
export function getPositionFullName(pos) {
  const names = {
    OH: 'Outside Hitter',
    OP: 'Opposite',
    MB: 'Middle Blocker',
    S: 'Setter',
    L: 'Libero',
  };
  return names[pos] || pos;
}

/** Calculate the OC's overall rating */
export function getOCOverall(oc) {
  if (!oc?.stats) return 5;
  const { attack, serve, defense, setting, athletic } = oc.stats;
  return Math.round(((attack + serve + defense + setting + athletic) / 5) * 10) / 10;
}

/** Get stat bars for display */
export function getOCStatBars(oc) {
  if (!oc?.stats) return {};
  const { attack, serve, defense, setting, athletic } = oc.stats;
  const max = OC_STAT_CONFIG.pointsMax;
  return {
    attack:   { value: attack, pct: Math.round((attack / max) * 100) },
    serve:    { value: serve, pct: Math.round((serve / max) * 100) },
    defense:   { value: defense, pct: Math.round((defense / max) * 100) },
    setting:   { value: setting, pct: Math.round((setting / max) * 100) },
    athletic: { value: athletic, pct: Math.round((athletic / max) * 100) },
  };
}

// ─────────────────────────────────────────────────────────────────────
// OC PROFILE — RENDER THE CREATE/EDIT FORM
// ─────────────────────────────────────────────────────────────────────

/**
 * Render the OC creation/edit wizard as a DOM element.
 * @param {object} oc - Current OC data
 * @param {function} onSave - Callback(oc) when save is triggered
 * @param {function} onSkip - Callback when skip is triggered
 */
export function renderOCCreator(oc = {}, onSave, onSkip) {
  const existing = oc?.created || false;

  const container = document.createElement('div');
  container.id = 'oc-creator';
  container.style.cssText = `
    position: fixed; inset: 0; z-index: 99990;
    background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
  `;

  container.innerHTML = `
    <div style="
      background: #0f172a; border: 1px solid #334155;
      border-radius: 20px; max-width: 520px; width: 95%;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7);
      animation: slideUp 0.3s ease;
    ">
      <!-- Header -->
      <div style="padding: 24px 28px 0;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="color:#f8fafc; margin:0; font-size:1.3rem;">
              ${existing ? '✏️ Edit Your Player' : '🏐 Create Your Player'}
            </h2>
            <p style="color:#64748b; margin:4px 0 0; font-size:0.85rem;">
              ${existing ? 'Update your character details' : 'Build your character for the campaign'}
            </p>
          </div>
          <button id="oc-close" style="
            background:none; border:none; color:#64748b; font-size:1.4rem;
            cursor:pointer; padding:4px; line-height:1;
          ">✕</button>
        </div>
      </div>

      <!-- Step indicator -->
      <div id="oc-steps" style="
        display:flex; gap:6px; padding:16px 28px;
        border-bottom:1px solid #1e293b;
      ">
        ${[1,2,3,4,5].map(n => `
          <div id="oc-step-${n}" style="
            flex:1; height:4px; border-radius:2px;
            background:${n === 1 ? '#fbbf24' : '#1e293b'};
            transition:background 0.3s;
          "></div>
        `).join('')}
      </div>

      <!-- Steps content -->
      <div style="padding: 24px 28px;">

        <!-- Step 1: Club & Name -->
        <div id="oc-step-content-1" class="oc-step-content">
          <h3 style="color:#f8fafc; margin:0 0 16px;">Your Club</h3>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:20px;">
            ${['strigidae','otters','shizuka'].map(club => `
              <button class="oc-club-btn" data-club="${club}" style="
                padding:12px 8px; border-radius:10px; border:2px solid #334155;
                background:#1e293b; color:#94a3b8; cursor:pointer;
                font-weight:700; font-size:0.8rem; transition:all 0.15s;
              ">
                ${club === 'strigidae' ? '🦉' : club === 'otters' ? '🦦' : '☁️'}
                <div style="margin-top:4px; font-size:0.7rem;">${club.charAt(0).toUpperCase() + club.slice(1)}</div>
              </button>
            `).join('')}
          </div>
          <div style="margin-bottom:8px;">
            <label style="color:#94a3b8; font-size:0.8rem; font-weight:600;">Your Name</label>
            <input id="oc-name" type="text" placeholder="e.g. Sam, Alex, Jordan..." maxlength="30" style="
              width:100%; box-sizing:border-box; margin-top:6px;
              padding:11px 14px; border-radius:8px;
              border:1px solid #334155; background:#1e293b;
              color:#f8fafc; font-size:0.95rem; outline:none;
            "/>
          </div>
          <div>
            <label style="color:#94a3b8; font-size:0.8rem; font-weight:600;">
              Position
              <span style="color:#475569; font-weight:400;"> — your role on the court</span>
            </label>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
              ${[['OH','Outside Hitter'],['OP','Opposite'],['MB','Middle Blocker'],['S','Setter'],['L','Libero']].map(([val, label]) => `
                <button class="oc-pos-btn" data-pos="${val}" style="
                  padding:8px 12px; border-radius:6px; border:1px solid #334155;
                  background:#1e293b; color:#94a3b8; cursor:pointer;
                  font-size:0.78rem; transition:all 0.15s;
                ">
                  <div style="font-weight:700;">${val}</div>
                  <div style="font-size:0.65rem; color:#475569;">${label}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Step 2: Nickname -->
        <div id="oc-step-content-2" class="oc-step-content" style="display:none;">
          <h3 style="color:#f8fafc; margin:0 0 16px;">Your Nickname</h3>
          <p style="color:#64748b; margin:0 0 16px; font-size:0.85rem; line-height:1.5;">
            Every player in the Gomi Cup has a nickname. It doesn't have to be cool — it has to be yours.
          </p>
          <div style="margin-bottom:16px;">
            <input id="oc-nickname" type="text" placeholder="Type a nickname..." maxlength="20" style="
              width:100%; box-sizing:border-box;
              padding:13px 14px; border-radius:8px;
              border:2px solid #334155; background:#1e293b;
              color:#f8fafc; font-size:1.1rem; font-weight:700; outline:none;
              letter-spacing:0.5px;
            "/>
            <p id="oc-nickname-status" style="color:#ef4444; font-size:0.78rem; margin:6px 0 0; min-height:18px;"></p>
          </div>
          <div>
            <p style="color:#64748b; font-size:0.8rem; margin:0 0 8px;">Or pick from suggestions:</p>
            <div id="oc-nickname-suggestions" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
          </div>
        </div>

        <!-- Step 3: Stats -->
        <div id="oc-step-content-3" class="oc-step-content" style="display:none;">
          <h3 style="color:#f8fafc; margin:0 0 4px;">Your Stats</h3>
          <p style="color:#64748b; margin:0 0 16px; font-size:0.82rem;">
            You have <strong id="oc-points-remaining" style="color:#fbbf24;">30</strong> points to distribute.
            Each stat starts at 0 and maxes at 11.
          </p>
          ${['attack','serve','defense','setting','athletic'].map(stat => `
            <div style="margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="color:#cbd5e1; font-size:0.85rem; font-weight:600; text-transform:capitalize;">
                  ${stat}
                </label>
                <span id="oc-stat-val-${stat}" style="color:#fbbf24; font-weight:700; font-size:0.9rem;">0.0</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button class="oc-stat-btn oc-stat-minus" data-stat="${stat}" style="
                  width:32px; height:32px; border-radius:6px; border:1px solid #334155;
                  background:#1e293b; color:#f8fafc; font-size:1.2rem; cursor:pointer;
                  display:flex; align-items:center; justify-content:center;
                ">−</button>
                <div style="flex:1; height:8px; background:#1e293b; border-radius:4px; overflow:hidden;">
                  <div id="oc-stat-bar-${stat}" style="height:100%; background:linear-gradient(90deg,#f97316,#fbbf24); border-radius:4px; width:42%; transition:width 0.2s;"></div>
                </div>
                <button class="oc-stat-btn oc-stat-plus" data-stat="${stat}" style="
                  width:32px; height:32px; border-radius:6px; border:1px solid #334155;
                  background:#1e293b; color:#f8fafc; font-size:1.2rem; cursor:pointer;
                  display:flex; align-items:center; justify-content:center;
                ">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Step 4: Avatar -->
        <div id="oc-step-content-4" class="oc-step-content" style="display:none;">
          <h3 style="color:#f8fafc; margin:0 0 16px;">Your Face</h3>
          <p style="color:#64748b; margin:0 0 16px; font-size:0.82rem; line-height:1.5;">
            Add a photo of yourself, or use an avatar. This will appear in the 3D arena and on your player card.
          </p>
          <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
            <div id="oc-avatar-preview" style="
              width:120px; height:120px; border-radius:50%; overflow:hidden;
              border:3px solid #334155; background:#1e293b;
              display:flex; align-items:center; justify-content:center;
              font-size:2.5rem; color:#64748b;
            ">👤</div>
            <div id="oc-crop-controls" style="display:none;width:100%;max-width:300px;color:#94a3b8;font-size:.75rem;">
              <label>Zoom <input id="oc-crop-zoom" type="range" min="1" max="3" step=".05" value="1" style="width:100%"></label>
              <label>Horizontal <input id="oc-crop-x" type="range" min="0" max="1" step=".01" value=".5" style="width:100%"></label>
              <label>Vertical <input id="oc-crop-y" type="range" min="0" max="1" step=".01" value=".5" style="width:100%"></label>
              <button id="oc-crop-apply" type="button" style="margin-top:8px;padding:8px 12px;border:0;border-radius:7px;background:#38bdf8;color:#082f49;font-weight:800;cursor:pointer">Use Crop</button>
            </div>
            <label style="
              cursor:pointer; padding:10px 20px; border-radius:8px;
              border:1px solid #334155; background:#1e293b;
              color:#cbd5e1; font-weight:600; font-size:0.85rem;
            ">
              📷 Upload Photo
              <input id="oc-avatar-input" type="file" accept="image/*" style="display:none;"/>
            </label>
            <p style="color:#475569; font-size:0.75rem; margin:0;">Square image, max 2MB. Will be cropped to a circle.</p>
          </div>
        </div>

        <!-- Step 5: Story -->
        <div id="oc-step-content-5" class="oc-step-content" style="display:none;">
          <h3 style="color:#f8fafc; margin:0 0 4px;">Why do you play?</h3>
          <p style="color:#64748b; margin:0 0 16px; font-size:0.82rem; line-height:1.5;">
            This is your story. It will appear in cutscenes when captains and rivals talk about you.
          </p>
          <textarea id="oc-story" rows="5" placeholder="I play volleyball because..." maxlength="400" style="
            width:100%; box-sizing:border-box;
            padding:12px 14px; border-radius:8px;
            border:1px solid #334155; background:#1e293b;
            color:#f8fafc; font-size:0.9rem; resize:none;
            outline:none; line-height:1.6;
          "></textarea>
          <p style="color:#475569; font-size:0.75rem; text-align:right; margin:4px 0 0;">
            <span id="oc-story-count">0</span>/400
          </p>
        </div>

        <!-- Navigation -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:20px; border-top:1px solid #1e293b;">
          <button id="oc-prev" style="
            padding:10px 20px; border-radius:8px; border:1px solid #334155;
            background:#1e293b; color:#94a3b8; font-weight:600; cursor:pointer;
            display:none;
          ">← Back</button>
          <button id="oc-skip" style="
            background:none; border:none; color:#475569; font-size:0.82rem; cursor:pointer;
            text-decoration:underline;
          ">Skip for now</button>
          <button id="oc-next" style="
            padding:10px 24px; border-radius:8px; border:none;
            background:#fbbf24; color:#0f172a; font-weight:700; cursor:pointer;
          ">Next →</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // ── State ──
  let currentStep = 1;
  const totalSteps = 5;
  let formData = {
    club: oc?.club || null,
    name: oc?.name || '',
    position: oc?.position || null,
    nickname: oc?.nickname || '',
    stats: oc?.stats ? { ...oc.stats } : { attack: 0, serve: 0, defense: 0, setting: 0, athletic: 0 },
    avatar: oc?.avatar || null,
    story: oc?.story || '',
  };

  const max = OC_STAT_CONFIG.pointsMax;
  const min = OC_STAT_CONFIG.pointsMin;

  function updatePoints() {
    const used = Object.values(formData.stats).reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, Math.round((OC_STAT_CONFIG.pointsTotal - used) * 10) / 10);
    document.getElementById('oc-points-remaining').textContent = remaining;
    return remaining;
  }

  function updateStatUI() {
    for (const stat of ['attack', 'serve', 'defense', 'setting', 'athletic']) {
      const val = formData.stats[stat];
      document.getElementById(`oc-stat-val-${stat}`).textContent = val.toFixed(1);
      document.getElementById(`oc-stat-bar-${stat}`).style.width = `${Math.round(((val - min) / (max - min)) * 100)}%`;
    }
    updatePoints();
  }

  function showStep(n) {
    for (let i = 1; i <= totalSteps; i++) {
      document.getElementById(`oc-step-content-${i}`).style.display = i === n ? 'block' : 'none';
      document.getElementById(`oc-step-${i}`).style.background = i <= n ? '#fbbf24' : '#1e293b';
    }
    currentStep = n;
    document.getElementById('oc-prev').style.display = n > 1 ? 'block' : 'none';
    document.getElementById('oc-skip').style.display = n < totalSteps ? 'inline' : 'none';
    const nextBtn = document.getElementById('oc-next');
    if (n === totalSteps) {
      nextBtn.textContent = '✓ Create Player';
      nextBtn.style.background = '#22c55e';
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.style.background = '#fbbf24';
    }
    updateStepValid();
  }

  function updateStepValid() {
    const nextBtn = document.getElementById('oc-next');
    const next = document.getElementById('oc-next');
    if (currentStep === 1) {
      const valid = formData.club && formData.name.trim() && formData.position;
      next.disabled = !valid;
    } else if (currentStep === 2) {
      const valid = formData.nickname.trim().length >= 2 && isNicknameAvailable(formData.nickname);
      next.disabled = !valid;
    } else if (currentStep === 3) {
      next.disabled = updatePoints() < 0;
    } else {
      next.disabled = false;
    }
    next.style.opacity = next.disabled ? '0.4' : '1';
    next.style.cursor = next.disabled ? 'not-allowed' : 'pointer';
  }

  // ── Event handlers ──

  document.getElementById('oc-close').onclick = () => container.remove();
  container.addEventListener('click', (e) => { if (e.target === container) container.remove(); });

  document.getElementById('oc-prev').onclick = () => showStep(currentStep - 1);
  document.getElementById('oc-skip').onclick = () => {
    if (onSkip) onSkip(formData);
    container.remove();
  };

  document.getElementById('oc-next').onclick = () => {
    if (currentStep < totalSteps) {
      showStep(currentStep + 1);
    } else {
      const finalOC = { ...formData, created: true, createdAt: Date.now() };
      if (onSave) onSave(finalOC);
      container.remove();
    }
  };

  // Step 1: Club buttons
  container.querySelectorAll('.oc-club-btn').forEach(btn => {
    btn.onclick = () => {
      formData.club = btn.dataset.club;
      container.querySelectorAll('.oc-club-btn').forEach(b => {
        b.style.borderColor = b === btn ? '#fbbf24' : '#334155';
        b.style.color = b === btn ? '#fbbf24' : '#94a3b8';
        b.style.background = b === btn ? '#1e293b' : '#1e293b';
      });
      updateStepValid();
    };
    // Pre-select
    if (oc?.club === btn.dataset.club) btn.click();
  });

  // Step 1: Name
  const nameInput = document.getElementById('oc-name');
  nameInput.value = formData.name;
  nameInput.addEventListener('input', () => {
    formData.name = nameInput.value;
    updateStepValid();
  });

  // Step 1: Position buttons
  container.querySelectorAll('.oc-pos-btn').forEach(btn => {
    btn.onclick = () => {
      formData.position = btn.dataset.pos;
      container.querySelectorAll('.oc-pos-btn').forEach(b => {
        b.style.borderColor = b === btn ? '#fbbf24' : '#334155';
        b.style.color = b === btn ? '#fbbf24' : '#94a3b8';
      });
      updateStepValid();
    };
    if (oc?.position === btn.dataset.pos) btn.click();
  });

  // Step 2: Nickname
  const nickInput = document.getElementById('oc-nickname');
  const nickStatus = document.getElementById('oc-nickname-status');
  nickInput.value = formData.nickname;

  nickInput.addEventListener('input', () => {
    formData.nickname = nickInput.value.trim();
    if (!formData.nickname) {
      nickStatus.textContent = '';
    } else if (isNicknameAvailable(formData.nickname)) {
      nickStatus.textContent = '✓ Available';
      nickStatus.style.color = '#22c55e';
    } else {
      nickStatus.textContent = '✗ Already taken';
      nickStatus.style.color = '#ef4444';
    }
    updateStepValid();
  });

  // Nickname suggestions
  const suggestionsEl = document.getElementById('oc-nickname-suggestions');
  getSuggestedNicknames(8).forEach(nick => {
    const btn = document.createElement('button');
    btn.textContent = nick;
    btn.style.cssText = `
      padding:6px 12px; border-radius:6px; border:1px solid #334155;
      background:#1e293b; color:#94a3b8; cursor:pointer;
      font-size:0.8rem; font-weight:600;
    `;
    btn.onclick = () => {
      formData.nickname = nick;
      nickInput.value = nick;
      nickStatus.textContent = '✓ Available';
      nickStatus.style.color = '#22c55e';
      updateStepValid();
    };
    suggestionsEl.appendChild(btn);
  });

  // Step 3: Stats
  container.querySelectorAll('.oc-stat-btn').forEach(btn => {
    btn.onclick = () => {
      const stat = btn.dataset.stat;
      const delta = btn.classList.contains('oc-stat-plus') ? 0.5 : -0.5;
      const current = formData.stats[stat];
      if (delta > 0 && updatePoints() <= 0) return;
      if (delta < 0 && current <= min) return;
      const newVal = Math.round(Math.min(max, Math.max(min, current + delta)) * 10) / 10;
      formData.stats[stat] = newVal;
      updateStatUI();
      updateStepValid();
    };
  });

  // Step 4: Avatar
  const avatarInput = document.getElementById('oc-avatar-input');
  const avatarPreview = document.getElementById('oc-avatar-preview');
  if (oc?.avatar) {
    avatarPreview.innerHTML = `<img src="${oc.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
  }
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const sourceUrl = URL.createObjectURL(file);
      const sourceImg = new Image();
      sourceImg.onload = () => {
        const controls = document.getElementById('oc-crop-controls');
        controls.style.display = 'block';
        const renderCrop = () => {
          const zoom = +document.getElementById('oc-crop-zoom').value;
          const x = +document.getElementById('oc-crop-x').value;
          const y = +document.getElementById('oc-crop-y').value;
          const size = Math.min(sourceImg.width, sourceImg.height) / zoom;
          const sx = Math.max(0, Math.min(sourceImg.width - size, sourceImg.width * x - size / 2));
          const sy = Math.max(0, Math.min(sourceImg.height - size, sourceImg.height * y - size / 2));
          const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
          canvas.getContext('2d').drawImage(sourceImg, sx, sy, size, size, 0, 0, 256, 256);
          const previewUrl = canvas.toDataURL('image/jpeg', .88);
          avatarPreview.innerHTML = `<img src="${previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>`;
          return previewUrl;
        };
        ['oc-crop-zoom','oc-crop-x','oc-crop-y'].forEach(id => document.getElementById(id).oninput = renderCrop);
        document.getElementById('oc-crop-apply').onclick = () => { formData.avatar = renderCrop(); controls.style.display = 'none'; URL.revokeObjectURL(sourceUrl); };
        renderCrop();
      };
      sourceImg.src = sourceUrl;
    } catch (err) {
      alert(err.message);
    }
  });

  // Step 5: Story
  const storyInput = document.getElementById('oc-story');
  const storyCount = document.getElementById('oc-story-count');
  storyInput.value = formData.story;
  storyInput.addEventListener('input', () => {
    formData.story = storyInput.value;
    storyCount.textContent = storyInput.value.length;
  });
  storyCount.textContent = formData.story.length;

  // Init
  updateStatUI();
  showStep(1);
  updateStepValid();
}
