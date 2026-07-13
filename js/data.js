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
export const PLAYER_DATA_VERSION = 5;

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
  { id: 'big-b',        name:'Big-B',         nickname:'The Night Predator', role:'Middle Blocker', isCaptain:true,
    attack:6.5, serve:6.5, defense:8,   setting:6.5, athletic:8 },
  { id: 'burla',        name:'Burla',         nickname:'The Trickster',      role:'Setter',         isCaptain:true,
    attack:6.5, serve:7,   defense:6.5, setting:6.5, athletic:6.5 },
  { id: 'stratus',      name:'Stratus',       nickname:'The Mirror',         role:'Libero',         isCaptain:true,
    attack:4,   serve:6,   defense:7,   setting:5,   athletic:6 },

  // Draft pool
  { id: 'ayaz',         name:'Ayaz',         nickname:'Footie',           attack:5, serve:5, defense:6, setting:4, athletic:7 },
  { id: 'steven',       name:'Steven',       nickname:'Tiny Giant',       attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'pato',         name:'Pato',         nickname:'Nishinoya',        attack:5, serve:5, defense:8, setting:6, athletic:8 },
  { id: 'moon',         name:'Moon',         nickname:'The Claw',         attack:8, serve:7, defense:5, setting:4, athletic:7 },
  { id: 'ibrahim',      name:'Ibrahim',      nickname:'Monster',          attack:4, serve:4, defense:4, setting:3, athletic:5 },
  { id: 'tamara',       name:'Tamara',       nickname:'Tomorrow',         attack:5, serve:5, defense:8, setting:6, athletic:7 },
  { id: 'ricardo',      name:'Ricardo',      nickname:'Aim & Shoot',      attack:8, serve:8, defense:7, setting:7, athletic:7 },
  { id: 'nikita-blond', name:'Nikita Blond', nickname:'Winger',           attack:8, serve:7, defense:5, setting:4, athletic:7 },
  { id: 'nikita-brown', name:'Nikita Brown', nickname:'Nightmare',        attack:9, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'max',          name:'Max',          nickname:'Grounded',         attack:6, serve:5, defense:4, setting:5, athletic:4 },
  { id: 'luna',         name:'Luna',         nickname:'Short Stop',       attack:4, serve:5, defense:8, setting:7, athletic:7 },
  { id: 'floor',        name:'Floor',        nickname:'Forte',            attack:7, serve:7, defense:7, setting:6, athletic:6 },
  { id: 'narcis',       name:'Narcis',       nickname:'Upcomer',          attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'rei',          name:'Rei',          nickname:'Axis Rotation',    attack:5, serve:5, defense:6, setting:8, athletic:6 },
  { id: 'zakhar',       name:'Zakhar',       nickname:'Guardian Angel',   attack:5, serve:5, defense:8, setting:5, athletic:7 },
  { id: 'renars',       name:'Renars',       nickname:'Hold This L',      attack:7, serve:8, defense:7, setting:6, athletic:7 },
  { id: 'rashid',       name:'Rashid',       nickname:'Weather Forecast', attack:6, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'mizu',         name:'Mizu',         nickname:'Brux',             attack:6, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'linus',        name:'Linus',        nickname:'Rocket',           attack:8, serve:7, defense:5, setting:4, athletic:8 },
  { id: 'joran',        name:'Joran',        nickname:'The Dream',        attack:9, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'skuppa',       name:'Skuppa',       nickname:'DJ',               attack:4, serve:3, defense:4, setting:4, athletic:5 },
  { id: 'islom',        name:'Islom',        nickname:'RPG',              attack:8, serve:8, defense:5, setting:4, athletic:7 },
  { id: 'ihor',         name:'Ihor',         nickname:'Header',           attack:7, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'bouschra',     name:'Bouschra',     nickname:'Gazelle',          attack:7, serve:7, defense:7, setting:6, athletic:8 },
  { id: 'anezka',       name:'Anezka',       nickname:'Navratilova',      attack:4, serve:3, defense:4, setting:4, athletic:5 },
  { id: 'joep',         name:'Joep',         nickname:'Blank',            attack:5, serve:5, defense:7, setting:8, athletic:6 },
  { id: 'pavel',        name:'Pavel',        nickname:'Janitor',          attack:6, serve:6, defense:8, setting:5, athletic:7 },
  { id: 'merel',        name:'Merel',        nickname:'Bird',             attack:7, serve:6, defense:7, setting:6, athletic:6 },
  { id: 'tabeeb',       name:'Tabeeb',       nickname:'Bomber',           attack:4, serve:4, defense:4, setting:3, athletic:5 },

  // Second-wave additions
  { id: 'daan',         name:'Daan',         nickname:'Dahliah',          attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'gabsche',      name:'Gabsche',      nickname:'Capitain',         attack:8, serve:8, defense:8, setting:7, athletic:8 },
  { id: 'ani',          name:'Ani',          nickname:'The Host',         attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'mandie',       name:'Mandie',       nickname:'Scope',            attack:7, serve:7, defense:7, setting:6, athletic:7 },
  { id: 'dawood',       name:'Dawood',       nickname:'Canon',            attack:7, serve:7, defense:6, setting:8, athletic:7 },
  { id: 'aizaz',        name:'Aizaz',        nickname:'Spark',            attack:6, serve:5, defense:6, setting:5, athletic:6 },
  { id: 'robin',        name:'Robin',        nickname:'Bullseye',         attack:7, serve:7, defense:7, setting:7, athletic:7 }
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
export const PICKS_PER_TEAM = 5;
