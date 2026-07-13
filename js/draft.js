import { db, ref, onValue, runTransaction, set, remove, onDisconnect } from "./firebase-init.js";
import { LOGO_URLS, STAT_KEYS, STAT_LABELS, photoPathFor, getInitials } from "./data.js";
import { escapeHtml } from "./util.js";
import { guardPage, renderAuthBadge, watchAuth } from "./auth.js";

// Spectator mode? Then login is NOT required (public watching)
const __params = new URLSearchParams(location.search);
const __isSpectate = __params.get('spectate') === '1';

let __authProfile = null;
if (__isSpectate) {
  // Just watch for login state to render badge if user is logged in
  watchAuth((session) => {
    if (session && session.profile) {
      __authProfile = session.profile;
      const container = document.querySelector('.container');
      if (container && !document.getElementById('auth-badge-el')) {
        const b = document.createElement('div');
        b.id = 'auth-badge-el';
        b.style.cssText = 'text-align:right; margin-bottom:12px;';
        container.insertBefore(b, container.firstChild);
        renderAuthBadge(b, __authProfile);
      }
    }
  });
} else {
  // Non-spectator (captain trying to pick, or commissioner watching): login required
  const { profile } = await guardPage({ requireRole: 'viewer' });
  __authProfile = profile;
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
}

// Async photo existence check with cache
function photoExists(url) {
  return new Promise(r => {
    const img = new Image();
    img.onload = () => r(true);
    img.onerror = () => r(false);
    img.src = url;
  });
}
const photoCache = new Map();
async function getPhotoUrl(id) {
  if (!id) return null;
  if (photoCache.has(id)) return photoCache.get(id);
  const url = photoPathFor(id);
  const exists = await photoExists(url);
  const result = exists ? url : null;
  photoCache.set(id, result);
  return result;
}

const params = new URLSearchParams(location.search);
const roomId    = (params.get('room')  || '').toUpperCase();
const codeGiven = (params.get('code')  || '').toUpperCase();
const spectate  = params.get('spectate') === '1';
const impersonate = params.get('impersonate') || ''; // e.g. 'c1' — commissioner-only

document.getElementById('loading-room').textContent = roomId || '(no room)';

if (!roomId) {
  showError('No room ID in URL. Go back to the home page and enter one.');
} else {
  subscribe();
}

let state = null;
let presence = {}; // { captainIdx: { at: timestamp } }
let myCaptainIdx = null; // null = spectator
let presenceRegistered = false;

function subscribe() {
  const draftRef = ref(db, `drafts/${roomId}`);
  onValue(draftRef, (snap) => {
    const val = snap.val();
    setConnected(true);
    if (!val) { showError(`Room "${roomId}" doesn't exist. Ask the commissioner for the right code.`); return; }
    state = val;

    // Resolve who am I
    if (spectate) {
      myCaptainIdx = null;
    } else if (impersonate && __authProfile && __authProfile.role === 'commissioner') {
      // Commissioner impersonating a captain slot (for testing)
      const idx = state.captains.findIndex(c => c.id === impersonate);
      if (idx < 0) { showError('That captain slot doesn\'t exist in this room.'); return; }
      myCaptainIdx = idx;
    } else if (codeGiven) {
      const idx = state.captains.findIndex(c => (c.code || '').toUpperCase() === codeGiven);
      if (idx < 0) { showError('Invalid captain code for this room.'); return; }
      myCaptainIdx = idx;
    } else if (!__isSpectate && __authProfile && __authProfile.role === 'captain' && __authProfile.captainId) {
      // Auto-link: match user's linked captainId to a captain in this room
      const idx = state.captains.findIndex(c => c.id === __authProfile.captainId);
      if (idx >= 0) myCaptainIdx = idx;
      else myCaptainIdx = null; // captain not in this room, fall back to spectator
    } else {
      myCaptainIdx = null;
    }

    // Register my presence as this captain (once per session)
    if (myCaptainIdx !== null && !presenceRegistered) {
      registerPresence(myCaptainIdx);
      presenceRegistered = true;
    }

    render();
  }, (err) => {
    console.error(err);
    setConnected(false);
    showError('Firebase connection failed: ' + err.message);
  });

  // Subscribe to presence separately
  const presenceRef = ref(db, `presence/${roomId}`);
  onValue(presenceRef, (snap) => {
    presence = snap.val() || {};
    if (state) render();
  });
}

async function registerPresence(captainIdx) {
  const myPresenceRef = ref(db, `presence/${roomId}/${captainIdx}`);
  await set(myPresenceRef, { at: Date.now(), captainIdx });
  // Auto-cleanup when tab closes / connection drops
  onDisconnect(myPresenceRef).remove();
}

function setConnected(ok) {
  const el = document.getElementById('conn');
  el.textContent = ok ? '● live' : '● offline';
  el.classList.toggle('online', ok);
  el.classList.toggle('offline', !ok);
}

function showError(msg) {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('waiting').classList.add('hidden');
  document.getElementById('my-turn').classList.add('hidden');
  const e = document.getElementById('error');
  e.classList.remove('hidden');
  document.getElementById('error-msg').innerHTML = escapeHtml(msg);
}

function render() {
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
  const lobbyEl = document.getElementById('lobby');
  if (lobbyEl) lobbyEl.classList.add('hidden');

  // If complete, redirect to reveal
  if (state.status === 'complete' || state.currentPick >= state.draftOrder.length) {
    location.href = `./reveal.html?room=${roomId}${myCaptainIdx !== null ? '&code=' + (state.captains[myCaptainIdx].code || '') : ''}${spectate ? '&spectate=1' : ''}`;
    return;
  }

  // Check if all captains are present — if not (and no picks made yet), show lobby
  const totalCaptains = state.captains.length;
  const presentCount = Object.keys(presence).length;
  const noPicksYet = !(state.picks && state.picks.length);
  const shouldShowLobby = noPicksYet && presentCount < totalCaptains && !spectate;

  if (shouldShowLobby) {
    renderLobby();
    return;
  }

  const onClockIdx = state.draftOrder[state.currentPick];
  const onClock = state.captains[onClockIdx];
  const isMyTurn = myCaptainIdx !== null && onClockIdx === myCaptainIdx;
  const onClockPresent = presence[onClockIdx];

  const whoAmIHtml = spectate
    ? `<span class="status-pill spectator">👀 Spectator</span>`
    : myCaptainIdx !== null
      ? `<span class="status-pill ${isMyTurn ? 'your-turn' : 'waiting'}">${isMyTurn ? '🟢 Your turn' : '⏳ Waiting'}</span>
         <span style="margin-left:8px; color:#cbd5e1;">You are <strong style="color:${state.captains[myCaptainIdx].color}">${escapeHtml(state.captains[myCaptainIdx].name)}</strong> — ${escapeHtml(state.captains[myCaptainIdx].team)}</span>`
      : '';

  if (isMyTurn) {
    renderMyTurn(onClock, whoAmIHtml);
  } else {
    renderWaiting(onClock, whoAmIHtml, onClockPresent);
  }
  renderTeamsPanel();
  renderPickHistory();
}

function renderLobby() {
  // Hide draft views
  document.getElementById('waiting').classList.add('hidden');
  document.getElementById('my-turn').classList.add('hidden');
  const teamsPanel = document.getElementById('teams-panel');
  if (teamsPanel) teamsPanel.innerHTML = '';
  const historyCard = document.getElementById('pick-history-card');
  if (historyCard) historyCard.classList.add('hidden');

  // Create or reuse the lobby container
  let lobby = document.getElementById('lobby');
  if (!lobby) {
    lobby = document.createElement('div');
    lobby.id = 'lobby';
    lobby.className = 'card';
    const container = document.querySelector('.container');
    container.insertBefore(lobby, container.firstChild.nextSibling);
  }
  lobby.classList.remove('hidden');

  const totalCaptains = state.captains.length;
  const presentCount = Object.keys(presence).length;
  const meLabel = myCaptainIdx !== null
    ? `You are <strong style="color:${state.captains[myCaptainIdx].color}">${escapeHtml(state.captains[myCaptainIdx].name)}</strong>. You're checked in ✓`
    : `You are a spectator waiting for the draft to begin.`;

  lobby.innerHTML = `
    <div style="text-align:center; padding: 20px 0;">
      <div style="font-size: 0.85rem; color:#94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Draft Lobby</div>
      <h2 style="color:#fbbf24; margin-bottom: 8px;">Waiting for captains to join</h2>
      <p style="color:#cbd5e1; margin-bottom: 8px;">${presentCount} / ${totalCaptains} captains are here.</p>
      <p style="color:#94a3b8; font-size: 0.85rem; margin-bottom: 24px;">${meLabel}</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; max-width: 800px; margin: 0 auto;">
        ${state.captains.map((c, i) => {
          const here = presence[i];
          const meMark = myCaptainIdx === i ? ' (you)' : '';
          return `
            <div style="padding: 20px 14px; border-radius: 12px; text-align:center;
                        background: ${here ? `linear-gradient(135deg, ${c.color}33, rgba(15,23,42,0.7))` : 'rgba(15,23,42,0.7)'};
                        border: 2px solid ${here ? c.color : '#475569'};
                        ${here ? `box-shadow: 0 0 20px ${c.color}66;` : 'opacity: 0.55;'}">
              <div style="font-size: 2rem; margin-bottom: 6px;">${here ? '✅' : '⏳'}</div>
              <div style="font-weight: 900; color: ${c.color}; font-size: 1.1rem;">${escapeHtml(c.team)}</div>
              <div style="color: #cbd5e1; font-size: 0.85rem; margin-top: 4px;">${escapeHtml(c.name)}${meMark}</div>
              <div style="margin-top: 8px; font-size: 0.75rem; color: ${here ? '#22c55e' : '#94a3b8'}; letter-spacing: 1px; text-transform: uppercase;">
                ${here ? 'Ready' : 'Waiting…'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <p style="color: #64748b; font-size: 0.8rem; margin-top: 24px;">
        The draft will start as soon as all captains have joined.
      </p>
    </div>
  `;
}

function teamHeaderHtml(cap) {
  const logo = cap.logo && LOGO_URLS[cap.logo] ? `<img src="${LOGO_URLS[cap.logo]}" alt="">` : '';
  return `${logo}<span style="color:${cap.color}">${escapeHtml(cap.team)}</span>`;
}

function renderWaiting(onClock, whoHtml, onClockPresent) {
  document.getElementById('my-turn').classList.add('hidden');
  const w = document.getElementById('waiting');
  w.classList.remove('hidden');
  document.getElementById('who-am-i').innerHTML = whoHtml;
  document.getElementById('wait-team-name').innerHTML = teamHeaderHtml(onClock);
  const round = Math.floor(state.currentPick / 3) + 1;
  const absentMsg = !onClockPresent
    ? `<div style="margin-top: 12px; padding: 10px 14px; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; border-radius: 8px; color: #fecaca; font-size: 0.9rem;">
         ⚠️ <strong>${escapeHtml(onClock.name)}</strong> hasn't joined yet — the draft is paused waiting for them.
       </div>`
    : '';
  document.getElementById('wait-round-info').innerHTML =
    `Round ${round} of ${state.picksPerTeam} · Captain: ${escapeHtml(onClock.name)} · Overall pick #${state.currentPick + 1} of ${state.picksPerTeam * 3}${absentMsg}`;
}

async function renderMyTurn(onClock, whoHtml) {
  document.getElementById('waiting').classList.add('hidden');
  const m = document.getElementById('my-turn');
  m.classList.remove('hidden');
  document.getElementById('who-am-i-2').innerHTML = whoHtml;
  document.getElementById('my-team-name').innerHTML = teamHeaderHtml(onClock);
  const round = Math.floor(state.currentPick / 3) + 1;
  document.getElementById('my-round-info').textContent =
    `Round ${round} of ${state.picksPerTeam} · Overall pick #${state.currentPick + 1} of ${state.picksPerTeam * 3}`;

  const pickedIds = new Set((state.picks || []).map(p => p.playerId));
  const displayOrder = state.displayOrder || state.players.map(p => p.id);
  const available = displayOrder
    .map(id => state.players.find(p => p.id === id))
    .filter(p => p && !pickedIds.has(p.id));

  document.getElementById('available-count').textContent = available.length;

  // Load all photos in parallel
  const photos = await Promise.all(available.map(p => getPhotoUrl(p.id)));

  document.getElementById('available-list').innerHTML = available.map((p, i) => {
    const photoUrl = photos[i];
    const silhouetteImg = photoUrl
      ? `<div style="width:120px; height:120px; margin:0 auto 10px; display:flex; align-items:flex-end; justify-content:center; overflow:hidden; position:relative;">
           <img src="${photoUrl}" style="max-width:100%; max-height:100%; object-fit:contain; object-position:bottom; filter:brightness(0) contrast(1) drop-shadow(0 0 8px rgba(251,191,36,0.4));" crossorigin="anonymous">
           <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:44px; font-weight:900; color:rgba(255,255,255,0.85); text-shadow:0 0 8px rgba(0,0,0,0.6);">?</div>
         </div>`
      : `<div style="width:120px; height:120px; margin:0 auto 10px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); border-radius:8px;">
           <div style="font-size:56px; font-weight:900; color:#fbbf24;">?</div>
         </div>`;
    return `
      <div class="player-card" data-pid="${p.id}">
        ${silhouetteImg}
        <div class="codename">${escapeHtml(p.nickname || p.name)}</div>
        <div class="overall">OVR <span class="val">${p.overall}</span></div>
        ${STAT_KEYS.map(s => `
          <div class="stat-row"><span>${STAT_LABELS[s]}</span><span>${p[s]}</span></div>
          <div class="stat-bar"><div class="stat-fill" style="width:${p[s] * 10}%"></div></div>
        `).join('')}
      </div>
    `;
  }).join('');
  document.querySelectorAll('.player-card[data-pid]').forEach(el => {
    el.addEventListener('click', () => draftPlayer(el.dataset.pid));
  });
}

async function draftPlayer(playerId) {
  if (myCaptainIdx === null) return;
  if (!confirm('Lock in this pick? You can\'t undo it.')) return;

  const draftRef = ref(db, `drafts/${roomId}`);
  const expectedPickIdx = state.currentPick;

  try {
    await runTransaction(draftRef, (current) => {
      if (!current) return current;
      // Guard: same pick still on the clock, still my turn, player not yet taken
      if (current.currentPick !== expectedPickIdx) return; // abort
      const onClockIdx = current.draftOrder[current.currentPick];
      if (onClockIdx !== myCaptainIdx) return; // abort
      const already = (current.picks || []).some(p => p.playerId === playerId);
      if (already) return; // abort

      current.picks = current.picks || [];
      current.picks.push({
        captainIdx: myCaptainIdx,
        playerId,
        pickIndex: current.currentPick,
        timestamp: Date.now()
      });
      current.currentPick = (current.currentPick || 0) + 1;
      if (current.currentPick >= current.draftOrder.length) {
        current.status = 'complete';
      }
      return current;
    });
  } catch (e) {
    console.error(e);
    alert('Failed to lock in pick: ' + e.message);
  }
}

function renderTeamsPanel() {
  const panel = document.getElementById('teams-panel');
  panel.innerHTML = state.captains.map((cap, i) => {
    const picks = (state.picks || []).filter(p => p.captainIdx === i);
    const logo = cap.logo && LOGO_URLS[cap.logo] ? `<img src="${LOGO_URLS[cap.logo]}" alt="">` : '';
    const meClass = myCaptainIdx === i ? ' you' : '';
    return `
      <div class="team-box${meClass}" style="border-top-color:${cap.color}">
        <h4 style="color:${cap.color}">${logo}<span>${escapeHtml(cap.team)}</span></h4>
        <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:8px;">
          Captain: ${escapeHtml(cap.name)} · ${picks.length} / ${state.picksPerTeam} picks
        </div>
        ${picks.map(pk => {
          const p = state.players.find(pp => pp.id === pk.playerId);
          return p ? `<div class="team-pick">${escapeHtml(p.nickname || p.name)}</div>` : '';
        }).join('') || '<div style="color:#475569; font-size:0.85rem;">No picks yet</div>'}
      </div>
    `;
  }).join('');
}

function renderPickHistory() {
  const picks = state.picks || [];
  if (!picks.length) {
    document.getElementById('pick-history-card').classList.add('hidden');
    return;
  }
  document.getElementById('pick-history-card').classList.remove('hidden');
  const rows = picks.slice().reverse().map(pk => {
    const p = state.players.find(pp => pp.id === pk.playerId);
    const cap = state.captains[pk.captainIdx];
    const round = Math.floor(pk.pickIndex / 3) + 1;
    return `
      <div style="display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px solid #334155; font-size:0.9rem;">
        <span style="color:#64748b;">R${round} · #${pk.pickIndex + 1}</span>
        <span><strong style="color:${cap.color}">${escapeHtml(cap.team)}</strong> selected <strong>${escapeHtml(p ? (p.nickname || p.name) : '?')}</strong></span>
      </div>
    `;
  }).join('');
  document.getElementById('pick-history').innerHTML = rows;
}
