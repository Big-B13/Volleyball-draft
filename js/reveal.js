import { db, ref, onValue } from "./firebase-init.js";
import { LOGO_URLS } from "./data.js";
import { escapeHtml } from "./util.js";

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
      ? `<img src="${LOGO_URLS[cap.logo]}" style="height:100px; float:right; margin-left:16px; filter: drop-shadow(0 0 16px ${cap.color}aa);">`
      : '';
    return `
      <div class="reveal-team" style="border-top-color:${cap.color}; background:linear-gradient(135deg, ${cap.color}22, #1e293b);">
        ${logo}
        <h2 style="color:${cap.color}">${escapeHtml(cap.team)}</h2>
        <div class="captain-line">Captain: ${escapeHtml(cap.name)} · Avg OVR: ${teamOvr}</div>
        <div style="clear:both;"></div>
        ${teamPlayers.map((p, idx) => `
          <div class="reveal-player">
            <div style="text-align:center; font-weight:900; color:${cap.color}; font-size:1.4rem;">${idx + 1}</div>
            <div>
              <div class="reveal-codename">"${escapeHtml(p.nickname || '—')}"</div>
              <div class="reveal-realname">→ ${escapeHtml(p.name)}</div>
            </div>
            <div class="reveal-ovr">${p.overall}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  const undrafted = state.players.filter(p => !pickedIds.has(p.id));
  const undraftedHtml = undrafted.length ? `
    <div class="reveal-team" style="border-top-color:#64748b; background:linear-gradient(135deg, #64748b22, #0f172a);">
      <h2 style="color:#94a3b8">💔 Didn't make a team (${undrafted.length})</h2>
      <div class="captain-line">These players were left on the board when the draft ended.</div>
      ${undrafted.map(p => `
        <div class="reveal-player">
          <div style="text-align:center; font-weight:900; color:#64748b; font-size:1.4rem;">✕</div>
          <div>
            <div class="reveal-codename">"${escapeHtml(p.nickname || '—')}"</div>
            <div class="reveal-realname">→ ${escapeHtml(p.name)}</div>
          </div>
          <div class="reveal-ovr" style="color:#64748b">${p.overall}</div>
        </div>
      `).join('')}
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
