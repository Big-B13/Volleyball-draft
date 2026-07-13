// Per-player, per-match performance stats.
// Data model: playerStats/<leagueId>/<matchId>/<playerId> = { kills, blocks, digs, aces, assists, mvp, notes }

import { db, ref, get, set, update, remove, onValue } from "./firebase-init.js";
import { listMatches } from "./standings.js";

export const STAT_FIELDS = [
  { id: 'kills',   label: 'Kills',   weight: 1.0,  short: 'K'  },
  { id: 'blocks',  label: 'Blocks',  weight: 1.5,  short: 'BL' },
  { id: 'aces',    label: 'Aces',    weight: 1.5,  short: 'A'  },
  { id: 'digs',    label: 'Digs',    weight: 0.5,  short: 'D'  },
  { id: 'assists', label: 'Assists', weight: 0.5,  short: 'AS' }
];

export const MVP_BONUS = 5;
export const WIN_BONUS = 2;

/** Fetch all stat entries for a league. Returns { matchId: { playerId: statsObj } } */
export async function loadStats(leagueId) {
  const snap = await get(ref(db, `playerStats/${leagueId}`));
  return snap.val() || {};
}

/** Subscribe to stats changes in real time */
export function watchStats(leagueId, cb) {
  return onValue(ref(db, `playerStats/${leagueId}`), (snap) => {
    cb(snap.val() || {});
  });
}

/** Save one player's stats for one match */
export async function savePlayerStats(leagueId, matchId, playerId, stats) {
  const clean = {
    kills:   parseInt(stats.kills)   || 0,
    blocks:  parseInt(stats.blocks)  || 0,
    aces:    parseInt(stats.aces)    || 0,
    digs:    parseInt(stats.digs)    || 0,
    assists: parseInt(stats.assists) || 0,
    mvp:     !!stats.mvp,
    notes:   (stats.notes || '').trim(),
    updatedAt: Date.now()
  };
  await set(ref(db, `playerStats/${leagueId}/${matchId}/${playerId}`), clean);
}

/** Delete stats for a player in a match */
export async function deletePlayerStats(leagueId, matchId, playerId) {
  await remove(ref(db, `playerStats/${leagueId}/${matchId}/${playerId}`));
}

/** Compute a single MVP-score for one line of stats */
export function computeMvpScore(stats, wonMatch = false) {
  if (!stats) return 0;
  let score = 0;
  for (const f of STAT_FIELDS) {
    score += (parseInt(stats[f.id]) || 0) * f.weight;
  }
  if (stats.mvp) score += MVP_BONUS;
  if (wonMatch)  score += WIN_BONUS;
  return Math.round(score * 10) / 10;
}

/** Aggregate stats across all matches for a league into per-player totals.
 *  Requires: matches list (to know who won), stats blob, drafts (to map player→captain→match wins)
 *  Returns per-player aggregate + rankings. */
export function aggregatePlayerStats({ statsBlob, matches, playerRosters }) {
  // playerRosters = { playerId: captainId }  → so we can determine wins
  const perPlayer = {}; // { playerId: aggregates }

  const matchesById = Object.fromEntries((matches || []).map(m => [m.id, m]));

  function ensure(pid) {
    if (!perPlayer[pid]) {
      perPlayer[pid] = {
        playerId: pid,
        gamesPlayed: 0,
        matchesWon: 0,
        mvpCount: 0,
        kills: 0, blocks: 0, aces: 0, digs: 0, assists: 0,
        totalScore: 0
      };
    }
    return perPlayer[pid];
  }

  for (const [matchId, matchStats] of Object.entries(statsBlob || {})) {
    const match = matchesById[matchId];
    for (const [pid, s] of Object.entries(matchStats || {})) {
      const agg = ensure(pid);
      agg.gamesPlayed++;
      agg.kills   += parseInt(s.kills)   || 0;
      agg.blocks  += parseInt(s.blocks)  || 0;
      agg.aces    += parseInt(s.aces)    || 0;
      agg.digs    += parseInt(s.digs)    || 0;
      agg.assists += parseInt(s.assists) || 0;
      if (s.mvp) agg.mvpCount++;

      // Compute win for this player
      let won = false;
      if (match && playerRosters && playerRosters[pid]) {
        const capId = playerRosters[pid];
        if (match.teamAId === capId && match.scoreA > match.scoreB) won = true;
        else if (match.teamBId === capId && match.scoreB > match.scoreA) won = true;
      }
      if (won) agg.matchesWon++;
      agg.totalScore += computeMvpScore(s, won);
    }
  }
  return perPlayer;
}
