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

// Photo path convention: ./assets/players/<id>.png (transparent PNG cutout preferred)
// If a file doesn't exist, cards fall back to a silhouette + initials.
export const DEFAULT_PLAYERS = [
  { id: 'ayaz',         name:'Ayaz',         nickname:'Footie',           attack:5, serve:5, defense:5, setting:5, athletic:5 },
  { id: 'steven',       name:'Steven',       nickname:'Tiny Giant',       attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'pato',         name:'Pato',         nickname:'Nishinoya',        attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'moon',         name:'Moon',         nickname:'The Claw',         attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'ibrahim',      name:'Ibrahim',      nickname:'Monster',          attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'tamara',       name:'Tamara',       nickname:'Tomorrow',         attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'ricardo',      name:'Ricardo',      nickname:'Aim & Shoot',      attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'nikita-blond', name:'Nikita Blond', nickname:'Winger',           attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'nikita-brown', name:'Nikita Brown', nickname:'Nightmare',        attack:9, serve:9, defense:9, setting:9, athletic:9 },
  { id: 'max',          name:'Max',          nickname:'Grounded',         attack:7, serve:5, defense:4, setting:5, athletic:4 },
  { id: 'luna',         name:'Luna',         nickname:'Short Stop',       attack:4, serve:5, defense:9, setting:8, athletic:8 },
  { id: 'floor',        name:'Floor',        nickname:'Forte',            attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'narcis',       name:'Narcis',       nickname:'Upcomer',          attack:6, serve:6, defense:6, setting:6, athletic:6 },
  { id: 'rei',          name:'Rei',          nickname:'Axis Rotation',    attack:4, serve:5, defense:7, setting:9, athletic:7 },
  { id: 'zakhar',       name:'Zakhar',       nickname:'Guardian Angel',   attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'renars',       name:'Renars',       nickname:'Hold This L',      attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'rashid',       name:'Rashid',       nickname:'Weather Forecast', attack:7, serve:6, defense:7, setting:6, athletic:7 },
  { id: 'mizu',         name:'Mizu',         nickname:'Brux',             attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'linus',        name:'Linus',        nickname:'Rocket',           attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'joran',        name:'Joran',        nickname:'The Dream',        attack:9, serve:9, defense:9, setting:9, athletic:9 },
  { id: 'skuppa',       name:'Skuppa',       nickname:'DJ',               attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'islom',        name:'Islom',        nickname:'RPG',              attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'ihor',         name:'Ihor',         nickname:'Header',           attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'bouschra',     name:'Bouschra',     nickname:'Gazelle',          attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'anezka',       name:'Anezka',       nickname:'Navratilova',      attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'joep',         name:'Joep',         nickname:'Blank',            attack:4, serve:5, defense:7, setting:9, athletic:7 },
  { id: 'pavel',        name:'Pavel',        nickname:'Janitor',          attack:7, serve:6, defense:9, setting:5, athletic:7 },
  { id: 'merel',        name:'Merel',        nickname:'Bird',             attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'tabeeb',       name:'Tabeeb',       nickname:'Bomber',           attack:3, serve:3, defense:3, setting:3, athletic:3 }
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
