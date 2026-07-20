// Resolves the artwork for a card based on rarity.
// Common / Uncommon / Rare  → original player photo (./assets/players/<pid>.png)
// Epic / Legendary          → special alt art (./assets/campaign/cards/<pid>/legendary.png)
//                             falls back to the original photo if no special art exists.

const LEGENDARY_ART_AVAILABLE = new Set([
  'big-b','burla','stratus','ricardo','steven','joran',
  'nikita-brown','bouschra','islom','nikita-blond','linus','gabsche','zakhar',
]);

/** Returns the image URL for a given player+rarity, or null to signal "use default". */
export function cardArt(pid, rarity) {
  if ((rarity === 'legendary' || rarity === 'epic') && LEGENDARY_ART_AVAILABLE.has(pid)) {
    return `./assets/campaign/cards/${pid}/legendary.png`;
  }
  return `./assets/players/${pid}.png`;
}

/** Border/frame color per rarity */
export const RARITY_FRAME = {
  common:    '#94a3b8',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f97316',
};

/** Rarity glow (box-shadow) */
export const RARITY_GLOW = {
  common:    '0 0 0 rgba(0,0,0,0)',
  uncommon:  '0 0 12px rgba(34,197,94,0.6)',
  rare:      '0 0 16px rgba(59,130,246,0.7)',
  epic:      '0 0 22px rgba(168,85,247,0.85)',
  legendary: '0 0 28px rgba(249,115,22,0.95), 0 0 60px rgba(249,115,22,0.4)',
};
