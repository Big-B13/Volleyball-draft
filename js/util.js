import { STAT_KEYS } from "./data.js";

export function overall(p) {
  return Math.round((p.attack + p.serve + p.defense + p.setting + p.athletic) / STAT_KEYS.length * 10) / 10;
}

// Random 6-character room ID
export function makeRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ambiguous chars removed
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Random 4-character captain code
export function makeCaptainCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Snake draft order: e.g. [0,1,2,2,1,0,0,1,2, ...]
// captainOrder is the round-1 order (already shuffled by commissioner if desired)
export function buildDraftOrder(captainOrder, picksPerTeam) {
  const order = [];
  for (let round = 0; round < picksPerTeam; round++) {
    const roundOrder = round % 2 === 0 ? [...captainOrder] : [...captainOrder].reverse();
    order.push(...roundOrder);
  }
  return order;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function saveLocal(key, val) {
  try { localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val)); } catch (e) {}
}
export function loadLocal(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  } catch { return fallback; }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
