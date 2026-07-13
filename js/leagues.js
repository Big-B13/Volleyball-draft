// Multi-league support for The Gomi Cup platform.
// Each league is stored at Firebase `leagues/<leagueId>` with its own captains,
// team names, colors, and logos. Player pool is shared globally from data.js.

import { db, ref, get, set, update, remove } from "./firebase-init.js";
import { DEFAULT_CAPTAINS, DEFAULT_PLAYERS, LOGO_URLS } from "./data.js";

/** Fuzzy-match a name to a player in the pool.
 *  Case/space/punctuation insensitive; also matches partial (e.g. "nathan" -> "burla" via nickname) */
export function findPlayerByName(query) {
  const q = String(query || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!q) return null;
  // Exact match first (by id, name, or nickname)
  for (const p of DEFAULT_PLAYERS) {
    const idN = p.id.replace(/[^a-z0-9]/g, '').toLowerCase();
    const nameN = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const nickN = (p.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (idN === q || nameN === q || nickN === q) return p;
  }
  // Substring/startsWith match
  for (const p of DEFAULT_PLAYERS) {
    const nameN = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameN.startsWith(q) || q.startsWith(nameN)) return p;
  }
  for (const p of DEFAULT_PLAYERS) {
    const nameN = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameN.includes(q) || q.includes(nameN)) return p;
  }
  return null;
}

const GOMI_CUP_ID = 'gomi-cup';

/** Ensure the Gomi Cup exists in the DB. Called on admin load. */
export async function ensureGomiCupSeeded() {
  const snap = await get(ref(db, `leagues/${GOMI_CUP_ID}`));
  if (snap.exists()) {
    // Make sure existing gomi cup has linkedPlayerId set on captains (migration)
    const existing = snap.val();
    let needsFix = false;
    (existing.captains || []).forEach(c => {
      if (!c.linkedPlayerId && c.name) {
        const match = findPlayerByName(c.name);
        if (match) { c.linkedPlayerId = match.id; needsFix = true; }
      }
    });
    if (needsFix) await update(ref(db, `leagues/${GOMI_CUP_ID}`), { captains: existing.captains });
    return;
  }
  const gomi = {
    id: GOMI_CUP_ID,
    name: 'The Gomi Cup',
    tagline: 'Three former teammates. One trophy. No mercy.',
    founded: 2026,
    setting: 'Indoor',
    active: true,
    captains: DEFAULT_CAPTAINS.map(c => normalizeCaptain(c)),
    createdAt: Date.now(),
    createdBy: 'system'
  };
  await set(ref(db, `leagues/${GOMI_CUP_ID}`), gomi);
}

/** List all leagues, most-recently-created first. */
export async function listLeagues() {
  const snap = await get(ref(db, 'leagues'));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Get a single league by id */
export async function getLeague(leagueId) {
  const snap = await get(ref(db, `leagues/${leagueId}`));
  return snap.val();
}

/** Create a new league. Slug is generated from name if not given. */
export async function createLeague({ name, tagline, founded, setting, captains, createdBy }) {
  const id = slugify(name);
  if (!id) throw new Error('League name is required.');
  const existing = await getLeague(id);
  if (existing) throw new Error(`A league with the slug "${id}" already exists. Pick a different name.`);
  const league = {
    id,
    name: name.trim(),
    tagline: (tagline || '').trim(),
    founded: parseInt(founded) || new Date().getFullYear(),
    setting: (setting || 'Indoor').trim(),
    active: true,
    captains: (captains || []).map(normalizeCaptain),
    createdAt: Date.now(),
    createdBy: createdBy || 'unknown'
  };
  await set(ref(db, `leagues/${id}`), league);
  return league;
}

/** Update an existing league (partial patch). */
export async function updateLeague(leagueId, patch) {
  if (patch.captains) patch.captains = patch.captains.map(normalizeCaptain);
  await update(ref(db, `leagues/${leagueId}`), patch);
}

/** Delete a league (careful — cannot delete the Gomi Cup). */
export async function deleteLeague(leagueId) {
  if (leagueId === GOMI_CUP_ID) throw new Error('The Gomi Cup cannot be deleted.');
  await remove(ref(db, `leagues/${leagueId}`));
}

/** Slugify a league name into a URL-safe id. */
export function slugify(s) {
  return String(s || '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCaptain(c) {
  const name = (c.name || '').trim();
  const matchedPlayer = name ? findPlayerByName(name) : null;
  return {
    id: c.id || `c${Math.random().toString(36).slice(2, 7)}`,
    name,
    team: (c.team || '').trim(),
    color: c.color || '#94a3b8',
    color2: c.color2 || '#000000',
    logo: c.logo || null,     // one of: 'strigidae', 'otters', 'shizuka', OR a custom URL
    role: (c.role || '').trim() || (matchedPlayer && matchedPlayer.role) || null,
    photo: c.photo || (matchedPlayer ? `./assets/players/${matchedPlayer.id}.png` : null),
    // If the captain matches a player in the pool, remember that so we can exclude them from that league's draft
    linkedPlayerId: matchedPlayer ? matchedPlayer.id : null
  };
}

/** Get the league id for the URL: ?league=xxx, or 'gomi-cup' as default */
export function currentLeagueId() {
  const params = new URLSearchParams(location.search);
  return params.get('league') || GOMI_CUP_ID;
}

/** Convert a captain's logo field to a full URL (built-in id OR raw URL). */
export function captainLogoUrl(logo) {
  if (!logo) return null;
  if (LOGO_URLS[logo]) return LOGO_URLS[logo];
  if (String(logo).startsWith('http') || String(logo).startsWith('./')) return logo;
  return null;
}

export const BUILTIN_LOGOS = Object.keys(LOGO_URLS);
export const GOMI_CUP_LEAGUE_ID = GOMI_CUP_ID;
