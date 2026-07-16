import { db, ref, onValue } from "./firebase-init.js";
import { LOGO_URLS, STAT_KEYS, STAT_LABELS, photoPathFor, getInitials } from "./data.js";
import { CLUBS, PLAYER_BIOS } from "./lore.js";
import { escapeHtml } from "./util.js";
import { guardPage, renderAuthBadge } from "./auth.js";
import { photoOffsetY } from "./photo-config.js";
import { playReveal, injectMuteButton } from "./sounds.js";
import { getAllPlayers } from "./players.js";

// Load latest merged player data (with admin overrides) so bios/nicknames from the
// admin panel show up on the reveal page. Falls back to PLAYER_BIOS map if not found.
let __bioById = { ...PLAYER_BIOS };
let __nickById = {};
let __allPlayers = [];
let __playersReady = (async () => {
  try {
    __allPlayers = await getAllPlayers();
    for (const p of __allPlayers) {
      if (p.bio) __bioById[p.id] = p.bio;
      if (p.nickname) __nickById[p.id] = p.nickname;
    }
  } catch (e) { console.warn('Could not merge admin player data on reveal', e); }
})();
function bioFor(id) { return __bioById[id] || PLAYER_BIOS[id] || ''; }

injectMuteButton();
// Play the dramatic reveal sting once on page load (after any user gesture)
let __revealSoundPlayed = false;
function tryPlayReveal() {
  if (__revealSoundPlayed) return;
  __revealSoundPlayed = true;
  playReveal();
  document.removeEventListener('click', tryPlayReveal);
  document.removeEventListener('keydown', tryPlayReveal);
  document.removeEventListener('touchstart', tryPlayReveal);
}
setTimeout(() => { tryPlayReveal(); }, 400); // try immediately (may need gesture)
document.addEventListener('click', tryPlayReveal);
document.addEventListener('keydown', tryPlayReveal);
document.addEventListener('touchstart', tryPlayReveal);

// Require at least a viewer login before showing the reveal
const { profile: __authProfile } = await guardPage({ requireRole: 'viewer' });
// Render badge after the page's DOM is ready
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

// Mini trading card renderer — used on reveal + optional other pages
function miniCardHtml({ player, teamColor, pickNum, badgeText, isCut, isCaptain }) {
  const kanji = (player.nickname || player.name || '').slice(0, 1).toUpperCase() || 'V';
  const photoUrl = player._photoUrl;
  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="${escapeHtml(player.name)}" crossorigin="anonymous">`
    : `<div class="mini-placeholder">${getInitials(player.name)}</div>`;
  const badge = badgeText || pickNum;
  const pickBadge = badge != null ? `<div class="mini-pick-num">${badge}</div>` : '';
  const cutClass = isCut ? ' cut' : '';
  const capClass = isCaptain ? ' captain-card' : '';
  const teamC = teamColor || '#64748b';
  return `
    <a href="./player.html?id=${encodeURIComponent(player.id)}" class="mini-tcg${cutClass}${capClass}" style="--team-c:${teamC}; text-decoration:none; display:block;" title="View profile">
      ${pickBadge}
      <div class="mini-halftone"></div>
      <div class="mini-slash"></div>
      <div class="mini-top">
        <div class="mini-ovr">OVR<span class="num">${player.overall}</span></div>
        <div class="mini-kanji">${escapeHtml(kanji)}</div>
      </div>
      <div class="mini-photo">${photoHtml}</div>
      <div class="mini-name-block">
        <div class="mini-nick">"${escapeHtml(player.nickname || player.name)}"</div>
        <div class="mini-real">${escapeHtml(player.name)}</div>
      </div>
      <div class="mini-stats">
        ${STAT_KEYS.map(s => `
          <div class="mini-stat">
            <div class="lbl">${STAT_LABELS[s].slice(0,3)}</div>
            <div class="val">${player[s]}</div>
          </div>
        `).join('')}
      </div>
    </a>
  `;
}

// Get captain's ID for photo lookup (matches how photos are named)
function captainIdForCaptain(cap) {
  const n = (cap.name || '').toLowerCase().trim();
  if (n === 'big-b' || n === 'bigb' || n === 'big b') return 'big-b';
  if (n === 'burla') return 'burla';
  if (n === 'stratus') return 'stratus';
  return n.replace(/\s+/g, '-');
}

// Async check if a photo file exists at the expected path
function photoExists(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
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


// Match a captain to their club record by team name (case-insensitive contains match)
function clubFor(cap) {
  const t = (cap.team || '').toLowerCase();
  for (const c of Object.values(CLUBS)) {
    if (t.includes(c.name.toLowerCase()) || (c.name.toLowerCase().includes(t) && t.length > 3)) return c;
  }
  // fallback by captain name
  const n = (cap.name || '').toLowerCase();
  for (const c of Object.values(CLUBS)) {
    if ((c.captain.name || '').toLowerCase() === n) return c;
  }
  return null;
}

const params = new URLSearchParams(location.search);
const roomId = (params.get('room') || '').toUpperCase();

let state = null;

if (!roomId) {
  document.getElementById('loading').innerHTML = '<div class="warning">No room ID provided.</div>';
} else {
  const draftRef = ref(db, `drafts/${roomId}`);
  onValue(draftRef, (snap) => {
    setConn(true);
    const val = snap.val();
    if (!val) {
      document.getElementById('loading').innerHTML = `<div class="warning">Room "${roomId}" not found.</div>`;
      return;
    }
    state = val;
    render();
  }, (err) => { setConn(false); console.error(err); });
}

function setConn(ok) {
  const el = document.getElementById('conn');
  el.textContent = ok ? '● live' : '● offline';
  el.classList.toggle('online', ok);
  el.classList.toggle('offline', !ok);
}

async function render() {
  document.getElementById('loading').classList.add('hidden');
  // Wait for admin-edited player data (nicknames, stats, bios) to be loaded
  // so captain cards show YOUR ratings (like Blackout) instead of hardcoded defaults.
  await __playersReady;
  const container = document.getElementById('reveal-teams');

  const pickedIds = new Set((state.picks || []).map(p => p.playerId));

  const teamsHtmlArr = await Promise.all(state.captains.map(async (cap, i) => {
    const teamPicks = (state.picks || []).filter(p => p.captainIdx === i);
    const teamPlayers = teamPicks.map(pk => state.players.find(pp => pp.id === pk.playerId)).filter(Boolean);
    const teamOvr = teamPlayers.length ? (teamPlayers.reduce((s, p) => s + p.overall, 0) / teamPlayers.length).toFixed(2) : '—';
    const logo = cap.logo && LOGO_URLS[cap.logo]
      ? `<img src="${LOGO_URLS[cap.logo]}" style="height:110px; float:right; margin-left:16px; filter: drop-shadow(0 0 16px ${cap.color}aa);">`
      : '';
    const club = clubFor(cap);

    // Build captain "player" object so it can render as a mini card.
    // Pull stats + nickname from the merged player data (admin edits win over defaults).
    const capId = captainIdForCaptain(cap);
    const capPhotoUrl = await getPhotoUrl(capId);
    const capPlayerRecord = __allPlayers.find(pp => pp.id === capId);
    const capAsPlayer = capPlayerRecord ? {
      ...capPlayerRecord,
      overall: Math.round(((capPlayerRecord.attack + capPlayerRecord.serve + capPlayerRecord.defense + capPlayerRecord.setting + capPlayerRecord.athletic) / 5) * 10) / 10,
      _photoUrl: capPhotoUrl
    } : {
      id: capId, name: cap.name,
      nickname: club ? club.captain.title : (cap.role || 'Captain'),
      attack: 8, serve: 8, defense: 8, setting: 8, athletic: 8, overall: 8.5,
      _photoUrl: capPhotoUrl
    };
    const captainCard = miniCardHtml({
      player: capAsPlayer,
      teamColor: cap.color,
      badgeText: 'C',
      isCaptain: true
    });

    // Player mini cards (5 drafted)
    const playerPhotos = await Promise.all(teamPlayers.map(p => getPhotoUrl(p.id)));
    const draftedCards = teamPlayers.map((p, idx) => {
      const withPhoto = { ...p, _photoUrl: playerPhotos[idx] };
      return miniCardHtml({ player: withPhoto, teamColor: cap.color, pickNum: idx + 1 });
    }).join('');

    // Bios listed below the lineup (optional flavor) — smaller text, uses admin-edited bios if present
    const biosBlock = teamPlayers.some(p => bioFor(p.id)) ? `
      <div style="margin-top:16px; padding:10px 14px; background:rgba(0,0,0,0.3); border-radius:8px;">
        <h4 style="color:${cap.color}; font-size:0.7rem; letter-spacing:2px; text-transform:uppercase; margin-bottom:6px;">Scouting Report</h4>
        ${teamPlayers.map((p, idx) => {
          const bio = bioFor(p.id);
          if (!bio) return '';
          return `<div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.72rem; line-height:1.4;">
            <strong style="color:${cap.color}; font-size:0.75rem;">${idx+1}. ${escapeHtml(__nickById[p.id] || p.nickname || p.name)}</strong>
            <span style="color:#cbd5e1; margin-left:4px;">— ${escapeHtml(bio)}</span>
          </div>`;
        }).join('')}
      </div>
    ` : '';

    // Captain + 5 players = 6 cards in one horizontal row
    const rosterRows = `<div class="roster-mini-grid lineup">${captainCard}${draftedCards}</div>${biosBlock}`;

    const loreHtml = club ? `
      <div style="clear:both;"></div>
      <div style="padding:16px 20px; background:rgba(0,0,0,0.35); border-radius:8px; margin:16px 0; border-left:4px solid ${cap.color};">
        <div style="color:${cap.color}; font-weight:700; letter-spacing:2px; font-size:0.85rem; text-transform:uppercase; margin-bottom:6px;">${club.motto.kanji}</div>
        <div style="color:#cbd5e1; font-style:italic; font-size:0.9rem; margin-bottom:12px;">${club.motto.english}</div>
        <p style="color:#e2e8f0; line-height:1.6; font-size:0.95rem;">${club.identity}</p>
        <a href="./clubs/${club.id}.html" style="display:inline-block; margin-top:10px; color:${cap.color}; text-decoration:none; font-size:0.85rem; font-weight:700;">Read full club history →</a>
      </div>
    ` : '';

    return `
      <div class="reveal-team" style="border-top-color:${cap.color}; background:linear-gradient(135deg, ${cap.color}22, #1e293b);">
        ${logo}
        <h2 style="color:${cap.color}">${escapeHtml(cap.team)}</h2>
        <div class="captain-line">Captain: ${escapeHtml(cap.name)}${club ? ` · <em>${club.captain.role} · "${club.captain.title}"</em>` : ''} · Avg OVR: ${teamOvr}</div>
        ${loreHtml}
        <h3 style="color:${cap.color}; margin:20px 0 10px; letter-spacing:2px; font-size:0.9rem; text-transform:uppercase;">The Lineup</h3>
        ${rosterRows}
      </div>
    `;
  }));
  const teamsHtml = teamsHtmlArr.join('');

  const undrafted = state.players.filter(p => !pickedIds.has(p.id));
  const undraftedPhotos = await Promise.all(undrafted.map(p => getPhotoUrl(p.id)));
  const undraftedCards = undrafted.map((p, i) => {
    const withPhoto = { ...p, _photoUrl: undraftedPhotos[i] };
    return miniCardHtml({ player: withPhoto, teamColor: '#64748b', pickNum: null, isCut: true });
  }).join('');
  const undraftedHtml = undrafted.length ? `
    <div class="reveal-team" style="border-top-color:#64748b; background:linear-gradient(135deg, #64748b22, #0f172a);">
      <h2 style="color:#94a3b8">💔 Didn't make a team (${undrafted.length})</h2>
      <div class="captain-line">These players were left on the board when the draft ended.</div>
      <div class="roster-mini-grid wrap">${undraftedCards}</div>
    </div>
  ` : '';

  container.innerHTML = teamsHtml + undraftedHtml;

  // Add a shareable-cards call-to-action at the bottom
  const cardsCta = document.createElement('div');
  cardsCta.style.textAlign = 'center';
  cardsCta.style.margin = '30px 0';
  cardsCta.innerHTML = `
    <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
      <a href="./cards.html?room=${roomId}" style="display:inline-block; padding:14px 28px; background:linear-gradient(90deg,#fbbf24,#f97316); color:#0f172a; font-weight:800; border-radius:8px; text-decoration:none; letter-spacing:1px;">
        🃏 Get shareable roster cards →
      </a>
      <a href="./predictions-results.html?room=${roomId}" style="display:inline-block; padding:14px 28px; background:rgba(124, 58, 237, 0.9); color:#fff; font-weight:800; border-radius:8px; text-decoration:none; letter-spacing:1px;">
        🏆 Prediction leaderboard →
      </a>
    </div>
    <div style="color:#94a3b8; font-size:0.85rem; margin-top:12px;">Download 1080×1080 PNGs · See who guessed the draft right</div>
  `;
  container.appendChild(cardsCta);
}

window.exportResults = () => {
  if (!state) return;
  let txt = "🏐 VOLLEYBALL DRAFT RESULTS 🏐\n\n";
  const pickedIds = new Set((state.picks || []).map(p => p.playerId));
  state.captains.forEach((cap, i) => {
    const teamPicks = (state.picks || []).filter(p => p.captainIdx === i);
    const teamPlayers = teamPicks.map(pk => state.players.find(pp => pp.id === pk.playerId)).filter(Boolean);
    const ovr = teamPlayers.length ? (teamPlayers.reduce((s, p) => s + p.overall, 0) / teamPlayers.length).toFixed(2) : '—';
    txt += `${cap.team} (Captain: ${cap.name}) — Avg OVR ${ovr}\n`;
    teamPlayers.forEach((p, idx) => {
      txt += `  ${idx + 1}. "${p.nickname || '—'}"  →  ${p.name}  OVR ${p.overall}\n`;
    });
    txt += "\n";
  });
  const undrafted = state.players.filter(p => !pickedIds.has(p.id));
  if (undrafted.length) {
    txt += `DIDN'T MAKE A TEAM (${undrafted.length})\n`;
    undrafted.forEach(p => txt += `  - "${p.nickname || '—'}"  →  ${p.name}  OVR ${p.overall}\n`);
  }
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `draft-results-${roomId}.txt`;
  a.click();
};
