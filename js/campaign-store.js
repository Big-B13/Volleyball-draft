// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — OFFLINE CAMPAIGN STORE
// All campaign state lives in localStorage. No Firebase required.
// ═══════════════════════════════════════════════════════════════════════

import { DEFAULT_PLAYERS } from './data.js';
import { db, ref, set, get, auth } from './firebase-init.js';

export const CAMPAIGN_SAVE_KEY = 'gomi-campaign-v1';
const SAVE_KEY = CAMPAIGN_SAVE_KEY;
export const CURRENT_CAMPAIGN_VERSION = 4;

// ──────────── RARITIES ────────────
export const RARITIES = ['common','uncommon','rare','epic','legendary'];
export const RARITY_COLORS = {
  common: '#94a3b8', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f97316',
};
export const RARITY_LABELS = {
  common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY',
};
const RARITY_MULT = { common: 1.00, uncommon: 1.08, rare: 1.18, epic: 1.30, legendary: 1.45 };

export const EVOLUTION_COSTS = {
  common:    { to: 'uncommon',  coins: 100,  sacrifices: 4 },
  uncommon:  { to: 'rare',      coins: 300,  sacrifices: 4 },
  rare:      { to: 'epic',      coins: 750,  sacrifices: 4 },
  epic:      { to: 'legendary', coins: 1250, sacrifices: 4 },
};

export const DIFFICULTY_CARD_DROPS = {
  easy:   { chance: 0.05,  rarities: ['common','uncommon'] },
  medium: { chance: 0.025, rarities: ['rare'] },
  hard:   { chance: 0.01,  rarities: ['epic','legendary'] },
};

// ──────────── CHAPTERS ────────────
export const CHAPTERS = [
  { n: 1, name: 'First Serve',      opponent: 'The Beginners',    theme: 'learn the ropes' },
  { n: 2, name: 'The Wall',         opponent: 'Iron Guardians',   theme: 'break through blocks' },
  { n: 3, name: 'No Easy Points',   opponent: 'Court Crushers',   theme: 'stamina war' },
  { n: 4, name: 'Rivalry Week',     opponent: 'The Outsiders',    theme: 'chemistry showdown' },
  { n: 5, name: 'The Second Hand',  opponent: 'Second-in-Command', theme: 'storekeeper test' },
  { n: 6, name: 'Break Point',      opponent: 'Nathan's Test', theme: 'trust your bench' },
  { n: 7, name: 'The Elite Six',    opponent: 'Six Kings',        theme: 'specialists everywhere' },
  { n: 8, name: 'Road to the Cup',  opponent: 'Rival Champions',  theme: 'test of everything' },
  { n: 9, name: 'Gomi Cup Final',   opponent: 'The Undefeated',   theme: 'title match' },
];

// 9 chapters × 4 featured rivals each
export const CHAPTER_RIVALS = {
  1: ['ibrahim', 'skuppa', 'anezka', 'tabeeb'],
  2: ['narcis', 'mizu', 'ihor', 'ani'],
  3: ['pato', 'tamara', 'luna', 'zakhar'],
  4: ['ayaz', 'max', 'merel', 'floor'],
  5: ['rei', 'joep', 'dawood', 'aizaz'],
  6: ['ricardo', 'renars', 'steven', 'robin'],
  7: ['moon', 'linus', 'islom', 'nikita-blond'],
  8: ['bouschra', 'daan', 'mandie', 'pavel'],
  9: ['nikita-brown', 'joran', 'gabsche', 'rashid'],
};

export const CAMPAIGN_MATCH_COUNT = 10;

export const CAMPAIGN_MATCH_PLAN = [
  { n: 1,  leaders: [0],         title: 'Opening Challenge', type: 'solo' },
  { n: 2,  leaders: [1],         title: 'Second Challenger', type: 'solo' },
  { n: 3,  leaders: [2],         title: 'Third Challenger',  type: 'solo' },
  { n: 4,  leaders: [3],         title: 'Fourth Challenger', type: 'solo' },
  { n: 5,  leaders: [1],         title: 'Rival Rematch',     type: 'solo' },
  { n: 6,  leaders: [0],         title: 'Captain Rematch',   type: 'solo' },
  { n: 7,  leaders: [2],         title: 'Last Solo Trial',   type: 'solo' },
  { n: 8,  leaders: [0, 1],      title: 'Alliance I',        type: 'duo' },
  { n: 9,  leaders: [2, 3],      title: 'Alliance II',       type: 'duo' },
  { n: 10, leaders: [0, 1, 2, 3],title: 'Four-Rival Finale', type: 'finale' },
];

const SUPPORT_ROLES = [
  { position:'S',  name:'Tactician', attack:-0.7, serve: 0,   defense: 0,   setting: 1.4, athletic: 0   },
  { position:'MB', name:'Wall',      attack: 0.4, serve:-0.3, defense: 0.7, setting:-0.8, athletic: 0.5 },
  { position:'OH', name:'Striker',   attack: 0.8, serve: 0.5, defense: 0,   setting:-0.6, athletic: 0.4 },
  { position:'OP', name:'Cannon',    attack: 1.0, serve: 0.5, defense:-0.4, setting:-0.7, athletic: 0.3 },
  { position:'L',  name:'Guardian',  attack:-1.2, serve:-0.3, defense: 1.4, setting: 0.3, athletic: 0.5 },
];

function clampStat(value) { return +Math.max(2.5, Math.min(11, value)).toFixed(2); }

function tuneRival(player, targetOverall, idPrefix) {
  const baseOverall = (player.attack + player.serve + player.defense + player.setting + player.athletic) / 5;
  const delta = targetOverall - baseOverall + 0.2;
  const tuned = { ...player, id: `${idPrefix}-${player.id}`, baseId: player.id, isFeaturedRival: true };
  for (const s of ['attack','serve','defense','setting','athletic']) tuned[s] = clampStat(player[s] + delta);
  return tuned;
}

const SUPPORT_FIRST_NAMES = ['Ace','Bolt','Drift','Echo','Flare','Ghost','Haze','Jolt','Nova','Pulse','Rush','Storm','Volt','Zeph'];
const SUPPORT_LAST_NAMES = ['Ashford','Cross','Edge','Hawk','Iron','Jade','Knox','Lund','Nox','Pike','Rook','Steel','Tide','Voss'];

function supportPlayer(role, index, targetOverall, idPrefix, teamStem) {
  const first = SUPPORT_FIRST_NAMES[index % SUPPORT_FIRST_NAMES.length];
  const last = SUPPORT_LAST_NAMES[(index * 3 + String(teamStem || '').length) % SUPPORT_LAST_NAMES.length];
  return {
    id: `${idPrefix}-support-${index}`,
    baseId: null,
    name: `${first} ${last}`,
    nickname: role.name,
    position: role.position,
    attack: clampStat(targetOverall + role.attack),
    serve: clampStat(targetOverall + role.serve),
    defense: clampStat(targetOverall + role.defense),
    setting: clampStat(targetOverall + role.setting),
    athletic: clampStat(targetOverall + role.athletic),
    isCampaignSupport: true,
  };
}

/** Descriptor + opponent 6-player roster for any chapter/match/difficulty. */
export function campaignMatchInfo(chapter, matchNumber, difficulty = 'easy') {
  const chapterData = CHAPTERS[chapter - 1];
  const plan = CAMPAIGN_MATCH_PLAN[matchNumber - 1];
  if (!chapterData || !plan) return null;
  const rivalIds = CHAPTER_RIVALS[chapter] || [];
  const chapterPlayers = rivalIds.map(id => getBasePlayer(id)).filter(Boolean);
  const featuredPlayers = plan.leaders.map(i => chapterPlayers[i]).filter(Boolean);
  const diffBoost = { easy: 0, medium: 0.8, hard: 1.6 }[difficulty] || 0;
  const targetOverall = +(4 + (chapter - 1) * 0.35 + (matchNumber - 1) * 0.15 + diffBoost).toFixed(2);
  const idPrefix = `rival-c${chapter}-m${matchNumber}-${difficulty}`;
  const teamStem = plan.type === 'solo'
    ? (featuredPlayers[0]?.nickname || featuredPlayers[0]?.name || chapterData.opponent)
    : plan.type === 'duo' ? 'Alliance' : 'Finale';
  const opponentName = plan.type === 'solo'
    ? `${featuredPlayers[0]?.name || 'Rival'}'s ${featuredPlayers[0]?.nickname || 'Rival'} Squad`
    : plan.type === 'duo'
      ? `${featuredPlayers.map(p => p.name).join(' & ')} Alliance`
      : `${chapterData.name} Four`;
  const opponentTeam = featuredPlayers.map(p => tuneRival(p, targetOverall, idPrefix));
  let s = 0;
  while (opponentTeam.length < 6) {
    const role = SUPPORT_ROLES[s % SUPPORT_ROLES.length];
    opponentTeam.push(supportPlayer(role, s, targetOverall, idPrefix, teamStem));
    s++;
  }
  return {
    chapter, matchNumber, difficulty, chapterData, plan,
    chapterPlayers, featuredPlayers, opponentName,
    opponentTeam: opponentTeam.slice(0, 6),
    targetOverall,
  };
}

// ──────────── PACKS ────────────
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
const PITY_THRESHOLD = 10;

// ──────────── DEFAULT STATE ────────────
function freshState() {
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
    version: CURRENT_CAMPAIGN_VERSION,
    createdAt: Date.now(),
    ownedCards,
    roster: { starters: starterIds, bench: [] },
    club: localStorage.getItem('gomiSelectedClub') || null,
    oc: null,
    storyFlags: {},
    unlocks: { ocSignatureMove: false },
    inventory: {
      coins: 100,
      packs: { starter: 1, common: 0, rare: 0, epic: 0, champion: 0 },
      materials: { atk: 3, def: 3, srv: 3, set: 3, ath: 3 },
    },
    progression: {
      easyCleared: [], mediumCleared: [], hardCleared: [],
      matches: { easy: {}, medium: {}, hard: {} },
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
    // migrate for older saves
    if (typeof state.tutorialComplete !== 'boolean') state.tutorialComplete = false;
    state.progression = state.progression || {};
    state.progression.matches = state.progression.matches || { easy: {}, medium: {}, hard: {} };
    for (const diff of ['easy','medium','hard']) {
      state.progression[`${diff}Cleared`] = state.progression[`${diff}Cleared`] || [];
      state.progression.matches[diff] = state.progression.matches[diff] || {};
      for (const chapter of state.progression[`${diff}Cleared`]) {
        if (!(state.progression.matches[diff][chapter] || []).length) {
          state.progression.matches[diff][chapter] = Array.from({ length: CAMPAIGN_MATCH_COUNT }, (_, i) => i + 1);
        }
      }
    }
    state.inventory = state.inventory || {};
    state.inventory.packs = state.inventory.packs || {};
    for (const k of Object.keys(PACK_ODDS)) state.inventory.packs[k] = state.inventory.packs[k] || 0;
    state.inventory.materials = state.inventory.materials || { atk:0,def:0,srv:0,set:0,ath:0 };
    state.pity = state.pity || { packsSinceEpic: 0 };
    state.history = state.history || [];
    state.log = state.log || [];
    state.club = state.club || localStorage.getItem('gomiSelectedClub') || null;
    state.oc = state.oc || null;
    state.storyFlags = state.storyFlags || {};
    state.unlocks = state.unlocks || { ocSignatureMove: false };
    if (typeof state.unlocks.ocSignatureMove !== 'boolean') state.unlocks.ocSignatureMove = false;
    state.version = CURRENT_CAMPAIGN_VERSION;
    return state;
  } catch (e) { return null; }
}
export function saveCampaign(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  // Offline-first cloud backup. Fire-and-forget so campaign still works without Firebase/login.
  try {
    const uid = auth?.currentUser?.uid;
    if (uid) set(ref(db, `campaignProgress/${uid}`), state).catch(() => {});
  } catch (e) {}
}

export async function loadCloudCampaign() {
  const uid = auth?.currentUser?.uid;
  if (!uid) return null;
  const snap = await get(ref(db, `campaignProgress/${uid}`));
  const cloud = snap.val();
  if (!cloud) return null;
  localStorage.setItem(SAVE_KEY, JSON.stringify(cloud));
  return loadCampaign();
}

export async function syncLocalCampaignToCloud(state) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !state) return false;
  await set(ref(db, `campaignProgress/${uid}`), state);
  return true;
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
export function getBasePlayer(pid, state = null) {
  if (pid === 'oc' || pid === 'player-oc') {
    const oc = state?.oc;
    return oc ? ocToBasePlayer(oc) : { id:'oc', name:'Your Player', nickname:'Rookie', position:'OH', role:'Custom Player', attack:5, serve:5, defense:5, setting:5, athletic:5, isOC:true };
  }
  return DEFAULT_PLAYERS.find(p => p.id === pid);
}

export function ocToBasePlayer(oc) {
  return {
    id: 'oc',
    name: oc?.name || 'Your Player',
    nickname: oc?.nickname || 'Rookie',
    position: oc?.position || 'OH',
    role: 'Custom Player',
    attack: +(oc?.stats?.attack ?? 5),
    serve: +(oc?.stats?.serve ?? 5),
    defense: +(oc?.stats?.defense ?? 5),
    setting: +(oc?.stats?.setting ?? 5),
    athletic: +(oc?.stats?.athletic ?? 5),
    isOC: true,
    avatar: oc?.avatar || null,
    signatureName: oc?.signatureName || null,
  };
}

export function cardStats(card) {
  const base = card.pid === 'oc' ? ocToBasePlayer(card.oc || {}) : getBasePlayer(card.pid);
  if (!base) return { attack:5, serve:5, defense:5, setting:5, athletic:5 };
  const mult = RARITY_MULT[card.rarity] || 1;
  const levelBonus = (card.level - 1) * 0.05;
  const starBonus = (card.stars - 1) * 0.15;
  const out = {};
  for (const key of ['attack','serve','defense','setting','athletic']) {
    const trained = card.statBoosts?.[key] || 0;
    out[key] = Math.min(11, +(base[key] * mult + levelBonus + starBonus + trained).toFixed(2));
  }
  return out;
}
export function cardOverall(card) {
  const s = cardStats(card);
  return +((s.attack + s.serve + s.defense + s.setting + s.athletic) / 5).toFixed(2);
}
export function teamPower(state) {
  const cards = state.roster.starters.map(id => state.ownedCards[id]).filter(Boolean);
  if (!cards.length) return 0;
  const total = cards.reduce((sum, c) => sum + cardOverall(c) * 10, 0);
  const bench = state.roster.bench.map(id => state.ownedCards[id]).filter(Boolean);
  const benchBonus = bench.reduce((s, c) => s + cardOverall(c) * 2, 0);
  return Math.round(total + benchBonus);
}

// ──────────── MATCH LADDER PROGRESS ────────────
export function clearedCampaignMatches(state, chapter, difficulty = 'easy') {
  const matches = state.progression?.matches?.[difficulty]?.[chapter] || [];
  return [...new Set(matches.filter(n => Number.isInteger(n) && n >= 1 && n <= CAMPAIGN_MATCH_COUNT))].sort((a,b) => a - b);
}
export function isCampaignMatchCleared(state, chapter, matchNumber, difficulty = 'easy') {
  return clearedCampaignMatches(state, chapter, difficulty).includes(matchNumber);
}
export function isChapterCleared(state, chapter, difficulty = 'easy') {
  return clearedCampaignMatches(state, chapter, difficulty).length >= CAMPAIGN_MATCH_COUNT;
}
export function isChapterUnlocked(state, chapter, difficulty) {
  const allChaptersCleared = (diff) => CHAPTERS.every(ch => isChapterCleared(state, ch.n, diff));
  if (difficulty === 'easy')   return chapter === 1 || isChapterCleared(state, chapter - 1, 'easy');
  if (difficulty === 'medium') return allChaptersCleared('easy')   && (chapter === 1 || isChapterCleared(state, chapter - 1, 'medium'));
  if (difficulty === 'hard')   return allChaptersCleared('medium') && (chapter === 1 || isChapterCleared(state, chapter - 1, 'hard'));
  return false;
}
export function isCampaignMatchUnlocked(state, chapter, matchNumber, difficulty = 'easy') {
  if (!isChapterUnlocked(state, chapter, difficulty)) return false;
  if (matchNumber === 1) return true;
  return isCampaignMatchCleared(state, chapter, matchNumber - 1, difficulty);
}
export function campaignProgressCount(state, difficulty = null) {
  const diffs = difficulty ? [difficulty] : ['easy','medium','hard'];
  return diffs.reduce((tot, d) => tot + CHAPTERS.reduce((s, ch) => s + clearedCampaignMatches(state, ch.n, d).length, 0), 0);
}

/** Apply the result of a one-set, first-to-5 campaign court match. */
export function completeCampaignMatch(state, chapter, matchNumber, difficulty, won, score = {}) {
  const info = campaignMatchInfo(chapter, matchNumber, difficulty);
  if (!info) throw new Error('Campaign match not found');
  if (won && !isCampaignMatchUnlocked(state, chapter, matchNumber, difficulty)) throw new Error('Campaign match is locked');
  const firstClear = won && !isCampaignMatchCleared(state, chapter, matchNumber, difficulty);
  const diffMult = { easy: 1, medium: 2, hard: 3 }[difficulty] || 1;
  const rewards = { coins: 0, xp: 0, packs: {}, materials: {}, cardDrop: null, unlocks: [] };
  if (won && firstClear) {
    const matches = state.progression.matches[difficulty];
    matches[chapter] = matches[chapter] || [];
    matches[chapter].push(matchNumber);
    matches[chapter] = [...new Set(matches[chapter])].sort((a,b) => a - b);
    rewards.coins = (12 + chapter * 4 + matchNumber * 2) * diffMult;
    rewards.xp    = (8  + chapter * 2 + matchNumber)     * diffMult;
    if (matchNumber === 5) {
      const pack = difficulty === 'easy' ? 'common' : difficulty === 'medium' ? 'rare' : 'epic';
      rewards.packs[pack] = 1;
    }
    if (matchNumber === 10) {
      let pack = 'rare';
      if (difficulty === 'easy')   pack = chapter <= 3 ? 'common' : chapter === 9 ? 'epic' : 'rare';
      if (difficulty === 'medium') pack = chapter === 9 ? 'champion' : 'epic';
      if (difficulty === 'hard')   pack = 'champion';
      rewards.packs[pack] = (rewards.packs[pack] || 0) + 1;
      rewards.coins += 25 * diffMult;
    }
    if ([3, 7, 10].includes(matchNumber)) {
      const mats = ['atk','def','srv','set','ath'];
      const first  = mats[(chapter + matchNumber) % mats.length];
      const second = mats[(chapter * 2 + matchNumber) % mats.length];
      rewards.materials[first]  = (rewards.materials[first]  || 0) + diffMult;
      rewards.materials[second] = (rewards.materials[second] || 0) + diffMult;
    }
    // Difficulty-based rival card drop chance.
    const drop = rollDifficultyCardDrop(info, difficulty);
    if (drop) {
      const id = addCampaignCard(state, drop.pid, drop.rarity, { source: 'match-drop', chapter, matchNumber, difficulty });
      rewards.cardDrop = { ...drop, id };
    }
    // OC milestone evolution/signature hooks.
    if (state.oc && chapter === 7 && matchNumber === 10 && !state.unlocks.ocSignatureMove) {
      state.unlocks.ocSignatureMove = true;
      state.oc.signatureName = state.oc.signatureName || `${state.oc.nickname || 'Rookie'} Moment`;
      rewards.unlocks.push('OC_SIGNATURE_MOVE');
    }
    if (isChapterCleared(state, chapter, difficulty)) {
      const oldKey = `${difficulty}Cleared`;
      if (!state.progression[oldKey].includes(chapter)) state.progression[oldKey].push(chapter);
      state.progression[oldKey].sort((a,b) => a - b);
    }
  } else if (won) {
    rewards.coins = 8 * diffMult;
    rewards.xp    = 5 * diffMult;
  } else {
    rewards.coins = 5 * diffMult;
  }
  state.inventory.coins += rewards.coins;
  for (const [pack, c] of Object.entries(rewards.packs))     state.inventory.packs[pack]     = (state.inventory.packs[pack] || 0)     + c;
  for (const [mat,  c] of Object.entries(rewards.materials)) state.inventory.materials[mat]  = (state.inventory.materials[mat] || 0)  + c;
  if (rewards.xp) state.roster.starters.map(id => state.ownedCards[id]).filter(Boolean).forEach(card => addXP(card, rewards.xp));
  const homeScore = Number.isFinite(+score.home) ? +score.home : '?';
  const awayScore = Number.isFinite(+score.away) ? +score.away : '?';
  const line = `${won ? '✅' : '❌'} Chapter ${chapter} · Match ${matchNumber} ${won ? 'won' : 'lost'} ${homeScore}-${awayScore} vs ${info.opponentName}`;
  state.log = [...(state.log || []), line].slice(-30);
  state.history.push({ chapter, match: matchNumber, difficulty, won, score: { home: homeScore, away: awayScore }, opponent: info.opponentName, ts: Date.now() });
  saveCampaign(state);
  return { won, firstClear, rewards, info };
}

export function addCampaignCard(state, pid, rarity = 'common', extra = {}) {
  const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newCard = { pid, rarity, stars: 1, level: 1, xp: 0, statBoosts: {}, obtainedAt: Date.now(), ...extra };
  if (pid === 'oc' && state.oc) newCard.oc = { ...state.oc };
  state.ownedCards[id] = newCard;
  return id;
}

function rollDifficultyCardDrop(info, difficulty) {
  const cfg = DIFFICULTY_CARD_DROPS[difficulty];
  if (!cfg || Math.random() >= cfg.chance) return null;
  const featured = info?.featuredPlayers || [];
  if (!featured.length) return null;
  const player = featured[Math.floor(Math.random() * featured.length)];
  const rarity = cfg.rarities[Math.floor(Math.random() * cfg.rarities.length)];
  return { pid: player.id, playerName: player.name, rarity, chance: cfg.chance };
}

// ──────────── LEVELING ────────────
function xpForNext(level) { return 50 + level * 25; }
export function addXP(card, amount) {
  card.xp = (card.xp || 0) + amount;
  while (card.xp >= xpForNext(card.level) && card.level < 20) {
    card.xp -= xpForNext(card.level);
    card.level++;
  }
}

// ──────────── PACK OPENING ────────────
export function openPack(state, packType) {
  const owned = state.inventory.packs[packType] || 0;
  if (owned <= 0) throw new Error('No pack of that type owned');
  state.inventory.packs[packType]--;

  const odds = { ...PACK_ODDS[packType] };
  let rarity = rollWeighted(odds);
  if (state.pity.packsSinceEpic >= PITY_THRESHOLD - 1 && !['epic','legendary'].includes(rarity)) {
    rarity = Math.random() < 0.85 ? 'epic' : 'legendary';
  }
  if (['epic','legendary'].includes(rarity)) state.pity.packsSinceEpic = 0;
  else state.pity.packsSinceEpic++;

  const pool = DEFAULT_PLAYERS.filter(p => !p.isCaptain);
  const scored = pool.map(p => ({ p, ovr: (p.attack + p.serve + p.defense + p.setting + p.athletic) / 5 }));
  scored.sort((a,b) => a.ovr - b.ovr);
  let picked;
  if (rarity === 'legendary') {
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

  const existing = Object.entries(state.ownedCards).find(([, c]) => c.pid === picked.id && c.rarity === rarity);
  if (existing) {
    const [, dupCard] = existing;
    const previousOverall = cardOverall(dupCard);
    const gainedStars = dupCard.stars < 5 ? 1 : 0;
    if (gainedStars) dupCard.stars++;
    const newOverall = cardOverall(dupCard);
    const coins = 25 + (RARITIES.indexOf(rarity) * 20);
    state.inventory.coins += coins;
    saveCampaign(state);
    return {
      card: dupCard, pid: picked.id, rarity, isDuplicate: true,
      starsGained: gainedStars, coinsGained: coins, playerName: picked.name,
      previousOverall, newOverall,
      overallGain: +(newOverall - previousOverall).toFixed(2),
    };
  }

  const id = addCampaignCard(state, picked.id, rarity, { source: 'pack' });
  const newCard = state.ownedCards[id];
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
  const previousOverall = cardOverall(card);
  const previousStat = cardStats(card)[statKey];
  if (previousStat >= 11) throw new Error(`${statKey.toUpperCase()} is already at the campaign maximum`);
  state.inventory.materials[materialKey]--;
  card.statBoosts = card.statBoosts || {};
  card.statBoosts[statKey] = +((card.statBoosts[statKey] || 0) + 0.2).toFixed(2);
  const newStat = cardStats(card)[statKey];
  const newOverall = cardOverall(card);
  saveCampaign(state);
  return { statKey, previousStat, newStat, newBoost: card.statBoosts[statKey],
           previousOverall, newOverall, overallGain: +(newOverall - previousOverall).toFixed(2) };
}

// ──────────── ROSTER ────────────
export function moveToStarters(state, cardId) {
  if (state.roster.starters.includes(cardId)) return;
  if (state.roster.starters.length >= 6) throw new Error('Starting Six is full');
  state.roster.bench = state.roster.bench.filter(id => id !== cardId);
  state.roster.starters.push(cardId);
  saveCampaign(state);
}
export function moveToBench(state, cardId) {
  if (state.roster.bench.includes(cardId)) return;
  if (state.roster.bench.length >= 4) throw new Error('Bench full (4 max)');
  state.roster.starters = state.roster.starters.filter(id => id !== cardId);
  state.roster.bench.push(cardId);
  saveCampaign(state);
}
export function removeFromRoster(state, cardId) {
  state.roster.starters = state.roster.starters.filter(id => id !== cardId);
  state.roster.bench    = state.roster.bench.filter(id => id !== cardId);
  saveCampaign(state);
}
export function sellCard(state, cardId) {
  const card = state.ownedCards[cardId];
  if (!card) return 0;
  const value = { common:20, uncommon:50, rare:120, epic:300, legendary:800 }[card.rarity] || 20;
  const total = value * (card.stars || 1);
  state.inventory.coins += total;
  removeFromRoster(state, cardId);
  delete state.ownedCards[cardId];
  saveCampaign(state);
  return total;
}


// ──────────── CARD EVOLUTION ────────────
export function canEvolveCard(state, cardId) {
  const card = state.ownedCards[cardId];
  if (!card || !EVOLUTION_COSTS[card.rarity]) return false;
  return (card.level || 1) >= 10;
}

export function getEligibleEvolutionSacrifices(state, cardId) {
  const card = state.ownedCards[cardId];
  if (!card) return [];
  return Object.entries(state.ownedCards)
    .filter(([id, c]) => id !== cardId && c.rarity === card.rarity && (c.level || 1) >= 10)
    .map(([id, c]) => ({ id, card: c, overall: cardOverall(c) }))
    .sort((a,b) => a.overall - b.overall);
}

export function evolveCard(state, cardId, sacrificeIds = []) {
  const card = state.ownedCards[cardId];
  if (!card) throw new Error('Card not found');
  const evo = EVOLUTION_COSTS[card.rarity];
  if (!evo) throw new Error('This card is already Legendary');
  if ((card.level || 1) < 10) throw new Error('Card must be level 10 to evolve');
  if (state.inventory.coins < evo.coins) throw new Error(`Need ${evo.coins} coins`);
  const valid = [...new Set(sacrificeIds)].filter(id => {
    const c = state.ownedCards[id];
    return id !== cardId && c && c.rarity === card.rarity && (c.level || 1) >= 10;
  });
  if (valid.length < evo.sacrifices) throw new Error(`Choose ${evo.sacrifices} level 10 ${card.rarity} sacrifice cards`);
  state.inventory.coins -= evo.coins;
  for (const id of valid.slice(0, evo.sacrifices)) {
    state.roster.starters = state.roster.starters.filter(x => x !== id);
    state.roster.bench = state.roster.bench.filter(x => x !== id);
    delete state.ownedCards[id];
  }
  const oldRarity = card.rarity;
  card.rarity = evo.to;
  card.level = 1;
  card.stars = 1;
  card.xp = 0;
  card.evolvedFrom = [...(card.evolvedFrom || []), oldRarity];
  state.log = [...(state.log || []), `✨ ${card.pid} evolved ${oldRarity.toUpperCase()} → ${evo.to.toUpperCase()}`].slice(-30);
  saveCampaign(state);
  return { oldRarity, newRarity: evo.to, coins: evo.coins, sacrificed: valid.slice(0, evo.sacrifices) };
}

// ──────────── OC / CUSTOM PLAYER ────────────
export function createOrUpdateOC(state, oc) {
  state.oc = { ...oc, created: true, createdAt: oc.createdAt || Date.now() };
  let entry = Object.entries(state.ownedCards).find(([, c]) => c.pid === 'oc');
  if (!entry) {
    const id = addCampaignCard(state, 'oc', 'common', { oc: { ...state.oc }, source: 'oc-created' });
    // Put OC on bench if there is room; campaign-only, not draft/sim pool.
    if ((state.roster.bench || []).length < 4) state.roster.bench.push(id);
  } else {
    entry[1].oc = { ...state.oc };
  }
  saveCampaign(state);
  return state.oc;
}

export function hasOC(state) {
  return !!state?.oc?.created;
}

// ──────────── SHOP ────────────
export const SHOP_ITEMS = [
  { id: 'starter', pack: 'starter', cost: 100,  label: '🎁 Starter Pack' },
  { id: 'common',  pack: 'common',  cost: 200,  label: '📦 Common Pack' },
  { id: 'rare',    pack: 'rare',    cost: 600,  label: '💎 Rare Pack' },
  { id: 'epic',    pack: 'epic',    cost: 1500, label: '⭐ Epic Pack' },
  { id: 'champion', pack: 'champion', cost: 3000, label: '🏆 Champion Pack' },
];
export function buyPack(state, itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) throw new Error('Item not found');
  if (state.inventory.coins < item.cost) throw new Error('Not enough coins');
  state.inventory.coins -= item.cost;
  state.inventory.packs[item.pack] = (state.inventory.packs[item.pack] || 0) + 1;
  saveCampaign(state);
}

// ──────────── SECRET CODES (BRIAN ONLY) ────────────
// Type these into the shop's "Enter code" box. Not shown in UI.
export const SECRET_CODES = {
  // Grants every non-captain player at EVERY rarity (common → legendary).
  // Great for previewing artwork and stats without grinding packs.
  'BIGB13GOD':        { action: 'grantAll',      label: '👑 Full collection unlocked — every player at every rarity' },
  // Just the alt-art rarities (epic + legendary) for artwork preview.
  'SHOWALLART':       { action: 'grantAltArt',   label: '🎨 Every player granted at Epic and Legendary for art preview' },
  // Money & materials top-up.
  'GOMIRICH':         { action: 'grantCoins',    label: '💰 +100 000 coins, +50 of every training material, +5 of every pack' },
  // Instantly clear every match on Easy + Medium + Hard (progression only, no rewards).
  'SKIPCAMPAIGN':     { action: 'clearAllMatches', label: '🏁 All 270 matches marked cleared (no rewards granted)' },
  // Wipe all cards except your starters (helps test empty collection flow).
  'CLEARCOLLECTION':  { action: 'clearCollection', label: '🧹 Collection cleared (starters preserved)' },
};

export function applySecretCode(state, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  const entry = SECRET_CODES[code];
  if (!entry) throw new Error('Unknown code');
  switch (entry.action) {
    case 'grantAll':        grantAllCards(state, RARITIES); break;
    case 'grantAltArt':     grantAllCards(state, ['epic', 'legendary']); break;
    case 'grantCoins':      grantResources(state); break;
    case 'clearAllMatches': clearAllMatches(state); break;
    case 'clearCollection': clearCollection(state); break;
  }
  saveCampaign(state);
  return entry;
}

function grantAllCards(state, rarities) {
  const players = DEFAULT_PLAYERS.filter(p => !p.isCaptain);
  let added = 0;
  for (const player of players) {
    for (const rarity of rarities) {
      const existing = Object.values(state.ownedCards).find(c => c.pid === player.id && c.rarity === rarity);
      if (existing) continue;
      const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${added}`;
      state.ownedCards[id] = { pid: player.id, rarity, stars: 1, level: 1, xp: 0, statBoosts: {}, obtainedAt: Date.now() };
      added++;
    }
  }
  state.log = [...(state.log || []), `👑 Secret code granted ${added} new cards.`].slice(-30);
}

function grantResources(state) {
  state.inventory.coins += 100000;
  for (const m of ['atk','def','srv','set','ath']) state.inventory.materials[m] = (state.inventory.materials[m] || 0) + 50;
  for (const p of Object.keys(PACK_ODDS))          state.inventory.packs[p]     = (state.inventory.packs[p]     || 0) + 5;
  state.log = [...(state.log || []), '💰 Secret code topped up coins, packs, and materials.'].slice(-30);
}

function clearAllMatches(state) {
  for (const diff of ['easy','medium','hard']) {
    state.progression.matches[diff] = state.progression.matches[diff] || {};
    for (const ch of CHAPTERS) {
      state.progression.matches[diff][ch.n] = Array.from({ length: CAMPAIGN_MATCH_COUNT }, (_, i) => i + 1);
      if (!state.progression[`${diff}Cleared`].includes(ch.n)) state.progression[`${diff}Cleared`].push(ch.n);
    }
    state.progression[`${diff}Cleared`].sort((a,b) => a - b);
  }
  state.log = [...(state.log || []), '🏁 Secret code cleared all 270 matches.'].slice(-30);
}

function clearCollection(state) {
  const keep = new Set(state.roster.starters);
  state.roster.bench = state.roster.bench.filter(id => keep.has(id));
  for (const id of Object.keys(state.ownedCards)) {
    if (!keep.has(id)) delete state.ownedCards[id];
  }
  state.log = [...(state.log || []), '🧹 Secret code cleared collection (starters kept).'].slice(-30);
}
