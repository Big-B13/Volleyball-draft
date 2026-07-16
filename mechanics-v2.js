// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP ENGINE v2 — Fly High–inspired mechanics
//
// This module WRAPS the existing engine without touching its internals.
// It runs as a post-processor: after simulateRally() produces its event
// stream, we walk through it and augment each event with:
//   1. Touch quality tiers (BAD / NORMAL / PERFECT) that CHAIN
//   2. Crit chance + crit damage (via existing personality traits)
//   3. Net-crossing counter (for cooldowns)
//   4. Ball-magnet priority modifier (for signature move ready state)
//   5. Team morale gauge + signature move triggers
//
// The output stream has the same shape as before with new fields added,
// so both the current 2D renderer and a future 3D renderer subscribe
// to identical data.
// ═══════════════════════════════════════════════════════════════════════

import { traitsFor } from './data.js';

// ───── SIGNATURE MOVES CATALOG ─────
// Each player's "ultimate" — fires when their team's morale hits 100 and it's
// their turn to act. See MECHANICS_V2.md §5.
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

export function signatureFor(pid) {
  return SIGNATURE_MOVES[pid] || null;
}

// ───── TOUCH QUALITY TIERS ─────

/** Compute quality tier from stat score, prev-touch tier, and traits.
 *  Returns { tier, score, crit, critMult }. */
export function computeTier(rawScore, prevTier, actorTraits, isOffense) {
  // Chain modifier: previous BAD drags this down, PERFECT boosts up
  const chainMul = prevTier === 'BAD'     ? 0.55
                 : prevTier === 'PERFECT' ? 1.20
                 : 1.0;
  const score = Math.max(0, Math.min(1, rawScore * chainMul));

  // Tuned so a typical rally shakes out ~60% NORMAL, ~25% PERFECT, ~15% BAD.
  let tier;
  if (score >= 0.85) tier = 'PERFECT';
  else if (score >= 0.45) tier = 'NORMAL';
  else tier = 'BAD';

  // Crit only on PERFECT-tier actions. Tuned so ~10-20% of PERFECTs crit — makes
  // the crit damage popup feel special rather than routine.
  let crit = false, critMult = 1.0;
  if (tier === 'PERFECT' && actorTraits) {
    const chanceTrait  = isOffense ? actorTraits.confidence : actorTraits.hustle;
    const damageTrait  = isOffense ? actorTraits.aggression : actorTraits.discipline;
    const critChance   = 0.03 + (chanceTrait || 0.5) * 0.20;   // 3-23%
    if (Math.random() < critChance) {
      crit = true;
      critMult = 1.6 + (damageTrait || 0.5) * 0.5;   // 1.85× → 2.1×
    }
  }
  return { tier, score, crit, critMult };
}

/** Approximate a raw skill score (0..1) for each event type based on its actor's
 *  stats. Used ONLY for tier classification — doesn't change point outcomes.  */
function scoreForEvent(ev, prevEv) {
  const p = ev.actor && ev.actor.player;
  if (!p) return 0.55;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  // Score maps stat (1..10) to (0..1) after centering + noise.
  // A stat of 5 (average) → ~0.5 score (NORMAL). Stat 8 (very good) → ~0.7 with
  // ±0.15 noise = mostly NORMAL, sometimes PERFECT. Stat 9-10 with crit trait
  // → regularly PERFECT. Elite play should be legibly elite.
  const noise = () => (Math.random() - 0.5) * 0.35;   // -0.175..+0.175
  const norm  = (stat) => clamp((stat - 1) / 9 + noise());   // 1→0, 10→1

  switch (ev.type) {
    case 'serve':
    case 'ace':
      return norm(p.serve || 5);
    case 'serve-error':
      return 0.15;   // definitely BAD
    case 'pass':
      return norm((p.defense || 5) * 0.7 + (p.setting || 5) * 0.3);
    case 'pass-error':
      return 0.15;
    case 'set':
      return norm((p.setting || 5) * 0.8 + (p.athletic || 5) * 0.2);
    case 'attack':
    case 'kill':
      return norm((p.attack || 5) * 0.85 + (p.athletic || 5) * 0.15);
    case 'attack-error':
    case 'attack-net':
    case 'attack-out':
      return 0.15;
    case 'block':
      return norm((p.defense || 5) * 0.6 + (p.athletic || 5) * 0.4);
    case 'dig':
      return norm((p.defense || 5) * 0.7 + (p.athletic || 5) * 0.3);
    case 'setter-dump':
    case 'tip':
      return norm(((p.setting || 5) + (p.attack || 5)) / 2);
    default:
      return 0.55;
  }
}

/** Which event types can crit as OFFENSE (not defense) */
const OFFENSIVE_TYPES = new Set([
  'serve','ace','set','attack','kill','setter-dump','tip'
]);
const DEFENSIVE_TYPES = new Set([
  'pass','block','dig'
]);
const NET_CROSSING_TYPES = new Set([
  'serve','ace','attack','kill','attack-error','attack-net','attack-out',
  'setter-dump','tip','block'   // block sends ball back over
]);

// ───── MORALE FILL RULES ─────
// Points gained per event type (per team who caused it).
// Tuned so a full 100-point morale bar takes ~15-25 rallies of good play
// (2-4 signature moves per full match, not per set).
const MORALE_GAIN = {
  'kill':         3,
  'ace':          4,
  'block':        3,
  'setter-dump':  3,
  'tip':          2,
  'dig':          1,
};

/** Apply all v2 augmentations to a full event stream from simulateRally().
 *  MUTATES the event objects with new fields. */
export function augmentEvents(events, match) {
  // Ensure match state slots exist
  if (!match.morale) match.morale = { home: 0, away: 0 };
  if (match.netCrossings == null) match.netCrossings = 0;
  if (!match.cooldowns) match.cooldowns = {};   // pid → remaining crossings

  let prevTier = null;
  let lastTeamTouched = null;   // for tracking chains inside one side's play

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prevEv = events[i - 1] || null;

    // ─ Reset chain when the ball switches sides
    if (prevEv && prevEv.team && ev.team && prevEv.team !== ev.team) {
      prevTier = null;
    }
    // Reset chain on new rally markers
    if (['point','rotation','set-won','match-won'].includes(ev.type)) {
      // Non-touch events — tick cooldowns on net crossings only, skip rest
      continue;
    }

    // ─ Compute tier
    const traits = ev.actor && ev.actor.player ? traitsFor(ev.actor.player.id) : null;
    const isOffense = OFFENSIVE_TYPES.has(ev.type);
    const rawScore = scoreForEvent(ev, prevEv);
    const { tier, score, crit, critMult } = computeTier(rawScore, prevTier, traits, isOffense);
    ev.tier = tier;
    ev.tierScore = +score.toFixed(3);
    ev.crit = crit;
    ev.critMult = crit ? +critMult.toFixed(2) : 1.0;

    // ─ Compute damage number (visual popup only)
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

    // ─ Morale gain (attacking team)
    let moraleGain = MORALE_GAIN[ev.type] || 0;
    if (tier === 'PERFECT') moraleGain += 1;
    if (crit)               moraleGain += 2;
    if (prevTier === 'BAD' && tier === 'PERFECT') moraleGain += 5;   // hustle recovery

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

    // ─ Signature move eligibility (for renderer to flag)
    const actorPid = ev.actor && ev.actor.player && ev.actor.player.id;
    if (actorPid) {
      const sig = SIGNATURE_MOVES[actorPid];
      const teamMoraleFull = match.morale[ev.team] >= 100;
      const cdReady = !(match.cooldowns[actorPid] > 0);
      // Fire the signature if: their team's morale is full, this is a matching event
      // type, they have no active cooldown, and their tier came out at least NORMAL.
      if (sig && teamMoraleFull && cdReady && sigMatchesEvent(sig, ev) && tier !== 'BAD') {
        ev.ability = 'signature';
        ev.signature = { id: sig.id, name: sig.name, power: sig.power };
        // Force this event to PERFECT + crit for max impact
        ev.tier = 'PERFECT';
        ev.crit = true;
        ev.critMult = sig.power;
        const p = ev.actor.player;
        const base = ev.type === 'kill' || ev.type === 'attack' ? (p.attack || 5) * 900
                   : ev.type === 'ace' || ev.type === 'serve'   ? (p.serve || 5) * 900
                   : ev.type === 'block' ? ((p.defense || 5) + (p.athletic || 5)) * 500
                   : (p.setting || 5) * 700;
        ev.damage = Math.round(base * sig.power + 500 + Math.random() * 400);
        // Drain morale, set cooldown
        match.morale[ev.team] = 0;
        match.cooldowns[actorPid] = sig.cd;
        // Signature may also drain opponent morale
        if (sig.moraleDrain) {
          const opp = ev.team === 'home' ? 'away' : 'home';
          match.morale[opp] = Math.max(0, match.morale[opp] - sig.moraleDrain);
        }
        ev.moraleAfter = { ...match.morale };
      }
    }

    prevTier = tier;
    lastTeamTouched = ev.team;
  }

  return events;
}

/** Does this signature move match the event's action type? */
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

/** Reset per-match state (called on startMatch) */
export function resetV2State(match) {
  match.morale = { home: 0, away: 0 };
  match.netCrossings = 0;
  match.cooldowns = {};
}
