// Volleyball match engine — stat + personality driven probabilistic simulator.
// Given two teams of 6 players each (with stats + positions + traits), produces a
// stream of "events" (serve, pass, set, attack, block, dig, point, rotation, etc.)
// that the visual layer can render.

import { traitsFor } from './data.js';

// Match-scoped chemistry overlay: { [pid]: { [pid]: 0..1 } } passed into createMatch()
// Merged on top of preset traits so persistent Firebase chemistry drives in-match decisions.
let MATCH_CHEMISTRY = {};

// Get personality traits for a slot (with graceful fallbacks + live chemistry).
function t(slot) {
  if (!slot || !slot.player) {
    return { aggression: 0.6, showboat: 0.4, discipline: 0.65, hustle: 0.7, confidence: 0.65, chemistry: {} };
  }
  const base = traitsFor(slot.player.id);
  const live = MATCH_CHEMISTRY[slot.player.id];
  if (!live) return base;
  // Merge chemistry maps — MATCH_CHEMISTRY (from Firebase) takes MAX with preset
  const merged = { ...(base.chemistry || {}) };
  for (const [otherPid, score] of Object.entries(live)) {
    merged[otherPid] = Math.max(merged[otherPid] || 0, score);
  }
  return { ...base, chemistry: merged };
}

// Court is 9m wide × 18m long (split in half). Use normalized coords (0..1).
// x = across the net (0 = left sideline, 1 = right sideline)
// y = along the court (0 = far endline, 0.5 = net, 1 = near endline)

// ============ POSITIONS ============
// Standard 6 rotation. Position 1 = right-back server, 2 = right-front, 3 = middle-front,
// 4 = left-front, 5 = left-back, 6 = middle-back. We use a simplified layout.
const ROTATION_SPOTS_HOME = [ // team on the near side (bottom half)
  { pos: 1, x: 0.75, y: 0.85 },  // right back
  { pos: 2, x: 0.75, y: 0.60 },  // right front
  { pos: 3, x: 0.50, y: 0.60 },  // middle front
  { pos: 4, x: 0.25, y: 0.60 },  // left front
  { pos: 5, x: 0.25, y: 0.85 },  // left back
  { pos: 6, x: 0.50, y: 0.85 }   // middle back
];
const ROTATION_SPOTS_AWAY = [ // team on the far side (top half) — mirror
  { pos: 1, x: 0.25, y: 0.15 },
  { pos: 2, x: 0.25, y: 0.40 },
  { pos: 3, x: 0.50, y: 0.40 },
  { pos: 4, x: 0.75, y: 0.40 },
  { pos: 5, x: 0.75, y: 0.15 },
  { pos: 6, x: 0.50, y: 0.15 }
];

/** Given a team of 6 players, assign them to spots based on their position preference */
function assignSpots(players, sideSpots) {
  const remaining = players.slice();
  const assigned = new Array(6).fill(null);

  // Priority: setter → pos 2 (right front, next to hitter), libero → pos 5/6 (back row),
  // middles → pos 3, outsides/opposites → pos 4/2, DS → back row
  function findAndTake(matcher) {
    const idx = remaining.findIndex(matcher);
    if (idx >= 0) return remaining.splice(idx, 1)[0];
    return null;
  }
  const hasPos = (p, code) => (p.position || '').split('/').includes(code);

  // 1. Setter → spot 2 (right front)
  let s = findAndTake(p => hasPos(p, 'S'));
  if (s) assigned[1] = s; // index 1 = spot 2
  // 2. Libero → spot 6 (middle back) — or spot 5 if not taken
  let l = findAndTake(p => hasPos(p, 'L'));
  if (l) assigned[5] = l;
  // 3. Middle blockers → spot 3 (middle front)
  let mb1 = findAndTake(p => hasPos(p, 'MB'));
  if (mb1) assigned[2] = mb1;
  let mb2 = findAndTake(p => hasPos(p, 'MB'));
  if (mb2) assigned[4] = mb2;   // second MB to left-back
  // 4. Outside hitter → spot 4 (left front)
  let oh1 = findAndTake(p => hasPos(p, 'OH'));
  if (oh1) assigned[3] = oh1;
  // 5. Opposite → spot 1 (right back) or wherever
  let op = findAndTake(p => hasPos(p, 'OP'));
  if (op) assigned[0] = op;
  // Fill remaining spots with anyone left
  for (let i = 0; i < 6; i++) {
    if (!assigned[i] && remaining.length) assigned[i] = remaining.shift();
  }
  // Attach the spot coordinates
  return assigned.map((player, i) => ({
    player,
    spot: sideSpots[i]
  }));
}

// ============ MATCH STATE ============
export function createMatch({ homeTeam, awayTeam, homeName, awayName, homeColor, awayColor, chemistryMap }) {
  // Store chemistry map for use by t() throughout this match
  MATCH_CHEMISTRY = chemistryMap || {};
  return {
    home: {
      name: homeName || 'Home',
      color: homeColor || '#dc2626',
      lineup: assignSpots(homeTeam, ROTATION_SPOTS_HOME),
      rotationOffset: 0
    },
    away: {
      name: awayName || 'Away',
      color: awayColor || '#2563eb',
      lineup: assignSpots(awayTeam, ROTATION_SPOTS_AWAY),
      rotationOffset: 0
    },
    setsHome: 0,
    setsAway: 0,
    pointsHome: 0,
    pointsAway: 0,
    serving: 'home',       // 'home' or 'away'
    rallyNumber: 0,
    setNumber: 1,
    setTarget: 25,          // sets 1-4
    finalSetTarget: 15,     // set 5 (if needed)
    matchOver: false,
    winner: null,
    log: []
  };
}

/** Rotate a team's lineup clockwise (after winning a side-out) */
function rotateTeam(team) {
  team.rotationOffset = (team.rotationOffset + 1) % 6;
}

/** Get the player currently at a rotation position (1-6) for a team */
function playerAtSpot(team, spotIndex) {
  // spotIndex is 0-5 for rotation positions 1-6
  const rotated = (spotIndex + team.rotationOffset) % 6;
  return team.lineup[rotated];
}

/** Simple weighted random check. Returns true if success.
 *  Higher `weight` = stats matter more. Default 0.55 gives an 8-rated player a ~20%pt
 *  edge over a 4-rated defender, which is felt but not deterministic. */
function statCheck(attackerStat, defenderStat, base = 0.5, weight = 0.55) {
  const attackScore = (attackerStat || 5) / 10;
  const defScore = (defenderStat || 5) / 10;
  const chance = base + (attackScore - defScore) * weight;
  return Math.random() < Math.max(0.05, Math.min(0.95, chance));
}

/** Pick a random hitter from the team's front row (spots 2, 3, 4 in rotation).
 *  Excludes the setter (spot 2 = rotation index 1) so the same person can't set + attack. */
function pickHitter(team) {
  const setterIdx = 1; // rotation index that is treated as the setter
  const candidates = [2, 3].map(i => playerAtSpot(team, i)).filter(Boolean);
  // If for some reason both hitter spots are empty, fall back to spot 1
  if (!candidates.length) {
    const fallback = playerAtSpot(team, setterIdx);
    return fallback || null;
  }
  // Weight by attack stat
  const weights = candidates.map(c => Math.pow((c.player.attack || 5), 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[0];
}

/** Pick the best defender to receive a serve — usually a back-row player with high defense.
 *  Priority order (real volleyball): Libero > Setter > OH/OPP > LB > Middle.
 *  Ball-x (0..1) matters: only players within reach of that x are eligible. */
function rolePriority(slot) {
  if (!slot || !slot.player) return 5;
  const pos = (slot.player.position || '').split('/');
  if (pos.includes('L') || pos.includes('DS')) return 1;   // Libero highest
  if (pos.includes('S')) return 2;                          // Setter
  if (pos.includes('OH') || pos.includes('OP')) return 3;   // Outsides
  if (pos.includes('MB')) return 5;                         // Middle blocker LAST for digs
  return 4;
}
function pickReceiver(team, ballX) {
  const backRow = [0, 4, 5].map(i => playerAtSpot(team, i)).filter(Boolean);
  let eligible = backRow;
  if (typeof ballX === 'number') {
    eligible = backRow.filter(p => Math.abs(p.spot.x - ballX) < 0.28);
    if (!eligible.length) eligible = backRow;
  }
  // Weight by defense stat AND role priority (lower priority num = bigger weight)
  const weights = eligible.map(c => {
    const def = c.player.defense || 5;
    const prio = rolePriority(c);
    // priority 1 (libero) = 3x, priority 5 (middle) = 0.4x
    const prioMult = 3.0 - (prio - 1) * 0.6;
    return Math.pow(def, 2) * Math.max(0.2, prioMult);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < eligible.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligible[i];
  }
  return eligible[0];
}

/** Pick the setter — team's designated setter (spot 2) or best `setting` stat */
function pickSetter(team) {
  // Prefer the actual designated setter (position includes 'S'). Falls back to spot 1.
  // In real volleyball the setter always sets on the 2nd touch regardless of rotation
  // (running plays are called around them). This keeps chemistry meaningful.
  for (const slot of team.lineup) {
    if (slot && (slot.player.position || '').split('/').includes('S')) return slot;
  }
  return playerAtSpot(team, 1) || team.lineup[0];
}

/** Is a slot in the front row (rotation spots 2, 3, 4 = indices 1, 2, 3)? */
function isFrontRow(slot) {
  if (!slot || !slot.spot) return false;
  // Home team: front row is y=0.60 (closer to net at y=0.5). Away: y=0.40.
  return Math.abs(slot.spot.y - 0.5) < 0.35;
}

/** Choose an attack tactic based on set quality + available hitters.
 *  Returns { hitter, tactic, decoy? }.
 *  Tactics:
 *   - 'quick'   : middle blocker attacks a low fast set (needs a great pass)
 *   - 'slide'   : MB runs behind setter for a running back-attack
 *   - 'back-row': OPP or OH attacks from back row (harder to defend, needs decent set)
 *   - 'fake'    : setter shows one hitter, sets another (weakens the block)
 *   - 'normal'  : standard outside/opposite attack
 */
// ═══════════════════════════════════════════════════════════════════════
// CAPABILITY GATES — some players physically CAN'T perform certain moves.
// Net is at 200cm (2m). Reach = heightCm + 50 (spike touch above head).
// If a player's reach doesn't clear the net, they physically can't dump/spike over.
// Skill stats gate HOW OFTEN they attempt it; height gates WHETHER it's possible at all.
// ═══════════════════════════════════════════════════════════════════════

const NET_HEIGHT_CM = 200;           // net top — real vball is 243cm, we use 2m so more players clear it
const REACH_OVER_NET_CM = NET_HEIGHT_CM + 5;   // need this much reach to actually hit over

/** Reach above the net (cm). Uses spikeTouchCm if set, otherwise heightCm+50 (typical jump touch). */
function playerReachCm(slot) {
  if (!slot || !slot.player) return 220;
  return slot.player.spikeTouchCm
      || (slot.player.heightCm ? slot.player.heightCm + 50 : 220);
}
function playerBlockReachCm(slot) {
  if (!slot || !slot.player) return 210;
  return slot.player.blockTouchCm
      || (slot.player.heightCm ? slot.player.heightCm + 40 : 210);
}
function playerHeightCm(slot) {
  return slot && slot.player && slot.player.heightCm ? slot.player.heightCm : 175;
}

/** Can the player physically REACH OVER the net (with jump)? */
function canReachOverNet(slot) {
  return playerReachCm(slot) >= REACH_OVER_NET_CM;   // needs to clear 205cm
}

/** CAN setter dump? Must reach over the net AND have basic attacking chops. */
function canSetterDump(setter) {
  if (!setter || !setter.player) return false;
  if (!canReachOverNet(setter)) return false;        // physically can't reach over
  const p = setter.player;
  const atk = p.attack || 5;
  const set = p.setting || 5;
  return atk >= 5 && set >= 5.5;                     // needs some touch + attacking sense
}

/** CAN run a quick attack? Needs athleticism + attack skill + reach over net. */
function canRunQuick(mb) {
  if (!mb || !mb.player) return false;
  if (!canReachOverNet(mb)) return false;
  const p = mb.player;
  return (p.athletic || 5) >= 6 && (p.attack || 5) >= 6;
}

/** CAN run a slide? Needs high athletic (running approach off one foot) + reach. */
function canRunSlide(mb) {
  if (!mb || !mb.player) return false;
  if (!canReachOverNet(mb)) return false;
  const p = mb.player;
  return (p.athletic || 5) >= 7 && (p.attack || 5) >= 6;
}

/** CAN back-row attack? Needs big vertical + attack skill + reach.
 *  Real vball: back-row attacks require jumping from behind 3m line then landing back. */
function canBackRowAttack(hitter) {
  if (!hitter || !hitter.player) return false;
  if (!canReachOverNet(hitter)) return false;
  const p = hitter.player;
  return (p.athletic || 5) >= 6.5 && (p.attack || 5) >= 6;
}

/** CAN tip effectively? Needs enough reach to place the ball over + basic touch. */
function canTip(hitter) {
  if (!hitter || !hitter.player) return false;
  if (!canReachOverNet(hitter)) return false;
  return (hitter.player.setting || 5) >= 4;
}

/** CAN fake a set? Setter needs high skill to sell the fake convincingly. */
function canFakeSet(setter) {
  if (!setter || !setter.player) return false;
  return (setter.player.setting || 5) >= 6.5;
}

function chooseAttackTactic(team, setter, incomingQuality) {
  const hasPos = (slot, code) => slot && (slot.player.position || '').split('/').includes(code);
  const frontRow = [1, 2, 3].map(i => playerAtSpot(team, i)).filter(Boolean);
  const backRow  = [0, 4, 5].map(i => playerAtSpot(team, i)).filter(Boolean);
  const middles  = frontRow.filter(s => hasPos(s, 'MB'));
  const outsides = frontRow.filter(s => hasPos(s, 'OH') || hasPos(s, 'OP'));
  const backHitters = backRow.filter(s => hasPos(s, 'OH') || hasPos(s, 'OP')
                        || (s.player.attack || 5) >= 6);

  // Personality: showboat setters call flashy plays more often
  const setterTr = t(setter);
  const flashMult = 0.5 + setterTr.showboat * 1.5;   // 0.5x - 2x tactic frequency

  // ── QUICK ATTACK ── GATED: only middles with 6+ athletic AND 6+ attack AND reach 300cm+
  const quickCapableMiddles = middles.filter(canRunQuick);
  if (incomingQuality > 0.85 && quickCapableMiddles.length && Math.random() < 0.15 * flashMult) {
    const mb = pickWithChemistry(quickCapableMiddles, setter);
    return { hitter: mb, tactic: 'quick' };
  }
  // ── SLIDE ── GATED: only middles with 7+ athletic can run the slide approach
  const slideCapableMiddles = middles.filter(canRunSlide);
  if (incomingQuality > 0.7 && slideCapableMiddles.length && Math.random() < 0.08 * flashMult) {
    const mb = slideCapableMiddles[slideCapableMiddles.length - 1];
    return { hitter: mb, tactic: 'slide' };
  }
  // ── BACK-ROW ATTACK ── GATED: needs big vertical + attack (canBackRowAttack)
  const backRowCapable = backHitters.filter(canBackRowAttack);
  if (incomingQuality > 0.75 && backRowCapable.length && Math.random() < 0.10 * flashMult) {
    const br = pickWithChemistry(backRowCapable, setter);
    return { hitter: br, tactic: 'back-row' };
  }
  // ── FAKE SET ── GATED: setter needs 7+ setting skill to sell the fake
  if (canFakeSet(setter) && frontRow.length >= 2 && Math.random() < 0.08 * flashMult) {
    const eligible = outsides.length ? outsides : frontRow;
    const real = pickWithChemistry(eligible, setter);
    const decoyPool = frontRow.filter(s => s.player.id !== real.player.id
                                          && (hasPos(s, 'MB') || hasPos(s, 'OP')));
    if (decoyPool.length) {
      const decoy = decoyPool[Math.floor(Math.random() * decoyPool.length)];
      return { hitter: real, tactic: 'fake', decoy };
    }
  }
  // ── NORMAL ATTACK ── setter picks a hitter, biased by chemistry (friends)
  const normalHitter = pickWithChemistry(outsides.length ? outsides : frontRow, setter)
                       || pickHitter(team);
  return { hitter: normalHitter, tactic: 'normal' };
}

/** Pick a hitter from `candidates`, weighted by attack stat AND chemistry with the setter.
 *  Setters preferentially deliver to their friends. */
function pickWithChemistry(candidates, setter) {
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0];
  const setterChem = t(setter).chemistry || {};
  const weights = candidates.map(c => {
    const atk = c.player.attack || 5;
    const bond = setterChem[c.player.id] || 0;   // 0..1
    // Bond adds up to 3x weight for a best friend
    // Bond dramatically boosts weight for close teammates:
    //   bond 0.0 → 1x   |  bond 0.3 → 3.4x  |  bond 0.6 → 8.2x  |  bond 1.0 → 17x
    return Math.pow(atk, 2) * (1 + bond * bond * 16);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[0];
}

/** Tip target: soft placement behind the block into an "open" spot near the 3m line.
 *  These are the classic tip zones: middle-back-center, or behind either pin blocker. */
function pickTipTarget(defendingTeam) {
  const isFar = defendingTeam && defendingTeam.lineup && defendingTeam.lineup[0]
              && defendingTeam.lineup[0].spot && defendingTeam.lineup[0].spot.y < 0.5;
  // These zones are just behind the block (~0.6-0.65 in engine y for near-side defenders)
  const candidates = [
    { x: 0.5, y: 0.62 },  // middle just past 3m line
    { x: 0.2, y: 0.62 },  // left just past 3m line
    { x: 0.8, y: 0.62 },  // right just past 3m line
  ];
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return isFar ? { x: pick.x, y: 1 - pick.y } : pick;
}

/** Get the blockers matched against a hitter's zone.
 *  Front row = spots 2, 3, 4 (rotation indices 1, 2, 3). We call ALL three of them
 *  potential blockers (real blockwall). The engine tags who is the primary vs helpers so the
 *  visual layer can arrange the wall. */
function pickBlockers(defendingTeam, hitter) {
  // REAL VOLLEYBALL RULE: only front-row players can block. We pick from rotation spots
  // 1/2/3 AND additionally verify their POSITION is a legal blocking role (OH/OP/MB).
  // Libero + DS can NEVER block regardless of rotation.
  const canBlockRole = (slot) => {
    if (!slot || !slot.player) return false;
    const pos = (slot.player.position || '').split('/');
    // Libero + DS are back-row specialists — always forbidden from blocking
    if (pos.includes('L') || pos.includes('DS')) return false;
    return true;
  };
  const front = [1, 2, 3]
    .map(i => playerAtSpot(defendingTeam, i))
    .filter(canBlockRole);
  if (!front.length) return [];   // no legal blockers — attacker gets a free swing

  const hitterX = hitter && hitter.spot ? hitter.spot.x : 0.5;
  const primaryIdx = hitterX < 0.4 ? 1 : (hitterX > 0.6 ? 3 : 2);
  const primaryCandidate = playerAtSpot(defendingTeam, primaryIdx);
  const primary = canBlockRole(primaryCandidate) ? primaryCandidate : front[0];

  const ordered = [primary, ...front.filter(f => f.player.id !== primary.player.id)];
  // Personality: helper blockers may skip if low discipline. Primary always tries.
  const filtered = ordered.filter((b, idx) => {
    if (idx === 0) return true;
    return Math.random() < t(b).discipline * 0.9;
  });
  return filtered;
}

/** Get defenders eligible to dig — non-blockers whose zone is within reach of the ball target.
 *  If ballTarget provided, filters to defenders within `range` of the landing spot. */
function pickDiggers(defendingTeam, blockers, ballTarget, range = 0.35) {
  const blockerIds = new Set(blockers.map(b => b && b.player.id));
  const all = [0, 1, 2, 3, 4, 5]
    .map(i => playerAtSpot(defendingTeam, i))
    .filter(p => p && !blockerIds.has(p.player.id));
  if (!ballTarget) return all;
  const eligible = all.filter(p => {
    const dx = p.spot.x - ballTarget.x;
    const dy = p.spot.y - ballTarget.y;
    return Math.sqrt(dx*dx + dy*dy) < range;
  });
  return eligible.length ? eligible : all;   // fallback: nobody close, everyone tries
}

// ============ SIMULATE ONE RALLY ============
// Returns an array of events describing what happens in the rally.
// Each event has: { type, from, to, ball, delay, sound, text? }
export function simulateRally(match) {
  const events = [];
  const servingTeam = match.serving === 'home' ? match.home : match.away;
  const receivingTeam = match.serving === 'home' ? match.away : match.home;
  const servingSide = match.serving;

  // 1) Serve — target a random x on the receiving side, then find nearest passer
  const server = playerAtSpot(servingTeam, 0); // spot 1 = right back = server
  const serveTargetX = 0.15 + Math.random() * 0.7;   // random x within the court
  const receiver = pickReceiver(receivingTeam, serveTargetX);
  events.push({
    type: 'serve',
    fromSpot: server ? server.spot : { x: 0.75, y: 0.9 },
    toSpot: receiver ? receiver.spot : { x: 0.5, y: 0.5 },
    actor: server,
    team: servingSide
  });

  // Ace check: server's serve vs receiver's defense (lower base = fewer aces).
  // Personality: aggressive + confident servers go for it harder → more aces AND more errors.
  const serverTr = t(server);
  const aggBonus = (serverTr.aggression - 0.5) * 0.06;   // ±3%
  const bigMoment = match && (match.pointsHome >= 20 || match.pointsAway >= 20);
  const clutchBonus = bigMoment ? (serverTr.confidence - 0.5) * 0.05 : 0;   // ±2.5% clutch
  const aceChance = statCheck(server?.player.serve, receiver?.player.defense,
                              0.05 + aggBonus + clutchBonus, 0.35);
  if (aceChance) {
    events.push({
      type: 'ace', actor: server, team: servingSide, target: receiver,
      toSpot: receiver ? receiver.spot : { x: 0.5, y: 0.15 }
    });
    return finishPoint(match, events, servingSide);
  }

  // Serve error: aggressive servers miss more; low-confidence servers CHOKE in big moments
  let errorChance = 0.04 + Math.max(0, (serverTr.aggression - 0.6)) * 0.08;
  if (bigMoment) errorChance += Math.max(0, (0.5 - serverTr.confidence)) * 0.10;  // chokers
  if (Math.random() < errorChance) {
    events.push({
      type: 'serve-error', actor: server, team: servingSide,
      toSpot: { x: 0.5, y: 0.5 }
    });
    return finishPoint(match, events, servingSide === 'home' ? 'away' : 'home');
  }

  // 2) Pass (reception)
  events.push({ type: 'pass', actor: receiver, team: servingSide === 'home' ? 'away' : 'home' });
  // Pass quality: base random + trait bonuses.
  //  - Passer's DEFENSE stat + HUSTLE improve base
  //  - CHEMISTRY with the setter improves accuracy (they know each other's tendencies)
  const receivingTeamRef = servingSide === 'home' ? match.away : match.home;
  const receivingSetter = pickSetter(receivingTeamRef);
  const rTr = t(receiver);
  const chemBonus = receiver && receivingSetter && receiver.player && receivingSetter.player
    ? ((rTr.chemistry || {})[receivingSetter.player.id] || 0) * 0.12
    : 0;
  const hustleBonus = rTr.hustle * 0.10;
  const passQuality = Math.min(1.0, Math.random() * 0.35 + 0.55 + chemBonus + hustleBonus);

  // 3) Set
  return continueRally(match, events, servingSide === 'home' ? 'away' : 'home', passQuality);
}

/** Continue the rally on the side that's now attacking */
function continueRally(match, events, attackingSide, incomingQuality, maxTouches = 20) {
  if (events.length > maxTouches) {
    // Failsafe: someone kills the ball randomly
    return finishPoint(match, events, Math.random() < 0.5 ? 'home' : 'away');
  }
  const attackingTeam = attackingSide === 'home' ? match.home : match.away;
  const defendingTeam = attackingSide === 'home' ? match.away : match.home;

  const setter = pickSetter(attackingTeam);
  if (!setter) {
    return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
  }

  // ═══ TACTIC 1: SETTER DUMP ═══
  // Front-row setters may dump the ball over on touch 2 — catches defense flat-footed.
  // GATED: setter must be TALL ENOUGH to reach over the net (canSetterDump).
  // Short setters CANNOT do this — they physically can't get the ball over.
  // Personality: SHOWBOAT setters try it more, CONFIDENT setters try it in big moments.
  const setterIsFrontRow = isFrontRow(setter);
  const setterTraits = t(setter);
  // Dump chance: 0.5-4% per rally when eligible (setter must be front-row AND canSetterDump).
  // Since setter is only in front row 3 of 6 rotations, this averages to ~1-2% of ALL rallies.
  const dumpChance = (setterIsFrontRow && incomingQuality > 0.75 && canSetterDump(setter))
    ? 0.008 + setterTraits.showboat * 0.03 + setterTraits.confidence * 0.008
    : 0;
  if (Math.random() < dumpChance) {
    // SETTER DUMP! Ball tipped over the net to an open spot.
    const dumpTarget = pickAttackTarget(defendingTeam);
    events.push({
      type: 'setter-dump', actor: setter, team: attackingSide,
      fromSpot: setter.spot, toSpot: dumpTarget
    });
    // Defense doesn't expect it — high success rate but not automatic
    const dumpDigger = pickDiggers(defendingTeam, [], dumpTarget, 0.25).reduce((best, d) => {
      const score = (d.player.defense || 5) + (d.player.athletic || 5) * 0.3;
      if (!best || score > best.score) return { d, score };
      return best;
    }, null);
    const dumpDigChance = dumpDigger ? statCheck(dumpDigger.score - 2, setter.player.attack || 5, 0.15) : false;
    if (dumpDigChance) {
      // Dug the dump — rally continues on defense side
      events.push({ type: 'dig', actor: dumpDigger.d, team: attackingSide === 'home' ? 'away' : 'home' });
      return continueRally(match, events, attackingSide === 'home' ? 'away' : 'home', 0.5, maxTouches);
    }
    return finishPoint(match, events, attackingSide);
  }

  // ═══ TACTIC 2: HITTER SELECTION (with fakes) ═══
  // Pick a primary hitter, but also decide the attack STYLE based on set quality + who's available
  const hitterChoice = chooseAttackTactic(attackingTeam, setter, incomingQuality);
  const hitter = hitterChoice.hitter;
  const tactic = hitterChoice.tactic;   // 'normal' | 'quick' | 'slide' | 'back-row' | 'fake'
  if (!hitter) {
    return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
  }

  // Fake set: setter shows one hitter then sets the other. Reduces block effectiveness.
  const isFake = tactic === 'fake';
  const setterTargetHitter = isFake ? hitterChoice.decoy : hitter;
  events.push({
    type: 'set',
    fromSpot: setter.spot, toSpot: setterTargetHitter.spot,
    actor: setter, team: attackingSide,
    tactic,                                  // for the visual layer
    realHitter: hitter, decoy: hitterChoice.decoy
  });

  // Set quality (better for quicks & slides due to faster tempo)
  let setQuality = ((setter.player.setting || 5) / 10) * 0.5 + incomingQuality * 0.5;
  if (tactic === 'quick') setQuality *= 1.15;    // low fast set = harder to block
  if (tactic === 'slide') setQuality *= 1.10;    // MB running behind setter
  if (isFake) setQuality *= 0.95;                 // small penalty for the fake

  // Blockers pick their target — but on fakes they may go to the DECOY
  const effectiveHitterForBlockers = isFake && Math.random() < 0.6 ? hitterChoice.decoy : hitter;
  const blockers = pickBlockers(defendingTeam, effectiveHitterForBlockers);
  // Reduce blocker count for quicks and back-row (fewer blockers get there in time)
  const effectiveBlockers = tactic === 'quick'    ? blockers.slice(0, 1)
                          : tactic === 'back-row' ? blockers.slice(0, 2)
                          : tactic === 'slide'    ? blockers.slice(0, 1)
                          : blockers;

  const attackTargetSpot = pickAttackTarget(defendingTeam);
  events.push({
    type: 'attack',
    actor: hitter, team: attackingSide,
    fromSpot: hitter.spot,
    toSpot: attackTargetSpot,
    setQuality, tactic
  });

  // Attack outcome tree
  // 1. Block: primary blocker's defense + wall bonus vs hitter's attack quality.
  //    Wall bonus scales with the number of blockers (2-man block > 1-man) AND their reach.
  // ═══ TACTIC 3: TIP / ROLL SHOT ═══
  // GATED: hitter needs decent touch (canTip) to place the ball softly.
  // Aggression trait matters: low-aggression = tipper, high = hammer.
  // Also facing a big wall or bad set → smart hitters tip more.
  const wallSize = effectiveBlockers.length;
  const hitterTr = t(hitter);
  const baseTip = (wallSize >= 2 ? 0.15 : 0.05);
  const badSetBonus = (setQuality < 0.55 ? 0.10 : 0);
  const aggressionAdj = (0.5 - hitterTr.aggression) * 0.45;
  const tipChance = canTip(hitter)
    ? Math.max(0.02, baseTip + badSetBonus + aggressionAdj)
    : 0;    // players without touch can't tip
  if (Math.random() < tipChance && tactic !== 'quick') {
    // TIP! Ball placed behind the block into an open spot
    const tipTarget = pickTipTarget(defendingTeam);
    events.push({
      type: 'tip', actor: hitter, team: attackingSide,
      fromSpot: hitter.spot, toSpot: tipTarget
    });
    // Tips are usually covered — but sometimes score
    const tipDigger = pickDiggers(defendingTeam, effectiveBlockers, tipTarget, 0.25).reduce((best, d) => {
      const score = (d.player.defense || 5) + (d.player.athletic || 5) * 0.4;
      const distToTarget = Math.sqrt(Math.pow(d.spot.x - tipTarget.x, 2) + Math.pow(d.spot.y - tipTarget.y, 2));
      const proximityBonus = Math.max(0, 3 - distToTarget * 5);   // closer = easier
      if (!best || score + proximityBonus > best.score) return { d, score: score + proximityBonus };
      return best;
    }, null);
    if (tipDigger && Math.random() < 0.55) {
      events.push({ type: 'dig', actor: tipDigger.d, team: attackingSide === 'home' ? 'away' : 'home' });
      return continueRally(match, events, attackingSide === 'home' ? 'away' : 'home', 0.45, maxTouches);
    }
    return finishPoint(match, events, attackingSide);
  }

  const primaryBlockerDef = effectiveBlockers[0] ? (effectiveBlockers[0].player.defense || 5) : 3;
  const wallBonus = (wallSize - 1) * 0.3; // small bonus per extra blocker (+0.3 / +0.6)
  // Reach bonuses scaled to the 200cm net. Blocker reach measured from block-touch (heightCm+40).
  // Every 15cm above the net (215cm+) gives +1 to their block strength.
  const reachBonus = effectiveBlockers.reduce((s, b) => {
    const reach = b.player.blockTouchCm || (b.player.heightCm ? b.player.heightCm + 40 : 215);
    return s + Math.max(0, (reach - (NET_HEIGHT_CM + 15)) / 15);
  }, 0) / Math.max(1, wallSize);
  const attackerEffective = (hitter.player.attack || 5) * setQuality;
  const spikeReach = hitter.player.spikeTouchCm || (hitter.player.heightCm ? hitter.player.heightCm + 50 : 225);
  // Attackers who reach 20cm+ ABOVE the net get above the wall bonus.
  const attackerReachEdge = Math.max(0, (spikeReach - (NET_HEIGHT_CM + 20)) / 15);
  const blockChance = statCheck(
    primaryBlockerDef + wallBonus + reachBonus - attackerReachEdge * 0.5,
    attackerEffective,
    -0.02,  // very low base — blocks require a real edge
    0.35
  );
  if (blockChance) {
    // BLOCK! Primary blocker gets credit but the whole wall reaches up.
    const blocker = effectiveBlockers[0] || effectiveBlockers[Math.floor(Math.random() * effectiveBlockers.length)];
    // Ball ricochets back onto the hitter's side of the court
    const hitterSideY = hitter.spot.y > 0.5 ? 0.85 : 0.15;
    events.push({
      type: 'block', actor: blocker, team: attackingSide === 'home' ? 'away' : 'home', hitter,
      blockers: effectiveBlockers, // full array so the visual layer can draw the blockwall
      toSpot: { x: hitter.spot.x, y: hitterSideY }
    });
    // Blocked ball often lands on hitter's side; sometimes recovered on their side. Assume ~70% point for blocker.
    if (Math.random() < 0.7) {
      return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
    }
    // Recovered by attacker's team — becomes another rally on their side
    return continueRally(match, events, attackingSide, 0.5);
  }

  // 2. Attack error — hitter either sends it INTO THE NET or OUT OF BOUNDS.
  //    Split roughly 50/50 (real vball: net faults slightly less common than balls out).
  if (Math.random() < 0.08 - setQuality * 0.05) {
    const hitTheNet = Math.random() < 0.4;   // 40% net, 60% out
    if (hitTheNet) {
      events.push({
        type: 'attack-net', actor: hitter, team: attackingSide,
        toSpot: { x: hitter.spot.x, y: 0.5 }   // ball collides with the net
      });
    } else {
      // Out of bounds — pick a spot beyond the opposing endline
      const outOfBoundsY = hitter.spot.y > 0.5 ? 0.02 : 0.98;
      events.push({
        type: 'attack-out', actor: hitter, team: attackingSide,
        toSpot: { x: hitter.spot.x, y: outOfBoundsY }
      });
    }
    return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
  }

  // 3. Dig attempt
  // Personality: HUSTLE boosts effective defense (chasing every ball).
  // CONFIDENCE boosts big-moment defense (when score is tight or set point).
  // ZONE: only defenders within ~0.35 units of the ball's landing spot can dig.
  const diggers = pickDiggers(defendingTeam, effectiveBlockers, attackTargetSpot);
  const isBigMoment = match && (match.pointsHome >= 20 || match.pointsAway >= 20);
  const bestDigger = diggers.reduce((best, d) => {
    const tr = t(d);
    let score = (d.player.defense || 5) + (d.player.athletic || 5) * 0.5;
    score += tr.hustle * 1.2;                              // hustle adds up to +1.2
    if (isBigMoment) score += tr.confidence * 0.8;         // clutch factor
    // Priority boost: Libero (P1) gets a big bonus, Middle (P5) gets a penalty.
    // This is the doc's "priority resolves overlap" rule for digging.
    const prio = rolePriority(d);
    score += (5 - prio) * 0.6;                             // P1: +2.4, P5: 0
    if (!best || score > best.score) return { d, score };
    return best;
  }, null);
  if (bestDigger) {
    const digChance = statCheck(bestDigger.score, attackerEffective * 1.1, 0.35);
    if (digChance) {
      events.push({ type: 'dig', actor: bestDigger.d, team: attackingSide === 'home' ? 'away' : 'home' });
      const digQuality = Math.random() * 0.4 + 0.5;
      return continueRally(match, events, attackingSide === 'home' ? 'away' : 'home', digQuality, maxTouches);
    }
  }

  // KILL — ball lands on the defender's floor (use the attack event's target)
  const killLandSpot = events[events.length - 1] && events[events.length - 1].toSpot
    ? events[events.length - 1].toSpot
    : pickAttackTarget(defendingTeam);
  events.push({ type: 'kill', actor: hitter, team: attackingSide, toSpot: killLandSpot });
  return finishPoint(match, events, attackingSide);
}

function pickAttackTarget(defendingTeam) {
  // Random open spot on defender's side (bias toward the deep corners).
  // Engine coords: y=0..1 with net at y=0.5. Home occupies y>0.5, Away occupies y<0.5.
  const candidates = [
    { x: 0.1, y: 0.9 },  // deep corner
    { x: 0.9, y: 0.9 },  // deep corner
    { x: 0.5, y: 0.95 }, // deep middle
    { x: 0.5, y: 0.6 }   // short (tip)
  ];
  // Detect whether the defending team is on the far (top) side of the court in engine space
  const isFar = !!(defendingTeam && defendingTeam.lineup && defendingTeam.lineup[0] &&
                   defendingTeam.lineup[0].spot && defendingTeam.lineup[0].spot.y < 0.5);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return isFar ? { x: pick.x, y: 1 - pick.y } : pick;
}

function finishPoint(match, events, winningSide) {
  const prevServing = match.serving;
  if (winningSide === 'home') match.pointsHome++;
  else match.pointsAway++;
  events.push({
    type: 'point',
    team: winningSide,
    home: match.pointsHome, away: match.pointsAway
  });
  // Rotate if side-out
  if (prevServing !== winningSide) {
    const team = winningSide === 'home' ? match.home : match.away;
    rotateTeam(team);
    events.push({ type: 'rotation', team: winningSide });
  }
  match.serving = winningSide;
  match.rallyNumber++;
  // Check set win
  const target = match.setNumber === 5 ? match.finalSetTarget : match.setTarget;
  const [a, b] = [match.pointsHome, match.pointsAway];
  if ((a >= target && a - b >= 2) || (b >= target && b - a >= 2)) {
    const winner = a > b ? 'home' : 'away';
    if (winner === 'home') match.setsHome++;
    else match.setsAway++;
    events.push({
      type: 'set-won', team: winner,
      setNumber: match.setNumber,
      setsHome: match.setsHome, setsAway: match.setsAway,
      // Final set score BEFORE reset (so the visual layer can display "25-23" etc.)
      finalHome: a, finalAway: b
    });
    // Match over?
    if (match.setsHome === 3 || match.setsAway === 3) {
      match.matchOver = true;
      match.winner = match.setsHome > match.setsAway ? 'home' : 'away';
      events.push({ type: 'match-won', team: match.winner });
    } else {
      match.setNumber++;
      match.pointsHome = 0;
      match.pointsAway = 0;
      // Swap sides visually optional; skip for now
    }
  }
  return events;
}

// Export helpers used by the visual layer
export { assignSpots, ROTATION_SPOTS_HOME, ROTATION_SPOTS_AWAY, playerAtSpot };
