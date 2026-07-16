// Procedural sound effects using Web Audio API.
// No audio files needed — everything is synthesized in the browser.
// Sounds are subtle and short. All can be muted globally.

const audio = { ctx: null };

function ctx() {
  if (!audio.ctx) {
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not supported', e);
      return null;
    }
  }
  // Some browsers require user gesture to resume
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

// User must interact once before audio can play (autoplay policy)
let userHasInteracted = false;
function markInteracted() {
  userHasInteracted = true;
  document.removeEventListener('click', markInteracted);
  document.removeEventListener('keydown', markInteracted);
  document.removeEventListener('touchstart', markInteracted);
}
document.addEventListener('click', markInteracted);
document.addEventListener('keydown', markInteracted);
document.addEventListener('touchstart', markInteracted);

export function isMuted() { return localStorage.getItem('vd_muted') === '1'; }
export function setMuted(m) { localStorage.setItem('vd_muted', m ? '1' : '0'); }
export function toggleMuted() { setMuted(!isMuted()); return isMuted(); }

function canPlay() { return !isMuted() && userHasInteracted; }

/** Pick made — descending whoosh */
export function playPick() {
  if (!canPlay()) return;
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(700, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
  gain.gain.setValueAtTime(0.20, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

/** Clock tick — high for normal, low for urgent */
export function playTick(urgent = false) {
  if (!canPlay()) return;
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = urgent ? 320 : 800;
  gain.gain.setValueAtTime(urgent ? 0.20 : 0.10, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.12);
}

/** It's your turn — 3-note rising chime */
export function playYourTurn() {
  if (!canPlay()) return;
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t0 = now + i * 0.12;
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  });
}

/** Time's up! — deep alarm */
export function playTimesUp() {
  if (!canPlay()) return;
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.value = 200;
    const t0 = now + i * 0.25;
    gain.gain.setValueAtTime(0.22, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }
}

/** Draft-reveal dramatic sting — thick chord */
export function playReveal() {
  if (!canPlay()) return;
  const c = ctx(); if (!c) return;
  const now = c.currentTime;
  // Rising sweep first
  {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.6);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain).connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  }
  // Then the chord slam
  [147, 220, 294, 440].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = i < 2 ? 'sawtooth' : 'triangle';
    osc.frequency.value = freq;
    const t0 = now + 0.55;
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 1.7);
  });
}

/** Global mute button — inject once per page */
export function injectMuteButton() {
  if (document.getElementById('mute-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'mute-btn';
  btn.className = 'mute-btn';
  btn.title = 'Toggle sound';
  btn.style.cssText = `
    position: fixed; top: 12px; right: 12px; z-index: 999;
    background: rgba(30,41,59,0.9); color: #fff;
    border: 1px solid #475569; border-radius: 50%;
    width: 40px; height: 40px; cursor: pointer;
    font-size: 1.1rem; display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(6px);
    transition: all 0.15s;
  `;
  function refreshIcon() { btn.textContent = isMuted() ? '🔇' : '🔊'; }
  refreshIcon();
  btn.addEventListener('click', () => {
    toggleMuted();
    refreshIcon();
    if (!isMuted()) playPick(); // audible confirmation on unmute
  });
  document.body.appendChild(btn);
  // Position adjustment when connection-indicator also exists (draft page)
  setTimeout(() => {
    const conn = document.getElementById('conn');
    if (conn) btn.style.right = (conn.getBoundingClientRect().width + 20) + 'px';
  }, 100);
}
