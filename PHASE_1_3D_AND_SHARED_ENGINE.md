# Phase 1 — 3D Stadium + Shared Match Rules

## Delivered

### 3D stadium audience
`js/renderer-3d.js` now creates a lightweight in-engine arena:
- five-tier far grandstand
- coloured low-poly spectator crowd using `THREE.InstancedMesh`
- seating rails and Gomi Cup gold banners
- crowd bounce/reaction for aces, kills, blocks, set wins and match wins

No individual GLB spectator models are loaded, which keeps the scene suitable for browsers and phones.

### One gameplay path
`match-sim.html` now imports:
- `js/match-engine-v3.js`
- `js/mechanics-v3.js`

The 2D renderer and 3D renderer now both consume the v3 event system: stamina, specialties, manual hitter calls, signature moves, morale, chemistry and substitution events.

### 3D rule parity fixes
`match-sim-3d.html` now applies:
- the same roster synergy bonuses as 2D
- persistent Firebase chemistry + preset chemistry traits
- the same v3 engine event stream

## Intentional next tasks
- Add a visible manual substitution UI to both renderers.
- Create Dream Team builder, saved teams and launches into either simulator.
- Replace placeholder rigs with GLB models once the shared character base is ready.
