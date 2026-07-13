import { db, ref, set, serverTimestamp } from "./firebase-init.js";
import { DEFAULT_CAPTAINS, DEFAULT_PLAYERS, STAT_KEYS, STAT_LABELS, PICKS_PER_TEAM } from "./data.js";
import { makeRoomId, makeCaptainCode, buildDraftOrder, shuffle, overall, saveLocal, loadLocal, escapeHtml } from "./util.js";
import { guardPage, renderAuthBadge } from "./auth.js";
import { listLeagues, getLeague, ensureGomiCupSeeded, currentLeagueId, GOMI_CUP_LEAGUE_ID } from "./leagues.js";

// Only commissioners can create draft rooms
const { profile: __authProfile } = await guardPage({ requireRole: 'commissioner' });
setTimeout(() => {
  const container = document.querySelector('.container');
  if (container && !document.getElementById('auth-badge-el')) {
    const b = document.createElement('div');
    b.id = 'auth-badge-el';
    b.style.cssText = 'text-align:right; margin-bottom:12px;';
    container.insertBefore(b, container.firstChild);
    renderAuthBadge(b, __authProfile);
  }
}, 0);

// Ensure gomi cup exists in DB and load available leagues
await ensureGomiCupSeeded();

let selectedLeagueId = currentLeagueId();
let captains = [];
let players  = loadLocal('vd_players') || JSON.parse(JSON.stringify(DEFAULT_PLAYERS));

async function loadLeagueCaptains() {
  const league = await getLeague(selectedLeagueId);
  if (league && league.captains && league.captains.length) {
    captains = JSON.parse(JSON.stringify(league.captains));
  } else {
    captains = JSON.parse(JSON.stringify(DEFAULT_CAPTAINS));
  }
  buildCaptainInputs();
  buildPlayerInputs(); // re-render to show which players are excluded
}

/** Returns the set of player IDs that should be excluded from the draft pool
 *  because they're serving as captains in the selected league. */
function excludedPlayerIds() {
  const excluded = new Set();
  for (const c of captains) {
    if (c.linkedPlayerId) excluded.add(c.linkedPlayerId);
  }
  return excluded;
}

async function buildLeaguePicker() {
  const leagues = await listLeagues();
  const wrap = document.getElementById('league-picker');
  if (!wrap) return;
  wrap.innerHTML = `
    <label>Which league is this draft for?</label>
    <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
      <select id="league-select" style="flex: 1; min-width: 200px;">
        ${leagues.map(l => `<option value="${l.id}" ${l.id === selectedLeagueId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}
      </select>
      <a href="./league-editor.html" style="color:#fbbf24; text-decoration:none; font-size:0.85rem;">➕ Create new league</a>
    </div>
  `;
  document.getElementById('league-select').addEventListener('change', async (e) => {
    selectedLeagueId = e.target.value;
    await loadLeagueCaptains();
  });
}

function persist() {
  saveLocal('vd_players', players);
}

function buildCaptainInputs() {
  const g = document.getElementById('captains-grid');
  g.innerHTML = captains.map((c, i) => `
    <div>
      <label>Captain ${i + 1} name</label>
      <input type="text" value="${escapeHtml(c.name)}" data-i="${i}" data-field="name" readonly style="opacity:0.7; cursor:not-allowed;">
      <label style="margin-top:8px;">Team name</label>
      <input type="text" value="${escapeHtml(c.team)}" data-i="${i}" data-field="team" readonly style="opacity:0.7; cursor:not-allowed;">
      <div style="font-size:0.72rem; color:#94a3b8; margin-top:6px; padding:4px 6px; background:rgba(0,0,0,0.3); border-radius:4px;">
        <span style="display:inline-block; width:12px; height:12px; background:${c.color}; border-radius:3px; vertical-align:middle;"></span>
        ${c.role ? '· '+escapeHtml(c.role) : ''}
        · Edit in <a href="./league-editor.html" style="color:#fbbf24;">League Editor</a>
      </div>
    </div>
  `).join('');
}

function buildPlayerInputs() {
  const g = document.getElementById('players-grid');
  const excluded = excludedPlayerIds();
  g.innerHTML = players.map((p, i) => {
    const isExcluded = excluded.has(p.id);
    const styleAttr = isExcluded
      ? 'style="opacity:0.4; text-decoration:line-through;"'
      : '';
    const badge = isExcluded
      ? `<div style="grid-column:1/-1; color:#fbbf24; font-size:0.72rem; padding:2px 6px;">🎖️ Excluded — captain in ${captains.find(c => c.linkedPlayerId === p.id)?.team || 'this league'}</div>`
      : '';
    return `
    <div class="player-row" ${styleAttr}>
      ${badge}
      <div class="num">${i + 1}</div>
      <input type="text" value="${escapeHtml(p.name)}"     data-i="${i}" data-field="name"     placeholder="Real name">
      <input type="text" value="${escapeHtml(p.nickname || '')}" data-i="${i}" data-field="nickname" placeholder="Nickname">
      ${STAT_KEYS.map(s => `<input type="number" min="1" max="10" step="0.5" value="${p[s]}" data-i="${i}" data-field="${s}">`).join('')}
    </div>
  `;}).join('');
  g.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', () => {
      const i = +el.dataset.i, f = el.dataset.field;
      const v = el.type === 'number' ? (parseFloat(el.value) || 0) : el.value;
      players[i][f] = v;
      persist();
    });
  });
}

window.addPlayerRow = () => {
  const nextNum = String(players.length + 1).padStart(2, '0');
  players.push({ id: 'p' + nextNum + Date.now().toString(36).slice(-3), name: '', nickname: '', attack: 5, serve: 5, defense: 5, setting: 5, athletic: 5 });
  buildPlayerInputs();
  persist();
};
window.removeLastPlayer = () => {
  if (players.length) players.pop();
  buildPlayerInputs();
  persist();
};
window.resetDefaults = async () => {
  if (!confirm('Reset players + stats back to the pre-loaded defaults? (Captains come from the selected league and aren\'t reset here.)')) return;
  players  = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  persist();
  await loadLeagueCaptains();
  buildPlayerInputs();
};

let lastRoom = null;
window.createRoom = async () => {
  // validate
  for (const c of captains) {
    if (!c.name.trim() || !c.team.trim()) { alert('Fill in all 3 captain names and team names.'); return; }
  }
  if (players.length < 15) { alert('Need at least 15 players.'); return; }
  for (const p of players) {
    if (!p.name.trim()) { alert('Every player needs a real name (or delete the empty row).'); return; }
  }

  const roomId = makeRoomId();
  const captainOrder = shuffle([0, 1, 2]);
  const draftOrder = buildDraftOrder(captainOrder, PICKS_PER_TEAM);

  const captainsWithCodes = captains.map(c => ({ ...c, code: makeCaptainCode() }));
  const excluded = excludedPlayerIds();
  const activePlayers = players.filter(p => !excluded.has(p.id));
  if (activePlayers.length < captains.length * PICKS_PER_TEAM) {
    return alert(`After excluding captains from the pool, only ${activePlayers.length} players remain, but ${captains.length * PICKS_PER_TEAM} draft picks are needed. Add more players or reduce captain count.`);
  }
  const playersWithOverall = activePlayers.map(p => ({ ...p, overall: overall(p) }));

  // Shuffle player display order so card position gives away nothing
  const displayOrder = shuffle(playersWithOverall.map(p => p.id));

  const draftData = {
    createdAt: Date.now(),
    picksPerTeam: PICKS_PER_TEAM,
    leagueId: selectedLeagueId,
    captains: captainsWithCodes,
    players: playersWithOverall,
    displayOrder,
    draftOrder,
    currentPick: 0,
    picks: [],  // array of { captainIdx, playerId, timestamp }
    status: 'active' // 'active' | 'complete'
  };

  try {
    await set(ref(db, `drafts/${roomId}`), draftData);
    lastRoom = { roomId, captains: captainsWithCodes };
    showRoomCreated();
  } catch (e) {
    console.error(e);
    alert('Failed to create room in Firebase: ' + e.message + '\n\nDouble-check your firebase-config.js and database rules.');
  }
};

function showRoomCreated() {
  const box = document.getElementById('room-created');
  box.classList.remove('hidden');
  document.getElementById('out-room').textContent = lastRoom.roomId;
  document.getElementById('out-captain-codes').innerHTML = lastRoom.captains.map(c => `
    <div class="code-row">
      <span>${escapeHtml(c.name)} — <strong style="color:${c.color}">${escapeHtml(c.team)}</strong></span>
      <span class="code-value">${c.code}</span>
    </div>
  `).join('');
  box.scrollIntoView({ behavior: 'smooth' });
}

window.copyInvites = () => {
  const url = new URL('./draft.html', location.href);
  const lines = [
    `🏐 Volleyball Blind Draft — Room: ${lastRoom.roomId}`,
    ``,
    ...lastRoom.captains.map(c =>
      `${c.name} (${c.team}): ${url.origin}${url.pathname}?room=${lastRoom.roomId}&code=${c.code}`
    ),
    ``,
    `Spectator link: ${url.origin}${url.pathname}?room=${lastRoom.roomId}&spectate=1`
  ].join('\n');
  navigator.clipboard.writeText(lines).then(() => alert('Invites copied to clipboard!'));
};

window.openDraftAsCommissioner = () => {
  location.href = `./draft.html?room=${lastRoom.roomId}&spectate=1`;
};

// Init
await buildLeaguePicker();
await loadLeagueCaptains();
buildPlayerInputs();
