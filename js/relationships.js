// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — RELATIONSHIP WEB
// Source of truth for all interpersonal connections between players.
// Used by: story system, synergy triggers, rivalry mechanics, chemistry.
// ═══════════════════════════════════════════════════════════════════════

export const RELATIONSHIPS = {
  // ───────────────────────────────────────────────────────────────────
  // FAMILY
  // ───────────────────────────────────────────────────────────────────
  family: {
    brothers: [
      ['renars', 'ricardo'],   // Renars and Ricardo are brothers
    ],
    brotherAndSister: [
      ['moon', 'luna'],        // Moon and Luna are brother and sister
    ],
    siblings: [
      ['zai', 'zandorah'],     // Zai has a sister: Zandorah
    ],
  },

  // ───────────────────────────────────────────────────────────────────
  // COUPLES / ROMANTIC
  // ───────────────────────────────────────────────────────────────────
  couples: [
    'floor', 'moon',           // Floor & Moon
    'gabshi', 'robin',        // Gabshi & Robin (couple)
  ],

  // ───────────────────────────────────────────────────────────────────
  // BEST FRIENDS (non-romantic)
  // ───────────────────────────────────────────────────────────────────
  bestFriends: [
    ['joep', 'daan'],          // Joep & Daan
    ['joep', 'moon'],          // Joep & Moon
    ['daan', 'moon'],          // Daan & Moon
    ['gabshi', 'ani'],         // Gabshi & Ani (best friends, NOT romantic)
  ],

  // ───────────────────────────────────────────────────────────────────
  // CLOSE FRIENDS / TRAINED TOGETHER
  // ───────────────────────────────────────────────────────────────────
  friendGroups: {
    // The first generation — they trained together from the start
    firstGen: [
      'moon', 'gabshi', 'robin', 'ani', 'daan', 'joep', 'ricardo', 'jordan', 'steven',
    ],
    // Big-B's circle
    bigBCircle: ['ibrahim', 'skuppa', 'ayaz'],
    // Mizu has multiple close connections
    mizuConnections: ['floor', 'ani'],
  },

  // ───────────────────────────────────────────────────────────────────
  // BIG-B'S NETWORK
  // ───────────────────────────────────────────────────────────────────
  // Who Big-B brought into volleyball / the league
  bigBIntroduced: ['nathan', 'zai', 'ayaz'],

  // Who Big-B trusts for life advice
  bigBAdvisors: ['zakhar', 'bader'],   // Bader = second-in-command, mentor figure

  // Big-B's inner circle (trained together from the start)
  bigBInner: ['ibrahim', 'skuppa'],

  // ───────────────────────────────────────────────────────────────────
  // CLUB GUIDES — The mentor who helps you based on your club choice
  // ───────────────────────────────────────────────────────────────────
  clubGuides: {
    strigidae: {
      guide: 'zakhar',
      title: 'Your Strigidae Guide',
      intro: `Zakhar stood at the edge of the court, watching.

He was still — not the relaxed kind, the deliberate kind. Like someone who has learned to be completely motionless so that when he moves, everyone notices.

When you chose Strigidae, he was the first person who looked at you directly.

"I'm Zakhar," he said. Quiet. No smile. No coldness either. Just the facts.

"I'm not your captain. Big-B is. I'm not here to welcome you or tell you you're special or give you a speech about what it means to wear these colors."

He walked onto the court.

"I'm the one who's going to make sure you evolve to the next level. That's my job. That's what I do."

He stopped at the net.

"I've been around this league longer than most. I've seen the ones who had everything and burned out in a season. The ones who had nothing and climbed anyway. The ones who were talented and lazy. The ones who weren't talented and worked until the talent came."

He looked at you.

"I don't know which one you are yet. I will find out. And when I do — I'll know exactly what you need to get better."

He picked up a ball.

"Strigidae doesn't play to entertain. We play to win. There's a difference. We're going to find that difference in your game and we're going to fix it."

He served. Clean. Simple. Perfect.

"See you tomorrow."`,
    },
    otters: {
      guide: 'mandie',
      title: 'Your Otters Guide',
      intro: `Mandie was already talking when you walked in.

She does that — fills the room before she even means to. It's not volume. It's just... presence. Everything feels a little more alive when she's in it.

"Oh, you're the new one!" She pointed at you like you'd been waiting for identification. "Aiden said you'd show up. I said you'd show up excited. Aiden said you'd show up nervous. He was right, wasn't he?"

She tossed you a ball.

"I'm Mandie. I don't have a cool nickname yet — Burla keeps trying to give me one but nothing sticks. I think she likes it that way."

She set up at the net, casual, like she'd been there all day.

"I run the chaos. That's what I do. Not the flashy chaos — the real kind. The kind where everything looks messy and it's actually the most precise thing on the court. Burla's the brain. I'm the... the thing that makes the brain make sense."

She served. Clean. Fast. Confident.

"You're in Otters now. That means you're part of the show. We're going to have fun. I promise."`,
    },
    shizuka: {
      guide: 'bouschra',
      title: 'Your Shizuka Guide',
      intro: `Bouschra didn't greet you when you arrived.

She was already on the court, running drills. Alone. The kind of alone that looks like it doesn't need anyone else — not lonely, just complete.

You watched for a while. She moved like water finding its level — exactly what was needed, exactly when needed, never more.

When she finally stopped, she looked at you.

"Zai said you'd come."

She walked to the sideline, picked up her water bottle.

"I'm Bouschra. I'm fast. That's what I am — the Gazelle. Fast, light, gone before anyone realizes I was there."

She sat on the bench.

"I'm not going to teach you anything. Zai doesn't teach — she shows. I'll show you how to watch her. How to see what she sees. How to move like the court is already telling you where to go."

She stood.

"In Shizuka, the court talks. Most people don't listen. Learn to listen."

She was already walking back to the court.

"Go get changed. We start in five."`,
    },
  },

  // ───────────────────────────────────────────────────────────────────
  // CLUB STRUCTURE
  // ───────────────────────────────────────────────────────────────────
  clubs: {
    strigidae: {
      captain: 'big-b',
      secondInCommand: 'bader',     // Runs The Night's Counter
      mentor: 'zakhar',             // Your guide
      storekeeper: 'bader',
      storeName: "The Night's Counter",
      members: [
        'big-b', 'bader', 'zakhar',
        'ibrahim', 'skuppa', 'narcis', 'mizu', 'ihor', 'ani', 'tabeeb',
        // others TBD
      ],
    },
    otters: {
      captain: 'nathan',
      secondInCommand: 'aiden',     // Runs The Otter Box
      mentor: 'mandie',            // Your guide
      storekeeper: 'aiden',
      storeName: 'The Otter Box',
      members: [
        'nathan', 'aiden', 'mandie',
        'moon', 'floor', 'renars', 'rashid', 'linus', 'joep', 'dawood', 'mizu', 'max', 'merel',
        // others TBD
      ],
    },
    shizuka: {
      captain: 'zai',
      secondInCommand: 'zandorah',  // Runs The Shizuka Cafe
      mentor: 'bouschra',           // Your guide
      storekeeper: 'zandorah',
      storeName: 'The Shizuka Cafe',
      members: [
        'zai', 'zandorah', 'bouschra',
        'luna', 'zakhar', 'gabshi', 'robin', 'pavel', 'aizaz', 'daan', 'ricardo',
        // others TBD
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────
  // CHAPTER 5 OPPONENTS (per club's second-in-command)
  // ───────────────────────────────────────────────────────────────────
  chapter5Opponents: {
    strigidae: 'bader',
    otters: 'aiden',
    shizuka: 'zandorah', // Zandorah is Zai's second-in-command
  },

  // ───────────────────────────────────────────────────────────────────
  // ENEMIES / RIVALS
  // ───────────────────────────────────────────────────────────────────
  rivals: [
    { a: 'tamara', b: 'anezka', type: 'enemy', reason: null },
    { a: 'tamara', b: 'big-b', type: 'enemy', reason: 'bitter rival' },
    { a: 'nikita-brown', b: 'jordan', type: 'rival', reason: null },
  ],

  // ───────────────────────────────────────────────────────────────────
  // ORIGINS
  // ───────────────────────────────────────────────────────────────────
  origins: {
    easternEurope: ['nikita-blond', 'nikita-brown', 'ihor', 'pavel', 'zakhar', 'tamara'],
    iran: ['narcis', 'rei'],
  },

  // ───────────────────────────────────────────────────────────────────
  // SPECIAL STATUS
  // ───────────────────────────────────────────────────────────────────
  captains: ['big-b', 'nathan', 'zai'],

  // Seconds-in-command
  secondsInCommand: ['bader', 'aiden'],

  oldestToYoungest: [
    'jordan', 'steven', 'moon', 'gabshi', 'robin', 'ani', 'daan', 'joep', 'ricardo',
    'skuppa', 'ibrahim', 'ayaz',
  ],

  // Rookies — joined the league last
  rookies: ['skuppa', 'ibrahim', 'ayaz'],

  // Wildcards — chaotic energy, unpredictable
  wildcards: ['zakhar', 'steven', 'ibrahim'],

  // Zakhar — recovering from foot injury
  recovering: ['zakhar'],

  // Story/support characters used for store, hierarchy and cutscenes.
  // They can have portraits/cards in UI, but are not regular on-court roster picks unless enabled later.
  storySupport: ['bader', 'aiden', 'zandorah'],
  storekeepers: ['bader', 'aiden', 'zandorah'],
};

// ─────────────────────────────────────────────────────────────────────
// PORTRAIT PATHS — where to find character images
// ─────────────────────────────────────────────────────────────────────

export const PORTRAITS = {
  bader: './assets/portraits/Bader.png',
  aiden: './assets/portraits/Aiden.png',
  zandorah: './assets/portraits/Zandorah.png',
  // Add other portrait paths here as they are created
};

// ─────────────────────────────────────────────────────────────────────
// RELATIONSHIP QUERY HELPERS
// ─────────────────────────────────────────────────────────────────────

/** Returns all relationship types a player is involved in */
export function getPlayerRelationships(pid) {
  const rels = [];
  const p = pid.toLowerCase();

  // Family
  for (const [a, b] of RELATIONSHIPS.family.brothers) {
    if (a === p) rels.push({ type: 'brother', player: b, label: `${capitalize(b)} is your brother` });
    if (b === p) rels.push({ type: 'brother', player: a, label: `${capitalize(a)} is your brother` });
  }
  for (const [a, b] of RELATIONSHIPS.family.brotherAndSister) {
    if (a === p) rels.push({ type: 'sibling', player: b, label: `${capitalize(b)} is your sister` });
    if (b === p) rels.push({ type: 'sibling', player: a, label: `${capitalize(a)} is your brother` });
  }
  for (const [a, b] of RELATIONSHIPS.family.siblings) {
    if (a === p) rels.push({ type: 'sibling', player: b, label: `${capitalize(b)} is your sister` });
    if (b === p) rels.push({ type: 'sibling', player: a, label: `${capitalize(a)} is your ${getPlayerClub(a) ? 'sibling' : 'sibling'}` });
  }

  // Couples
  for (let i = 0; i < RELATIONSHIPS.couples.length; i += 2) {
    const a = RELATIONSHIPS.couples[i];
    const b = RELATIONSHIPS.couples[i + 1];
    if (a === p) rels.push({ type: 'couple', player: b, label: `In a relationship with ${capitalize(b)}` });
    if (b === p) rels.push({ type: 'couple', player: a, label: `In a relationship with ${capitalize(a)}` });
  }

  // Best Friends
  for (const [a, b] of RELATIONSHIPS.bestFriends) {
    if (a === p) rels.push({ type: 'bestfriend', player: b, label: `Best friends with ${capitalize(b)}` });
    if (b === p) rels.push({ type: 'bestfriend', player: a, label: `Best friends with ${capitalize(a)}` });
  }

  // Big-B introduced
  if (RELATIONSHIPS.bigBIntroduced.includes(p)) {
    rels.push({ type: 'bigb_introduced', player: 'big-b', label: 'Big-B introduced you to volleyball' });
  }

  // First Gen
  if (RELATIONSHIPS.friendGroups.firstGen.includes(p)) {
    rels.push({ type: 'firstgen', label: 'First generation — trained together from the start' });
  }

  // Inner circle
  if (RELATIONSHIPS.friendGroups.bigBCircle.includes(p)) {
    rels.push({ type: 'bigb_inner', label: `Big-B's inner circle — trained together from the beginning` });
  }

  // Rivals
  for (const r of RELATIONSHIPS.rivals) {
    if (r.a === p) rels.push({ type: r.type, player: r.b, label: `Rival of ${capitalize(r.b)}${r.reason ? ` (${r.reason})` : ''}` });
    if (r.b === p) rels.push({ type: r.type, player: r.a, label: `${capitalize(r.a)} is your ${r.type}${r.reason ? ` (${r.reason})` : ''}` });
  }

  // Captain
  if (RELATIONSHIPS.captains.includes(p)) {
    rels.push({ type: 'captain', label: 'League Captain' });
  }

  // Second-in-command
  if (RELATIONSHIPS.secondsInCommand.includes(p)) {
    rels.push({ type: 'second', label: 'Second-in-Command' });
  }

  // Recovering
  if (RELATIONSHIPS.recovering.includes(p)) {
    rels.push({ type: 'recovering', label: 'Recovering from a career-threatening foot injury' });
  }

  // Rookies
  if (RELATIONSHIPS.rookies.includes(p)) {
    rels.push({ type: 'rookie', label: 'Rookie — joined the league most recently' });
  }

  // Wildcard
  if (RELATIONSHIPS.wildcards.includes(p)) {
    rels.push({ type: 'wildcard', label: 'Wildcard — plays by their own rules' });
  }

  // Eastern Europe / Iran
  if (RELATIONSHIPS.origins.easternEurope.includes(p)) {
    rels.push({ type: 'origin', label: 'From Ukraine/Russia' });
  }
  if (RELATIONSHIPS.origins.iran.includes(p)) {
    rels.push({ type: 'origin', label: 'From Iran' });
  }

  return rels;
}

/** Returns the club a player belongs to */
export function getPlayerClub(pid) {
  const p = pid.toLowerCase();
  for (const [club, data] of Object.entries(RELATIONSHIPS.clubs)) {
    if (data.members.map(m => m.toLowerCase()).includes(p)) return club;
  }
  return null;
}

/** Returns players in the same club as pid */
export function getClubMates(pid) {
  const club = getPlayerClub(pid);
  if (!club) return [];
  return RELATIONSHIPS.clubs[club].members.filter(m => m.toLowerCase() !== pid.toLowerCase());
}

/** Returns the captain of a player's club */
export function getClubCaptain(pid) {
  const club = getPlayerClub(pid);
  if (!club) return null;
  return RELATIONSHIPS.clubs[club].captain;
}

/** Returns the second-in-command of a player's club */
export function getClubSecond(pid) {
  const club = getPlayerClub(pid);
  if (!club) return null;
  return RELATIONSHIPS.clubs[club].secondInCommand;
}

/** Returns the mentor/guide of a player's club */
export function getClubMentor(pid) {
  const club = getPlayerClub(pid);
  if (!club) return null;
  return RELATIONSHIPS.clubs[club].mentor;
}

/** Returns the club guide for a given club */
export function getClubGuide(club) {
  return RELATIONSHIPS.clubGuides[club] || null;
}

/** Returns the storekeeper for a given club */
export function getClubStorekeeper(club) {
  return RELATIONSHIPS.clubs[club]?.storekeeper || RELATIONSHIPS.clubs[club]?.secondInCommand || null;
}

/** Returns the store name for a given club */
export function getClubStoreName(club) {
  return RELATIONSHIPS.clubs[club]?.storeName || 'The Card Store';
}

/** Returns the Chapter 5 opponent for a given club */
export function getChapter5Opponent(club) {
  return RELATIONSHIPS.chapter5Opponents[club] || null;
}

/** Returns a player's romantic partner if any */
export function getPartner(pid) {
  const p = pid.toLowerCase();
  for (let i = 0; i < RELATIONSHIPS.couples.length; i += 2) {
    if (RELATIONSHIPS.couples[i] === p) return RELATIONSHIPS.couples[i + 1];
    if (RELATIONSHIPS.couples[i + 1] === p) return RELATIONSHIPS.couples[i];
  }
  return null;
}

/** Returns siblings of a player */
export function getSiblings(pid) {
  const p = pid.toLowerCase();
  const siblings = [];
  for (const [a, b] of [...RELATIONSHIPS.family.brothers, ...RELATIONSHIPS.family.brotherAndSister, ...RELATIONSHIPS.family.siblings]) {
    if (a === p && b !== p) siblings.push(b);
    if (b === p && a !== p) siblings.push(a);
  }
  return [...new Set(siblings)];
}

/** Returns rivals and enemies of a player */
export function getRivals(pid) {
  const p = pid.toLowerCase();
  return RELATIONSHIPS.rivals
    .filter(r => r.a === p || r.b === p)
    .map(r => ({ player: r.a === p ? r.b : r.a, type: r.type, reason: r.reason }));
}

/** Returns best friends of a player */
export function getBestFriends(pid) {
  const p = pid.toLowerCase();
  const friends = [];
  for (const [a, b] of RELATIONSHIPS.bestFriends) {
    if (a === p) friends.push(b);
    if (b === p) friends.push(a);
  }
  return [...new Set(friends)];
}

/** Build full relationship graph */
export function buildRelationshipGraph() {
  const graph = {};
  const allPlayers = new Set();

  Object.values(RELATIONSHIPS.clubs).forEach(club => club.members.forEach(m => allPlayers.add(m)));
  RELATIONSHIPS.friendGroups.firstGen.forEach(p => allPlayers.add(p));
  RELATIONSHIPS.captains.forEach(p => allPlayers.add(p));

  allPlayers.forEach(pid => {
    graph[pid] = {
      relationships: getPlayerRelationships(pid),
      club: getPlayerClub(pid),
      clubMates: getClubMates(pid),
      captain: getClubCaptain(pid),
      second: getClubSecond(pid),
      mentor: getClubMentor(pid),
      partner: getPartner(pid),
      siblings: getSiblings(pid),
      rivals: getRivals(pid),
      bestFriends: getBestFriends(pid),
    };
  });

  return graph;
}

function capitalize(str) {
  if (!str) return '';
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
