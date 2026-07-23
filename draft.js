import { db, ref, onValue, runTransaction, set, remove, onDisconnect } from "./firebase-init.js";
import { LOGO_URLS, STAT_KEYS, STAT_LABELS, photoPathFor, getInitials } from "./data.js";
import { escapeHtml } from "./util.js";
import { guardPage, renderAuthBadge, watchAuth } from "./auth.js";
import { playPick, playTick, playYourTurn, playTimesUp, injectMuteButton } from "./sounds.js";

// Inject mute button once
injectMuteButton();

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
  const { profile } = await guardPage({ requireRole: 'viewer', requireApproved: true });
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

// ============ PICK TIMER ============
const PICK_TIMER_SECONDS = 60;   // seconds per pick
const TIMER_WARNING_AT   = 10;   // start urgent ticks at this many seconds
let timerHandle = null;
let timerDeadline = null;
let timerLastPickIndex = -1;   // resets timer whenever a new pick is on the clock
let lastAnnouncedMyTurn = -1;  // to play the "your turn" sound once per turn

function startPickTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerDeadline = Date.now() + PICK_TIMER_SECONDS * 1000;
  timerHandle = setInterval(tickTimer, 250);
  tickTimer(); // initial paint
}

function stopPickTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  timerDeadline = null;
  const el = document.getElementById('pick-timer-el');
  if (el) el.style.display = 'none';
}

let lastTickWholeSecond = -1;
function tickTimer() {
  if (!state || !timerDeadline) return;
  const remainingMs = timerDeadline - Date.now();
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

  // Render the timer widget
  paintTimer(remainingSec);

  // Play tick sounds on whole-second changes
  if (remainingSec !== lastTickWholeSecond) {
    lastTickWholeSecond = remainingSec;
    // Only the person on-clock hears their own ticks (avoids everyone's browser dinging)
    const onClockIdx = state.draftOrder[state.currentPick];
    const iAmOnClock = onClockIdx === myCaptainIdx;
    if (iAmOnClock) {
      if (remainingSec > 0 && remainingSec <= TIMER_WARNING_AT) {
        playTick(true);
      } else if (remainingSec > 0 && remainingSec % 10 === 0 && remainingSec <= 30) {
        playTick(false);
      }
    }
  }

  if (remainingMs <= 0) {
    // Time's up! Only ONE client should auto-pick — use the on-clock captain if present,
    // otherwise the first present captain, otherwise nobody (draft stalls until someone joins).
    const onClockIdx = state.draftOrder[state.currentPick];
    const onClockPresent = presence[onClockIdx];
    const shouldIAutoPick =
      (onClockPresent && myCaptainIdx === onClockIdx) ||
      (!onClockPresent && myCaptainIdx !== null &&
        // If on-clock is absent, only the LOWEST-index present captain triggers auto-pick
        Object.keys(presence).map(Number).sort((a,b)=>a-b)[0] === myCaptainIdx);
    stopPickTimer();
    if (shouldIAutoPick) {
      autoPickBestAvailable();
    }
  }
}

function paintTimer(remainingSec) {
  let el = document.getElementById('pick-timer-el');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pick-timer-el';
    el.style.cssText = `
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 900;
      padding: 6px 20px;
      border-radius: 16px;
      font-family: 'Monaco', monospace;
      font-weight: 900;
      font-size: 1.4rem;
      letter-spacing: 2px;
      backdrop-filter: blur(6px);
      transition: all 0.15s;
    `;
    document.body.appendChild(el);
  }
  el.style.display = 'block';
  const urgent = remainingSec <= TIMER_WARNING_AT;
  const critical = remainingSec <= 3;
  el.textContent = `⏱ ${remainingSec}s`;
  if (critical) {
    el.style.background = 'rgba(239,68,68,0.95)';
    el.style.color = '#fff';
    el.style.boxShadow = '0 0 24px rgba(239,68,68,0.9)';
    el.style.transform = 'translateX(-50%) scale(1.1)';
  } else if (urgent) {
    el.style.background = 'rgba(251,191,36,0.95)';
    el.style.color = '#0f172a';
    el.style.boxShadow = '0 0 16px rgba(251,191,36,0.6)';
    el.style.transform = 'translateX(-50%) scale(1.0)';
  } else {
    el.style.background = 'rgba(30,41,59,0.9)';
    el.style.color = '#e2e8f0';
    el.style.boxShadow = 'none';
    el.style.transform = 'translateX(-50%) scale(1.0)';
  }
}

// ============ DISCONNECT BANNER ============
// Shows a persistent, obvious banner across the top when any captain is
// disconnected during the draft (once the lobby has already been passed).
function updateDisconnectBanner() {
  if (!state || state.status === 'complete') {
    removeDisconnectBanner();
    return;
  }
  // Only meaningful once the draft has started (picks made or lobby passed)
  const totalCaptains = state.captains.length;
  const presentCount = Object.keys(presence).length;
  const noPicksYet = !(state.picks && state.picks.length);
  const stillInLobby = noPicksYet && presentCount < totalCaptains && !spectate;
  if (stillInLobby) { removeDisconnectBanner(); return; }
  const missing = state.captains
    .map((c, i) => presence[i] ? null : c)
    .filter(Boolean);
  if (!missing.length) { removeDisconnectBanner(); return; }

  let banner = document.getElementById('disconnect-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'disconnect-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      z-index: 9800;
      background: linear-gradient(90deg, #7c2d12, #dc2626, #7c2d12);
      color: #fff; padding: 10px 14px;
      text-align: center; font-weight: 700; font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      animation: db-pulse 2s ease-in-out infinite;
    `;
    const style = document.createElement('style');
    style.textContent = '@keyframes db-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }';
    document.head.appendChild(style);
    document.body.appendChild(banner);
    // Push page down so it doesn't overlap content
    document.body.style.paddingTop = '48px';
  }
  const names = missing.map(c => `<strong style="color:${c.color}">${escapeHtml(c.name)}</strong>`).join(', ');
  banner.innerHTML = `⏸️ Draft paused — waiting for ${names} to reconnect…`;
}
function removeDisconnectBanner() {
  const b = document.getElementById('disconnect-banner');
  if (b) {
    b.remove();
    document.body.style.paddingTop = '';
  }
}

// ============ PICK REVEAL ANIMATION ============
function showPickAnimation(pick) {
  const p = state.players.find(pp => pp.id === pick.playerId);
  const cap = state.captains[pick.captainIdx];
  if (!p || !cap) return;
  const photoUrl = photoPathFor(p.id);
  // Create overlay if not exists
  let overlay = document.getElementById('pick-anim-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pick-anim-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9500;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95));
      backdrop-filter: blur(8px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s;
      overflow: hidden;
    `;
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <style>
      @keyframes pa-slam-in {
        0% { transform: scale(3) rotate(-8deg); opacity: 0; filter: blur(30px); }
        50% { transform: scale(1.05) rotate(0deg); opacity: 1; filter: blur(0); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes pa-photo-in {
        0% { transform: translateY(80px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes pa-swipe {
        0% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateX(0) skewX(-15deg); opacity: 1; }
      }
      @keyframes pa-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
      .pa-slam { animation: pa-slam-in 0.6s cubic-bezier(.2,1.2,.4,1) both; }
      .pa-photo { animation: pa-photo-in 0.6s 0.2s cubic-bezier(.2,1,.4,1) both; }
      .pa-swipe { animation: pa-swipe 0.5s cubic-bezier(.2,1,.4,1) both; }
      .pa-pulse { animation: pa-pulse 2s ease-in-out infinite; }
    </style>
    <div style="position: relative; text-align: center; max-width: 90vw;">
      <div class="pa-swipe" style="position:absolute; top:-40px; left:0; right:0; margin:0 auto;
                                    background: ${cap.color}; color:#fff; padding:6px 24px;
                                    font-weight: 900; letter-spacing: 3px; font-size: 0.85rem;
                                    display: inline-block; text-transform: uppercase;">
        ${escapeHtml(cap.team)} selects
      </div>
      <div class="pa-photo" style="width: 260px; height: 260px; margin: 0 auto 16px;
                                    border-radius: 50%; overflow: hidden;
                                    border: 6px solid ${cap.color};
                                    box-shadow: 0 0 60px ${cap.color};
                                    background: rgba(0,0,0,0.5);">
        <img src="${photoUrl}"
             style="width:100%; height:100%; object-fit:cover; object-position: 50% 15%;"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:5rem;font-weight:900;color:${cap.color};&quot;>${getInitials(p.name)}</div>'"
             crossorigin="anonymous">
      </div>
      <div class="pa-slam pa-pulse" style="font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 900;
                                            line-height: 1; color: #fff;
                                            text-shadow: 0 0 30px ${cap.color}, 0 4px 20px rgba(0,0,0,0.9);
                                            letter-spacing: -1px; margin-bottom: 10px;">
        ${escapeHtml((p.nickname || p.name).toUpperCase())}
      </div>
      <div class="pa-photo" style="font-size: 1.3rem; color: rgba(255,255,255,0.9);
                                    letter-spacing: 4px; text-transform: uppercase; font-weight: 700;">
        ${escapeHtml(p.name)}
      </div>
      <div class="pa-photo" style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
        <span style="padding: 4px 12px; background: #fbbf24; color: #422006; border-radius: 12px; font-weight:900; font-size:0.85rem;">OVR ${p.overall}</span>
        ${p.position ? `<span style="padding: 4px 12px; background: rgba(255,255,255,0.15); color:#fff; border-radius: 12px; font-weight:700; font-size:0.85rem;">${escapeHtml(p.position)}</span>` : ''}
      </div>
    </div>
  `;
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  // Play the pick sound (whoosh) if it wasn't already played by the picker
  try { playPick(); } catch (e) {}
  clearTimeout(showPickAnimation._t);
  showPickAnimation._t = setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => { if (overlay.parentElement) overlay.remove(); }, 300);
  }, 5000);
}

async function autoPickBestAvailable() {
  if (!state) return;
  const pickedIds = new Set((state.picks || []).map(p => p.playerId));
  const available = (state.players || []).filter(p => !pickedIds.has(p.id));
  if (!available.length) return;
  // Highest OVR wins; ties broken by first in the display order
  const displayOrder = state.displayOrder || available.map(p => p.id);
  available.sort((a, b) => {
    if (b.overall !== a.overall) return b.overall - a.overall;
    return displayOrder.indexOf(a.id) - displayOrder.indexOf(b.id);
  });
  const auto = available[0];
  await draftPlayer(auto.id, /*autoPick*/ true);
  playTimesUp();
}

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
    } else if (!__isSpectate && __authProfile && __authProfile.role === 'captain') {
      // Auto-link: try multiple strategies to find the captain slot for this user
      const norm = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const myName = norm(__authProfile.displayName || __authProfile.username);
      const myCaptainId = __authProfile.captainId;

      // 1) Match by captainId (works when the league used the same c1/c2/c3 slot ids)
      let idx = myCaptainId ? state.captains.findIndex(c => c.id === myCaptainId) : -1;
      // 2) Match by captain.name (fuzzy) — works for any league that used the same person's name
      if (idx < 0) idx = state.captains.findIndex(c => norm(c.name) === myName);
      // 3) Match by captain.linkedPlayerId matching the normalized user name
      if (idx < 0) idx = state.captains.findIndex(c => norm(c.linkedPlayerId) === myName);
      // 4) Partial-name match (e.g. "big-b" matches "Big-B")
      if (idx < 0) idx = state.captains.findIndex(c => {
        const cName = norm(c.name);
        return cName && (cName.includes(myName) || myName.includes(cName));
      });

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
  updateDisconnectBanner();

  // If complete, redirect to reveal
  if (state.status === 'complete' || state.currentPick >= state.draftOrder.length) {
    stopPickTimer();
    location.href = `./reveal.html?room=${roomId}${myCaptainIdx !== null ? '&code=' + (state.captains[myCaptainIdx].code || '') : ''}${spectate ? '&spectate=1' : ''}`;
    return;
  }

  // Check if all captains are present — if not (and no picks made yet), show lobby
  const totalCaptains = state.captains.length;
  const presentCount = Object.keys(presence).length;
  const noPicksYet = !(state.picks && state.picks.length);
  const shouldShowLobby = noPicksYet && presentCount < totalCaptains && !spectate;

  if (shouldShowLobby) {
    stopPickTimer();
    renderLobby();
    return;
  }

  const onClockIdx = state.draftOrder[state.currentPick];
  const onClock = state.captains[onClockIdx];
  const isMyTurn = myCaptainIdx !== null && onClockIdx === myCaptainIdx;
  const onClockPresent = presence[onClockIdx];

  // Timer management: (re)start whenever a new pick is on the clock
  if (state.currentPick !== timerLastPickIndex) {
    // A new pick just landed — trigger the reveal animation for everyone (except the picker who already knows)
    if (timerLastPickIndex >= 0 && (state.picks || []).length > 0) {
      const lastPick = state.picks[state.picks.length - 1];
      if (lastPick && lastPick.pickIndex === state.currentPick - 1) {
        showPickAnimation(lastPick);
      }
    }
    timerLastPickIndex = state.currentPick;
    // Only start timer if on-clock captain is present (draft-paused screens shouldn't run timer)
    if (onClockPresent) startPickTimer();
    else stopPickTimer();
    // Play "your turn" chime the first time it becomes my turn
    if (isMyTurn && lastAnnouncedMyTurn !== state.currentPick) {
      lastAnnouncedMyTurn = state.currentPick;
      playYourTurn();
    }
  } else if (!onClockPresent && timerHandle) {
    // Captain dropped mid-pick — pause the timer
    stopPickTimer();
  } else if (onClockPresent && !timerHandle && state.status !== 'complete') {
    // Captain came back — resume with fresh timer
    startPickTimer();
  }

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
  let meLabel;
  if (myCaptainIdx !== null) {
    meLabel = `You are <strong style="color:${state.captains[myCaptainIdx].color}">${escapeHtml(state.captains[myCaptainIdx].name)}</strong>. You're checked in ✓`;
  } else if (__authProfile && __authProfile.role === 'captain') {
    // A captain-role user who didn't auto-link — probably not in this league's captain list
    meLabel = `⚠️ You're logged in as <strong>${escapeHtml(__authProfile.displayName || __authProfile.username)}</strong>, but you're not a captain in this specific league. Watching as spectator.`;
  } else if (spectate) {
    meLabel = `You are watching as spectator.`;
  } else {
    meLabel = `You are a spectator waiting for the draft to begin.`;
  }

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
  const numCaptains = state.captains.length;
  const totalPicks = state.draftOrder ? state.draftOrder.length : state.picksPerTeam * numCaptains;
  const round = Math.floor(state.currentPick / numCaptains) + 1;
  const absentMsg = !onClockPresent
    ? `<div style="margin-top: 12px; padding: 10px 14px; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; border-radius: 8px; color: #fecaca; font-size: 0.9rem;">
         ⚠️ <strong>${escapeHtml(onClock.name)}</strong> hasn't joined yet — the draft is paused waiting for them.
       </div>`
    : '';
  const modeTag = state.attendanceMode ? ' <span style="color:#fbbf24; font-size:0.85em;">📋 Attendance mode</span>' : '';
  document.getElementById('wait-round-info').innerHTML =
    `Round ${round} of ${state.picksPerTeam}${modeTag} · Captain: ${escapeHtml(onClock.name)} · Overall pick #${state.currentPick + 1} of ${totalPicks}${absentMsg}`;
}

// Filter state (persists during the current pick)
const filterState = { search: '', position: '', sort: 'default' };

function wireFilterBar() {
  const s = document.getElementById('filter-search');
  const p = document.getElementById('filter-position');
  const so = document.getElementById('filter-sort');
  const c = document.getElementById('filter-clear');
  if (!s || s.__wired) return;
  s.__wired = true;
  const trigger = () => {
    filterState.search = s.value.trim().toLowerCase();
    filterState.position = p.value;
    filterState.sort = so.value;
    if (state) render();
  };
  s.addEventListener('input', trigger);
  p.addEventListener('change', trigger);
  so.addEventListener('change', trigger);
  c.addEventListener('click', () => {
    s.value = ''; p.value = ''; so.value = 'default';
    trigger();
  });
}
function applyFilters(players) {
  let out = players.slice();
  if (filterState.search) {
    const q = filterState.search;
    out = out.filter(p =>
      (p.nickname || '').toLowerCase().includes(q) ||
      (p.name || '').toLowerCase().includes(q));
  }
  if (filterState.position) {
    out = out.filter(p => (p.position || '').split('/').includes(filterState.position));
  }
  const s = filterState.sort;
  if (s === 'ovr-desc') out.sort((a, b) => b.overall - a.overall);
  else if (s === 'ovr-asc') out.sort((a, b) => a.overall - b.overall);
  else if (['attack','serve','defense','setting','athletic'].includes(s))
    out.sort((a, b) => (b[s] || 0) - (a[s] || 0));
  else if (s === 'height') out.sort((a, b) => (b.heightCm || 0) - (a.heightCm || 0));
  else if (s === 'spike')  out.sort((a, b) => (b.spikeTouchCm || 0) - (a.spikeTouchCm || 0));
  return out;
}
function populatePositionDropdown(allPlayers) {
  const sel = document.getElementById('filter-position');
  if (!sel || sel.__populated) return;
  sel.__populated = true;
  const positions = new Set();
  for (const p of allPlayers) {
    (p.position || '').split('/').filter(Boolean).forEach(x => positions.add(x));
  }
  const sorted = [...positions].sort();
  sorted.forEach(pos => {
    const opt = document.createElement('option');
    opt.value = pos; opt.textContent = pos;
    sel.appendChild(opt);
  });
}

/** ROSTER TIP SYSTEM — analyzes user's current picks and suggests what role/skill they still need.
 *  Considers: captain's own linked player role, all picks made so far, and remaining picks.
 *  Returns a { level, text } object or null if no tip. */
function analyzeRosterAndSuggest(myCaptainIdx) {
  if (myCaptainIdx == null) return null;
  const cap = state.captains[myCaptainIdx];
  if (!cap) return null;
  const myPicks = (state.picks || []).filter(p => p.captainIdx === myCaptainIdx);
  const myPlayers = myPicks.map(pk => state.players.find(pp => pp.id === pk.playerId)).filter(Boolean);
  // Add captain themselves (if linked to a player) as part of the roster
  if (cap.linkedPlayerId) {
    const capPlayer = state.players.find(p => p.id === cap.linkedPlayerId);
    if (capPlayer) myPlayers.push(capPlayer);
  }
  // Count role presence — each player counts for all their position tags (e.g. "OH/OP" = both)
  const roleCounts = { S: 0, OH: 0, OP: 0, MB: 0, L: 0, DS: 0 };
  for (const p of myPlayers) {
    const posTags = (p.position || '').split('/').map(s => s.trim().toUpperCase());
    for (const tag of posTags) {
      if (roleCounts[tag] !== undefined) roleCounts[tag]++;
    }
  }
  const totalRoster = myPlayers.length;
  // Attendance mode: each captain has their own quota
  const myQuota = state.picksPerCaptain ? (state.picksPerCaptain[myCaptainIdx] ?? state.picksPerTeam) : state.picksPerTeam;
  const remaining = myQuota - myPicks.length;
  // V3: A "full" 11-player squad (7 starters + 4 bench) needs:
  //   2 setters (starter + backup)
  //   3 outsides (2 starters + 1 flex/bench)
  //   3 middles (2 starters + 1 for rotation/bench)
  //   2 liberos (starter + defensive sub)
  //   1 opposite (starter, or use OH/OP flex)
  const idealCounts = { S: 2, OH: 3, MB: 3, L: 2, OP: 1 };

  const missing = [];
  const nice = [];
  // Priority order: setter > libero > middle > outside (based on how essential)
  const priorityChecks = [
    { key: 'S',  label: '🎯 Setter',          essential: true,  msg: 'Every team needs a setter — they run the offense. Pick 2 for bench depth.' },
    { key: 'L',  label: '🛡️ Libero',           essential: true,  msg: 'A libero locks down back-row defense (highest dig priority). Pick 2 for rotation.' },
    { key: 'MB', label: '🧱 Middle Blocker',   essential: true,  msg: 'Middles anchor the block wall. Pick 3 for bench rotation.' },
    { key: 'OH', label: '💥 Outside Hitter',  essential: true,  msg: 'Outsides are your main attackers. Pick 3 for depth.' },
    { key: 'OP', label: '⚔️ Opposite',         essential: false, msg: 'Opposites attack from the right pin — great counter to blockers.' },
  ];
  for (const check of priorityChecks) {
    const have = roleCounts[check.key] || 0;
    const need = idealCounts[check.key] || 0;
    if (have < need) missing.push({ ...check, have, need, gap: need - have });
  }

  // If they have all essentials, suggest a stat improvement (weakest stat area)
  if (!missing.length && myPlayers.length) {
    // Calculate team stat averages
    const stats = { attack: 0, serve: 0, defense: 0, setting: 0, athletic: 0 };
    for (const p of myPlayers) {
      for (const k of Object.keys(stats)) stats[k] += (+p[k] || 5);
    }
    for (const k of Object.keys(stats)) stats[k] /= myPlayers.length;
    // Find the weakest stat
    let weakestKey = null, weakestVal = 999;
    for (const [k, v] of Object.entries(stats)) {
      if (v < weakestVal) { weakestVal = v; weakestKey = k; }
    }
    if (weakestVal < 6.5) {
      const labels = { attack: 'attacking', serve: 'serving', defense: 'defense/passing', setting: 'setting', athletic: 'athleticism' };
      return {
        level: 'improve',
        text: `✨ Your roster is complete on roles. Your weakest area is <b>${labels[weakestKey]}</b> (avg ${weakestVal.toFixed(1)}) — consider a player who's strong there.`
      };
    }
    return {
      level: 'good',
      text: `✅ Your roster looks well-balanced! Pick whoever you want.`
    };
  }

  if (!missing.length) return null;

  // Build the tip. If they have very few picks left, be urgent.
  const urgent = missing.length >= remaining;
  const topMissing = missing[0];   // highest priority missing role
  const shortList = missing.slice(0, 3);
  const roleList = shortList.map(m =>
    `<b>${m.label}</b>${m.gap > 1 ? ` ×${m.gap}` : ''}`
  ).join(', ');

  let text;
  if (urgent) {
    text = `⚠️ <b>Only ${remaining} pick${remaining !== 1 ? 's' : ''} left</b> and you still need: ${roleList}. Prioritize these!`;
  } else if (missing.length === 1) {
    text = `💡 You could still use a ${topMissing.label}. ${topMissing.msg}`;
  } else {
    text = `💡 You might want to grab: ${roleList}. Most important: ${topMissing.msg}`;
  }
  return { level: urgent ? 'urgent' : 'suggest', text };
}

async function renderMyTurn(onClock, whoHtml) {
  document.getElementById('waiting').classList.add('hidden');
  const m = document.getElementById('my-turn');
  m.classList.remove('hidden');
  document.getElementById('who-am-i-2').innerHTML = whoHtml;
  document.getElementById('my-team-name').innerHTML = teamHeaderHtml(onClock);
  const numCaptains = state.captains.length;
  const round = Math.floor(state.currentPick / numCaptains) + 1;
  const totalPicksAll = state.draftOrder ? state.draftOrder.length : state.picksPerTeam * numCaptains;
  const modeTag = state.attendanceMode ? ' 📋 attendance' : '';
  const myQuota = state.picksPerCaptain ? (state.picksPerCaptain[myCaptainIdx] ?? state.picksPerTeam) : state.picksPerTeam;
  document.getElementById('my-round-info').textContent =
    `Round ${round} of ${state.picksPerTeam}${modeTag} · Overall pick #${state.currentPick + 1} of ${totalPicksAll} · You get ${myQuota} picks total`;

  // Roster tip — only show when it's YOUR turn (this render function only runs then)
  const tipEl = document.getElementById('roster-tip');
  if (tipEl) {
    const tip = analyzeRosterAndSuggest(myCaptainIdx);
    if (tip) {
      tipEl.innerHTML = tip.text;
      tipEl.style.display = '';
      // Color by urgency
      if (tip.level === 'urgent') {
        tipEl.style.background = 'rgba(239,68,68,0.15)';
        tipEl.style.borderLeftColor = '#ef4444';
        tipEl.style.color = '#fecaca';
      } else if (tip.level === 'good') {
        tipEl.style.background = 'rgba(34,197,94,0.12)';
        tipEl.style.borderLeftColor = '#22c55e';
        tipEl.style.color = '#bbf7d0';
      } else if (tip.level === 'improve') {
        tipEl.style.background = 'rgba(139,92,246,0.12)';
        tipEl.style.borderLeftColor = '#a78bfa';
        tipEl.style.color = '#ddd6fe';
      } else {
        tipEl.style.background = 'rgba(251,191,36,0.12)';
        tipEl.style.borderLeftColor = '#fbbf24';
        tipEl.style.color = '#fef3c7';
      }
    } else {
      tipEl.style.display = 'none';
    }
  }

  const pickedIds = new Set((state.picks || []).map(p => p.playerId));
  const displayOrder = state.displayOrder || state.players.map(p => p.id);
  const availableAll = displayOrder
    .map(id => state.players.find(p => p.id === id))
    .filter(p => p && !pickedIds.has(p.id));

  wireFilterBar();
  populatePositionDropdown(availableAll);

  const available = applyFilters(availableAll);

  document.getElementById('available-count').textContent =
    available.length + (available.length !== availableAll.length ? ` filtered of ${availableAll.length}` : '');

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

async function draftPlayer(playerId, autoPick = false) {
  if (myCaptainIdx === null) return;
  if (!autoPick && !confirm('Lock in this pick? You can\'t undo it.')) return;

  const draftRef = ref(db, `drafts/${roomId}`);
  const expectedPickIdx = state.currentPick;
  const autoPickerIdx = state.draftOrder[state.currentPick]; // who's on clock right now

  try {
    const result = await runTransaction(draftRef, (current) => {
      if (!current) return current;
      // Guard: same pick still on the clock, player not yet taken
      if (current.currentPick !== expectedPickIdx) return; // abort
      const onClockIdx = current.draftOrder[current.currentPick];
      // Normal: only the on-clock captain can pick.
      // Auto-pick: any client can push a pick on behalf of the on-clock captain when timer expires.
      if (!autoPick && onClockIdx !== myCaptainIdx) return; // abort
      const already = (current.picks || []).some(p => p.playerId === playerId);
      if (already) return; // abort

      current.picks = current.picks || [];
      current.picks.push({
        captainIdx: onClockIdx,
        playerId,
        pickIndex: current.currentPick,
        timestamp: Date.now(),
        auto: !!autoPick
      });
      current.currentPick = (current.currentPick || 0) + 1;
      if (current.currentPick >= current.draftOrder.length) {
        current.status = 'complete';
      }
      return current;
    });
    if (result && result.committed) {
      playPick();
      // If the draft just completed, seed chemistry between teammates (one-time bond bonus)
      const finalState = result.snapshot ? result.snapshot.val() : null;
      if (finalState && finalState.status === 'complete') {
        try {
          const { recordDraftForChemistry } = await import('./chemistry.js');
          const leagueId = finalState.leagueId || 'gomi-cup';
          // Build rosters: for each captain, gather their picks + their own linked player id
          const captains = finalState.captains || [];
          const picks = finalState.picks || [];
          for (let ci = 0; ci < captains.length; ci++) {
            const cap = captains[ci];
            const roster = picks.filter(p => p.captainIdx === ci).map(p => p.playerId);
            if (cap.linkedPlayerId) roster.push(cap.linkedPlayerId);
            if (roster.length >= 2) {
              await recordDraftForChemistry(leagueId, roster);
            }
          }
          console.log('[chemistry] Seeded draft bonds for', captains.length, 'teams');
        } catch (err) {
          console.warn('[chemistry] Failed to seed draft bonds:', err);
        }
      }
    }
  } catch (e) {
    console.error(e);
    if (!autoPick) alert('Failed to lock in pick: ' + e.message);
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
          Captain: ${escapeHtml(cap.name)} · ${picks.length} / ${state.picksPerCaptain ? (state.picksPerCaptain[i] ?? state.picksPerTeam) : state.picksPerTeam} picks
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
    const round = Math.floor(pk.pickIndex / state.captains.length) + 1;
    return `
      <div style="display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px solid #334155; font-size:0.9rem;">
        <span style="color:#64748b;">R${round} · #${pk.pickIndex + 1}</span>
        <span><strong style="color:${cap.color}">${escapeHtml(cap.team)}</strong> ${pk.auto ? '⏰ auto-picked' : 'selected'} <strong>${escapeHtml(p ? (p.nickname || p.name) : '?')}</strong></span>
      </div>
    `;
  }).join('');
  document.getElementById('pick-history').innerHTML = rows;
}
