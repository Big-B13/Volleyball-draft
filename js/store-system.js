// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — CLUB STORE / SECOND-IN-COMMAND SYSTEM
// Second-in-commands run the campaign store and card box progression.
// ═══════════════════════════════════════════════════════════════════════

import { RELATIONSHIPS, PORTRAITS, getClubStorekeeper, getClubStoreName } from './relationships.js';

export const CLUB_STORES = {
  strigidae: {
    name: "The Night's Counter",
    storekeeper: 'bader',
    accent: '#7f1d1d',
    portrait: PORTRAITS.bader,
    intro: `Bader looked up from the counter before you even entered.

"You cleared another match. Good. That means you earned something."

He placed a sealed card box on the table.

"Don't get excited yet. A box is potential. What matters is what you do with what comes out."`,
  },

  otters: {
    name: 'The Otter Box',
    storekeeper: 'aiden',
    accent: '#16a34a',
    portrait: PORTRAITS.aiden,
    intro: `Aiden spun the box once on the counter and caught it before it fell.

"You want the boring explanation or the fun one?"

He grinned.

"Never mind. We're doing the fun one. Open it."`,
  },

  shizuka: {
    name: 'The Shizuka Cafe',
    storekeeper: 'zandorah',
    accent: '#2563eb',
    portrait: PORTRAITS.zandorah,
    intro: `Zandorah placed the box on the counter like it was already decided.

"The Cafe is quiet for a reason. People make worse choices when they are loud."

She looked at the box, then at you.

"Open it. Then choose carefully."`,
  },
};

export const STOREKEEPER_REACTIONS = {
  bader: {
    common: 'Not exciting. Still useful.',
    uncommon: 'Good. Build from there.',
    rare: 'Now that is worth planning around.',
    epic: 'That changes your options.',
    legendary: 'Do not let the rarity make you careless.',
    evolution: 'Four cards. One upgrade. That is not destruction. That is investment.',
    pity: 'Bad luck is still data. The next box owes you something.',
  },

  aiden: {
    common: 'Okay, not fireworks. But we work with it.',
    uncommon: 'That is usable. Very usable.',
    rare: 'OHHH. There it is.',
    epic: 'WALKOUT! I told you this box had something!',
    legendary: 'NO WAY. That is insane.',
    evolution: 'Sacrifice four, upgrade one. Sounds dramatic. I love it.',
    pity: 'The box has been playing hard to get. Next one better behave.',
  },

  zandorah: {
    common: 'Every card has a place.',
    uncommon: 'Useful, if you understand it.',
    rare: 'Good. Do not waste it.',
    epic: 'Interesting.',
    legendary: 'So the box chose you.',
    evolution: 'Evolution is not free. Decide what you are willing to lose.',
    pity: 'Patience is also a resource.',
  },
};

export function getClubStore(club) {
  return CLUB_STORES[club] || CLUB_STORES.strigidae;
}

export function getStorekeeperReaction(club, rarityOrEvent = 'common') {
  const storekeeper = getClubStorekeeper(club);
  return STOREKEEPER_REACTIONS[storekeeper]?.[rarityOrEvent] || 'Open it.';
}

export function getStorekeeperForPackOpening(club, rarityOrEvent = 'common') {
  const store = getClubStore(club);
  return {
    id: store.storekeeper,
    name: capitalize(store.storekeeper),
    portrait: store.portrait,
    line: getStorekeeperReaction(club, rarityOrEvent),
    storeName: store.name,
    accent: store.accent,
  };
}

export function getStoreHeaderData(club) {
  const store = getClubStore(club);
  return {
    club,
    name: getClubStoreName(club) || store.name,
    storekeeper: store.storekeeper,
    portrait: store.portrait,
    intro: store.intro,
    accent: store.accent,
    captain: RELATIONSHIPS.clubs[club]?.captain || null,
    mentor: RELATIONSHIPS.clubs[club]?.mentor || null,
    secondInCommand: RELATIONSHIPS.clubs[club]?.secondInCommand || store.storekeeper,
  };
}

function capitalize(str) {
  if (!str) return '';
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
