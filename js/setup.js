import { db, ref, set, serverTimestamp } from "./firebase-init.js";
import { DEFAULT_CAPTAINS, DEFAULT_PLAYERS, STAT_KEYS, STAT_LABELS, PICKS_PER_TEAM } from "./data.js";
import { makeRoomId, makeCaptainCode, buildDraftOrder, shuffle, overall, saveLocal, loadLocal, escapeHtml } from "./util.js";

let captains = loadLocal('vd_captains') || JSON.parse(JSON.stringify(DEFAULT_CAPTAINS));
let players  = loadLocal('vd_players')  || JSON.parse(JSON.stringify(DEFAULT_PLAYERS));

function persist() {
  saveLocal('vd_captains', captains);
  saveLocal('vd_players', players);
}

function buildCaptainInputs() {
  const g = document.getElementById('captains-grid');
  g.innerHTML = captains.map((c, i) => `
    <div>
      <label>Captain ${i + 1} name</label>
      <input type="text" value="${escapeHtml(c.name)}" data-i="${i}" data-field="name">
      <label style="margin-top:8px;">Team name</label>
      <input type="text" value="${escapeHtml(c.team)}" data-i="${i}" data-field="team">
      <div class="grid-2" style="margin-top:8px;">
        <div>
          <label>Primary color</label>
          <input type="color" value="${c.color}" data-i="${i}" data-field="color">
        </div>
        <div>
          <label>Secondary color</label>
          <input type="color" value="${c.color2}" data-i="${i}" data-field="color2">
        </div>
      </div>
    </div>
  `).join('');
  g.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', () => {
      const i = +el.dataset.i, f = el.dataset.field;
      captains[i][f] = el.value;
      persist();
    });
  });
}

function buildPlayerInputs() {
  const g = document.getElementById('players-grid');
  g.innerHTML = players.map((p, i) => `
    <div class="player-row">
      <div class="num">${i + 1}</div>
      <input type="text" value="${escapeHtml(p.name)}"     data-i="${i}" data-field="name"     placeholder="Real name">
      <input type="text" value="${escapeHtml(p.nickname || '')}" data-i="${i}" data-field="nickname" placeholder="Nickname">
      ${STAT_KEYS.map(s => `<input type="number" min="1" max="10" value="${p[s]}" data-i="${i}" data-field="${s}">`).join('')}
    </div>
  `).join('');
  g.querySelectorAll('input').forEach(el => {
    el.addEventListener('input', () => {
      const i = +el.dataset.i, f = el.dataset.field;
      const v = el.type === 'number' ? (parseInt(el.value) || 0) : el.value;
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
window.resetDefaults = () => {
  if (!confirm('Reset captains + players + stats back to the pre-loaded defaults? This wipes any local edits.')) return;
  captains = JSON.parse(JSON.stringify(DEFAULT_CAPTAINS));
  players  = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  persist();
  buildCaptainInputs();
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
  const playersWithOverall = players.map(p => ({ ...p, overall: overall(p) }));

  // Shuffle player display order so card position gives away nothing
  const displayOrder = shuffle(playersWithOverall.map(p => p.id));

  const draftData = {
    createdAt: Date.now(),
    picksPerTeam: PICKS_PER_TEAM,
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

buildCaptainInputs();
buildPlayerInputs();
