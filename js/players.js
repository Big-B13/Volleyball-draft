// Player management — allows admins to edit players' nicknames, stats, bios,
// and add new players via the admin panel. Overrides are stored in Firebase.
//
// Design: DEFAULT_PLAYERS (data.js) remains as the seed/fallback. Any admin edits
// are stored in Firebase at `players/<id>`. When rendering the app, we merge
// defaults with overrides so nothing breaks even if Firebase is unreachable.

import { db, ref, get, set, update, onValue, remove } from "./firebase-init.js";
import { DEFAULT_PLAYERS, photoPathFor } from "./data.js";
import { PLAYER_BIOS } from "./lore.js";

const OVERRIDES_PATH = 'playerOverrides';
const CUSTOM_PLAYERS_PATH = 'customPlayers';

/** Fetch overrides + custom players from Firebase */
export async function loadDb() {
  const [ovSnap, cuSnap] = await Promise.all([
    get(ref(db, OVERRIDES_PATH)),
    get(ref(db, CUSTOM_PLAYERS_PATH))
  ]);
  return {
    overrides: ovSnap.val() || {},   // { playerId: { nickname, attack, ... } }
    custom:    cuSnap.val() || {}    // { playerId: full player record }
  };
}

/** Subscribe to combined effective player list */
export function subscribePlayers(cb) {
  let overrides = {}, custom = {};
  const emit = () => cb(mergeAll(overrides, custom));
  const off1 = onValue(ref(db, OVERRIDES_PATH), (snap) => { overrides = snap.val() || {}; emit(); });
  const off2 = onValue(ref(db, CUSTOM_PLAYERS_PATH),  (snap) => { custom    = snap.val() || {}; emit(); });
  return () => { off1(); off2(); };
}

/** Compute merged effective player list */
function mergeAll(overrides, custom) {
  const byId = {};
  // 1. Start with defaults
  for (const p of DEFAULT_PLAYERS) {
    byId[p.id] = { ...p, bio: PLAYER_BIOS[p.id] || '' };
  }
  // 2. Apply overrides on top of defaults
  for (const [id, patch] of Object.entries(overrides)) {
    if (byId[id]) byId[id] = { ...byId[id], ...patch };
  }
  // 3. Add custom (net-new) players
  for (const [id, p] of Object.entries(custom)) {
    byId[id] = { ...p, id, isCustom: true };
  }
  return Object.values(byId);
}

/** One-shot fetch of the effective player list (used by non-realtime pages) */
export async function getAllPlayers() {
  const { overrides, custom } = await loadDb();
  return mergeAll(overrides, custom);
}

/** Update an override for a default player (or replace fields for a custom player) */
export async function savePlayer(id, patch) {
  const isCustom = !DEFAULT_PLAYERS.some(p => p.id === id);
  if (isCustom) {
    // Custom players are stored whole
    await update(ref(db, `${CUSTOM_PLAYERS_PATH}/${id}`), patch);
  } else {
    // Default players get override entries (only the changed fields)
    await update(ref(db, `${OVERRIDES_PATH}/${id}`), patch);
  }
}

/** Reset a default player back to its hardcoded defaults (clears any override) */
export async function resetPlayerToDefault(id) {
  const isCustom = !DEFAULT_PLAYERS.some(p => p.id === id);
  if (isCustom) throw new Error('Custom players can only be deleted, not reset.');
  await remove(ref(db, `${OVERRIDES_PATH}/${id}`));
}

/** Add a brand-new player (not in defaults) */
export async function addCustomPlayer(player) {
  const id = String(player.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!id) throw new Error('Player id (slug) is required.');
  const existing = await get(ref(db, `${CUSTOM_PLAYERS_PATH}/${id}`));
  const isDefault = DEFAULT_PLAYERS.some(p => p.id === id);
  if (existing.exists() || isDefault) throw new Error(`Player id "${id}" already exists.`);
  const clean = {
    id,
    name: (player.name || '').trim(),
    nickname: (player.nickname || '').trim(),
    position: (player.position || 'OH').trim().toUpperCase().replace(/[^A-Z/]/g, '').split('/').filter(Boolean).slice(0,2).join('/'),
    attack: parseFloat(player.attack) || 5,
    serve: parseFloat(player.serve) || 5,
    defense: parseFloat(player.defense) || 5,
    setting: parseFloat(player.setting) || 5,
    athletic: parseFloat(player.athletic) || 5,
    bio: (player.bio || '').trim(),
    createdAt: Date.now()
  };
  await set(ref(db, `${CUSTOM_PLAYERS_PATH}/${id}`), clean);
  return id;
}

/** Delete a custom player (defaults can't be deleted; only reset) */
export async function deleteCustomPlayer(id) {
  const isDefault = DEFAULT_PLAYERS.some(p => p.id === id);
  if (isDefault) throw new Error('Cannot delete default players — reset instead.');
  await remove(ref(db, `${CUSTOM_PLAYERS_PATH}/${id}`));
  // Also clean up any override that might have been set (edge case)
  await remove(ref(db, `${OVERRIDES_PATH}/${id}`));
}

/** Check if a player has any overrides applied */
export function isPlayerEdited(playerFromMerged) {
  if (playerFromMerged.isCustom) return true;
  const def = DEFAULT_PLAYERS.find(p => p.id === playerFromMerged.id);
  if (!def) return true;
  const fields = ['name', 'nickname', 'position', 'attack', 'serve', 'defense', 'setting', 'athletic'];
  return fields.some(f => (playerFromMerged[f] || '') !== (def[f] || ''));
}
