// Volleyball match engine — stat-driven probabilistic simulator.
// Given two teams of 6 players each (with stats + positions), produces a
// stream of "events" (serve, pass, set, attack, block, dig, point, rotation, etc.)
// that the visual layer can render.

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
export function createMatch({ homeTeam, awayTeam, homeName, awayName, homeColor, awayColor }) {
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

/** Simple weighted random check. Returns true if success. */
function statCheck(attackerStat, defenderStat, base = 0.5) {
  // Convert 0-10 stats into a 0-1 chance, weighted by contest.
  // High attacker + low defender = high success. Vice versa low.
  const attackScore = (attackerStat || 5) / 10;
  const defScore = (defenderStat || 5) / 10;
  // Base success = attacker's raw ability + small edge over defender
  const chance = base + (attackScore - defScore) * 0.35;
  return Math.random() < Math.max(0.1, Math.min(0.9, chance));
}

/** Pick a random hitter from the team's front row (spots 2, 3, 4 in rotation) */
function pickHitter(team) {
  const candidates = [1, 2, 3].map(i => playerAtSpot(team, i)).filter(Boolean);
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

/** Pick the best defender to receive a serve — usually a back-row player with high defense */
function pickReceiver(team) {
  const backRow = [0, 4, 5].map(i => playerAtSpot(team, i)).filter(Boolean);
  const weights = backRow.map(c => Math.pow((c.player.defense || 5), 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < backRow.length; i++) {
    r -= weights[i];
    if (r <= 0) return backRow[i];
  }
  return backRow[0];
}

/** Pick the setter — team's designated setter (spot 2) or best `setting` stat */
function pickSetter(team) {
  return playerAtSpot(team, 1) || team.lineup[0];
}

/** Get the blocker matched against a hitter's zone */
function pickBlockers(defendingTeam, hitter) {
  // Middle blocker (spot 3 = index 2) always joins the block, plus one pin blocker
  const middle = playerAtSpot(defendingTeam, 2);
  // Pin blocker = opposite side of the hitter's zone
  const pinIdx = hitter && hitter.spot.x < 0.5 ? 1 : 3; // hitter on left → block from right pin
  const pin = playerAtSpot(defendingTeam, pinIdx);
  return [middle, pin].filter(Boolean);
}

/** Get all back-row defenders + spot 4/2 non-blocker (if any) */
function pickDiggers(defendingTeam, blockers) {
  const blockerIds = new Set(blockers.map(b => b && b.player.id));
  const all = [0, 1, 2, 3, 4, 5]
    .map(i => playerAtSpot(defendingTeam, i))
    .filter(p => p && !blockerIds.has(p.player.id));
  return all;
}

// ============ SIMULATE ONE RALLY ============
// Returns an array of events describing what happens in the rally.
// Each event has: { type, from, to, ball, delay, sound, text? }
export function simulateRally(match) {
  const events = [];
  const servingTeam = match.serving === 'home' ? match.home : match.away;
  const receivingTeam = match.serving === 'home' ? match.away : match.home;
  const servingSide = match.serving;

  // 1) Serve
  const server = playerAtSpot(servingTeam, 0); // spot 1 = right back = server
  const receiver = pickReceiver(receivingTeam);
  events.push({
    type: 'serve',
    fromSpot: server ? server.spot : { x: 0.75, y: 0.9 },
    toSpot: receiver ? receiver.spot : { x: 0.5, y: 0.5 },
    actor: server,
    team: servingSide
  });

  // Ace check: server's serve vs receiver's defense
  const aceChance = statCheck(server?.player.serve, receiver?.player.defense, 0.15);
  if (aceChance) {
    // ACE!
    events.push({ type: 'ace', actor: server, team: servingSide, target: receiver });
    return finishPoint(match, events, servingSide);
  }

  // Error check: server misses (rare — service errors)
  if (Math.random() < 0.05) {
    events.push({ type: 'serve-error', actor: server, team: servingSide });
    return finishPoint(match, events, servingSide === 'home' ? 'away' : 'home');
  }

  // 2) Pass (reception)
  events.push({ type: 'pass', actor: receiver, team: servingSide === 'home' ? 'away' : 'home' });
  const passQuality = Math.random() * 0.4 + 0.6; // 0.6-1.0

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
  const hitter = pickHitter(attackingTeam);
  if (!setter || !hitter) {
    return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
  }

  // Set
  events.push({
    type: 'set',
    fromSpot: setter.spot, toSpot: hitter.spot,
    actor: setter, team: attackingSide
  });

  // Set quality: setter's setting stat + incoming quality
  const setQuality = ((setter.player.setting || 5) / 10) * 0.5 + incomingQuality * 0.5;

  // Attack
  const blockers = pickBlockers(defendingTeam, hitter);
  events.push({
    type: 'attack',
    actor: hitter, team: attackingSide,
    fromSpot: hitter.spot,
    toSpot: pickAttackTarget(defendingTeam),
    setQuality
  });

  // Attack outcome tree
  // 1. Block: (blocker defense + block bonus) vs (hitter attack * setQuality)
  const avgBlockDef = blockers.length
    ? blockers.reduce((s, b) => s + (b.player.defense || 5), 0) / blockers.length
    : 3;
  const blockBonus = blockers.some(b => (b.player.blockTouchCm || 300) > 310) ? 1 : 0;
  const attackerEffective = (hitter.player.attack || 5) * setQuality;
  const blockChance = statCheck(avgBlockDef + blockBonus, attackerEffective, 0.20);
  if (blockChance) {
    // BLOCK!
    const blocker = blockers[Math.floor(Math.random() * blockers.length)];
    events.push({ type: 'block', actor: blocker, team: attackingSide === 'home' ? 'away' : 'home', hitter });
    // Blocked ball often lands on hitter's side; sometimes recovered on their side. Assume ~70% point for blocker.
    if (Math.random() < 0.7) {
      return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
    }
    // Recovered by attacker's team — becomes another rally on their side
    return continueRally(match, events, attackingSide, 0.5);
  }

  // 2. Attack error (hitter into net / out)
  if (Math.random() < 0.08 - setQuality * 0.05) {
    events.push({ type: 'attack-error', actor: hitter, team: attackingSide });
    return finishPoint(match, events, attackingSide === 'home' ? 'away' : 'home');
  }

  // 3. Dig attempt
  const diggers = pickDiggers(defendingTeam, blockers);
  const bestDigger = diggers.reduce((best, d) => {
    const score = (d.player.defense || 5) + (d.player.athletic || 5) * 0.5;
    if (!best || score > best.score) return { d, score };
    return best;
  }, null);
  if (bestDigger) {
    const digChance = statCheck(bestDigger.score, attackerEffective * 1.1, 0.35);
    if (digChance) {
      // DUG! Rally continues on defender's side.
      events.push({ type: 'dig', actor: bestDigger.d, team: attackingSide === 'home' ? 'away' : 'home' });
      const digQuality = Math.random() * 0.4 + 0.5;
      return continueRally(match, events, attackingSide === 'home' ? 'away' : 'home', digQuality, maxTouches);
    }
  }

  // KILL
  events.push({ type: 'kill', actor: hitter, team: attackingSide });
  return finishPoint(match, events, attackingSide);
}

function pickAttackTarget(defendingTeam) {
  // Random open spot on defender's side (bias toward the deep corners)
  const candidates = [
    { x: 0.1, y: 0.9 },  // deep corner
    { x: 0.9, y: 0.9 },  // deep corner
    { x: 0.5, y: 0.95 }, // deep middle
    { x: 0.5, y: 0.6 }   // short (tip)
  ];
  // Mirror if defending team is on the far side
  const isFar = defendingTeam === (defendingTeam && defendingTeam.lineup && defendingTeam.lineup[0].spot.y < 0.5);
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
      setsHome: match.setsHome, setsAway: match.setsAway
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
