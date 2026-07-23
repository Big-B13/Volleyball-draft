// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP — PACK OPENING CINEMATIC SYSTEM
// FIFA-style inspired pack opening for Campaign card boxes.
// No external assets required: pure DOM/CSS, works in GitHub Pages preview.
// ═══════════════════════════════════════════════════════════════════════

export const RARITY_META = {
  common: {
    label: 'COMMON',
    color: '#94a3b8',
    glow: 'rgba(148,163,184,.45)',
    beams: 10,
    revealDelay: 900,
    shake: false,
    walkout: false,
  },
  uncommon: {
    label: 'UNCOMMON',
    color: '#22c55e',
    glow: 'rgba(34,197,94,.55)',
    beams: 14,
    revealDelay: 1100,
    shake: false,
    walkout: false,
  },
  rare: {
    label: 'RARE',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,.65)',
    beams: 18,
    revealDelay: 1350,
    shake: true,
    walkout: false,
  },
  epic: {
    label: 'EPIC',
    color: '#a855f7',
    glow: 'rgba(168,85,247,.75)',
    beams: 24,
    revealDelay: 1700,
    shake: true,
    walkout: true,
  },
  legendary: {
    label: 'LEGENDARY',
    color: '#f97316',
    glow: 'rgba(249,115,22,.85)',
    beams: 32,
    revealDelay: 2200,
    shake: true,
    walkout: true,
  },
};

export const PACK_META = {
  starter: { label: 'Starter Box', accent: '#fbbf24', icon: '🎁' },
  common: { label: 'Common Box', accent: '#94a3b8', icon: '📦' },
  rare: { label: 'Rare Box', accent: '#3b82f6', icon: '💎' },
  epic: { label: 'Epic Box', accent: '#a855f7', icon: '⭐' },
  champion: { label: 'Champion Box', accent: '#f97316', icon: '🏆' },
};

let stylesInjected = false;

export function getHighestRarity(cards = []) {
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  return cards.reduce((best, card) => {
    const rarity = card?.rarity || 'common';
    return order.indexOf(rarity) > order.indexOf(best) ? rarity : best;
  }, 'common');
}

/**
 * Main cinematic entry point.
 * @param {Array} cards - Cards already rolled by the pack system.
 * Each card should have: { pid, name, nickname, rarity, position, artwork }
 * @param {object} options
 * @param {string} options.packType - starter/common/rare/epic/champion
 * @param {object} options.storekeeper - { id, name, portrait, line }
 * @returns {Promise<Array>} resolves with cards after user closes the reveal.
 */
export function openPackCinematic(cards = [], options = {}) {
  injectPackStyles();

  const packType = options.packType || 'common';
  const pack = PACK_META[packType] || PACK_META.common;
  const highest = getHighestRarity(cards);
  const rarity = RARITY_META[highest] || RARITY_META.common;
  const storekeeper = options.storekeeper || null;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = `gomi-pack-overlay rarity-${highest}`;

    overlay.innerHTML = `
      <div class="gomi-pack-stage" style="--rarity:${rarity.color}; --glow:${rarity.glow}; --pack:${pack.accent};">
        ${storekeeper ? renderStorekeeper(storekeeper) : ''}

        <div class="gomi-pack-topline">${pack.icon} ${pack.label}</div>

        <div class="gomi-pack-beams">
          ${Array.from({ length: rarity.beams }).map((_, i) => `<span style="--i:${i}; --total:${rarity.beams};"></span>`).join('')}
        </div>

        <button class="gomi-pack-box ${rarity.shake ? 'will-shake' : ''}" type="button" aria-label="Open pack">
          <div class="gomi-pack-lid"></div>
          <div class="gomi-pack-emblem">${pack.icon}</div>
          <div class="gomi-pack-label">HOLD TO OPEN</div>
        </button>

        <div class="gomi-pack-rarity hidden">
          <span>${rarity.label}</span>
        </div>

        <div class="gomi-pack-walkout hidden">
          ${rarity.walkout ? `<div class="gomi-walkout-shadow"></div><div class="gomi-walkout-text">WALKOUT</div>` : ''}
        </div>

        <div class="gomi-pack-cards hidden">
          ${cards.map(renderRevealCard).join('')}
        </div>

        <button class="gomi-pack-close hidden" type="button">Continue</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const box = overlay.querySelector('.gomi-pack-box');
    const rarityEl = overlay.querySelector('.gomi-pack-rarity');
    const cardsEl = overlay.querySelector('.gomi-pack-cards');
    const closeBtn = overlay.querySelector('.gomi-pack-close');
    const walkoutEl = overlay.querySelector('.gomi-pack-walkout');

    let opened = false;
    const startReveal = () => {
      if (opened) return;
      opened = true;
      overlay.classList.add('opening');
      box.classList.add('opening');
      box.querySelector('.gomi-pack-label').textContent = 'OPENING...';

      setTimeout(() => {
        rarityEl.classList.remove('hidden');
        overlay.classList.add('rarity-burst');
      }, Math.max(350, rarity.revealDelay - 600));

      if (rarity.walkout) {
        setTimeout(() => walkoutEl.classList.remove('hidden'), rarity.revealDelay - 200);
      }

      setTimeout(() => {
        box.classList.add('hidden');
        walkoutEl.classList.add('hidden');
        cardsEl.classList.remove('hidden');
        closeBtn.classList.remove('hidden');
        cardsEl.querySelectorAll('.gomi-reveal-card').forEach((card, i) => {
          setTimeout(() => card.classList.add('shown'), i * 140);
        });
      }, rarity.revealDelay + 450);
    };

    box.addEventListener('click', startReveal);
    box.addEventListener('pointerdown', () => box.classList.add('holding'));
    box.addEventListener('pointerup', () => box.classList.remove('holding'));
    box.addEventListener('pointerleave', () => box.classList.remove('holding'));

    closeBtn.addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 180);
      resolve(cards);
    });
  });
}

function renderStorekeeper(storekeeper) {
  return `
    <div class="gomi-storekeeper">
      ${storekeeper.portrait ? `<img src="${storekeeper.portrait}" alt="${storekeeper.name || 'Storekeeper'}">` : ''}
      <div>
        <strong>${storekeeper.name || 'Storekeeper'}</strong>
        <p>${storekeeper.line || 'Let’s see what the box gives you.'}</p>
      </div>
    </div>
  `;
}

function renderRevealCard(card) {
  const rarity = card?.rarity || 'common';
  const meta = RARITY_META[rarity] || RARITY_META.common;
  const art = card?.artwork || card?.portrait || '';
  return `
    <article class="gomi-reveal-card card-${rarity}" style="--card:${meta.color}; --cardglow:${meta.glow};">
      <div class="gomi-card-rarity">${meta.label}</div>
      <div class="gomi-card-art">
        ${art ? `<img src="${art}" alt="${card.name || card.pid || 'Player'}">` : `<div class="gomi-card-placeholder">🏐</div>`}
      </div>
      <h3>${card.nickname || card.name || card.pid || 'Unknown'}</h3>
      <p>${card.name || card.pid || ''}</p>
      <small>${card.position || ''}</small>
    </article>
  `;
}

function injectPackStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'gomi-pack-cinematic-styles';
  style.textContent = `
    .gomi-pack-overlay{position:fixed;inset:0;z-index:999999;background:radial-gradient(circle at center,#111827 0%,#020617 58%,#000 100%);display:flex;align-items:center;justify-content:center;overflow:hidden;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;}
    .gomi-pack-overlay.closing{animation:gomiFadeOut .18s ease forwards;}
    .gomi-pack-stage{position:relative;width:min(980px,96vw);min-height:min(680px,94vh);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;isolation:isolate;}
    .gomi-pack-topline{position:absolute;top:26px;letter-spacing:.18em;text-transform:uppercase;font-weight:900;color:#e2e8f0;text-shadow:0 0 18px var(--pack);}
    .gomi-storekeeper{position:absolute;left:22px;top:22px;max-width:330px;display:flex;gap:12px;align-items:center;background:rgba(15,23,42,.78);border:1px solid rgba(148,163,184,.25);border-radius:16px;padding:10px 12px;backdrop-filter:blur(8px);box-shadow:0 16px 45px rgba(0,0,0,.45);}
    .gomi-storekeeper img{width:64px;height:64px;object-fit:cover;border-radius:14px;border:1px solid rgba(255,255,255,.18);}
    .gomi-storekeeper strong{display:block;color:#fff;font-size:.92rem;}
    .gomi-storekeeper p{margin:3px 0 0;color:#cbd5e1;font-size:.78rem;line-height:1.35;}
    .gomi-pack-beams{position:absolute;inset:-20%;pointer-events:none;opacity:.35;filter:blur(.2px);}
    .gomi-pack-beams span{position:absolute;left:50%;top:50%;width:3px;height:58%;background:linear-gradient(to top,transparent,var(--rarity),transparent);transform-origin:50% 0;transform:rotate(calc(360deg / var(--total) * var(--i))) translateY(-6%);animation:gomiBeam 3.5s linear infinite;opacity:.65;}
    .opening .gomi-pack-beams,.rarity-burst .gomi-pack-beams{opacity:.95;}
    .gomi-pack-box{width:260px;height:320px;border:0;background:linear-gradient(145deg,#1e293b,#020617 75%);border-radius:28px;position:relative;cursor:pointer;box-shadow:0 0 0 2px rgba(255,255,255,.08),0 30px 80px rgba(0,0,0,.7),0 0 70px var(--pack);transform:perspective(900px) rotateX(8deg);transition:transform .2s,box-shadow .2s,opacity .2s;}
    .gomi-pack-box:hover,.gomi-pack-box.holding{transform:perspective(900px) rotateX(0deg) scale(1.035);box-shadow:0 0 0 2px rgba(255,255,255,.15),0 34px 90px rgba(0,0,0,.8),0 0 100px var(--pack);}
    .gomi-pack-box.will-shake.opening{animation:gomiShake .08s linear infinite;}
    .gomi-pack-box.opening{box-shadow:0 0 0 2px rgba(255,255,255,.2),0 30px 80px rgba(0,0,0,.8),0 0 150px var(--rarity);}
    .gomi-pack-lid{position:absolute;left:18px;right:18px;top:20px;height:72px;border-radius:18px;background:linear-gradient(135deg,var(--pack),#fff5 45%,#0002);box-shadow:inset 0 -12px 22px rgba(0,0,0,.25);transition:transform .6s cubic-bezier(.2,.9,.2,1);transform-origin:50% 0;}
    .opening .gomi-pack-lid{transform:translateY(-22px) rotateX(62deg);}
    .gomi-pack-emblem{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:4.4rem;text-shadow:0 0 24px var(--pack);}
    .gomi-pack-label{position:absolute;left:0;right:0;bottom:34px;text-align:center;font-size:.8rem;font-weight:950;letter-spacing:.18em;color:#f8fafc;}
    .gomi-pack-rarity{position:absolute;top:44%;transform:translateY(-50%);font-size:clamp(2rem,7vw,5.4rem);font-weight:1000;letter-spacing:.12em;text-shadow:0 0 24px var(--rarity),0 0 90px var(--rarity);animation:gomiRarityPop .45s cubic-bezier(.2,1.2,.2,1);}
    .gomi-pack-walkout{position:absolute;bottom:110px;text-align:center;animation:gomiWalkout .8s ease both;}
    .gomi-walkout-shadow{width:160px;height:210px;background:linear-gradient(to bottom,var(--rarity),transparent);clip-path:polygon(40% 0,60% 0,72% 28%,68% 100%,32% 100%,28% 28%);filter:blur(2px);opacity:.75;margin:auto;}
    .gomi-walkout-text{font-weight:1000;font-size:1.2rem;letter-spacing:.28em;color:#fff;text-shadow:0 0 20px var(--rarity);}
    .gomi-pack-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;width:min(860px,92vw);z-index:2;}
    .gomi-reveal-card{opacity:0;transform:translateY(34px) rotateY(70deg) scale(.86);background:linear-gradient(155deg,#0f172a,#020617);border:2px solid var(--card);border-radius:20px;padding:12px;min-height:245px;box-shadow:0 18px 60px rgba(0,0,0,.55),0 0 40px var(--cardglow);transition:opacity .45s,transform .6s cubic-bezier(.2,1.2,.2,1);position:relative;overflow:hidden;}
    .gomi-reveal-card:before{content:"";position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 36%,rgba(255,255,255,.22),transparent 62%);transform:translateX(-60%);animation:gomiShine 2.6s ease infinite;}
    .gomi-reveal-card.shown{opacity:1;transform:translateY(0) rotateY(0) scale(1);}
    .gomi-card-rarity{font-size:.66rem;font-weight:950;letter-spacing:.14em;color:var(--card);text-align:center;margin-bottom:8px;}
    .gomi-card-art{height:138px;border-radius:14px;overflow:hidden;background:#111827;display:flex;align-items:center;justify-content:center;margin-bottom:10px;border:1px solid rgba(255,255,255,.08);}
    .gomi-card-art img{width:100%;height:100%;object-fit:cover;}
    .gomi-card-placeholder{font-size:3rem;}
    .gomi-reveal-card h3{margin:0;text-align:center;font-size:1rem;color:#f8fafc;}
    .gomi-reveal-card p{margin:3px 0 0;text-align:center;font-size:.82rem;color:#cbd5e1;}
    .gomi-reveal-card small{display:block;text-align:center;margin-top:5px;color:var(--card);font-weight:900;}
    .gomi-pack-close{margin-top:26px;border:0;border-radius:12px;background:#fbbf24;color:#0f172a;font-weight:950;padding:12px 28px;cursor:pointer;box-shadow:0 12px 40px rgba(251,191,36,.25);}
    .hidden{display:none!important;}
    @keyframes gomiFadeOut{to{opacity:0;}}
    @keyframes gomiBeam{to{transform:rotate(calc(360deg / var(--total) * var(--i) + 360deg)) translateY(-6%);}}
    @keyframes gomiShake{0%,100%{transform:translate(0,0) perspective(900px) rotateX(0) scale(1.04);}25%{transform:translate(2px,-1px) perspective(900px) rotateX(0) scale(1.04);}75%{transform:translate(-2px,1px) perspective(900px) rotateX(0) scale(1.04);}}
    @keyframes gomiRarityPop{from{opacity:0;transform:translateY(-50%) scale(.45);filter:blur(8px);}to{opacity:1;transform:translateY(-50%) scale(1);filter:blur(0);}}
    @keyframes gomiWalkout{from{opacity:0;transform:translateY(24px) scale(.85);}to{opacity:1;transform:translateY(0) scale(1);}}
    @keyframes gomiShine{0%,55%{transform:translateX(-65%);}100%{transform:translateX(65%);}}
  `;
  document.head.appendChild(style);
}
