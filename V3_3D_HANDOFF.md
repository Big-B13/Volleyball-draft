# V3 — 3D Renderer Handoff Notes

**Status:** Scaffold shipped. Parallel to 2D sim. Real 3D models not yet dropped in.

## What exists today

- `match-sim-3d.html` — parallel page to `match-sim.html`, uses the same match
  engine + v2 mechanics
- `js/renderer-3d.js` — Three.js scene + `PlayerRig` class with 6 stance
  animations (idle, walking, crouching, jumping, spiking, diving)
- Placeholder low-poly rigs: capsule body (colored by team) + sphere head +
  jersey number sprite

The 3D page plays **the exact same match** as the 2D page — same events,
same rotations, same signature moves, same crits — just rendered in 3D.

## Architecture (v3-ready)

```
┌──────────────────────┐    events[]     ┌───────────────────┐
│  match-engine.js     │  ────────────>  │  renderer-2d      │  (match-sim.html)
│  + mechanics-v2.js   │                 │  (DOM circles)    │
│                      │                 └───────────────────┘
│  simulateRally() →   │                 ┌───────────────────┐
│  augmentEvents() →   │  ────────────>  │  renderer-3d.js   │  (match-sim-3d.html)
│  [rich event list]   │                 │  (Three.js scene) │
└──────────────────────┘                 └───────────────────┘
```

**Engine is a pure event generator.** Both renderers subscribe to the same
event stream. Adding a v3 3D model means:

1. Replace `PlayerRig._addJerseyLabel()` and the body/head geometry with a
   `GLTFLoader.load('models/big-b.glb')` call
2. Replace `PlayerRig.update()`'s procedural stance code with
   `THREE.AnimationMixer.clipAction('idle' | 'spike' | 'block' | …).play()`
3. Everything else stays: engine, event stream, morale bars, tier flashes,
   signature cinematic, ball physics, court, net, camera

## Files to add when 3D models arrive

```
assets/models/
  big-b.glb       ← rigged mesh + animation clips (idle, run, jump, spike, block, dig, celebrate)
  burla.glb
  stratus.glb
  …
```

Recommended pipeline:
- Blender / Character Creator → export GLB with skinning
- Use Mixamo animation library for the 7 clips per character
  (idle, walk, run, jump, spike, block, dig)
- Each character shares the same skeleton so we can retarget clips
- Keep GLBs under 1 MB each — mobile users on GitHub Pages have slow pipes

## Character animation state machine

Currently procedural. When GLB clips arrive, map like this:

| Stance         | Fly High equivalent | GLB clip name  |
|----------------|--------------------|-----------------|
| `idle`         | Ready position     | `idle_loop`     |
| `walking`      | Court movement     | `run_forward`   |
| `crouching`    | Pass / receive     | `crouch_pass`   |
| `jumping`      | Block jump         | `block_jump`    |
| `spiking`      | Full spike swing   | `spike_attack`  |
| `diving`       | Emergency save     | `dive_dig`      |

Extras to add later:
- `celebrating` — after kill
- `serve_toss` — jump serve wind-up
- `signature_intro` — the 1-second pose that plays during signature cutscene

## Camera plan

Currently: fixed side-view + swoop-in on signature moves.

For v3 polish, add:
- **Rally cam** — slowly orbits during long rallies for flavor
- **Bullet-time** on crit kills — camera pauses, ball trail slows to 0.2×
- **Instant replay** — after big signature move, replay from 3 angles

## Testing checklist for v3 3D drop-in

When you swap in real GLBs:
1. Model appears at correct spot on court (0,0 = center)
2. Model scales to real height (heightCm mapped 1:1 to meters)
3. All 6 stance transitions play smoothly (no T-pose flickers)
4. Jersey number floats above head
5. Team color tints (either jersey material tint or emissive glow)
6. Signature cutscene: camera swoops behind character, model plays
   `spike_attack` clip at 0.8× speed for dramatic effect
7. Ball still lands in correct spot after model swap
8. Frame rate stays above 45 fps on mid-tier phones (≤7 GLBs on screen,
   under 1M polys total)

## Known limitations of the scaffold

- Camera is fixed side-view — 3D depth is subtle
- No ball trail effect yet
- No crowd, stadium, or environment beyond court + net
- Placeholder rigs can't wave arms, so spikes look like a body-lean
- No particle FX for kills / crits / signatures
- No shadow catcher outside the court

All of these are v3 polish items — the scaffold's job is just to prove the
engine → 3D renderer pipeline works.
