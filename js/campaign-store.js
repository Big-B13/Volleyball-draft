// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — OFFLINE CAMPAIGN STORE
//
// All campaign state lives in localStorage. No Firebase required.
//
// Data model:
//   ownedCards: { [instanceId]: { pid, rarity, stars, level, xp, statBoosts, obtainedAt } }
//   roster: { starters: [instanceId, ...], bench: [instanceId, ...] }   // ids of owned cards
//   inventory: { coins, packs: {starter, common, rare, epic, champion}, materials: {atk,def,srv,set,ath} }
//   progression: { easyCleared: [1..9], mediumCleared: [], hardCleared: [], currentDifficulty: 'easy' }
//   pity: { packsSinceEpic: 0 }
//   history: [{ chapter, difficulty, won, mvp, ts }]
// ═══════════════════════════════════════════════════════════════════════

import { DEFAULT_PLAYERS } from './data.js';

export const CAMPAIGN_SAVE_KEY = 'gomi-campaign-v1';
const SAVE_KEY = CAMPAIGN_SAVE_KEY;

// ──────────── RARITIES ────────────
export const RARITIES = ['common','uncommon','rare','epic','legendary'];
export const RARITY_COLORS = {
  common:    '#94a3b8',   // grey
  uncommon:  '#22c55e',   // green
  rare:      '#3b82f6',   // blue
  epic:      '#a855f7',   // purple
  legendary: '#f97316',   // orange
};
export const RARITY_LABELS = {
  common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY',
};
// Stat boost per rarity tier (multiplier on base stats)
const RARITY_MULT = { common: 1.00, uncommon: 1.08, rare: 1.18, epic: 1.30, legendary: 1.45 };

// ──────────── CHAPTERS ────────────
export const CHAPTERS = [
  { n: 1, name: 'First Serve',      opponent: 'The Beginners',    theme: 'learn the ropes' },
  { n: 2, name: 'The Wall',         opponent: 'Iron Guardians',   theme: 'break through blocks' },
  { n: 3, name: 'No Easy Points',   opponent: 'Court Crushers',   theme: 'stamina war' },
  { n: 4, name: 'Rivalry Week',     opponent: 'The Outsiders',    theme: 'chemistry showdown' },
  { n: 5, name: 'The Storm',        opponent: 'Lightning Bolts',  theme: 'fast tempo' },
  { n: 6, name: 'Break Point',      opponent: 'Silent Assassins', theme: 'clutch under pressure' },
  { n: 7, name: 'The Elite Six',    opponent: 'Six Kings',        theme: 'specialists everywhere' },
  { n: 8, name: 'Road to the Cup',  opponent: 'Rival Champions',  theme: 'test of everything' },
  { n: 9, name: 'Gomi Cup Final',   opponent: 'The Undefeated',   theme: 'title match' },
];

// Chapter target power scales with chapter # + difficulty
export function chapterPower(chapter, difficulty) {
  const base = 20 + chapter * 8;   // Ch1 easy = 28, Ch9 easy = 92
  const diffMult = { easy: 1.0, medium: 1.35, hard: 1.75 }[difficulty] || 1.0;
  return Math.round(base * diffMult);
}

// ──────────── PACKS ────────────
// Odds per pack type — each entry sums to 100
export const PACK_ODDS = {
  starter:  { common: 70, uncommon: 25, rare: 5,  epic: 0,  legendary: 0 },
  common:   { common: 60, uncommon: 30, rare: 10, epic: 0,  legendary: 0 },
  rare:     { common: 20, uncommon: 40, rare: 30, epic: 9,  legendary: 1 },
  epic:     { common: 0,  uncommon: 20, rare: 45, epic: 30, legendary: 5 },
  champion: { common: 0,  uncommon: 0,  rare: 40, epic: 45, legendary: 15 },
};
export const PACK_LABELS = {
  starter:  '🎁 Starter Pack',
  common:   '📦 Common Pack',
  rare:     '💎 Rare Pack',
  epic:     '⭐ Epic Pack',
  champion: '🏆 Champion Pack',
};

// Pity: 10 packs without epic+ → next pack guarantees epic+
const PITY_THRESHOLD = 10;

// ──────────── DEFAULT STATE ────────────
function freshState() {
  // The Underdog Six = 6 lowest-overall players
  const scored = DEFAULT_PLAYERS
    .filter(p => !p.isCaptain)
    .map(p => ({ p, ovr: (p.attack + p.serve + p.defense + p.setting + p.athletic) / 5 }))
    .sort((a, b) => a.ovr - b.ovr);
  const underdogs = scored.slice(0, 6).map(x => x.p);
  const ownedCards = {};
  const starterIds = [];
  underdogs.forEach((p, i) => {
    const id = `card-${Date.now()}-${i}`;
    ownedCards[id] = { pid: p.id, rarity: 'common', stars: 1, level: 1, xp: 0, statBoosts: {}, obtainedAt: Date.now() };
    starterIds.push(id);
  });
  return {
    version: 1,
    createdAt: Date.now(),
    ownedCards,
    roster: { starters: starterIds, bench: [] },
    inventory: {
      coins: 100,
      packs: { starter: 1, common: 0, rare: 0, epic: 0, champion: 0 },
      materials: { atk: 3, def: 3, srv: 3, set: 3, ath: 3 },
    },
    progression: {
      easyCleared: [], mediumCleared: [], hardCleared: [],
      currentDifficulty: 'easy',
    },
    pity: { packsSinceEpic: 0 },
    tutorialComplete: false,
    history: [],
    log: ['🏐 Campaign started. The Underdog Six begin their journey.'],
  };
}

// ──────────── SAVE / LOAD ────────────
export function loadCampaign() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Campaign saves created before the guided start existed should receive it once.
    if (typeof state.tutorialComplete !== 'boolean') state.tutorialComplete = false;
    return state;
  } catch (e) { return null; }
}
export function saveCampaign(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}
export function clearCampaign() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}
export function newCampaign() {
  const s = freshState();
  saveCampaign(s);
  return s;
}

// ──────────── DERIVED HELPERS ────────────
export function getBasePlayer(pid) {
  return DEFAULT_PLAYERS.find(p => p.id === pid);
}

/** Effective stats for a card (base * rarity mult + level bonus + trained boosts) */
export function cardStats(card) {
  const base = getBasePlayer(card.pid);
  if (!base) return { attack:5, serve:5, defense:5, setting:5, athletic:5 };
  const mult = RARITY_MULT[card.rarity] || 1;
  const levelBonus = (card.level - 1) * 0.05;   // +0.05 per level after 1
  const starBonus = (card.stars - 1) * 0.15;    // +0.15 per star after 1
  const stats = {};
  for (const key of ['attack','serve','defense','setting','athletic']) {
    const trained = card.statBoosts?.[key] || 0;
    stats[key] = Math.min(11, +(base[key] * mult + levelBonus + starBonus + trained).toFixed(2));
  }
  return stats;
}
export function cardOverall(card) {
  const s = cardStats(card);
  return +((s.attack + s.serve + s.defense + s.setting + s.athletic) / 5).toFixed(2);
}
export function teamPower(state) {
  const cards = state.roster.starters.map(id => state.ownedCards[id]).filter(Boolean);
  if (!cards.length) return 0;
  const total = cards.reduce((sum, c) => sum + cardOverall(c) * 10, 0);
  // Bench gives small bonus (avg / 4)
  const bench = state.roster.bench.map(id => state.ownedCards[id]).filter(Boolean);
  const benchBonus = bench.length ? bench.reduce((s, c) => s + cardOverall(c) * 2, 0) : 0;
  return Math.round(total + benchBonus);
}

/** Chapter unlock rules.
 *  Easy: sequential (must clear Ch N-1 to unlock Ch N).
 *  Medium: unlocked only after ALL 9 easy chapters are cleared, then sequential.
 *  Hard: unlocked only after ALL 9 medium chapters are cleared, then sequential. */
export function isChapterUnlocked(state, chapter, difficulty) {
  const allCleared = (arr) => [1,2,3,4,5,6,7,8,9].every(n => arr.includes(n));
  if (difficulty === 'easy') {
    return chapter === 1 || state.progression.easyCleared.includes(chapter - 1);
  }
  if (difficulty === 'medium') {
    if (!allCleared(state.progression.easyCleared)) return false;
    return chapter === 1 || state.progression.mediumCleared.includes(chapter - 1);
  }
  if (difficulty === 'hard') {
    if (!allCleared(state.progression.mediumCleared)) return false;
    return chapter === 1 || state.progression.hardCleared.includes(chapter - 1);
  }
  return false;
}
export function isChapterCleared(state, chapter, difficulty) {
  return state.progression[`${difficulty}Cleared`].includes(chapter);
}

// ──────────── PLAY CHAPTER (quick sim) ────────────
/** Runs a quick calculated battle. Returns { won, mvp, rewards, log } */
export function playChapter(state, chapter, difficulty) {
  const yourPower = teamPower(state);
  const enemyPower = chapterPower(chapter, difficulty);
  // Win probability: sigmoid on power delta, capped 15-85%
  const delta = yourPower - enemyPower;
  const winChance = Math.max(0.15, Math.min(0.85, 0.5 + delta / (2 * enemyPower)));
  const won = Math.random() < winChance;

  // MVP = highest-overall starter
  const starters = state.roster.starters.map(id => state.ownedCards[id]).filter(Boolean);
  const mvpCard = starters.sort((a,b) => cardOverall(b) - cardOverall(a))[0];
  const mvpName = mvpCard ? getBasePlayer(mvpCard.pid)?.name : '?';

  const log = [
    `⚔️ Chapter ${chapter} [${difficulty.toUpperCase()}] vs ${CHAPTERS[chapter-1].opponent}`,
    `   Your Power: ${yourPower} · Enemy Power: ${enemyPower} · Win chance: ${Math.round(winChance*100)}%`,
    won ? `✅ VICTORY! MVP: ${mvpName}` : `❌ DEFEAT. Regroup and try again.`,
  ];

  const rewards = { coins: 0, packs: {}, materials: {}, xp: 0 };
  if (won) {
    // Update progression
    const key = `${difficulty}Cleared`;
    if (!state.progression[key].includes(chapter)) {
      state.progression[key].push(chapter);
      state.progression[key].sort((a,b) => a-b);
    }
    // Rewards scale with chapter + difficulty
    const diffMult = { easy: 1, medium: 2, hard: 4 }[difficulty];
    rewards.coins = (30 + chapter * 15) * diffMult;
    rewards.xp = (20 + chapter * 5) * diffMult;
    // Pack drops
    if (difficulty === 'easy') {
      if (chapter <= 3) rewards.packs.common = 1;
      else if (chapter <= 6) rewards.packs.rare = 1;
      else if (chapter === 9) rewards.packs.epic = 1;
      else rewards.packs.rare = 1;
    } else if (difficulty === 'medium') {
      if (chapter <= 4) rewards.packs.rare = 1;
      else if (chapter === 9) rewards.packs.champion = 1;
      else rewards.packs.epic = 1;
    } else if (difficulty === 'hard') {
      if (chapter <= 4) rewards.packs.epic = 1;
      else rewards.packs.champion = 1;
    }
    // Materials — random 1-3 of two random stats
    const statKeys = ['atk','def','srv','set','ath'];
    for (let i = 0; i < 2; i++) {
      const k = statKeys[Math.floor(Math.random() * statKeys.length)];
      rewards.materials[k] = (rewards.materials[k] || 0) + (1 + Math.floor(Math.random() * (2 * diffMult)));
    }

    // Apply rewards
    state.inventory.coins += rewards.coins;
    for (const [pack, n] of Object.entries(rewards.packs)) {
      state.inventory.packs[pack] = (state.inventory.packs[pack] || 0) + n;
    }
    for (const [mat, n] of Object.entries(rewards.materials)) {
      state.inventory.materials[mat] = (state.inventory.materials[mat] || 0) + n;
    }
    // XP to every starter
    starters.forEach(c => addXP(c, rewards.xp));

    log.push(`   +${rewards.coins} coins · +${rewards.xp} XP per starter`);
    if (Object.keys(rewards.packs).length) log.push(`   Pack: ${Object.entries(rewards.packs).map(([k,n]) => `${n}× ${PACK_LABELS[k]}`).join(', ')}`);
    if (Object.keys(rewards.materials).length) log.push(`   Materials: ${Object.entries(rewards.materials).map(([k,n]) => `+${n} ${k.toUpperCase()}`).join(', ')}`);
  } else {
    // Consolation: small coin
    rewards.coins = 10;
    state.inventory.coins += rewards.coins;
    log.push(`   Consolation: +${rewards.coins} coins`);
  }

  state.history.push({ chapter, difficulty, won, mvp: mvpName, ts: Date.now() });
  state.log = [...(state.log || []), ...log].slice(-30);
  saveCampaign(state);
  return { won, mvp: mvpName, rewards, log, yourPower, enemyPower, winChance };
}

// ──────────── LEVELING ────────────
function xpForNext(level) {
  return 50 + level * 25;   // L1→L2 = 75, L2→L3 = 100, ...
}
export function addXP(card, amount) {
  card.xp = (card.xp || 0) + amount;
  while (card.xp >= xpForNext(card.level) && card.level < 20) {
    card.xp -= xpForNext(card.level);
    card.level++;
  }
}

// ──────────── PACK OPENING ────────────
/** Rolls one player from a pack. Returns { card, isDuplicate, fragmentsGained } */
export function openPack(state, packType) {
  const owned = (state.inventory.packs[packType] || 0);
  if (owned <= 0) throw new Error('No pack of that type owned');
  state.inventory.packs[packType]--;

  // Roll rarity (with pity)
  const odds = { ...PACK_ODDS[packType] };
  let rarity = rollWeighted(odds);
  if (state.pity.packsSinceEpic >= PITY_THRESHOLD - 1 && !['epic','legendary'].includes(rarity)) {
    rarity = Math.random() < 0.85 ? 'epic' : 'legendary';
  }
  if (['epic','legendary'].includes(rarity)) state.pity.packsSinceEpic = 0;
  else state.pity.packsSinceEpic++;

  // Pick a random player (weighted toward higher-tier players for higher rarity)
  const pool = DEFAULT_PLAYERS.filter(p => !p.isCaptain);
  const scored = pool.map(p => ({ p, ovr: (p.attack + p.serve + p.defense + p.setting + p.athletic) / 5 }));
  scored.sort((a,b) => a.ovr - b.ovr);
  let picked;
  if (rarity === 'legendary') {
    // Legendary: top 20% of players
    const top = scored.slice(-Math.max(3, Math.floor(scored.length * 0.20)));
    picked = top[Math.floor(Math.random() * top.length)].p;
  } else if (rarity === 'epic') {
    const top = scored.slice(-Math.max(6, Math.floor(scored.length * 0.40)));
    picked = top[Math.floor(Math.random() * top.length)].p;
  } else if (rarity === 'rare') {
    const mid = scored.slice(Math.floor(scored.length * 0.20));
    picked = mid[Math.floor(Math.random() * mid.length)].p;
  } else {
    picked = scored[Math.floor(Math.random() * scored.length)].p;
  }

  // Do we already own this player at this rarity?
  const existing = Object.entries(state.ownedCards).find(([, c]) => c.pid === picked.id && c.rarity === rarity);
  if (existing) {
    // Duplicate → +1 star (max 5), plus some coins. The resulting OVR change is
    // calculated from the campaign card only; the shared base player is untouched.
    const [, dupCard] = existing;
    const previousOverall = cardOverall(dupCard);
    const gainedStars = dupCard.stars < 5 ? 1 : 0;
    if (gainedStars) dupCard.stars++;
    const newOverall = cardOverall(dupCard);
    const coins = 25 + (['common','uncommon','rare','epic','legendary'].indexOf(rarity) * 20);
    state.inventory.coins += coins;
    saveCampaign(state);
    return {
      card: dupCard,
      pid: picked.id,
      rarity,
      isDuplicate: true,
      starsGained: gainedStars,
      coinsGained: coins,
      playerName: picked.name,
      previousOverall,
      newOverall,
      overallGain: +(newOverall - previousOverall).toFixed(2),
    };
  }

  // New card
  const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newCard = { pid: picked.id, rarity, stars: 1, level: 1, xp: 0, statBoosts: {}, obtainedAt: Date.now() };
  state.ownedCards[id] = newCard;
  saveCampaign(state);
  return { card: newCard, id, pid: picked.id, rarity, isDuplicate: false, playerName: picked.name };
}

function rollWeighted(weights) {
  const total = Object.values(weights).reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return key;
  }
  return Object.keys(weights)[0];
}

// ──────────── TRAINING ────────────
const MAT_TO_STAT = { atk: 'attack', def: 'defense', srv: 'serve', set: 'setting', ath: 'athletic' };
export function trainCard(state, cardId, materialKey) {
  const card = state.ownedCards[cardId];
  if (!card) throw new Error('Card not found');
  const statKey = MAT_TO_STAT[materialKey];
  if (!statKey) throw new Error('Unknown training material');
  if ((state.inventory.materials[materialKey] || 0) < 1) throw new Error('Not enough materials');

  // Training belongs to this campaign card instance only. DEFAULT_PLAYERS is never
  // changed, so player ratings everywhere outside Campaign remain untouched.
  const previousOverall = cardOverall(card);
  const previousStat = cardStats(card)[statKey];
  if (previousStat >= 11) throw new Error(`${statKey.toUpperCase()} is already at the campaign maximum`);

  state.inventory.materials[materialKey]--;
  card.statBoosts = card.statBoosts || {};
  card.statBoosts[statKey] = +((card.statBoosts[statKey] || 0) + 0.2).toFixed(2);
  const newStat = cardStats(card)[statKey];
  const newOverall = cardOverall(card);
  saveCampaign(state);
  return {
    statKey,
    previousStat,
    newStat,
    newBoost: card.statBoosts[statKey],
    previousOverall,
    newOverall,
    overallGain: +(newOverall - previousOverall).toFixed(2),
  };
}

// ──────────── ROSTER ────────────
export function moveToStarters(state, cardId) {
  if (state.roster.starters.length >= 6) throw new Error('Already 6 starters');
  state.roster.bench = state.roster.bench.filter(id => id !== cardId);
  if (!state.roster.starters.includes(cardId)) state.roster.starters.push(cardId);
  saveCampaign(state);
}
export function moveToBench(state, cardId) {
  if (state.roster.bench.length >= 4) throw new Error('Bench full (4 max)');
  state.roster.starters = state.roster.starters.filter(id => id !== cardId);
  if (!state.roster.bench.includes(cardId)) state.roster.bench.push(cardId);
  saveCampaign(state);
}
export function removeFromRoster(state, cardId) {
  state.roster.starters = state.roster.starters.filter(id => id !== cardId);
  state.roster.bench = state.roster.bench.filter(id => id !== cardId);
  saveCampaign(state);
}
export function sellCard(state, cardId) {
  const card = state.ownedCards[cardId];
  if (!card) return;
  const value = { common:20, uncommon:50, rare:120, epic:300, legendary:800 }[card.rarity] || 20;
  state.inventory.coins += value * (card.stars || 1);
  removeFromRoster(state, cardId);
  delete state.ownedCards[cardId];
  saveCampaign(state);
  return value * (card.stars || 1);
}

// ──────────── SHOP ────────────
export const SHOP_ITEMS = [
  { id: 'starter', pack: 'starter', cost: 100,  label: '🎁 Starter Pack' },
  { id: 'common',  pack: 'common',  cost: 200,  label: '📦 Common Pack' },
  { id: 'rare',    pack: 'rare',    cost: 600,  label: '💎 Rare Pack' },
  { id: 'epic',    pack: 'epic',    cost: 1500, label: '⭐ Epic Pack' },
];
export function buyPack(state, itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) throw new Error('Item not found');
  if (state.inventory.coins < item.cost) throw new Error('Not enough coins');
  state.inventory.coins -= item.cost;
  state.inventory.packs[item.pack] = (state.inventory.packs[item.pack] || 0) + 1;
  saveCampaign(state);
}
