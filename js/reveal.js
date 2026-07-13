import { db, ref, onValue } from "./firebase-init.js";
import { LOGO_URLS } from "./data.js";
import { CLUBS, PLAYER_BIOS } from "./lore.js";
import { escapeHtml } from "./util.js";

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

function render() {
  document.getElementById('loading').classList.add('hidden');
  const container = document.getElementById('reveal-teams');

  const pickedIds = new Set((state.picks || []).map(p => p.playerId));

  const teamsHtml = state.captains.map((cap, i) => {
    const teamPicks = (state.picks || []).filter(p => p.captainIdx === i);
    const teamPlayers = teamPicks.map(pk => state.players.find(pp => pp.id === pk.playerId)).filter(Boolean);
    const teamOvr = teamPlayers.length ? (teamPlayers.reduce((s, p) => s + p.overall, 0) / teamPlayers.length).toFixed(2) : '—';
    const logo = cap.logo && LOGO_URLS[cap.logo]
      ? `<img src="${LOGO_URLS[cap.logo]}" style="height:120px; float:right; margin-left:16px; filter: drop-shadow(0 0 16px ${cap.color}aa);">`
      : '';
    const club = clubFor(cap);
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
        <h3 style="color:${cap.color}; margin:16px 0 10px; letter-spacing:2px; font-size:0.9rem; text-transform:uppercase;">The Roster</h3>
        ${teamPlayers.map((p, idx) => {
          const bio = PLAYER_BIOS[p.id];
          return `
          <div class="reveal-player">
            <div style="text-align:center; font-weight:900; color:${cap.color}; font-size:1.4rem;">${idx + 1}</div>
            <div>
              <div class="reveal-codename">"${escapeHtml(p.nickname || '—')}"</div>
              <div class="reveal-realname">→ ${escapeHtml(p.name)}</div>
              ${bio ? `<div style="color:#94a3b8; font-size:0.82rem; margin-top:4px; font-style:italic; line-height:1.4;">${escapeHtml(bio)}</div>` : ''}
            </div>
            <div class="reveal-ovr">${p.overall}</div>
          </div>
        `;}).join('')}
      </div>
    `;
  }).join('');

  const undrafted = state.players.filter(p => !pickedIds.has(p.id));
  const undraftedHtml = undrafted.length ? `
    <div class="reveal-team" style="border-top-color:#64748b; background:linear-gradient(135deg, #64748b22, #0f172a);">
      <h2 style="color:#94a3b8">💔 Didn't make a team (${undrafted.length})</h2>
      <div class="captain-line">These players were left on the board when the draft ended.</div>
      ${undrafted.map(p => {
        const bio = PLAYER_BIOS[p.id];
        return `
        <div class="reveal-player">
          <div style="text-align:center; font-weight:900; color:#64748b; font-size:1.4rem;">✕</div>
          <div>
            <div class="reveal-codename">"${escapeHtml(p.nickname || '—')}"</div>
            <div class="reveal-realname">→ ${escapeHtml(p.name)}</div>
            ${bio ? `<div style="color:#64748b; font-size:0.8rem; margin-top:4px; font-style:italic;">${escapeHtml(bio)}</div>` : ''}
          </div>
          <div class="reveal-ovr" style="color:#64748b">${p.overall}</div>
        </div>
      `;}).join('')}
    </div>
  ` : '';

  container.innerHTML = teamsHtml + undraftedHtml;
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
