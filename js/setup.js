import { db, ref, set, serverTimestamp } from "./firebase-init.js";
import { DEFAULT_CAPTAINS, DEFAULT_PLAYERS, STAT_KEYS, STAT_LABELS, PICKS_PER_TEAM, PLAYER_DATA_VERSION } from "./data.js";
import { makeRoomId, makeCaptainCode, buildDraftOrder, shuffle, overall, saveLocal, loadLocal, escapeHtml } from "./util.js";
import { guardPage, renderAuthBadge } from "./auth.js";
import { listLeagues, getLeague, ensureGomiCupSeeded, currentLeagueId, GOMI_CUP_LEAGUE_ID } from "./leagues.js";
import { getAllPlayers } from "./players.js";

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

// Load the effective player list from Firebase (merges defaults + admin edits).
// This means any nickname/stat/bio edits from the admin panel appear here immediately.
let players = await getAllPlayers();

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
  // Setup-page-only player edits are transient (they only affect the draft
  // room being created right now). Permanent player edits happen in /admin.html.
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
  if (!confirm('Reload the player list from Firebase? This drops any unsaved local edits on this setup form.')) return;
  players = await getAllPlayers();
  await loadLeagueCaptains();
  buildPlayerInputs();
  alert('✅ Player list reloaded from Firebase — showing ' + players.length + ' players.\n\nNote: to permanently edit players (nickname, stats, bio), use the Admin panel → Players section.');
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

  // Run the NBA-style lottery animation to determine captain order
  const captainOrder = await runLotteryAnimation(captains);

  const roomId = makeRoomId();
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
  const predUrl = new URL('./predictions.html', location.href);
  const predLink = `${predUrl.origin}${predUrl.pathname}?room=${lastRoom.roomId}`;
  const linkEl = document.getElementById('out-predictions-link');
  if (linkEl) { linkEl.textContent = predLink; linkEl.href = predLink; }
  box.scrollIntoView({ behavior: 'smooth' });
}

window.copyInvites = () => {
  const url = new URL('./draft.html', location.href);
  const predUrl = new URL('./predictions.html', location.href);
  const lines = [
    `🏐 Volleyball Blind Draft — Room: ${lastRoom.roomId}`,
    ``,
    ...lastRoom.captains.map(c =>
      `${c.name} (${c.team}): ${url.origin}${url.pathname}?room=${lastRoom.roomId}&code=${c.code}`
    ),
    ``,
    `Spectator link: ${url.origin}${url.pathname}?room=${lastRoom.roomId}&spectate=1`,
    ``,
    `🔮 Predictions (share publicly for hype!): ${predUrl.origin}${predUrl.pathname}?room=${lastRoom.roomId}`
  ].join('\n');
  navigator.clipboard.writeText(lines).then(() => alert('Invites + predictions link copied to clipboard!'));
};

window.openDraftAsCommissioner = () => {
  location.href = `./draft.html?room=${lastRoom.roomId}&spectate=1`;
};

// ============ NBA-STYLE LOTTERY ANIMATION ============
// Fullscreen dramatic animation that reveals the draft pick order.
// Returns a Promise that resolves with the final captain-index order (e.g. [2, 0, 1]).
function runLotteryAnimation(captains) {
  return new Promise((resolve) => {
    const finalOrder = shuffle(captains.map((_, i) => i));

    const overlay = document.createElement('div');
    overlay.id = 'lottery-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #000 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 20px; overflow: hidden;
      opacity: 0; transition: opacity 0.3s;
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes lot-fall { 0% { transform: translateY(-40px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      @keyframes lot-glow { 0%,100% { box-shadow: 0 0 30px currentColor; } 50% { box-shadow: 0 0 60px currentColor; } }
      @keyframes lot-shake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-4px, -6px) rotate(-3deg); }
                             50% { transform: translate(3px, -3px) rotate(2deg); } 75% { transform: translate(-2px, 4px) rotate(-1deg); } }
      @keyframes lot-slam { 0% { transform: scale(4); opacity: 0; } 60% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1); } }
      .lot-ball {
        width: 80px; height: 80px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 900; font-size: 1.5rem; color: #fff;
        border: 4px solid rgba(255,255,255,0.4);
        background: linear-gradient(135deg, #64748b, #334155);
        text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        animation: lot-shake 0.4s ease-in-out infinite;
        transition: transform 0.4s;
      }
      .lot-reveal {
        padding: 20px 28px; border-radius: 16px;
        display: flex; align-items: center; gap: 20px;
        background: linear-gradient(135deg, var(--c) 0%, #0f172a 130%);
        border: 3px solid var(--c); box-shadow: 0 0 40px var(--c);
        margin-bottom: 12px;
        animation: lot-fall 0.5s ease-out both;
      }
      .lot-reveal .rank { font-size: 3rem; font-weight: 900; color: var(--c);
                          background: rgba(0,0,0,0.4); padding: 4px 20px; border-radius: 10px;
                          text-shadow: 0 0 20px var(--c); min-width: 90px; text-align: center; }
      .lot-reveal .team-name { font-size: 1.8rem; font-weight: 900; color: #fff; letter-spacing: 1px; }
      .lot-reveal .cap-name { font-size: 0.9rem; color: rgba(255,255,255,0.8); letter-spacing: 2px; text-transform: uppercase; }
      @media (max-width: 720px) {
        .lot-ball { width: 60px; height: 60px; font-size: 1.1rem; }
        .lot-reveal { padding: 12px 16px; gap: 12px; }
        .lot-reveal .rank { font-size: 2rem; min-width: 60px; padding: 3px 12px; }
        .lot-reveal .team-name { font-size: 1.2rem; }
      }
    `;
    overlay.appendChild(styleEl);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    // Phase 1: intro
    overlay.innerHTML += `
      <div id="lot-title" style="font-size: clamp(1.5rem, 5vw, 3rem); font-weight: 900; color: #fbbf24;
                                  text-align: center; margin-bottom: 20px; letter-spacing: 2px;
                                  text-shadow: 0 4px 20px rgba(251,191,36,0.5); animation: lot-slam 0.6s;">
        🎲 DRAFT ORDER LOTTERY
      </div>
      <div id="lot-sub" style="color: #cbd5e1; margin-bottom: 30px; text-align: center;">
        Drawing pick order for ${captains.length} captains…
      </div>
      <div id="lot-balls" style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; justify-content: center;">
        ${captains.map((c, i) => `
          <div class="lot-ball" style="background: linear-gradient(135deg, ${c.color}, #0f172a); border-color: ${c.color}; color: ${c.color};">
            ${escapeHtml(c.team.slice(0, 2).toUpperCase())}
          </div>
        `).join('')}
      </div>
      <div id="lot-reveals" style="width: 100%; max-width: 500px;"></div>
    `;

    // After ~2s, start revealing picks one by one (last pick first, then 2nd-to-last, then #1 pick)
    setTimeout(() => revealNext(finalOrder.length - 1), 2000);

    function revealNext(rankIdx) {
      if (rankIdx < 0) {
        // Done — wait a moment, fade out, resolve
        setTimeout(() => {
          overlay.style.opacity = '0';
          setTimeout(() => { overlay.remove(); resolve(finalOrder); }, 400);
        }, 2000);
        return;
      }
      // rankIdx 0 = picks 1st, rankIdx (n-1) = picks last
      const captainIdx = finalOrder[rankIdx];
      const cap = captains[captainIdx];
      const humanRank = rankIdx + 1;
      const medal = humanRank === 1 ? '🥇 1st pick' : humanRank === 2 ? '🥈 2nd pick' : humanRank === 3 ? '🥉 3rd pick' : `#${humanRank}`;

      // Grey out that ball
      const balls = overlay.querySelectorAll('.lot-ball');
      const targetBall = balls[captainIdx];
      if (targetBall) {
        targetBall.style.animation = 'none';
        targetBall.style.transform = 'scale(1.4)';
        targetBall.style.opacity = '0.3';
      }

      // Add reveal row
      const reveals = overlay.querySelector('#lot-reveals');
      reveals.insertAdjacentHTML('beforeend', `
        <div class="lot-reveal" style="--c: ${cap.color};">
          <div class="rank">${medal}</div>
          <div style="flex: 1;">
            <div class="team-name" style="color: ${cap.color};">${escapeHtml(cap.team)}</div>
            <div class="cap-name">${escapeHtml(cap.name)}</div>
          </div>
        </div>
      `);

      // Reveal next after 1.2s
      setTimeout(() => revealNext(rankIdx - 1), 1200);
    }
  });
}

// Init
await buildLeaguePicker();
await loadLeagueCaptains();
buildPlayerInputs();
