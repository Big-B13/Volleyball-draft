// Default league data. Edit here to change captains / players / stats.

export const DEFAULT_CAPTAINS = [
  { id: 'c1', name: 'Big-B',   team: 'Strigidae',     color: '#dc2626', color2: '#000000', logo: 'strigidae' },
  { id: 'c2', name: 'Burla',   team: 'Kòrsou Otters', color: '#16a34a', color2: '#000000', logo: 'otters' },
  { id: 'c3', name: 'Stratus', team: 'Shizuka',       color: '#2563eb', color2: '#78716c', logo: 'shizuka' }
];

export const LOGO_URLS = {
  strigidae: './assets/strigidae.png',
  otters:    './assets/otters.png',
  shizuka:   './assets/shizuka.png'
};

export const DEFAULT_PLAYERS = [
  { id: 'p01', name:'Ayaz',         nickname:'Footie',           attack:5, serve:5, defense:5, setting:5, athletic:5 },
  { id: 'p02', name:'Steven',       nickname:'Tiny Giant',       attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'p03', name:'Pato',         nickname:'Nishinoya',        attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'p04', name:'Moon',         nickname:'The Claw',         attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'p05', name:'Ibrahim',      nickname:'Monster',          attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'p06', name:'Tamara',       nickname:'Tomorrow',         attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'p07', name:'Ricardo',      nickname:'Aim & Shoot',      attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'p08', name:'Nikita Blond', nickname:'Winger',           attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'p09', name:'Nikita Brown', nickname:'Nightmare',        attack:9, serve:9, defense:9, setting:9, athletic:9 },
  { id: 'p10', name:'Max',          nickname:'Grounded',         attack:7, serve:5, defense:4, setting:5, athletic:4 },
  { id: 'p11', name:'Luna',         nickname:'Short Stop',       attack:4, serve:5, defense:9, setting:8, athletic:8 },
  { id: 'p12', name:'Floor',        nickname:'Forte',            attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'p13', name:'Narcis',       nickname:'Upcomer',          attack:6, serve:6, defense:6, setting:6, athletic:6 },
  { id: 'p14', name:'Rei',          nickname:'Axis Rotation',    attack:4, serve:5, defense:7, setting:9, athletic:7 },
  { id: 'p15', name:'Zakhar',       nickname:'Guardian Angel',   attack:5, serve:5, defense:9, setting:6, athletic:8 },
  { id: 'p16', name:'Renars',       nickname:'Hold This L',      attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'p17', name:'Rashid',       nickname:'Weather Forecast', attack:7, serve:6, defense:7, setting:6, athletic:7 },
  { id: 'p18', name:'Mizu',         nickname:'Brux',             attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'p19', name:'Linus',        nickname:'Rocket',           attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'p20', name:'Joran',        nickname:'The Dream',        attack:9, serve:9, defense:9, setting:9, athletic:9 },
  { id: 'p21', name:'Skuppa',       nickname:'DJ',               attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'p22', name:'Islom',        nickname:'RPG',              attack:9, serve:8, defense:5, setting:5, athletic:8 },
  { id: 'p23', name:'Ihor',         nickname:'Header',           attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'p24', name:'Boushra',      nickname:'Gazelle',          attack:8, serve:8, defense:8, setting:8, athletic:8 },
  { id: 'p25', name:'Anezka',       nickname:'Navratilova',      attack:3, serve:3, defense:3, setting:3, athletic:3 },
  { id: 'p26', name:'Joep',         nickname:'Blank',            attack:4, serve:5, defense:7, setting:9, athletic:7 },
  { id: 'p27', name:'Pavel',        nickname:'Janitor',          attack:7, serve:6, defense:9, setting:5, athletic:7 },
  { id: 'p28', name:'Merel',        nickname:'Bird',             attack:7, serve:7, defense:7, setting:7, athletic:7 },
  { id: 'p29', name:'Tabeeb',       nickname:'Bomber',           attack:3, serve:3, defense:3, setting:3, athletic:3 }
];

export const STAT_KEYS = ['attack', 'serve', 'defense', 'setting', 'athletic'];
export const STAT_LABELS = { attack: 'Attack', serve: 'Serve', defense: 'Defense', setting: 'Setting', athletic: 'Athletic' };
export const PICKS_PER_TEAM = 5;
