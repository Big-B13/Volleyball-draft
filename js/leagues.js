// Multi-league support for The Gomi Cup platform.
// Each league is stored at Firebase `leagues/<leagueId>` with its own captains,
// team names, colors, and logos. Player pool is shared globally from data.js.

import { db, ref, get, set, update, remove } from "./firebase-init.js";
import { DEFAULT_CAPTAINS, LOGO_URLS } from "./data.js";

const GOMI_CUP_ID = 'gomi-cup';

/** Ensure the Gomi Cup exists in the DB. Called on admin load. */
export async function ensureGomiCupSeeded() {
  const snap = await get(ref(db, `leagues/${GOMI_CUP_ID}`));
  if (snap.exists()) return;
  const gomi = {
    id: GOMI_CUP_ID,
    name: 'The Gomi Cup',
    tagline: 'Three former teammates. One trophy. No mercy.',
    founded: 2026,
    setting: 'Indoor',
    active: true,
    captains: DEFAULT_CAPTAINS.map(c => ({
      id: c.id, name: c.name, team: c.team,
      color: c.color, color2: c.color2,
      logo: c.logo, role: c.role, photo: c.photo || null
    })),
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
  return {
    id: c.id || `c${Math.random().toString(36).slice(2, 7)}`,
    name: (c.name || '').trim(),
    team: (c.team || '').trim(),
    color: c.color || '#94a3b8',
    color2: c.color2 || '#000000',
    logo: c.logo || null,     // one of: 'strigidae', 'otters', 'shizuka', OR a custom URL
    role: (c.role || '').trim() || null,
    photo: c.photo || null
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
