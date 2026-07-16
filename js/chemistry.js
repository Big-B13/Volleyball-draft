// Team chemistry — persistent per-league tracking of how well two players play together.
// Scale: 0-100. Grows with each match they play on the same team (wins > losses).
// Preset trait chemistry (from data.js PLAYER_TRAITS) is added on top as a "personal bond"
// baseline that never decays — friendships outside the game.
//
// Firebase data model:
//   chemistry/<leagueId>/<pairKey> = { score, gamesPlayed, matchesWon, lastPlayed }
//   pairKey = alphabetically sorted [pidA, pidB].join('_')

import { db, ref, get, set, update, onValue } from "./firebase-init.js";

// Growth rates (0-100 scale)
const CHEMISTRY_PER_GAME    = 3;    // baseline per shared match
const CHEMISTRY_WIN_BONUS   = 2;    // extra if they won together
const CHEMISTRY_DRAFT_BONUS = 5;    // one-time bump when drafted onto same team
const CHEMISTRY_MAX         = 100;

/** Canonical pair key so (A,B) and (B,A) hash the same */
export function pairKey(pidA, pidB) {
  if (!pidA || !pidB || pidA === pidB) return null;
  return [pidA, pidB].sort().join('_');
}

/** Read one pair's chemistry record (returns null if none) */
export async function getPairChemistry(leagueId, pidA, pidB) {
  const key = pairKey(pidA, pidB);
  if (!key) return null;
  const snap = await get(ref(db, `chemistry/${leagueId}/${key}`));
  return snap.val();
}

/** Read the whole chemistry map for a league */
export async function loadLeagueChemistry(leagueId) {
  const snap = await get(ref(db, `chemistry/${leagueId}`));
  return snap.val() || {};
}

/** Subscribe to a league's chemistry map in real time */
export function watchLeagueChemistry(leagueId, cb) {
  return onValue(ref(db, `chemistry/${leagueId}`), (snap) => cb(snap.val() || {}));
}

/** Score 0-100 between two players in a league.
 *  Combines persistent Firebase record + optional preset "personal bond" (0-1 → 0-30 baseline).
 *  presetChem is a { pid: 0..1 } map from PLAYER_TRAITS chemistry field. */
export function chemistryScore(pidA, pidB, chemistryBlob, presetChemA = {}, presetChemB = {}) {
  const key = pairKey(pidA, pidB);
  if (!key) return 0;
  const persistent = chemistryBlob && chemistryBlob[key] ? (chemistryBlob[key].score || 0) : 0;
  // Preset personal bond adds up to 30 pts to the baseline (max, either direction)
  const preset = Math.max(presetChemA[pidB] || 0, presetChemB[pidA] || 0) * 30;
  return Math.min(CHEMISTRY_MAX, Math.round(persistent + preset));
}

/** Record a match: bump chemistry between every pair in the roster.
 *  roster = array of player IDs who played together.
 *  matchWon = true if this roster won its match. */
export async function recordMatchForChemistry(leagueId, roster, matchWon = false) {
  if (!leagueId || !Array.isArray(roster) || roster.length < 2) return;
  const now = Date.now();
  const updates = {};
  const gain = CHEMISTRY_PER_GAME + (matchWon ? CHEMISTRY_WIN_BONUS : 0);
  // Read current chemistry first so we can bump correctly
  const existing = await loadLeagueChemistry(leagueId);
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      const key = pairKey(roster[i], roster[j]);
      if (!key) continue;
      const cur = existing[key] || { score: 0, gamesPlayed: 0, matchesWon: 0 };
      updates[`chemistry/${leagueId}/${key}`] = {
        score: Math.min(CHEMISTRY_MAX, (cur.score || 0) + gain),
        gamesPlayed: (cur.gamesPlayed || 0) + 1,
        matchesWon: (cur.matchesWon || 0) + (matchWon ? 1 : 0),
        lastPlayed: now
      };
    }
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

/** One-time bump when a team is first drafted together (they chose each other). */
export async function recordDraftForChemistry(leagueId, roster) {
  if (!leagueId || !Array.isArray(roster) || roster.length < 2) return;
  const now = Date.now();
  const updates = {};
  const existing = await loadLeagueChemistry(leagueId);
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      const key = pairKey(roster[i], roster[j]);
      if (!key) continue;
      const cur = existing[key] || { score: 0, gamesPlayed: 0, matchesWon: 0 };
      // Only apply the draft bonus ONCE per pair (skip if score already indicates prior draft)
      if (cur.draftedTogether) continue;
      updates[`chemistry/${leagueId}/${key}`] = {
        ...cur,
        score: Math.min(CHEMISTRY_MAX, (cur.score || 0) + CHEMISTRY_DRAFT_BONUS),
        draftedTogether: true,
        firstDraftedAt: now
      };
    }
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

/** Manually set a pair's chemistry (admin override) */
export async function setPairChemistry(leagueId, pidA, pidB, score) {
  const key = pairKey(pidA, pidB);
  if (!key) return;
  const clamped = Math.max(0, Math.min(CHEMISTRY_MAX, parseInt(score) || 0));
  const cur = await getPairChemistry(leagueId, pidA, pidB) || {};
  await set(ref(db, `chemistry/${leagueId}/${key}`), {
    ...cur, score: clamped, lastPlayed: Date.now()
  });
}

/** Build a per-player chemistry map suitable for the match engine.
 *  Returns { [pidA]: { [pidB]: 0..1 } } — normalized to 0-1 for use as trait weights. */
export function buildChemistryMap(chemistryBlob, presetTraits = {}) {
  const out = {};
  // First, seed with preset traits (make bidirectional — chemistry is symmetric)
  for (const [pid, tr] of Object.entries(presetTraits)) {
    if (!tr.chemistry) continue;
    for (const [otherPid, bond] of Object.entries(tr.chemistry)) {
      if (!out[pid]) out[pid] = {};
      if (!out[otherPid]) out[otherPid] = {};
      out[pid][otherPid] = Math.max(out[pid][otherPid] || 0, bond);
      out[otherPid][pid] = Math.max(out[otherPid][pid] || 0, bond);   // mirror
    }
  }
  // Then merge in persistent chemistry
  for (const [key, record] of Object.entries(chemistryBlob || {})) {
    const [pidA, pidB] = key.split('_');
    if (!pidA || !pidB) continue;
    const norm = Math.min(1, (record.score || 0) / CHEMISTRY_MAX);
    if (!out[pidA]) out[pidA] = {};
    if (!out[pidB]) out[pidB] = {};
    // Take the MAX of preset + persistent (they represent the same relationship)
    out[pidA][pidB] = Math.max(out[pidA][pidB] || 0, norm);
    out[pidB][pidA] = Math.max(out[pidB][pidA] || 0, norm);
  }
  return out;
}

/** Format for display: 85 → "85 · ★★★★☆" */
export function formatChemistry(score) {
  const stars = Math.round(score / 20);
  return `${score} · ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
}

export const CONSTANTS = {
  CHEMISTRY_MAX,
  CHEMISTRY_PER_GAME,
  CHEMISTRY_WIN_BONUS,
  CHEMISTRY_DRAFT_BONUS
};
