// Team synergies — named squads of 3+ friends that unlock bonuses when all together.
// Tiered: getting MORE members than the minimum stacks bonuses.
//   Base   = when at least `minRequired` on the court
//   Full   = extra boost when ALL members are on the court (only for squads with 4+)

import { PLAYER_TRAITS } from './data.js';

export const SYNERGIES = [
  // ── Captain-level ──
  {
    id: 'trinity',
    name: 'The Trinity',
    icon: '👑',
    players: ['big-b', 'burla', 'stratus'],
    minRequired: 3,
    boost: { confidence: 0.5, chemistryFloor: 0.95 },
    description: 'The three captains united. +0.5 confidence, chemistry maxed.'
  },

  // ── Sniper trio ──
  {
    id: 'sniper-squad',
    name: 'Sniper Squad',
    icon: '🎯',
    players: ['steven', 'ricardo', 'renars'],
    minRequired: 3,
    boost: { attack: 0.5, serve: 0.3, chemistryFloor: 0.9 },
    description: 'Tiny Giant + Aim & Shoot + Hold This L. +0.5 ATK, +0.3 SRV.'
  },

  // ── Wall of terror ──
  {
    id: 'nightmare-fuel',
    name: 'Nightmare Fuel',
    icon: '💀',
    players: ['nikita-brown', 'islom', 'ihor'],
    minRequired: 3,
    boost: { attack: 0.6, chemistryFloor: 0.9 },
    description: 'Nightmare + RPG + Header. +0.6 ATK when all 3 on court.'
  },

  // ── Defensive lockdown (4-member squad — full bonus when all 4 play together) ──
  {
    id: 'iron-wall',
    name: 'Iron Wall',
    icon: '🛡️',
    players: ['zakhar', 'nikita-blond', 'pavel', 'ihor'],
    minRequired: 3,
    boost: { defense: 0.5, chemistryFloor: 0.85 },
    fullBoost: { defense: 0.4, athletic: 0.3, chemistryFloor: 0.95 },
    description: 'Guardian Angel + Winger + Janitor + Header. +0.5 DEF (3/4) → +0.9 DEF, +0.3 ATH (all 4).'
  },

  // ── Party crew ──
  {
    id: 'party-crew',
    name: 'Party Crew',
    icon: '🎉',
    players: ['big-b', 'skuppa', 'ibrahim'],
    minRequired: 3,
    boost: { confidence: 0.4, athletic: 0.3, chemistryFloor: 0.85 },
    description: 'Blackout + DJ + Monster. +0.4 CON, +0.3 ATH.'
  },

  // ── Moonwalk crew (4-member squad) ──
  {
    id: 'moon-crew',
    name: 'Moon Crew',
    icon: '🌙',
    players: ['moon', 'floor', 'luna', 'daan'],
    minRequired: 3,
    boost: { athletic: 0.5, chemistryFloor: 0.85 },
    fullBoost: { athletic: 0.3, attack: 0.3, chemistryFloor: 0.95 },
    description: 'The Claw + Forte + Short Stop + Dahliah. +0.5 ATH (3/4) → +0.8 ATH, +0.3 ATK (all 4).'
  },

  // ── Capitain's crew (4-member squad) ──
  {
    id: 'rebel-alliance',
    name: "Capitain's Crew",
    icon: '⚡',
    players: ['gabsche', 'ani', 'merel', 'robin'],
    minRequired: 3,
    boost: { attack: 0.3, defense: 0.3, chemistryFloor: 0.9 },
    fullBoost: { attack: 0.3, defense: 0.3, confidence: 0.3, chemistryFloor: 0.98 },
    description: 'Capitain + The Host + Bird + Bullseye. +0.3 ATK/DEF (3/4) → +0.6 ATK/DEF, +0.3 CON (all 4).'
  },

  // ── Setter connections ──
  {
    id: 'perfect-storm',
    name: 'Perfect Storm',
    icon: '🌀',
    players: ['bouschra', 'narcis', 'rei'],
    minRequired: 3,
    boost: { setting: 0.5, attack: 0.3, chemistryFloor: 0.9 },
    description: 'Gazelle + Upcomer + Axis Rotation (setter combo). +0.5 SET, +0.3 ATK.'
  },

  // ── Serve bombers (4-member squad) ──
  {
    id: 'bomb-squad',
    name: 'Bomb Squad',
    icon: '💣',
    players: ['dawood', 'ayaz', 'rashid', 'aizaz'],
    minRequired: 3,
    boost: { serve: 0.6, chemistryFloor: 0.85 },
    fullBoost: { serve: 0.4, attack: 0.2, chemistryFloor: 0.95 },
    description: 'Canon + Footie + Weather Forecast + Spark. +0.6 SRV (3/4) → +1.0 SRV, +0.2 ATK (all 4).'
  },

  // ── Dutch dream ──
  {
    id: 'dream-team',
    name: 'Dream Team',
    icon: '✨',
    players: ['joran', 'linus', 'burla'],
    minRequired: 3,
    boost: { attack: 0.5, confidence: 0.3, chemistryFloor: 0.9 },
    description: 'The Dream + Rocket + The Trickster. +0.5 ATK, +0.3 CON.'
  }
];

/** Find all active synergies. Returns array of { synergy, activeMembers, tier }
 *  where tier = 'full' (all members) or 'base' (partial). */
export function findActiveSynergies(rosterIds) {
  const set = new Set(rosterIds);
  const out = [];
  for (const s of SYNERGIES) {
    const activeMembers = s.players.filter(p => set.has(p));
    if (activeMembers.length >= s.minRequired) {
      const tier = activeMembers.length === s.players.length ? 'full' : 'base';
      out.push({ synergy: s, activeMembers, tier });
    }
  }
  return out;
}

/** Sum boosts + collect badges for one player from active synergies. */
export function playerSynergyBoosts(playerId, activeSynergies) {
  const boosts = { attack: 0, serve: 0, defense: 0, setting: 0, athletic: 0, confidence: 0 };
  const badges = [];
  for (const { synergy, tier } of activeSynergies) {
    if (!synergy.players.includes(playerId)) continue;
    badges.push({ icon: synergy.icon, name: synergy.name, id: synergy.id, tier });
    // Base boost always applies
    for (const [k, v] of Object.entries(synergy.boost || {})) {
      if (k in boosts) boosts[k] += v;
    }
    // Full boost ADDS on top when the whole squad is present
    if (tier === 'full' && synergy.fullBoost) {
      for (const [k, v] of Object.entries(synergy.fullBoost)) {
        if (k in boosts) boosts[k] += v;
      }
    }
  }
  return { boosts, badges };
}

export function applySynergiesToRoster(roster) {
  const rosterIds = roster.map(p => p.id);
  const active = findActiveSynergies(rosterIds);
  const boostedRoster = roster.map(p => {
    const { boosts, badges } = playerSynergyBoosts(p.id, active);
    return {
      ...p,
      attack:    (+p.attack    || 5) + (boosts.attack    || 0),
      serve:     (+p.serve     || 5) + (boosts.serve     || 0),
      defense:   (+p.defense   || 5) + (boosts.defense   || 0),
      setting:   (+p.setting   || 5) + (boosts.setting   || 0),
      athletic:  (+p.athletic  || 5) + (boosts.athletic  || 0),
      _synergyBadges: badges,
      _synergyBoosts: boosts
    };
  });
  return { boostedRoster, activeSynergies: active };
}

/** Chemistry floor from all active synergies for a pair — max floor (respects full tier). */
export function synergyChemistryFloor(pidA, pidB, activeSynergies) {
  let floor = 0;
  for (const { synergy, tier } of activeSynergies) {
    if (synergy.players.includes(pidA) && synergy.players.includes(pidB)) {
      const baseFloor = synergy.boost?.chemistryFloor || 0;
      const fullFloor = (tier === 'full' && synergy.fullBoost?.chemistryFloor) || 0;
      floor = Math.max(floor, baseFloor, fullFloor);
    }
  }
  return floor;
}
