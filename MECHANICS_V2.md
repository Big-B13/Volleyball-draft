# Gomi Cup Engine v2 — Fly High–inspired Mechanics

Deep-dive redesign integrating 5 Fly High mechanics into the match sim.
Written so a future **v3 3D renderer** can subscribe to the same event stream.

---

## Architecture principle (v3-ready)

The **match engine** (`js/match-engine.js`) is a pure event generator. It emits an
ordered stream of touches. The **visual layer** (currently `match-sim.html` DOM +
2D CSS animations, later a Three.js/WebGL 3D scene) subscribes to that stream and
renders it. Every new mechanic below adds fields to the event stream — it does NOT
add hidden state that only the current renderer knows about. That way v3 can
render the same match faithfully.

Event shape after v2:
```js
{
  type: 'attack' | 'kill' | 'set' | 'pass' | 'block' | 'dig' | 'serve' | ...,
  actor: { player, spot },      // who acted
  team: 'home' | 'away',        // which side
  fromSpot, toSpot,             // ball trajectory
  tier: 'BAD' | 'NORMAL' | 'PERFECT',   // NEW — quality of this touch
  crit: true|false,             // NEW — was this a crit?
  critMult: 1.0..2.0,           // NEW — damage multiplier applied
  netCrossings: 0..∞,           // NEW — global counter
  ability: 'signature'|null,    // NEW — was this a signature move?
  moraleBefore: {home,away},    // NEW — morale snapshot at moment of touch
  moraleAfter:  {home,away},    // NEW — morale after this touch
}
```

---

## Mechanic 1 — Touch Quality Tiers (BAD / NORMAL / PERFECT chaining)

### The insight
Every touch in Fly High resolves into one of 3 tiers. A **BAD receive almost
never produces a PERFECT set** — the tier CHAINS. Only huge stat mismatches
can jump 2 tiers. This turns a rally from "rolls of dice" into a legible
cause-and-effect sequence: fans can *see* the moment the point was lost 3
touches back.

### Formula

Every touch computes a raw *skill score* `s ∈ [0, 1]`:
```
s = raw_stat_score × prev_touch_bias × momentum_boost × cold_penalty
```

Where:
- `raw_stat_score` = the current stat check normalized (0..1)
- `prev_touch_bias` = **chain modifier** from the previous touch tier:
  - Prev **BAD**    → ×0.55 (heavy drag — you're recovering a shanked ball)
  - Prev **NORMAL** → ×1.00
  - Prev **PERFECT** → ×1.20 (great pass = setter's job is easy)
  - (First touch of rally: no bias)
- `momentum_boost` = existing team fire aura (1.0 → 1.15)
- `cold_penalty` = existing per-player cold streak (0.85 → 1.0)

Tier buckets:
| Score `s` | Tier |
|---|---|
| ≥ 0.75 | **PERFECT** |
| 0.35 – 0.75 | **NORMAL** |
| < 0.35 | **BAD** |

BAD result probabilities (independent of stat check binary outcome):
- BAD-tier pass → 40% pass-error, 60% weak set-quality 0.25
- BAD-tier set → set quality 0.30 (weak set to hitter)
- BAD-tier attack → 15% chance to become attack-error (out or net), else weak spike easily blocked/dug
- PERFECT-tier attack → +20% kill chance, +50% crit chance (see Mechanic 2)

### Visual
- Player circle glow color for the touch instant:
  - 🔴 BAD    = red flash + short shake
  - ⚪ NORMAL = no extra effect
  - 🟢 PERFECT = green glow + sparkle burst
- Play-by-play prefix: `❌ BAD pass by X` / `✨ PERFECT set by Y`

---

## Mechanic 2 — Crit Chance × Crit Damage split

### The insight
Fly High separates the "did something clutch happen?" (Awareness = crit chance)
from "how big was it?" (Strength = crit damage). Two knobs create way more
build variety than a single "power" stat. **We already have this in personality
traits — just wire them into rolls.**

### Formula

Only PERFECT-tier offensive actions can crit (serve, spike, tip, dump):
```
critChance   = 0.05 + confidence × 0.30     // 5% → 35%
critDamageMul = 1.0 + 0.5 + aggression × 0.5  // 1.5× → 2.0×
```

When crit fires on an attack:
- Kill probability +30% (harder to block/dig)
- Damage number popup shows: `9014` style burst (à la Fly High)
- Visual: character card lights up gold, screen shake, "!" cut-in

Only PERFECT-tier defensive actions can crit (dig, block, receive):
```
critChance   = 0.05 + hustle × 0.30    // hustlers save more
critDamageMul = 1.0 + 0.5 + discipline × 0.5   // disciplined defenders dig cleanly
```

When crit fires on a dig/block:
- Instantly upgrades continuation to PERFECT (chain propagates)
- Extra momentum tick

### Why our existing traits fit
- `confidence` → offensive crit chance (Big-B has 0.80 → 29% crit chance on PERFECT swings)
- `aggression` → offensive crit damage (aggressive hitters swing harder)
- `hustle` → defensive crit chance (Nishinoya-types dive more)
- `discipline` → defensive crit damage (clean, technical defenders)

**No new stats added.** Just new usage of what's there.

---

## Mechanic 3 — Cooldowns in Net Crossings

### The insight
Fly High counts CDs by **net crossings, not seconds** — because sim speed varies
and rally length varies. A signature move on "6 net-crossing CD" behaves the
same at 1× and 4× speed. Perfectly volleyball-native.

### Formula

Every ball crossing the net (serve, spike, tip, dump, over-set-return) increments
`match.netCrossings` by 1. Each ability stores:
```js
{
  id: 'rolling-thunder',
  name: 'Rolling Thunder',
  type: 'dig-crit',
  cdCrossings: 8,      // total CD
  remaining: 0,        // ticks down each crossing
}
```

Player abilities table lives on `match.abilities[pid] = [{...}]`. Engine helper:
```js
useAbility(pid, id) {
  const a = match.abilities[pid].find(x=>x.id===id);
  if (!a || a.remaining > 0) return false;
  a.remaining = a.cdCrossings;
  return true;
}
tickCooldowns() {   // called on every net-crossing event
  for (const pid in match.abilities)
    match.abilities[pid].forEach(a => { if (a.remaining>0) a.remaining--; });
}
```

Abilities are checked whenever the player *would* act — if ready, they trigger
their signature (auto-play). No manual button — this is a sim.

---

## Mechanic 4 — Ball-magnet priority

### The insight
Fly High **dynamically re-weights** ball trajectory toward the player with the
best available ult. That's why Nishinoya "receives everything" — the ball is
slightly rigged toward him when his ult is up.

### Formula
Existing priority (Libero=1 > Setter=2 > OH/OP=3 > LB=4 > MB=5) stays as a
BASE. Additional weight when the player has a ready signature move:
```
weight = defenseStat² × prioMult × (hasReadyUlt ? 3.0 : 1.0)
```
So a Nishinoya-type with ready ult gets 3× the pull toward him. Not
deterministic, but very likely.

Applied to:
- `pickReceiver` (serve reception)
- `pickDiggers` (spike defense)

---

## Mechanic 5 — Team Morale + Signature Moves

### The insight
Fly High's `Team Morale` meter fills as bonded characters make good plays.
When full, it triggers a **Signature Move** cutscene — the biggest visual
punch in the game. This is the "climax moment" that turns matches into stories.

### Formula

**Morale gauge:** `match.morale[side] = 0 to 100`. Fill triggers:
| Event | Morale gain |
|---|---|
| Any kill | +6 |
| Any ace | +8 |
| Any block | +7 |
| PERFECT-tier touch | +3 (any) |
| BAD → PERFECT chain (hustle recovery) | +12 (huge) |
| Set to high-chem teammate → kill | +5 bonus |
| Crit hit | +5 bonus |
| Team scores 3+ in a row | +10 flat |
| Opponent scores | -3 (small drain) |

Gauge caps at 100. Never resets between rallies. Resets at start of each set.

**Signature move trigger:** once morale ≥ 100, next time a player with a designed
signature move gets the ball at the moment their signature fires, they use it.

### Signature moves catalog (starter set)

Each captain + top players get one signature. Later players can be added.

| Player | Signature | Type | Effect |
|---|---|---|---|
| **Big-B** | Night Predator | block | Guaranteed PERFECT block, wall of 3, +150% |
| **Burla** | The Trickster | setter-dump | Guaranteed PERFECT dump, unblockable |
| **Stratus** | The Mirror | dig | Guaranteed PERFECT dig → chains to PERFECT set |
| **Steven** | Tiny Giant | quick-spike | Guaranteed PERFECT quick, +180% power |
| **Ricardo** | Aim & Shoot | power-spike | Guaranteed PERFECT line shot, +170% |
| **Nikita B** | Nightmare | power-spike | Guaranteed PERFECT cross, +200%, cannot be dug |
| **Joran** | The Dream | power-spike | Guaranteed PERFECT + wipe-off any block |
| **Bouschra** | Aim & Shoot 2 | power-spike | Guaranteed PERFECT line shot, +170% |
| **Nikita-blond** | Iron Wall | block | Guaranteed 3-man wall block, +160% |
| **Islom** | Cannon | serve | Guaranteed ACE (perfect crit serve) |
| **Ihor** | Storm | power-spike | Guaranteed PERFECT + destabilize opp morale (-20) |

### Visual — the "climax moment"
When signature fires:
1. Screen dims for 300ms (all other players fade to 50%)
2. Player card centers, scales to 200%, gold aura pulse
3. Signature name appears in dramatic font: **"NIGHT PREDATOR"**
4. Cut-in effect: diagonal light streaks across court
5. Ball travels with a **flame trail**
6. On result: big damage number popup à la Fly High: `9014`
7. Return to normal, morale drained to 0

---

## Implementation checklist (order to build)

1. ✅ Add `netCrossings` counter to match state (increment in engine)
2. ✅ Add `TouchTier` computation to every skill check
3. ✅ Add chain rule (bias next touch by prev tier)
4. ✅ Add tier field to every event
5. ✅ Wire `confidence`/`aggression`/`hustle`/`discipline` into crit rolls on PERFECT
6. ✅ Add `crit` + `critMult` fields to events
7. ✅ Add morale state + fill triggers
8. ✅ Add signature moves catalog (data.js)
9. ✅ Add `useAbility`/`tickCooldowns` helpers
10. ✅ Rewrite `pickReceiver`/`pickDiggers` with ready-ult ball-magnet
11. ✅ Add tier visuals (green/red glow) to player circles
12. ✅ Add tier prefix to play-by-play
13. ✅ Add morale bar to match header (per team)
14. ✅ Add signature move cinematic (dim, scale, name, flame trail, damage popup)
15. ✅ Bump PLAYER_DATA_VERSION for morale/signature payloads

---

## v3 (3D) preparation notes

When you move to Three.js models later, the engine will not change. The 3D
renderer subscribes to the same event stream and just needs to know:
- **Positions**: already in engine coords `(x, y)` in [0,1] — map to 3D world
  as `worldX = (x - 0.5) × COURT_WIDTH`, `worldZ = (y - 0.5) × COURT_DEPTH`
- **Tier**: play a different animation clip for BAD (stumble) / NORMAL (clean)
  / PERFECT (sparkle particles)
- **Crit**: extra camera shake + slow-mo bullet-time
- **Signature**: pre-baked cinematic camera swoop + skinned model action
- **Morale**: HUD element outside the 3D scene
- **Net crossings**: pure state, no rendering

Because the engine emits all this in structured event data (not hidden in
DOM animations), swapping renderers is a pure UI change — the sim logic
stays untouched.
