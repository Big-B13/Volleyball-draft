// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP ENGINE v3 — Fly High complete
//
// Everything in v2 + the missing 5 mechanics:
//   1. Ball-magnet toward player with ready signature ult
//   2. Lineup Specialty (Power/Quick/Block/Receive) with RPS counter +30%
//   3. Attack-Tech / Def-Tech flat multiplier per player
//   4. 7-starter + 6-bench system with auto-subs on stamina depletion
//   5. Stamina economy — actions cost stamina, low stamina = tier penalty
//
// Runs as a post-processor to simulateRally() from match-engine-v3.js.
// The v2 mechanics module is left completely intact for the 2D sim.
// ═══════════════════════════════════════════════════════════════════════

import { traitsFor } from './data.js';
import {
  spendStamina, staminaPenalty, autoSubExhausted, endOfRallyRest,
  specialtyCounters, SPECIALTIES,
} from './match-engine-v3.js';

// ───── SIGNATURE MOVES CATALOG (same as v2) ─────
export const SIGNATURE_MOVES = {
  'big-b':        { id: 'night-predator',  name: 'NIGHT PREDATOR',  type: 'block',        power: 2.5, cd: 8 },
  'burla':        { id: 'the-trickster',   name: 'THE TRICKSTER',   type: 'setter-dump',  power: 2.0, cd: 6 },
  'stratus':      { id: 'the-mirror',      name: 'THE MIRROR',      type: 'dig',          power: 2.5, cd: 8 },
  'steven':       { id: 'tiny-giant',      name: 'TINY GIANT',      type: 'quick-spike',  power: 2.8, cd: 6 },
  'ricardo':      { id: 'aim-shoot',       name: 'AIM & SHOOT',     type: 'power-spike',  power: 2.7, cd: 7 },
  'nikita-brown': { id: 'nightmare',       name: 'NIGHTMARE',       type: 'power-spike',  power: 3.0, cd: 8 },
  'joran':        { id: 'the-dream',       name: 'THE DREAM',       type: 'power-spike',  power: 2.9, cd: 8, wipeoff: true },
  'bouschra':     { id: 'aim-shoot-2',     name: 'BULLSEYE',        type: 'power-spike',  power: 2.7, cd: 7 },
  'nikita-blond': { id: 'iron-wall',       name: 'IRON WALL',       type: 'block',        power: 2.6, cd: 8 },
  'islom':        { id: 'cannon',          name: 'CANNON',          type: 'serve',        power: 3.0, cd: 10 },
  'ihor':         { id: 'storm',           name: 'STORM',           type: 'power-spike',  power: 2.8, cd: 8, moraleDrain: 20 },
  'linus':        { id: 'rocket',          name: 'ROCKET',          type: 'power-spike',  power: 2.7, cd: 8 },
  'gabsche':      { id: 'capitain',        name: "CAPITAIN'S CALL", type: 'power-spike',  power: 2.7, cd: 7 },
  'dawood':       { id: 'canon-s',         name: 'CANNON SETTER',   type: 'serve',        power: 2.8, cd: 9 },
};

export function signatureFor(pid) { return SIGNATURE_MOVES[pid] || null; }

// ───── V3 NEW: Which specialty benefits from each event ─────
// When your team specialty counters opponent's, ALL your actions of that
// specialty family get +30% tier score (much more likely to land PERFECT).
const SPECIALTY_EVENT_MAP = {
  'power':   new Set(['attack','kill','attack-net','attack-out','attack-error']),   // hard swings
  'quick':   new Set(['set','tip']),                                                 // tempo plays
  'block':   new Set(['block']),                                                     // net defense
  'receive': new Set(['pass','pass-error','dig']),                                   // back-row defense
};

function specialtyBonus(ev, actorTeam, oppTeam) {
  if (!actorTeam?.specialty || !oppTeam?.specialty) return 0;
  if (!specialtyCounters(actorTeam.specialty, oppTeam.specialty)) return 0;
  const set = SPECIALTY_EVENT_MAP[actorTeam.specialty];
  return set && set.has(ev.type) ? 0.30 : 0;
}

// ───── V3 NEW: Attack-Tech / Def-Tech derived stat ─────
// Every player has a derived "technique" number based on their stats + traits.
// It multiplies tier score (like Fly High's Attack-Tech / Def-Tech flat mult).
//   attackTech = (0.5×attack + 0.3×setting + 0.2×athletic) / 10 × discipline
//   defTech    = (0.6×defense + 0.4×athletic) / 10 × discipline
// Discipline (existing trait) weights technique — technical players hit harder
// even without crits.
function attackTech(player, traits) {
  const base = ((player.attack || 5) * 0.5 + (player.setting || 5) * 0.3 + (player.athletic || 5) * 0.2) / 10;
  const disc = traits?.discipline ?? 0.6;
  return 0.85 + base * 0.25 + disc * 0.15;   // ~0.90 → ~1.25 typical
}
function defTech(player, traits) {
  const base = ((player.defense || 5) * 0.6 + (player.athletic || 5) * 0.4) / 10;
  const disc = traits?.discipline ?? 0.6;
  return 0.85 + base * 0.25 + disc * 0.15;
}

// ───── TOUCH QUALITY TIERS ─────
export function computeTier(rawScore, prevTier, actorTraits, isOffense) {
  const chainMul = prevTier === 'BAD'     ? 0.55
                 : prevTier === 'PERFECT' ? 1.20
                 : 1.0;
  const score = Math.max(0, Math.min(1, rawScore * chainMul));

  // V3: tighter PERFECT threshold since tech multiplier now boosts base score.
  let tier;
  if (score >= 0.92) tier = 'PERFECT';
  else if (score >= 0.50) tier = 'NORMAL';
  else tier = 'BAD';

  let crit = false, critMult = 1.0;
  if (tier === 'PERFECT' && actorTraits) {
    const chanceTrait  = isOffense ? actorTraits.confidence : actorTraits.hustle;
    const damageTrait  = isOffense ? actorTraits.aggression : actorTraits.discipline;
    const critChance   = 0.03 + (chanceTrait || 0.5) * 0.20;
    if (Math.random() < critChance) {
      crit = true;
      critMult = 1.6 + (damageTrait || 0.5) * 0.5;
    }
  }
  return { tier, score, crit, critMult };
}

/** V3: score now incorporates specialty bonus + stamina penalty + tech multiplier. */
function scoreForEvent(ev, match, actorTeam, oppTeam) {
  const p = ev.actor && ev.actor.player;
  if (!p) return 0.55;
  const traits = traitsFor(p.id);
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const noise = () => (Math.random() - 0.5) * 0.35;
  const norm  = (stat) => clamp((stat - 1) / 9 + noise());

  let base;
  switch (ev.type) {
    case 'serve': case 'ace':     base = norm(p.serve || 5); break;
    case 'serve-error':           base = 0.15; break;
    case 'pass':                  base = norm((p.defense || 5) * 0.7 + (p.setting || 5) * 0.3); break;
    case 'pass-error':            base = 0.15; break;
    case 'set':                   base = norm((p.setting || 5) * 0.8 + (p.athletic || 5) * 0.2); break;
    case 'attack': case 'kill':   base = norm((p.attack || 5) * 0.85 + (p.athletic || 5) * 0.15); break;
    case 'attack-error': case 'attack-net': case 'attack-out': base = 0.15; break;
    case 'block':                 base = norm((p.defense || 5) * 0.6 + (p.athletic || 5) * 0.4); break;
    case 'dig':                   base = norm((p.defense || 5) * 0.7 + (p.athletic || 5) * 0.3); break;
    case 'setter-dump': case 'tip': base = norm(((p.setting || 5) + (p.attack || 5)) / 2); break;
    default: base = 0.55;
  }

  // ─ Apply flat tech multiplier (Attack-Tech / Def-Tech equivalent)
  const isOffense = OFFENSIVE_TYPES.has(ev.type);
  const tech = isOffense ? attackTech(p, traits) : defTech(p, traits);
  base *= tech;

  // ─ Apply lineup specialty counter bonus (+30% when your team beats opponent's)
  base += specialtyBonus(ev, actorTeam, oppTeam);

  // ─ Apply stamina penalty (low stamina → BAD outcomes)
  const sta = match.stamina?.[p.id] ?? 100;
  base += staminaPenalty(sta);

  return clamp(base);
}

const OFFENSIVE_TYPES = new Set(['serve','ace','set','attack','kill','setter-dump','tip']);
const DEFENSIVE_TYPES = new Set(['pass','block','dig']);
const NET_CROSSING_TYPES = new Set([
  'serve','ace','attack','kill','attack-error','attack-net','attack-out',
  'setter-dump','tip','block'
]);

// ───── MORALE ─────
const MORALE_GAIN = {
  'kill':         3,
  'ace':          4,
  'block':        3,
  'setter-dump':  3,
  'tip':          2,
  'dig':          1,
};

/** V3 NEW: Ball-magnet override.
 *  When a player on the receiving side has a ready signature ult of the
 *  right type, we bias the ball toward them by REASSIGNING the pass/dig
 *  actor if a valid candidate exists.  Only fires ~30% of the time so it's
 *  not deterministic. */
function applyBallMagnet(ev, match) {
  if (ev.type !== 'pass' && ev.type !== 'dig') return;
  if (!match.cooldowns) match.cooldowns = {};
  const side = ev.team;
  const team = match[side];
  if (!team || !team.lineup) return;
  // Find any back-row player with a ready signature move of matching type
  const magnetType = ev.type === 'pass' ? ['dig'] : ['dig'];   // signature type 'dig' catches both
  let magnet = null;
  for (const slot of team.lineup) {
    if (!slot || !slot.player) continue;
    const sig = SIGNATURE_MOVES[slot.player.id];
    if (!sig) continue;
    if (!magnetType.includes(sig.type)) continue;
    const cdReady = !(match.cooldowns[slot.player.id] > 0);
    if (!cdReady) continue;
    magnet = slot;
    break;
  }
  if (!magnet) return;
  // Only reassign 30% of the time
  if (Math.random() > 0.30) return;
  ev.actor = magnet;
  ev.ballMagnet = true;   // flag for renderer / play-by-play
}

// ─────────────────────────────────────────────────────────────────
// MAIN AUGMENT FUNCTION
// ─────────────────────────────────────────────────────────────────

export function augmentEvents(events, match) {
  if (!match.morale) match.morale = { home: 0, away: 0 };
  if (match.netCrossings == null) match.netCrossings = 0;
  if (!match.cooldowns) match.cooldowns = {};

  let prevTier = null;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prevEv = events[i - 1] || null;

    if (prevEv && prevEv.team && ev.team && prevEv.team !== ev.team) prevTier = null;

    if (['point','rotation','set-won','match-won'].includes(ev.type)) {
      continue;
    }

    // ─ V3: ball-magnet override BEFORE anything else (may reassign actor)
    applyBallMagnet(ev, match);

    const actorSide = ev.team;
    const oppSide = actorSide === 'home' ? 'away' : 'home';
    const actorTeam = match[actorSide];
    const oppTeam = match[oppSide];

    const traits = ev.actor && ev.actor.player ? traitsFor(ev.actor.player.id) : null;
    const isOffense = OFFENSIVE_TYPES.has(ev.type);
    const rawScore = scoreForEvent(ev, match, actorTeam, oppTeam);
    const { tier, score, crit, critMult } = computeTier(rawScore, prevTier, traits, isOffense);
    ev.tier = tier;
    ev.tierScore = +score.toFixed(3);
    ev.crit = crit;
    ev.critMult = crit ? +critMult.toFixed(2) : 1.0;

    // ─ V3: spend stamina for this action
    if (ev.actor && ev.actor.player) {
      const remaining = spendStamina(match, ev.actor.player.id, ev.type);
      ev.staminaAfter = remaining;
    }

    // ─ Damage popup
    if (crit && (ev.type === 'kill' || ev.type === 'ace' || ev.type === 'block' ||
                 ev.type === 'setter-dump' || ev.type === 'tip')) {
      const p = ev.actor.player;
      const base = ev.type === 'kill'  ? (p.attack || 5) * 900
                 : ev.type === 'ace'   ? (p.serve || 5) * 900
                 : ev.type === 'block' ? ((p.defense || 5) + (p.athletic || 5)) * 450
                 : ev.type === 'setter-dump' ? (p.setting || 5) * 700
                 : (p.attack || 5) * 700;
      ev.damage = Math.round(base * critMult + Math.random() * 300);
    }

    // ─ Morale gain
    let moraleGain = MORALE_GAIN[ev.type] || 0;
    if (tier === 'PERFECT') moraleGain += 1;
    if (crit)               moraleGain += 2;
    if (prevTier === 'BAD' && tier === 'PERFECT') moraleGain += 5;

    if (moraleGain > 0 && ev.team) {
      const before = { ...match.morale };
      match.morale[ev.team] = Math.min(100, match.morale[ev.team] + moraleGain);
      ev.moraleGain = moraleGain;
      ev.moraleBefore = before;
      ev.moraleAfter = { ...match.morale };
    }

    // ─ Net-crossing counter + cooldown tick
    if (NET_CROSSING_TYPES.has(ev.type)) {
      match.netCrossings++;
      for (const pid in match.cooldowns) {
        if (match.cooldowns[pid] > 0) match.cooldowns[pid]--;
      }
    }
    ev.netCrossings = match.netCrossings;

    // ─ Signature move fire check
    const actorPid = ev.actor && ev.actor.player && ev.actor.player.id;
    if (actorPid) {
      const sig = SIGNATURE_MOVES[actorPid];
      const teamMoraleFull = match.morale[ev.team] >= 100;
      const cdReady = !(match.cooldowns[actorPid] > 0);
      if (sig && teamMoraleFull && cdReady && sigMatchesEvent(sig, ev) && tier !== 'BAD') {
        ev.ability = 'signature';
        ev.signature = { id: sig.id, name: sig.name, power: sig.power };
        ev.tier = 'PERFECT';
        ev.crit = true;
        ev.critMult = sig.power;
        const p = ev.actor.player;
        const base = ev.type === 'kill' || ev.type === 'attack' ? (p.attack || 5) * 900
                   : ev.type === 'ace' || ev.type === 'serve'   ? (p.serve || 5) * 900
                   : ev.type === 'block' ? ((p.defense || 5) + (p.athletic || 5)) * 500
                   : (p.setting || 5) * 700;
        ev.damage = Math.round(base * sig.power + 500 + Math.random() * 400);
        match.morale[ev.team] = 0;
        match.cooldowns[actorPid] = sig.cd;
        if (sig.moraleDrain) {
          const opp = ev.team === 'home' ? 'away' : 'home';
          match.morale[opp] = Math.max(0, match.morale[opp] - sig.moraleDrain);
        }
        ev.moraleAfter = { ...match.morale };
      }
    }

    prevTier = tier;
  }

  // ─ V3: after a full rally, rest players & auto-sub exhausted starters
  endOfRallyRest(match);
  const subs = autoSubExhausted(match);
  if (subs.length) {
    // Inject substitution events into the stream so the renderer can react
    for (const s of subs) {
      events.push({
        type: 'substitution',
        team: s.side,
        outPid: s.outPid,
        inPid: s.inPid,
        outName: s.outName,
        inName: s.inName,
      });
      match.subHistory.push({ ...s, atRally: match.rallyNumber });
    }
  }

  return events;
}

function sigMatchesEvent(sig, ev) {
  switch (sig.type) {
    case 'power-spike':  return ev.type === 'attack' || ev.type === 'kill';
    case 'quick-spike':  return (ev.type === 'attack' || ev.type === 'kill') && ev.tactic === 'quick';
    case 'block':        return ev.type === 'block';
    case 'dig':          return ev.type === 'dig';
    case 'setter-dump':  return ev.type === 'setter-dump';
    case 'serve':        return ev.type === 'serve' || ev.type === 'ace';
    default:             return false;
  }
}

export function resetV3State(match) {
  match.morale = { home: 0, away: 0 };
  match.netCrossings = 0;
  match.cooldowns = {};
  match.subHistory = [];
  // Reset stamina to full
  if (match.stamina) {
    for (const pid in match.stamina) match.stamina[pid] = 100;
  }
}
