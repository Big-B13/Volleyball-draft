// Volleyball match engine — stat + personality driven probabilistic simulator.
// Given two teams of 6 players each (with stats + positions + traits), produces a
// stream of "events" (serve, pass, set, attack, block, dig, point, rotation, etc.)
// that the visual layer can render.

import { traitsFor } from './data.js';

// Match-scoped chemistry overlay: { [pid]: { [pid]: 0..1 } } passed into createMatch()
// Merged on top of preset traits so persistent Firebase chemistry drives in-match decisions.
let MATCH_CHEMISTRY = {};

// ═══════════════════════════════════════════════════════════════════════
// V3: MANUAL HITTER OVERRIDE
// When set, the next rally's attacker call will use this pid instead of the
// AI-picked hitter. Set by the UI when the user manually picks a target.
// Format: { side: 'home'|'away', pid: 'big-b', tactic: 'normal'|'quick'|'back-row' }
// Cleared automatically after being consumed.
// ═══════════════════════════════════════════════════════════════════════
let MANUAL_HITTER_OVERRIDE = null;
export function setManualHitter(side, pid, tactic = null) {
  MANUAL_HITTER_OVERRIDE = pid ? { side, pid, tactic } : null;
}
export function clearManualHitter() { MANUAL_HITTER_OVERRIDE = null; }
export function getManualHitter() { return MANUAL_HITTER_OVERRIDE; }

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
// ═══════════════════════════════════════════════════════════════════════
// V3 ADDITIONS — Lineup Specialty (Power/Quick/Block/Receive)
// The starter's SETTER determines team specialty. RPS counter chart gives
// +30% to actions of your specialty when you beat opponent's.
// ═══════════════════════════════════════════════════════════════════════

export const SPECIALTIES = ['power', 'quick', 'block', 'receive'];

/** Rock-paper-scissors counter chart:
 *  Power > Receive > Quick > Block > Power (cycle)
 *  Interpretation:
 *    Power BEATS Receive (raw force overwhelms passers)
 *    Receive BEATS Quick (great defense reads fast tempo)
 *    Quick BEATS Block (releases before wall forms)
 *    Block BEATS Power (giant wall stuffs the swing)  */
const SPECIALTY_COUNTERS = {
  'power':   'receive',
  'receive': 'quick',
  'quick':   'block',
  'block':   'power',
};
export function specialtyCounters(mine, theirs) {
  return SPECIALTY_COUNTERS[mine] === theirs;
}

/** Auto-derive a team's specialty from setter stats + squad shape.
 *  If the designated setter has high `setting` and there's a tall MB with
 *  high `athletic`, lean Quick. High `attack` avg → Power. High `defense`
 *  avg → Receive. Tall front row → Block. */
export function deriveSpecialty(lineup) {
  const players = lineup.map(s => s && s.player).filter(Boolean);
  if (!players.length) return 'power';
  const avg = (key) => players.reduce((s, p) => s + (p[key] || 5), 0) / players.length;
  const setter = players.find(p => (p.position || '').split('/').includes('S'));
  const setterAthletic = setter ? (setter.athletic || 5) : 5;
  const setterSetting  = setter ? (setter.setting || 5) : 5;
  // Score each specialty
  const scores = {
    power:   avg('attack') * 1.0 + avg('serve') * 0.4,
    quick:   setterAthletic * 0.6 + setterSetting * 0.5 + avg('athletic') * 0.4,
    block:   avg('defense') * 0.6 + players.filter(p => (p.heightCm || 180) > 190).length * 1.5,
    receive: avg('defense') * 0.7 + avg('setting') * 0.3 + players.filter(p => (p.position || '').includes('L')).length * 1.5,
  };
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// ═══════════════════════════════════════════════════════════════════════
// V3 ADDITIONS — Stamina economy
// Every player has a 0..100 stamina bar. Actions cost stamina. When
// stamina drops below 40, tier score is penalized. Below 20, penalty
// doubles. Encourages substituting tired players.
// ═══════════════════════════════════════════════════════════════════════

export const STAMINA_MAX = 100;
export const STAMINA_COST = {
  'serve': 5, 'ace': 5, 'serve-error': 5,
  'pass': 2, 'pass-error': 2,
  'set': 2,
  'attack': 8, 'kill': 8, 'attack-net': 8, 'attack-out': 8, 'attack-error': 8,
  'block': 4,
  'dig': 3,
  'setter-dump': 3,
  'tip': 4,
};

export function staminaPenalty(currentStamina) {
  // 100→0 penalty, 40→0 penalty, 20→-0.10 penalty, 0→-0.20 penalty
  if (currentStamina >= 40) return 0;
  if (currentStamina >= 20) return -0.05 * (40 - currentStamina) / 20;   // 0 → -0.05
  return -0.05 - 0.15 * (20 - currentStamina) / 20;                       // -0.05 → -0.20
}

export function spendStamina(match, pid, eventType) {
  if (!match.stamina) match.stamina = {};
  if (match.stamina[pid] == null) match.stamina[pid] = STAMINA_MAX;
  const cost = STAMINA_COST[eventType] || 1;
  match.stamina[pid] = Math.max(0, match.stamina[pid] - cost);
  return match.stamina[pid];
}

export function restStamina(match, pid, amount = 10) {
  if (!match.stamina) match.stamina = {};
  if (match.stamina[pid] == null) match.stamina[pid] = STAMINA_MAX;
  match.stamina[pid] = Math.min(STAMINA_MAX, match.stamina[pid] + amount);
}

// ═══════════════════════════════════════════════════════════════════════
// V3 ADDITIONS — Bench & subs (7 starters + up to 6 bench)
// Engine still plays 6 on-court, but a 7th "sub" player sits on bench and
// can rotate in for tired teammates between rallies. Auto-sub is called
// after each point if a starter is exhausted.
// ═══════════════════════════════════════════════════════════════════════

/** Substitute bench[benchIdx] in for lineup[lineupIdx]. Returns true if ok. */
export function substitute(team, lineupIdx, benchIdx) {
  if (!team.bench || !team.bench[benchIdx]) return false;
  const outSlot = team.lineup[lineupIdx];
  const inPlayer = team.bench[benchIdx];
  if (!outSlot || !inPlayer) return false;
  // Swap the player onto the current spot (positions stay geographically same)
  team.bench[benchIdx] = outSlot.player;
  team.lineup[lineupIdx] = { player: inPlayer, spot: outSlot.spot };
  return true;
}

/** Auto-sub any exhausted starter (stamina ≤ 15) with a rested bench player of
 *  a compatible position. Called between rallies from applyEndOfRallyEffects.  */
export function autoSubExhausted(match) {
  const subs = [];   // records for the event log
  for (const side of ['home', 'away']) {
    const team = match[side];
    if (!team.bench || !team.bench.length) continue;
    team.lineup.forEach((slot, i) => {
      if (!slot || !slot.player) return;
      const pid = slot.player.id;
      const sta = match.stamina?.[pid] ?? STAMINA_MAX;
      if (sta > 15) return;
      // Find a bench player of same position family with high stamina
      const outPos = (slot.player.position || '').split('/');
      const bestBenchIdx = team.bench.findIndex(bp => {
        if (!bp) return false;
        const bpPos = (bp.position || '').split('/');
        const posOverlap = outPos.some(p => bpPos.includes(p));
        const bpSta = match.stamina?.[bp.id] ?? STAMINA_MAX;
        return posOverlap && bpSta >= 60;
      });
      if (bestBenchIdx >= 0) {
        const outPid = slot.player.id;
        const inPlayer = team.bench[bestBenchIdx];
        substitute(team, i, bestBenchIdx);
        subs.push({ side, outPid, inPid: inPlayer.id, outName: slot.player.name, inName: inPlayer.name });
      }
    });
  }
  return subs;
}

/** Between-rally rest: all on-court players regen a bit, bench regens more. */
export function endOfRallyRest(match) {
  if (!match.stamina) match.stamina = {};
  for (const side of ['home', 'away']) {
    const team = match[side];
    team.lineup.forEach(slot => {
      if (slot && slot.player) restStamina(match, slot.player.id, 4);
    });
    if (team.bench) team.bench.forEach(bp => {
      if (bp) restStamina(match, bp.id, 10);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════

export function createMatch({ homeTeam, awayTeam, homeBench = [], awayBench = [],
                              homeName, awayName, homeColor, awayColor,
                              homeSpecialty, awaySpecialty, chemistryMap }) {
  // Store chemistry map for use by t() throughout this match
  MATCH_CHEMISTRY = chemistryMap || {};
  const home = {
    name: homeName || 'Home',
    color: homeColor || '#dc2626',
    lineup: assignSpots(homeTeam, ROTATION_SPOTS_HOME),
    bench: (homeBench || []).slice(0, 6),   // up to 6 bench players
    rotationOffset: 0,
  };
  const away = {
    name: awayName || 'Away',
    color: awayColor || '#2563eb',
    lineup: assignSpots(awayTeam, ROTATION_SPOTS_AWAY),
    bench: (awayBench || []).slice(0, 6),
    rotationOffset: 0,
  };
  home.specialty = homeSpecialty || deriveSpecialty(home.lineup);
  away.specialty = awaySpecialty || deriveSpecialty(away.lineup);

  // Initialize stamina for all starters + bench
  const stamina = {};
  [...home.lineup, ...away.lineup].forEach(s => {
    if (s && s.player) stamina[s.player.id] = STAMINA_MAX;
  });
  [...home.bench, ...away.bench].forEach(p => {
    if (p) stamina[p.id] = STAMINA_MAX;
  });

  return {
    home, away,
    setsHome: 0,
    setsAway: 0,
    pointsHome: 0,
    pointsAway: 0,
    serving: 'home',
    rallyNumber: 0,
    setNumber: 1,
    setTarget: 25,
    finalSetTarget: 15,
    matchOver: false,
    winner: null,
    log: [],
    // ── V3 state ──
    stamina,
    subHistory: [],       // records each sub for the play-by-play
    version: 3,
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
/** LIBERO SUBSTITUTION RULE (real volleyball 19.3.2):
 *  A libero rotates in for the middle blocker whenever the MB is in the back row.
 *  This function returns the back-row players with any MB replaced by the libero.
 *  If no libero on the team, returns back row as-is. */
function backRowWithLiberoSub(team) {
  const backRow = [0, 4, 5].map(i => playerAtSpot(team, i)).filter(Boolean);
  // Find the libero on this team
  const libero = team.lineup.find(s => {
    if (!s || !s.player) return false;
    const pos = (s.player.position || '').split('/');
    return pos.includes('L');
  });
  if (!libero) return backRow;
  // Replace any middle blocker in back row with the libero (libero plays their defensive spot)
  const isMiddle = (slot) => (slot.player.position || '').split('/').includes('MB');
  return backRow.map(slot => {
    if (isMiddle(slot)) {
      // Libero substitutes in — inherits the MB's spot for defensive positioning
      return { ...libero, spot: slot.spot };
    }
    return slot;
  });
}

function pickReceiver(team, ballX) {
  // Libero-sub aware back row: MB replaced by libero when they'd be receiving
  const backRow = backRowWithLiberoSub(team);
  let eligible = backRow;
  if (typeof ballX === 'number') {
    eligible = backRow.filter(p => Math.abs(p.spot.x - ballX) < 0.28);
    if (!eligible.length) eligible = backRow;
  }
  // Weight by defense stat AND role priority (lower priority num = bigger weight)
  const weights = eligible.map(c => {
    const def = c.player.defense || 5;
    const prio = rolePriority(c);
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
// MOMENTUM SYSTEM — team on a hot streak gets stat boosts. Cold team loses them.
// ═══════════════════════════════════════════════════════════════════════
function initMomentum(match) {
  if (!match.momentum) {
    match.momentum = {
      home: { streak: 0, boost: 0 },
      away: { streak: 0, boost: 0 }
    };
  }
}

/** Return stat boost from momentum for a given side (0, 0.2, 0.5, or 0.8). */
function momentumBoost(match, side) {
  if (!match || !match.momentum) return 0;
  return match.momentum[side].boost;
}

// ═══════════════════════════════════════════════════════════════════════
// COLD STREAK — individual player errors compound into a temporary debuff.
// Recover after 2 successful plays.
// ═══════════════════════════════════════════════════════════════════════
function initPlayerStreaks(match) {
  if (!match.playerStreaks) match.playerStreaks = {};   // pid → { fails, cleans, penalty }
}

/** Record that a player MISSED a play (bad pass, missed serve, attack error, etc.) */
function recordFail(match, pid) {
  if (!pid) return;
  initPlayerStreaks(match);
  const s = match.playerStreaks[pid] || { fails: 0, cleans: 0, penalty: 0 };
  s.fails++;
  s.cleans = 0;
  // 2 fails in a row → -0.5 to their stats. Persists until they redeem.
  if (s.fails >= 2) s.penalty = 0.5;
  if (s.fails >= 4) s.penalty = 1.0;   // brutal cold streak
  match.playerStreaks[pid] = s;
}

/** Record a successful play (good pass, dig, kill, ace). */
function recordSuccess(match, pid) {
  if (!pid) return;
  initPlayerStreaks(match);
  const s = match.playerStreaks[pid] || { fails: 0, cleans: 0, penalty: 0 };
  s.cleans++;
  if (s.cleans >= 2) {
    s.penalty = 0;   // redeemed — cold streak broken
    s.fails = 0;
  }
  match.playerStreaks[pid] = s;
}

/** Get a player's current stat penalty (0 = normal, 0.5 or 1.0 = cold). */
function playerPenalty(match, pid) {
  if (!match || !match.playerStreaks || !pid) return 0;
  return (match.playerStreaks[pid] || {}).penalty || 0;
}

/** Effective stat = raw stat + team momentum boost - personal cold penalty.
 *  Clamped 1-10. */
function effectiveStat(slot, statName, match, side) {
  if (!slot || !slot.player) return 5;
  const raw = slot.player[statName] || 5;
  const boost = momentumBoost(match, side);
  const penalty = playerPenalty(match, slot.player.id);
  return Math.max(1, Math.min(10, raw + boost - penalty));
}

/** Called after a point is scored to update momentum tracking. */
function updateMomentum(match, winnerSide) {
  initMomentum(match);
  const loserSide = winnerSide === 'home' ? 'away' : 'home';
  match.momentum[winnerSide].streak++;
  match.momentum[loserSide].streak = 0;
  match.momentum[loserSide].boost  = 0;   // losing team loses their momentum
  const streak = match.momentum[winnerSide].streak;
  match.momentum[winnerSide].boost =
    streak >= 5 ? 0.8 :
    streak >= 4 ? 0.5 :
    streak >= 3 ? 0.2 : 0;
}


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

function chooseAttackTactic(team, setter, incomingQuality, attackingSide) {
  const hasPos = (slot, code) => slot && (slot.player.position || '').split('/').includes(code);
  const frontRow = [1, 2, 3].map(i => playerAtSpot(team, i)).filter(Boolean);
  const backRow  = [0, 4, 5].map(i => playerAtSpot(team, i)).filter(Boolean);

  // ── V3: MANUAL OVERRIDE ── if user picked a hitter for this side, honor it
  if (MANUAL_HITTER_OVERRIDE && MANUAL_HITTER_OVERRIDE.side === attackingSide) {
    const manualPid = MANUAL_HITTER_OVERRIDE.pid;
    const manualTactic = MANUAL_HITTER_OVERRIDE.tactic;
    // Find that player in the lineup (must be on court)
    const all = [...frontRow, ...backRow];
    const chosen = all.find(s => s.player && s.player.id === manualPid);
    MANUAL_HITTER_OVERRIDE = null;   // consume single-shot
    if (chosen) {
      // Determine tactic: auto (based on position) unless user specified
      const isFront = frontRow.some(s => s.player.id === manualPid);
      let tac = manualTactic;
      if (!tac) {
        if (!isFront) tac = 'back-row';
        else if (hasPos(chosen, 'MB') && canRunQuick(chosen)) tac = 'quick';
        else tac = 'normal';
      }
      return { hitter: chosen, tactic: tac, manual: true };
    }
    // else fall through to auto (player not on court somehow)
  }
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
    // Bond boosts weight but doesn't dominate — high-attack players still get plenty of sets
    //   bond 0.0 → 1x   |  bond 0.5 → 2x  |  bond 0.7 → 3x  |  bond 1.0 → 5x
    return Math.pow(atk, 2) * (1 + bond * bond * 4);
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
  // LIBERO SUBSTITUTION: back-row middles are replaced by the libero for defensive plays.
  const backRow = backRowWithLiberoSub(defendingTeam);
  const frontRow = [1, 2, 3].map(i => playerAtSpot(defendingTeam, i)).filter(Boolean);
  const all = [...frontRow, ...backRow]
    .filter(p => p && !blockerIds.has(p.player.id));
  if (!ballTarget) return all;
  const eligible = all.filter(p => {
    const dx = p.spot.x - ballTarget.x;
    const dy = p.spot.y - ballTarget.y;
    return Math.sqrt(dx*dx + dy*dy) < range;
  });
  return eligible.length ? eligible : all;
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
  // Pick server = player at spot 1 (P1 = right back). BUT skip MB and L — they never
  // serve in this sim (user preference). Search clockwise for the next legal server.
  const isLegalServer = (slot) => {
    if (!slot || !slot.player) return false;
    const pos = (slot.player.position || '').split('/');
    return !pos.includes('MB') && !pos.includes('L') && !pos.includes('DS');
  };
  let server = null;
  for (let offset = 0; offset < 6; offset++) {
    const cand = playerAtSpot(servingTeam, offset);
    if (isLegalServer(cand)) { server = cand; break; }
  }
  if (!server) server = playerAtSpot(servingTeam, 0);  // absolute fallback
  const serveTargetX = 0.15 + Math.random() * 0.7;   // random x within the court
  const receiver = pickReceiver(receivingTeam, serveTargetX);
  events.push({
    type: 'serve',
    fromSpot: server ? server.spot : { x: 0.75, y: 0.9 },
    toSpot: receiver ? receiver.spot : { x: 0.5, y: 0.5 },
    actor: server,
    team: servingSide
  });

  // Ace check: server's SERVE stat vs receiver's DEFENSE stat, with:
  //   - Momentum boost (server's team hot streak → +0.2 to +0.8 serve)
  //   - Cold streak penalty (server's personal fails)
  //   - Aggression bonus (aggressive servers go for aces harder → more aces AND more errors)
  //   - Confidence clutch bonus at score ≥20
  const serverTr = t(server);
  const receiverTr = t(receiver);
  const aggBonus = (serverTr.aggression - 0.5) * 0.06;
  const bigMoment = match && (match.pointsHome >= 20 || match.pointsAway >= 20);
  const clutchBonus = bigMoment ? (serverTr.confidence - 0.5) * 0.05 : 0;
  const effServe = effectiveStat(server, 'serve', match, servingSide);
  const effReceiveDef = effectiveStat(receiver, 'defense', match, servingSide === 'home' ? 'away' : 'home');
  // Setting stat helps passing too now (touch/ball control)
  const effReceiveSet = effectiveStat(receiver, 'setting', match, servingSide === 'home' ? 'away' : 'home');
  const receiverSkill = effReceiveDef * 0.7 + effReceiveSet * 0.3;
  const aceChance = statCheck(effServe, receiverSkill,
                              0.05 + aggBonus + clutchBonus, 0.35);
  if (aceChance) {
    events.push({
      type: 'ace', actor: server, team: servingSide, target: receiver,
      toSpot: receiver ? receiver.spot : { x: 0.5, y: 0.15 }
    });
    recordSuccess(match, server?.player?.id);   // ace = server hot
    recordFail(match, receiver?.player?.id);    // aced on = receiver cold
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
    recordFail(match, server?.player?.id);   // missed serve = cold
    return finishPoint(match, events, servingSide === 'home' ? 'away' : 'home');
  }

  // ══ PASS RECEPTION ══
  // Passer skill = 70% DEFENSE + 30% SETTING (touch matters for ball control).
  // Fail chance: high serve stat + low receiver skill = ~15-25% missed pass.
  // On a miss: rally continues with a bad pass (setter scrambles) or dies on floor.
  const receivingSide = servingSide === 'home' ? 'away' : 'home';
  const receivingTeamRef = match[receivingSide];
  const receivingSetter = pickSetter(receivingTeamRef);
  const rTr = t(receiver);
  const chemBonus = receiver && receivingSetter && receiver.player && receivingSetter.player
    ? ((rTr.chemistry || {})[receivingSetter.player.id] || 0) * 0.12
    : 0;
  const hustleBonus = rTr.hustle * 0.10;
  // Effective passer skill (with momentum + cold streak)
  const passerDef = effectiveStat(receiver, 'defense', match, receivingSide);
  const passerSet = effectiveStat(receiver, 'setting', match, receivingSide);
  const passerSkill = passerDef * 0.7 + passerSet * 0.3;
  // Fail chance = high server + low passer. Base 8% error at even skill.
  // (effServe/10 - passerSkill/10) shifts from -0.9 to +0.9
  const skillGap = (effServe / 10) - (passerSkill / 10);
  const missChance = Math.max(0.02, Math.min(0.35, 0.08 + skillGap * 0.20 - hustleBonus * 0.5));
  if (Math.random() < missChance) {
    // BAD PASS — either dies immediately or leaves a really weak set
    events.push({ type: 'pass-error', actor: receiver, team: receivingSide,
                  toSpot: { x: receiver.spot.x, y: receiver.spot.y } });
    recordFail(match, receiver?.player?.id);
    // 60% chance the ball dies on the floor immediately (dropped pass)
    if (Math.random() < 0.6) {
      return finishPoint(match, events, servingSide);
    }
    // 40% chance a scrappy setter still gets to it — rally continues with terrible incoming quality
    events.push({ type: 'pass', actor: receiver, team: receivingSide });
    return continueRally(match, events, receivingSide, 0.25);
  }
  // Good pass
  events.push({ type: 'pass', actor: receiver, team: receivingSide });
  recordSuccess(match, receiver?.player?.id);
  // Pass quality: better passer + hustle + chem → tighter pass → better set
  const passQuality = Math.min(1.0,
    Math.random() * 0.25 + 0.45 +
    (passerSkill - 5) * 0.06 +      // above-avg passer bumps up
    chemBonus + hustleBonus);
  return continueRally(match, events, receivingSide, passQuality);
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
  const hitterChoice = chooseAttackTactic(attackingTeam, setter, incomingQuality, attackingSide);
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
    realHitter: hitter, decoy: hitterChoice.decoy,
    manualCall: !!hitterChoice.manual   // V3: flag if user manually picked hitter
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
    setQuality, tactic,
    manualCall: !!hitterChoice.manual
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

  // ══ BLOCK CALCULATION ══
  // Blocker skill = 60% DEFENSE + 40% ATHLETIC (jump/timing matters as much as reading).
  // Wall bonus scales with the number of blockers (2-man block > 1-man).
  // Reach bonuses scaled to the 200cm net (+1 per 15cm above 215cm reach).
  const defSide = attackingSide === 'home' ? 'away' : 'home';
  const primaryBlockerSkill = effectiveBlockers[0]
    ? (effectiveStat(effectiveBlockers[0], 'defense', match, defSide) * 0.6 +
       effectiveStat(effectiveBlockers[0], 'athletic', match, defSide) * 0.4)
    : 3;
  const wallBonus = (wallSize - 1) * 0.3;
  const reachBonus = effectiveBlockers.reduce((s, b) => {
    const reach = b.player.blockTouchCm || (b.player.heightCm ? b.player.heightCm + 40 : 215);
    return s + Math.max(0, (reach - (NET_HEIGHT_CM + 15)) / 15);
  }, 0) / Math.max(1, wallSize);
  // Attacker: 100% ATTACK stat × set quality. Cold attackers hit weaker; hot momentum boosts.
  const effAttack = effectiveStat(hitter, 'attack', match, attackingSide);
  const attackerEffective = effAttack * setQuality;
  const spikeReach = hitter.player.spikeTouchCm || (hitter.player.heightCm ? hitter.player.heightCm + 50 : 225);
  const attackerReachEdge = Math.max(0, (spikeReach - (NET_HEIGHT_CM + 20)) / 15);
  const blockChance = statCheck(
    primaryBlockerSkill + wallBonus + reachBonus - attackerReachEdge * 0.5,
    attackerEffective,
    -0.02,
    0.35
  );
  if (blockChance) {
    // BLOCK! Primary blocker gets credit but the whole wall reaches up.
    const blocker = effectiveBlockers[0] || effectiveBlockers[Math.floor(Math.random() * effectiveBlockers.length)];
    // "Wipe off the block" chance: strong attackers (attack ≥7) sometimes bounce off blockers
    // for a rebound they can recover. This gives the ATTACK stat meaning even when blocked.
    const wipeOffChance = Math.max(0, (effAttack - 6.5) * 0.10);   // atk 7→5%, atk 9→25%
    const hitterSideY = hitter.spot.y > 0.5 ? 0.85 : 0.15;
    events.push({
      type: 'block', actor: blocker, team: defSide, hitter,
      blockers: effectiveBlockers,
      toSpot: { x: hitter.spot.x, y: hitterSideY }
    });
    recordSuccess(match, blocker?.player?.id);   // blocker hot
    // If the attacker wipes off: recovered on their side, no fail
    if (Math.random() < wipeOffChance) {
      return continueRally(match, events, attackingSide, 0.5);
    }
    recordFail(match, hitter?.player?.id);   // got stuffed = cold
    if (Math.random() < 0.7) {
      return finishPoint(match, events, defSide);
    }
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
      // Out of bounds — actually LEAVE the court. Pick either past the far endline
      // (long) or past a sideline (wide). Coords go WELL outside 0..1 so the visual
      // layer clearly shows the ball sailing off the court.
      const attackerOnHome = hitter.spot.y > 0.5;   // home = bottom half (y > 0.5)
      const goLong = Math.random() < 0.5;
      let outX, outY;
      if (goLong) {
        // Past opposing endline: away side endline is y≈0 (engine), home side is y≈1.
        // Push WAY out — 30% past the endline, plenty of room to see it fly off.
        outY = attackerOnHome ? -0.50 : 1.50;
        // Spread across the court width, biased around hitter's line
        outX = Math.max(-0.05, Math.min(1.05, hitter.spot.x + (Math.random() - 0.5) * 0.6));
      } else {
        // Past a sideline: engine x well past 0 or 1
        outX = Math.random() < 0.5 ? -0.50 : 1.50;
        // Y on the OPPONENT's half of the court (where the ball would have landed)
        outY = attackerOnHome
          ? 0.05 + Math.random() * 0.4    // away side (top half)
          : 0.55 + Math.random() * 0.4;   // home side (bottom half)
      }
      events.push({
        type: 'attack-out', actor: hitter, team: attackingSide,
        fromSpot: hitter.spot,
        toSpot: { x: outX, y: outY }
      });
    }
    recordFail(match, hitter?.player?.id);   // hit into net / out = cold
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
    // Effective stats include team momentum + cold penalty
    const effDef = effectiveStat(d, 'defense', match, defSide);
    const effAth = effectiveStat(d, 'athletic', match, defSide);
    let score = effDef + effAth * 0.5;
    score += tr.hustle * 1.2;
    if (isBigMoment) score += tr.confidence * 0.8;
    // Priority: Libero digs everything, Middle rarely digs
    const prio = rolePriority(d);
    score += (5 - prio) * 0.6;
    if (!best || score > best.score) return { d, score };
    return best;
  }, null);
  if (bestDigger) {
    const digChance = statCheck(bestDigger.score, attackerEffective * 1.1, 0.35);
    if (digChance) {
      events.push({ type: 'dig', actor: bestDigger.d, team: defSide });
      recordSuccess(match, bestDigger.d?.player?.id);   // dig = hot
      const digQuality = Math.random() * 0.4 + 0.5;
      return continueRally(match, events, defSide, digQuality, maxTouches);
    }
  }

  // KILL — ball lands on the defender's floor (use the attack event's target)
  const killLandSpot = events[events.length - 1] && events[events.length - 1].toSpot
    ? events[events.length - 1].toSpot
    : pickAttackTarget(defendingTeam);
  events.push({ type: 'kill', actor: hitter, team: attackingSide, toSpot: killLandSpot });
  recordSuccess(match, hitter?.player?.id);   // kill = hot
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
  // Update team momentum (hot streak boost / lose it on point loss)
  updateMomentum(match, winningSide);
  const streak = match.momentum ? match.momentum[winningSide].streak : 0;
  const boost = match.momentum ? match.momentum[winningSide].boost : 0;
  events.push({
    type: 'point',
    team: winningSide,
    home: match.pointsHome, away: match.pointsAway,
    streak, boost   // let the visual layer light up the team on fire
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
