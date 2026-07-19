// Default league data. Edit here to change captains / players / stats.

export const DEFAULT_CAPTAINS = [
  { id: 'c1', name: 'Big-B',   team: 'Strigidae',     color: '#dc2626', color2: '#000000', logo: 'strigidae', role: 'Middle Blocker', photo: './assets/players/big-b.png' },
  { id: 'c2', name: 'Burla',   team: 'Kòrsou Otters', color: '#16a34a', color2: '#000000', logo: 'otters',    role: 'Setter',         photo: './assets/players/burla.png' },
  { id: 'c3', name: 'Stratus', team: 'Shizuka',       color: '#2563eb', color2: '#78716c', logo: 'shizuka',   role: 'Libero',         photo: './assets/players/stratus.png' }
];

export const LOGO_URLS = {
  strigidae: './assets/strigidae.png',
  otters:    './assets/otters.png',
  shizuka:   './assets/shizuka.png'
};

// Bump this any time DEFAULT_PLAYERS changes — clients with a lower version
// will auto-refresh their local cache to pick up the new list.
// V3: captain + 10 picks = 11 total (7 starters + 4 bench). Was 5 (6 starters, no bench).
export const PICKS_PER_TEAM = 10;
export const PLAYER_DATA_VERSION = 11;

// Photo path convention: ./assets/players/<id>.png (transparent PNG cutout preferred)
// If a file doesn't exist, cards fall back to a silhouette + initials.
//
// Ratings rebalanced for realism:
//  - Nobody flat 5/5/5 or 9/9/9 anymore
//  - Everyone has a shape (attackers high att/srv, setters high set, liberos high def/ath, etc.)
//  - Ceilings realistic: 9 is elite, 8 is very good, 7 is solid, 6 average, 5 developing, 4 beginner
export const DEFAULT_PLAYERS = [
  // Captains — added to the shared pool. When a league picks them as captain,
  // they're auto-excluded from that league's draft pool.
  { id: 'big-b', position:'MB',        name:'Big-B',         nickname:'The Night Predator', role:'Middle Blocker', isCaptain:true,
    attack:6.5, serve:6.5, defense:8,   setting:6.5, athletic:8 },
  { id: 'burla', position:'S',        name:'Burla',         nickname:'The Trickster',      role:'Setter',         isCaptain:true,
    attack:6.5, serve:7,   defense:6.5, setting:6.5, athletic:6.5 },
  { id: 'stratus', position:'L',      name:'Stratus',       nickname:'The Mirror',         role:'Libero',         isCaptain:true,
    attack:4,   serve:6,   defense:7,   setting:5,   athletic:6 },

  // Draft pool
  { id: 'ayaz', position:'OH',         name:'Ayaz',         nickname:'Footie',           attack:5, serve:5, defense:6, setting:4, athletic:7 },
  { id: 'steven', position:'OH/OP',       name:'Steven',       nickname:'Tiny Giant',       attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'pato', position:'L',         name:'Pato',         nickname:'Nishinoya',        attack:5, serve:5, defense:8, setting:6, athletic:8 },
  { id: 'moon', position:'OH',         name:'Moon',         nickname:'The Claw',         attack:8, serve:7, defense:5, setting:4, athletic:7 },
  { id: 'ibrahim', position:'DS',      name:'Ibrahim',      nickname:'Monster',          attack:4, serve:4, defense:4, setting:3, athletic:5 },
  { id: 'tamara', position:'L',       name:'Tamara',       nickname:'Tomorrow',         attack:5, serve:5, defense:8, setting:6, athletic:7 },
  { id: 'ricardo', position:'OH/OP',      name:'Ricardo',      nickname:'Aim & Shoot',      attack:8, serve:8, defense:7, setting:7, athletic:7 },
  { id: 'nikita-blond', position:'OH', name:'Nikita Blond', nickname:'Winger',           attack:8, serve:7, defense:5, setting:4, athletic:7 },
  { id: 'nikita-brown', position:'OP', name:'Nikita Brown', nickname:'Nightmare',        attack:9, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'max', position:'OP',          name:'Max',          nickname:'Grounded',         attack:6, serve:5, defense:4, setting:5, athletic:4 },
  { id: 'luna', position:'L/S',         name:'Luna',         nickname:'Short Stop',       attack:4, serve:5, defense:8, setting:7, athletic:7 },
  { id: 'floor', position:'OH',        name:'Floor',        nickname:'Forte',            attack:7, serve:7, defense:7, setting:6, athletic:6 },
  { id: 'narcis', position:'MB',       name:'Narcis',       nickname:'Upcomer',          attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'rei', position:'S',          name:'Rei',          nickname:'Axis Rotation',    attack:5, serve:5, defense:6, setting:8, athletic:6 },
  { id: 'zakhar', position:'L',       name:'Zakhar',       nickname:'Guardian Angel',   attack:5, serve:5, defense:8, setting:5, athletic:7 },
  { id: 'renars', position:'OH',       name:'Renars',       nickname:'Hold This L',      attack:7, serve:8, defense:7, setting:6, athletic:7 },
  { id: 'rashid', position:'OH',       name:'Rashid',       nickname:'Weather Forecast', attack:6, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'mizu', position:'MB',         name:'Mizu',         nickname:'Brux',             attack:6, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'linus', position:'OP',        name:'Linus',        nickname:'Rocket',           attack:8, serve:7, defense:5, setting:4, athletic:8 },
  { id: 'joran', position:'OH/OP',        name:'Joran',        nickname:'The Dream',        attack:9, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'skuppa', position:'DS',       name:'Skuppa',       nickname:'DJ',               attack:4, serve:3, defense:4, setting:4, athletic:5 },
  { id: 'islom', position:'OH',        name:'Islom',        nickname:'RPG',              attack:8, serve:8, defense:5, setting:4, athletic:7 },
  { id: 'ihor', position:'MB',         name:'Ihor',         nickname:'Header',           attack:7, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'bouschra', position:'OH',     name:'Bouschra',     nickname:'Gazelle',          attack:7, serve:7, defense:7, setting:6, athletic:8 },
  { id: 'anezka', position:'DS',       name:'Anezka',       nickname:'Navratilova',      attack:4, serve:3, defense:4, setting:4, athletic:5 },
  { id: 'joep', position:'S',         name:'Joep',         nickname:'Blank',            attack:5, serve:5, defense:7, setting:8, athletic:6 },
  { id: 'pavel', position:'L/OP',        name:'Pavel',        nickname:'Janitor',          attack:6, serve:6, defense:8, setting:5, athletic:7 },
  { id: 'merel', position:'OH',        name:'Merel',        nickname:'Bird',             attack:7, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'tabeeb', position:'DS',       name:'Tabeeb',       nickname:'Bomber',           attack:4, serve:4, defense:4, setting:3, athletic:5 },

  // Second-wave additions
  { id: 'daan', position:'OH',         name:'Daan',         nickname:'Dahliah',          attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'gabsche', position:'OH/OP',      name:'Gabsche',      nickname:'Capitain',         attack:8, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'ani', position:'MB',          name:'Ani',          nickname:'The Host',         attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'mandie', position:'OH',       name:'Mandie',       nickname:'Scope',            attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'dawood', position:'S/OP',       name:'Dawood',       nickname:'Canon',            attack:7, serve:7, defense:6, setting:8, athletic:7 },
  { id: 'aizaz', position:'DS',        name:'Aizaz',        nickname:'Spark',            attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'robin', position:'OH',        name:'Robin',        nickname:'Bullseye',         attack:7, serve:7, defense:7, setting:7, athletic:7 }
];

// Helper: given an id like 'nikita-brown', returns './assets/players/nikita-brown.png'
export function photoPathFor(id) {
  return `./assets/players/${id}.png`;
}

// Fallback: gets initials from a name for the silhouette placeholder
export function getInitials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export const STAT_KEYS = ['attack', 'serve', 'defense', 'setting', 'athletic'];
export const STAT_LABELS = { attack: 'Attack', serve: 'Serve', defense: 'Defense', setting: 'Setting', athletic: 'Athletic' };

// ═══════════════════════════════════════════════════════════════════════
// PERSONALITY TRAITS — six 0..1 sliders that shape player behavior
// ═══════════════════════════════════════════════════════════════════════
//   aggression    - swing hard vs tip smart (0=tipper, 1=hammer)
//   showboat      - loves flashy plays: setter dumps, slides, fakes (0=safe, 1=trickster)
//   discipline    - reads plays, commits to blocks (0=lazy blocker, 1=always jumps)
//   hustle        - chases every ball, dives for saves (0=laid back, 1=all-out)
//   confidence    - performs under pressure (0=chokes on tight sets, 1=big-moment player)
//   chemistry     - a MAP of friend IDs → bond strength (0..1). Setter passes to friends more.
export const TRAIT_KEYS = ['aggression', 'showboat', 'discipline', 'hustle', 'confidence'];

// Preset personalities for the Gomi Cup roster (based on Brian's descriptions).
// Chemistry: 0.9 = best friend, 0.7 = close, 0.5 = friendly (top 3 for each player).
// Merges bidirectionally — max() taken when players list each other.
export const PLAYER_TRAITS = {
  // ── Captains ──
  'big-b':        { aggression: 0.85, showboat: 0.30, discipline: 0.90, hustle: 0.85, confidence: 0.80,
                    chemistry: { 'burla': 0.9, 'stratus': 0.9, 'zakhar': 0.7 } },
  'burla':        { aggression: 0.40, showboat: 0.95, discipline: 0.70, hustle: 0.70, confidence: 0.75,
                    chemistry: { 'big-b': 0.9, 'stratus': 0.9, 'bouschra': 0.7, 'mandie': 0.5, 'joran': 0.6 } },
  'stratus':      { aggression: 0.20, showboat: 0.10, discipline: 0.90, hustle: 0.95, confidence: 0.85,
                    chemistry: { 'big-b': 0.9, 'burla': 0.9, 'bouschra': 0.7 } },

  // ── Draft pool with real friendships ──
  'ayaz':         { aggression: 0.60, showboat: 0.50, discipline: 0.50, hustle: 0.80, confidence: 0.55,
                    chemistry: { 'big-b': 0.9, 'pavel': 0.7, 'stratus': 0.5 } },
  'steven':       { aggression: 0.75, showboat: 0.40, discipline: 0.80, hustle: 0.75, confidence: 0.80,
                    chemistry: { 'ricardo': 0.9, 'renars': 0.7, 'dawood': 0.5 } },
  'pato':         { aggression: 0.20, showboat: 0.60, discipline: 0.85, hustle: 0.95, confidence: 0.75,
                    chemistry: { 'ani': 0.9, 'merel': 0.7 } },
  'moon':         { aggression: 0.95, showboat: 0.40, discipline: 0.50, hustle: 0.60, confidence: 0.70,
                    chemistry: { 'daan': 0.9, 'floor': 0.7, 'luna': 0.5 } },
  'ibrahim':      { aggression: 0.60, showboat: 0.30, discipline: 0.40, hustle: 0.70, confidence: 0.50,
                    chemistry: { 'big-b': 0.9, 'skuppa': 0.7, 'burla': 0.5 } },
  'tamara':       { aggression: 0.30, showboat: 0.40, discipline: 0.85, hustle: 0.90, confidence: 0.70,
                    chemistry: { 'gabsche': 0.9, 'ani': 0.7, 'moon': 0.5 } },
  'ricardo':      { aggression: 0.75, showboat: 0.35, discipline: 0.85, hustle: 0.75, confidence: 0.90,
                    chemistry: { 'renars': 0.9, 'steven': 0.7 } },
  'nikita-blond': { aggression: 0.85, showboat: 0.55, discipline: 0.55, hustle: 0.60, confidence: 0.75,
                    chemistry: { 'zakhar': 0.9, 'ihor': 0.7, 'pavel': 0.5 } },
  'nikita-brown': { aggression: 0.90, showboat: 0.50, discipline: 0.85, hustle: 0.80, confidence: 0.95,
                    chemistry: { 'islom': 0.9, 'ihor': 0.7, 'nikita-blond': 0.5 } },
  'max':          { aggression: 0.55, showboat: 0.30, discipline: 0.45, hustle: 0.55, confidence: 0.55,
                    chemistry: { 'merel': 0.9, 'ani': 0.7, 'gabsche': 0.5 } },
  'luna':         { aggression: 0.25, showboat: 0.50, discipline: 0.80, hustle: 0.85, confidence: 0.75,
                    chemistry: { 'moon': 0.9, 'floor': 0.7 } },
  'floor':        { aggression: 0.70, showboat: 0.45, discipline: 0.70, hustle: 0.75, confidence: 0.70,
                    chemistry: { 'luna': 0.9, 'moon': 0.7, 'daan': 0.5 } },
  'narcis':       { aggression: 0.55, showboat: 0.60, discipline: 0.55, hustle: 0.65, confidence: 0.60,
                    chemistry: { 'rei': 0.9, 'bouschra': 0.7, 'renars': 0.5 } },
  'rei':          { aggression: 0.40, showboat: 0.75, discipline: 0.80, hustle: 0.80, confidence: 0.75,
                    chemistry: { 'narcis': 0.9, 'burla': 0.7, 'big-b': 0.5 } },
  'zakhar':       { aggression: 0.30, showboat: 0.30, discipline: 0.90, hustle: 0.95, confidence: 0.80,
                    chemistry: { 'nikita-blond': 0.9, 'big-b': 0.7, 'joran': 0.5 } },
  'renars':       { aggression: 0.75, showboat: 0.70, discipline: 0.70, hustle: 0.70, confidence: 0.80,
                    chemistry: { 'ricardo': 0.9, 'steven': 0.7, 'narcis': 0.5 } },
  'rashid':       { aggression: 0.60, showboat: 0.35, discipline: 0.70, hustle: 0.75, confidence: 0.65,
                    chemistry: { 'dawood': 0.9, 'gabsche': 0.7, 'pavel': 0.5 } },
  'mizu':         { aggression: 0.55, showboat: 0.35, discipline: 0.75, hustle: 0.70, confidence: 0.70,
                    chemistry: { 'floor': 0.9, 'merel': 0.7, 'ani': 0.5 } },
  'linus':        { aggression: 0.90, showboat: 0.55, discipline: 0.55, hustle: 0.70, confidence: 0.80,
                    chemistry: { 'joran': 0.9, 'islom': 0.7, 'ricardo': 0.5 } },
  'joran':        { aggression: 0.80, showboat: 0.70, discipline: 0.85, hustle: 0.85, confidence: 0.95,
                    chemistry: { 'steven': 0.9, 'ricardo': 0.7, 'dawood': 0.5, 'burla': 0.6 } },
  'skuppa':       { aggression: 0.45, showboat: 0.65, discipline: 0.40, hustle: 0.55, confidence: 0.50,
                    chemistry: { 'ibrahim': 0.9, 'big-b': 0.7, 'burla': 0.5 } },
  'islom':        { aggression: 0.85, showboat: 0.50, discipline: 0.60, hustle: 0.65, confidence: 0.75,
                    chemistry: { 'nikita-brown': 0.9, 'ihor': 0.7, 'pavel': 0.5 } },
  'ihor':         { aggression: 0.65, showboat: 0.30, discipline: 0.80, hustle: 0.75, confidence: 0.70,
                    chemistry: { 'nikita-blond': 0.9, 'pavel': 0.7, 'islom': 0.5 } },
  'bouschra':     { aggression: 0.70, showboat: 0.40, discipline: 0.75, hustle: 0.90, confidence: 0.75,
                    chemistry: { 'narcis': 0.9, 'burla': 0.7, 'ricardo': 0.5 } },
  'anezka':       { aggression: 0.40, showboat: 0.35, discipline: 0.60, hustle: 0.65, confidence: 0.55,
                    chemistry: { 'burla': 0.9, 'big-b': 0.7, 'rei': 0.5 } },
  'joep':         { aggression: 0.35, showboat: 0.30, discipline: 0.85, hustle: 0.75, confidence: 0.75,
                    chemistry: { 'daan': 0.9, 'moon': 0.7, 'joran': 0.5 } },
  'pavel':        { aggression: 0.55, showboat: 0.35, discipline: 0.85, hustle: 0.90, confidence: 0.70,
                    chemistry: { 'ihor': 0.9, 'nikita-blond': 0.7, 'zakhar': 0.5 } },
  'merel':        { aggression: 0.65, showboat: 0.55, discipline: 0.70, hustle: 0.80, confidence: 0.70,
                    chemistry: { 'ani': 0.9, 'gabsche': 0.7, 'max': 0.5 } },
  'tabeeb':       { aggression: 0.70, showboat: 0.40, discipline: 0.50, hustle: 0.65, confidence: 0.55,
                    chemistry: { 'big-b': 0.9, 'stratus': 0.7, 'skuppa': 0.5 } },
  'daan':         { aggression: 0.70, showboat: 0.50, discipline: 0.75, hustle: 0.75, confidence: 0.75,
                    chemistry: { 'moon': 0.9, 'joep': 0.7, 'gabsche': 0.5 } },
  'gabsche':      { aggression: 0.80, showboat: 0.60, discipline: 0.85, hustle: 0.85, confidence: 0.90,
                    chemistry: { 'ani': 0.9, 'merel': 0.7, 'robin': 0.5 } },
  'ani':          { aggression: 0.50, showboat: 0.60, discipline: 0.65, hustle: 0.70, confidence: 0.65,
                    chemistry: { 'gabsche': 0.9, 'robin': 0.7, 'daan': 0.5 } },
  'mandie':       { aggression: 0.70, showboat: 0.55, discipline: 0.75, hustle: 0.75, confidence: 0.75,
                    chemistry: { 'burla': 0.9, 'big-b': 0.7, 'stratus': 0.5 } },
  'dawood':       { aggression: 0.65, showboat: 0.80, discipline: 0.75, hustle: 0.75, confidence: 0.80,
                    chemistry: { 'ayaz': 0.9, 'rashid': 0.7, 'stratus': 0.5 } },
  'aizaz':        { aggression: 0.55, showboat: 0.50, discipline: 0.65, hustle: 0.75, confidence: 0.65,
                    chemistry: { 'dawood': 0.9, 'ayaz': 0.7, 'rashid': 0.5 } },
  'robin':        { aggression: 0.70, showboat: 0.45, discipline: 0.80, hustle: 0.80, confidence: 0.75,
                    chemistry: { 'gabsche': 0.9, 'ani': 0.7, 'merel': 0.5 } }
};

// Default traits for anyone not in the map (e.g. players added via admin)
export const DEFAULT_TRAITS = {
  aggression: 0.60, showboat: 0.40, discipline: 0.65, hustle: 0.70, confidence: 0.65, chemistry: {}
};

/** Get merged traits for a player id (with fallback defaults). */
export function traitsFor(pid) {
  return { ...DEFAULT_TRAITS, ...(PLAYER_TRAITS[pid] || {}) };
}
