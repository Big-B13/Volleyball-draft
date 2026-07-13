// Season standings module — tracks match results per league.
// Data model in Firebase:
//   standings/<leagueId>/matches/<matchId> = { teamA, teamB, scoreA, scoreB, playedAt, notes }
//   (teamA/teamB are captain slot IDs from the league record)

import { db, ref, get, set, update, remove, onValue } from "./firebase-init.js";

/** List all matches for a league, most recent first */
export async function listMatches(leagueId) {
  const snap = await get(ref(db, `standings/${leagueId}/matches`));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
}

/** Subscribe to matches in real time */
export function watchMatches(leagueId, cb) {
  return onValue(ref(db, `standings/${leagueId}/matches`), (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
    cb(list);
  });
}

/** Log a new match */
export async function logMatch(leagueId, { teamAId, teamBId, scoreA, scoreB, notes, playedAt }) {
  const id = 'm_' + Math.random().toString(36).slice(2, 10);
  await set(ref(db, `standings/${leagueId}/matches/${id}`), {
    teamAId, teamBId,
    scoreA: parseInt(scoreA),
    scoreB: parseInt(scoreB),
    notes: (notes || '').trim(),
    playedAt: playedAt || Date.now(),
    loggedAt: Date.now()
  });
  return id;
}

/** Delete a match */
export async function deleteMatch(leagueId, matchId) {
  await remove(ref(db, `standings/${leagueId}/matches/${matchId}`));
}

/** Given a league's captains + its match list, compute standings.
 *  Returns [{ captainId, teamName, played, wins, losses, setsWon, setsLost, setDiff, points }] sorted */
export function computeStandings(captains, matches) {
  const stats = {};
  for (const c of captains) {
    stats[c.id] = {
      captainId: c.id,
      captainName: c.name,
      teamName: c.team,
      color: c.color,
      logo: c.logo,
      played: 0, wins: 0, losses: 0,
      setsWon: 0, setsLost: 0, setDiff: 0,
      points: 0 // 3 for win, 0 for loss (simple standard)
    };
  }
  for (const m of matches) {
    const a = stats[m.teamAId], b = stats[m.teamBId];
    if (!a || !b) continue;
    a.played++; b.played++;
    a.setsWon += m.scoreA; a.setsLost += m.scoreB;
    b.setsWon += m.scoreB; b.setsLost += m.scoreA;
    if (m.scoreA > m.scoreB) { a.wins++; b.losses++; a.points += 3; }
    else if (m.scoreB > m.scoreA) { b.wins++; a.losses++; b.points += 3; }
    else { a.wins += 0.5; b.wins += 0.5; a.points += 1; b.points += 1; } // draw fallback
  }
  Object.values(stats).forEach(s => { s.setDiff = s.setsWon - s.setsLost; });
  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    return b.setsWon - a.setsWon;
  });
}
