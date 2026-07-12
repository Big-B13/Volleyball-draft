import { db, ref, onValue, runTransaction } from "./firebase-init.js";
import { LOGO_URLS, STAT_KEYS, STAT_LABELS } from "./data.js";
import { escapeHtml } from "./util.js";

const params = new URLSearchParams(location.search);
const roomId    = (params.get('room')  || '').toUpperCase();
const codeGiven = (params.get('code')  || '').toUpperCase();
const spectate  = params.get('spectate') === '1';

document.getElementById('loading-room').textContent = roomId || '(no room)';

if (!roomId) {
  showError('No room ID in URL. Go back to the home page and enter one.');
} else {
  subscribe();
}

let state = null;
let myCaptainIdx = null; // null = spectator

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
    } else if (codeGiven) {
      const idx = state.captains.findIndex(c => (c.code || '').toUpperCase() === codeGiven);
      if (idx < 0) { showError('Invalid captain code for this room.'); return; }
      myCaptainIdx = idx;
    } else {
      myCaptainIdx = null;
    }

    render();
  }, (err) => {
    console.error(err);
    setConnected(false);
    showError('Firebase connection failed: ' + err.message);
  });
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

  // If complete, redirect to reveal
  if (state.status === 'complete' || state.currentPick >= state.draftOrder.length) {
    location.href = `./reveal.html?room=${roomId}${myCaptainIdx !== null ? '&code=' + (state.captains[myCaptainIdx].code || '') : ''}${spectate ? '&spectate=1' : ''}`;
    return;
  }

  const onClockIdx = state.draftOrder[state.currentPick];
  const onClock = state.captains[onClockIdx];
  const isMyTurn = myCaptainIdx !== null && onClockIdx === myCaptainIdx;

  const whoAmIHtml = spectate
    ? `<span class="status-pill spectator">👀 Spectator</span>`
    : myCaptainIdx !== null
      ? `<span class="status-pill ${isMyTurn ? 'your-turn' : 'waiting'}">${isMyTurn ? '🟢 Your turn' : '⏳ Waiting'}</span>
         <span style="margin-left:8px; color:#cbd5e1;">You are <strong style="color:${state.captains[myCaptainIdx].color}">${escapeHtml(state.captains[myCaptainIdx].name)}</strong> — ${escapeHtml(state.captains[myCaptainIdx].team)}</span>`
      : '';

  if (isMyTurn) {
    renderMyTurn(onClock, whoAmIHtml);
  } else {
    renderWaiting(onClock, whoAmIHtml);
  }
  renderTeamsPanel();
  renderPickHistory();
}

function teamHeaderHtml(cap) {
  const logo = cap.logo && LOGO_URLS[cap.logo] ? `<img src="${LOGO_URLS[cap.logo]}" alt="">` : '';
  return `${logo}<span style="color:${cap.color}">${escapeHtml(cap.team)}</span>`;
}

function renderWaiting(onClock, whoHtml) {
  document.getElementById('my-turn').classList.add('hidden');
  const w = document.getElementById('waiting');
  w.classList.remove('hidden');
  document.getElementById('who-am-i').innerHTML = whoHtml;
  document.getElementById('wait-team-name').innerHTML = teamHeaderHtml(onClock);
  const round = Math.floor(state.currentPick / 3) + 1;
  document.getElementById('wait-round-info').textContent =
    `Round ${round} of ${state.picksPerTeam} · Captain: ${onClock.name} · Overall pick #${state.currentPick + 1} of ${state.picksPerTeam * 3}`;
}

function renderMyTurn(onClock, whoHtml) {
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
  document.getElementById('available-list').innerHTML = available.map(p => `
    <div class="player-card" data-pid="${p.id}">
      <div class="codename">${escapeHtml(p.nickname || p.name)}</div>
      <div class="overall">OVR <span class="val">${p.overall}</span></div>
      ${STAT_KEYS.map(s => `
        <div class="stat-row"><span>${STAT_LABELS[s]}</span><span>${p[s]}</span></div>
        <div class="stat-bar"><div class="stat-fill" style="width:${p[s] * 10}%"></div></div>
      `).join('')}
    </div>
  `).join('');
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
