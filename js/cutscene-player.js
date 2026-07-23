// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — CUTSCENE PLAYER (Phase 1)
// Data-driven visual-novel engine for campaign story scenes.
// Scripts live in js/story/. No dependencies; DOM/CSS only.
//
// Script format:
//   {
//     id: 'chapter-5-intro',
//     scenes: {
//       start: [ <beats> ],       // entry scene is always 'start'
//       otherScene: [ <beats> ],  // reached via choice/goto
//     },
//   }
// Beat types:
//   { bg: 'store'|'court'|'city' }              — change backdrop
//   { speaker: 'keeper'|'mentor'|'captain'|'narrator', text: '...' }
//       text may be a string or { strigidae, otters, shizuka } per-club variant
//   { choice: [ { text: '...', goto: 'sceneId' }, ... ] }
//   { goto: 'sceneId' }                         — jump (use sparingly)
// Text tokens: {keeper} {mentor} {captain} {store} {club} {you} {opponent}
// ═══════════════════════════════════════════════════════════════════════

import { RELATIONSHIPS } from './relationships.js';
import { PLAYER_PORTRAITS, CLUB_THEME } from './campaign-loading.js';
import { playTick, isMuted } from './sounds.js';

const NAME_OVERRIDES = { 'big-b': 'Big-B' };
const CLUB_DISPLAY = { strigidae: 'STRIGIDAE', otters: 'Kòrsou Otters', shizuka: 'SHIZUKA' };
const BG_PATHS = {
  court: './assets/loading/court.jpeg',
  city: './assets/loading/city.jpeg',
};

function displayName(id) {
  if (!id) return '???';
  if (NAME_OVERRIDES[id]) return NAME_OVERRIDES[id];
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Resolve speaker tokens to concrete club characters (id + name + portrait). */
export function resolveSpeaker(token, club = 'strigidae') {
  if (token === 'narrator') return { id: 'narrator', name: '', portrait: '' };
  const c = RELATIONSHIPS.clubs[club] || RELATIONSHIPS.clubs.strigidae;
  const map = { keeper: c.storekeeper, mentor: c.mentor, captain: c.captain, guide: c.mentor };
  const id = map[token] || token;
  return { id, name: displayName(id), portrait: PLAYER_PORTRAITS[id] || '' };
}

function resolveBg(key, club) {
  if (!key) return null;
  if (key === 'store') return CLUB_THEME[club]?.storeBg || null;
  return BG_PATHS[key] || null;
}

/** Expand {tokens} in a line for the given context. */
function expandText(text, ctx) {
  const { club, playerName, opponent } = ctx;
  const c = RELATIONSHIPS.clubs[club] || RELATIONSHIPS.clubs.strigidae;
  const keeper = displayName(c.storekeeper);
  const mentor = displayName(c.mentor);
  const captain = displayName(c.captain);
  return String(text)
    .replaceAll('{keeper}', keeper)
    .replaceAll('{mentor}', mentor)
    .replaceAll('{captain}', captain)
    .replaceAll('{store}', c.storeName || 'the store')
    .replaceAll('{club}', CLUB_DISPLAY[club] || club)
    .replaceAll('{you}', playerName || 'rookie')
    .replaceAll('{opponent}', opponent || 'your opponents');
}

function pickVariant(text, club) {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[club] || text.strigidae || Object.values(text)[0] || '';
}

let stylesReady = false;

/**
 * Play a cutscene script. Returns a Promise that resolves when it ends
 * (finished or skipped).
 * @param {object} script - scene script (see header)
 * @param {object} ctx - { club, playerName, opponent }
 */
export function playCutscene(script, ctx = {}) {
  injectCutsceneStyles();
  const club = CLUB_DISPLAY[ctx.club] ? ctx.club : 'strigidae';
  const fullCtx = { ...ctx, club };

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'gomi-cs-overlay';
    overlay.style.setProperty('--accent', CLUB_THEME[club]?.accent || '#fbbf24');
    overlay.innerHTML = `
      <div class="gomi-cs-bg"></div>
      <div class="gomi-cs-shade"></div>
      <div class="gomi-cs-bar gomi-cs-top"><span class="gomi-cs-kicker"></span><button class="gomi-cs-skip" type="button">SKIP ▶▶</button></div>
      <div class="gomi-cs-portrait"><img alt=""><span class="gomi-cs-fallback">🏐</span></div>
      <div class="gomi-cs-bar gomi-cs-bottom"></div>
      <div class="gomi-cs-dialog">
        <div class="gomi-cs-name"></div>
        <div class="gomi-cs-text"></div>
        <div class="gomi-cs-hint">click to continue ▸</div>
        <div class="gomi-cs-choices"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const bgEl = overlay.querySelector('.gomi-cs-bg');
    const kickerEl = overlay.querySelector('.gomi-cs-kicker');
    const portraitWrap = overlay.querySelector('.gomi-cs-portrait');
    const img = portraitWrap.querySelector('img');
    const nameEl = overlay.querySelector('.gomi-cs-name');
    const textEl = overlay.querySelector('.gomi-cs-text');
    const dialogEl = overlay.querySelector('.gomi-cs-dialog');
    const hintEl = overlay.querySelector('.gomi-cs-hint');
    const choicesEl = overlay.querySelector('.gomi-cs-choices');
    img.onerror = () => { img.style.display = 'none'; portraitWrap.classList.add('no-image'); };

    kickerEl.textContent = script.kicker || (script.id ? script.id.replaceAll('-', ' ').toUpperCase() : '');
    requestAnimationFrame(() => overlay.classList.add('shown'));

    let done = false;
    let typing = null;
    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('shown');
      setTimeout(() => overlay.remove(), 420);
      resolve();
    };
    overlay.querySelector('.gomi-cs-skip').addEventListener('click', (e) => { e.stopPropagation(); finish(); });
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    document.addEventListener('keydown', onKey);

    const runBeat = async (beat) => {
      // Background swap
      if (beat.bg) {
        const url = resolveBg(beat.bg, club);
        if (url) {
          bgEl.classList.remove('bg-shown');
          await new Promise(r => setTimeout(r, 260));
          bgEl.style.backgroundImage = `url("${url}")`;
          bgEl.classList.add('bg-shown');
        }
      }

      const speaker = resolveSpeaker(beat.speaker || 'narrator', club);
      const raw = pickVariant(beat.text, club);
      const line = expandText(raw, fullCtx);
      const isNarration = speaker.id === 'narrator';

      // Speaker chrome
      portraitWrap.classList.toggle('hidden-portrait', isNarration);
      portraitWrap.classList.remove('no-image');
      img.style.display = '';
      if (!isNarration && speaker.portrait) img.src = speaker.portrait;
      nameEl.textContent = speaker.name;
      dialogEl.classList.toggle('narration', isNarration);

      // Typewriter
      hintEl.style.visibility = 'hidden';
      choicesEl.innerHTML = '';
      textEl.textContent = '';
      let i = 0;
      let advance;
      const typingDone = new Promise(r => { advance = r; });
      const completeText = () => {
        if (typing) { clearInterval(typing); typing = null; }
        textEl.textContent = line;
        advance();
      };
      typing = setInterval(() => {
        i += 1;
        textEl.textContent = line.slice(0, i);
        if (i >= line.length) completeText();
      }, 22);

      // One click = complete line; next click = advance (handled in runScene)
      const clickHandler = () => { if (typing) completeText(); };
      dialogEl.addEventListener('click', clickHandler, { once: false });
      await typingDone;
      dialogEl.removeEventListener('click', clickHandler);

      // Choice beats: wait for a selection
      if (Array.isArray(beat.choice) && beat.choice.length) {
        hintEl.style.visibility = 'hidden';
        const picked = new Promise((res) => {
          beat.choice.forEach((opt) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'gomi-cs-choice';
            b.textContent = expandText(pickVariant(opt.text, club), fullCtx);
            b.onclick = (e) => { e.stopPropagation(); if (!isMuted()) playTick(false); res(opt.goto || null); };
            choicesEl.appendChild(b);
          });
        });
        return { goto: await picked };
      }

      hintEl.style.visibility = 'visible';
      // Wait for the advance click
      await new Promise((res) => {
        const adv = (e) => {
          e.stopPropagation();
          if (!isMuted()) playTick(false);
          res();
        };
        dialogEl.addEventListener('click', adv, { once: true });
      });
      return {};
    };

    const runScene = async (sceneId) => {
      const beats = script.scenes?.[sceneId];
      if (!beats) return null;
      for (const beat of beats) {
        if (done) return null;
        if (beat.goto && !beat.text && !beat.choice) return beat.goto;
        const result = await runBeat(beat);
        if (done) return null;
        if (result?.goto) return result.goto;
      }
      return null;
    };

    (async () => {
      let next = 'start';
      let hops = 0;
      while (next && !done && hops < 25) {
        next = await runScene(next);
        hops += 1;
      }
      finish();
    })();
  });
}

function injectCutsceneStyles() {
  if (stylesReady) return;
  stylesReady = true;
  const style = document.createElement('style');
  style.id = 'gomi-cutscene-styles';
  style.textContent = `
    .gomi-cs-overlay{position:fixed;inset:0;z-index:999996;background:#020617;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;opacity:0;transition:opacity .4s;overflow:hidden;}
    .gomi-cs-overlay.shown{opacity:1;}
    .gomi-cs-bg{position:absolute;inset:-4%;background-size:cover;background-position:center;opacity:0;transition:opacity .5s;animation:gomiCsKenBurns 26s ease-in-out infinite alternate;filter:saturate(.85) brightness(.75);}
    .gomi-cs-bg.bg-shown{opacity:.5;}
    @keyframes gomiCsKenBurns{from{transform:scale(1) translate(0,0);}to{transform:scale(1.09) translate(-1.2%,1.4%);}}
    .gomi-cs-shade{position:absolute;inset:0;background:radial-gradient(ellipse at center 35%,transparent 0%,rgba(2,6,23,.72) 80%),linear-gradient(0deg,rgba(2,6,23,.95),transparent 45%);}
    .gomi-cs-bar{position:absolute;left:0;right:0;height:64px;background:#000;display:flex;align-items:center;justify-content:space-between;padding:0 22px;z-index:3;}
    .gomi-cs-top{top:0;border-bottom:1px solid rgba(251,191,36,.25);}
    .gomi-cs-bottom{bottom:0;border-top:1px solid rgba(251,191,36,.25);}
    .gomi-cs-kicker{font-size:.68rem;letter-spacing:.3em;color:var(--accent,#fbbf24);font-weight:950;}
    .gomi-cs-skip{background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:999px;padding:4px 14px;font-size:.68rem;letter-spacing:.14em;cursor:pointer;}
    .gomi-cs-skip:hover{color:#fff;border-color:#94a3b8;}
    .gomi-cs-portrait{position:absolute;left:34px;bottom:150px;width:148px;height:148px;border-radius:50%;border:3px solid var(--accent,#fbbf24);box-shadow:0 0 42px var(--accent,#fbbf24),0 24px 60px rgba(0,0,0,.7);overflow:hidden;background:#0f172a;z-index:2;display:flex;align-items:center;justify-content:center;transition:opacity .3s,transform .3s;}
    .gomi-cs-portrait img{width:100%;height:100%;object-fit:cover;}
    .gomi-cs-portrait .gomi-cs-fallback{display:none;font-size:3.2rem;}
    .gomi-cs-portrait.no-image .gomi-cs-fallback{display:block;}
    .gomi-cs-portrait.hidden-portrait{opacity:0;transform:translateY(14px);pointer-events:none;}
    .gomi-cs-dialog{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);width:min(760px,92vw);background:rgba(2,6,23,.88);border:1px solid rgba(148,163,184,.3);border-left:4px solid var(--accent,#fbbf24);border-radius:14px;padding:16px 20px 22px;cursor:pointer;z-index:2;box-shadow:0 26px 70px rgba(0,0,0,.65);min-height:112px;}
    .gomi-cs-dialog.narration{border-left-color:#475569;font-style:italic;}
    .gomi-cs-name{font-size:.72rem;font-weight:950;letter-spacing:.24em;text-transform:uppercase;color:var(--accent,#fbbf24);margin-bottom:6px;min-height:.9rem;}
    .gomi-cs-text{font-size:clamp(.95rem,2.2vw,1.08rem);line-height:1.65;color:#f1f5f9;min-height:3.2em;white-space:pre-line;}
    .gomi-cs-hint{margin-top:8px;font-size:.66rem;letter-spacing:.16em;color:#64748b;text-align:right;}
    .gomi-cs-choices{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
    .gomi-cs-choice{background:rgba(15,23,42,.9);border:1px solid var(--accent,#fbbf24);color:#f8fafc;border-radius:10px;padding:10px 16px;font-size:.92rem;font-weight:800;text-align:left;cursor:pointer;transition:background .15s,transform .15s;}
    .gomi-cs-choice:hover{background:rgba(251,191,36,.14);transform:translateX(4px);}
    @media (max-width:640px){
      .gomi-cs-portrait{width:96px;height:96px;left:18px;bottom:190px;}
      .gomi-cs-dialog{bottom:76px;padding:14px 16px 18px;}
    }
  `;
  document.head.appendChild(style);
}
