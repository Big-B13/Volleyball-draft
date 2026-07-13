import { db, ref, onValue } from "./firebase-init.js";
import { LOGO_URLS, STAT_KEYS, STAT_LABELS, photoPathFor, getInitials } from "./data.js";
import { CLUBS, PLAYER_BIOS } from "./lore.js";
import { escapeHtml } from "./util.js";

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
    <div class="mini-tcg${cutClass}${capClass}" style="--team-c:${teamC};">
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
    </div>
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

    // Build captain "player" object so it can render as a mini card
    const capId = captainIdForCaptain(cap);
    const capPhotoUrl = await getPhotoUrl(capId);
    const capAsPlayer = {
      id: capId,
      name: cap.name,
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

    // Bios listed below the lineup (optional flavor)
    const biosBlock = teamPlayers.some(p => PLAYER_BIOS[p.id]) ? `
      <div style="margin-top:20px; padding:14px 18px; background:rgba(0,0,0,0.3); border-radius:8px;">
        <h4 style="color:${cap.color}; font-size:0.8rem; letter-spacing:2px; text-transform:uppercase; margin-bottom:10px;">Scouting Report</h4>
        ${teamPlayers.map((p, idx) => {
          const bio = PLAYER_BIOS[p.id];
          if (!bio) return '';
          return `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.85rem;">
            <strong style="color:${cap.color};">${idx+1}. ${escapeHtml(p.nickname || p.name)}</strong>
            <span style="color:#cbd5e1; margin-left:6px;">— ${escapeHtml(bio)}</span>
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
    <a href="./cards.html?room=${roomId}" style="display:inline-block; padding:14px 28px; background:linear-gradient(90deg,#fbbf24,#f97316); color:#0f172a; font-weight:800; border-radius:8px; text-decoration:none; letter-spacing:1px;">
      🃏 Get shareable roster cards →
    </a>
    <div style="color:#94a3b8; font-size:0.85rem; margin-top:8px;">Download 1080×1080 PNGs of each team's roster for Instagram/WhatsApp</div>
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
