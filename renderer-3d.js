// ═══════════════════════════════════════════════════════════════════════
// GOMI CUP v3 — 3D RENDERER (scaffold)
//
// Parallel renderer to the 2D DOM version. Subscribes to the SAME event
// stream produced by match-engine.js + mechanics-v2.js. Currently uses
// PLACEHOLDER low-poly rigs (capsule + sphere head, colored by team).
// When real 3D character models arrive in v3, swap the `buildPlayerRig()`
// function to load GLTF meshes with Mixamo-style animation clips.
//
// Architecture:
//   scene              — Three.js scene root
//   court, net         — static geometry
//   PlayerRig          — per-player class managing mesh + animation state
//   Ball               — animated sphere with trail
//   playEvent(ev)      — the public entry point; the same call the 2D
//                         renderer uses (well, its equivalent)
//
// Character animation state machine (mirrors Fly High's on-court moves):
//   idle       — small breathing motion, weight shift
//   walking    — legs alternate, torso lean into motion
//   crouching  — bend for pass/receive
//   jumping    — take-off + hang time (for spike or block)
//   spiking    — full swing arm animation at apex
//   diving     — belly-flop dig save
//   celebrating— arms up, hop after kill
//
// Camera: fixed side-view like Fly High. Small orbit + zoom on signature
// moves (climax moment).
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ───── COURT CONSTANTS (real-world dimensions in meters, scaled 1:1) ─────
export const COURT_WIDTH  = 18;   // full length of court (long axis)
export const COURT_DEPTH  = 9;    // width of court (short axis)
export const NET_HEIGHT   = 2.43; // real men's net = 2.43m (we use 2.0 in engine for reach checks)
export const CEILING_H    = 12;   // camera far height
export const ENDLINE_PAD  = 3;    // space behind endlines for servers

// Map engine coords (x=[0..1] side-to-side, y=[0..1] far-to-near) → world:
//   worldX = (engine.y - 0.5) × COURT_WIDTH    // engine's y-axis becomes world X (long court)
//   worldZ = (engine.x - 0.5) × COURT_DEPTH    // engine's x-axis becomes world Z (short court)
export function engineToWorld(spot) {
  return {
    x: (spot.y - 0.5) * COURT_WIDTH,
    z: (spot.x - 0.5) * COURT_DEPTH,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SCENE SETUP
// ═══════════════════════════════════════════════════════════════════════

export class GomiCupRenderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1929);

    // Camera — side-view, slight elevation, looks toward court center
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.camera.position.set(0, 12, 22);
    this.camera.lookAt(0, 1, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting — stadium spotlights
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff2e0, 1.1);
    key.position.set(6, 20, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -15;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x88bbff, 0.4);
    rim.position.set(-8, 10, -8);
    this.scene.add(rim);

    // Court + net + floor
    this._buildCourt();
    this._buildNet();

    // Ball
    this.ball = this._buildBall();
    this.scene.add(this.ball);

    // Player rigs (populated by attachMatch)
    this.rigs = new Map();   // pid → PlayerRig

    // Signature move state
    this._sigActive = false;
    this._camDefault = { pos: this.camera.position.clone(), target: new THREE.Vector3(0,1,0) };

    // Kick off render loop
    this._clock = new THREE.Clock();
    this._running = true;
    this._loop();
  }

  _buildCourt() {
    // Outdoor wooden floor (extends past court)
    const floorGeo = new THREE.PlaneGeometry(COURT_WIDTH + 12, COURT_DEPTH + 8);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xb8783f, roughness: 0.85, metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Court paint (blue-teal box on top of floor)
    const courtGeo = new THREE.PlaneGeometry(COURT_WIDTH, COURT_DEPTH);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x1e7891, roughness: 0.7, transparent: true, opacity: 0.85,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.005;
    court.receiveShadow = true;
    this.scene.add(court);

    // Court lines — thin white boxes
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const addLine = (x, z, w, d) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.011, z);
      this.scene.add(m);
    };
    // Sidelines
    addLine(0, -COURT_DEPTH/2, COURT_WIDTH, 0.08);
    addLine(0,  COURT_DEPTH/2, COURT_WIDTH, 0.08);
    // Endlines
    addLine(-COURT_WIDTH/2, 0, 0.08, COURT_DEPTH);
    addLine( COURT_WIDTH/2, 0, 0.08, COURT_DEPTH);
    // Center line (at net)
    addLine(0, 0, 0.08, COURT_DEPTH);
    // Attack lines (3m from net on each side)
    addLine(-3, 0, 0.08, COURT_DEPTH);
    addLine( 3, 0, 0.08, COURT_DEPTH);
  }

  _buildNet() {
    // Net posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7 });
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, NET_HEIGHT + 0.4);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(0, (NET_HEIGHT + 0.4) / 2, side * (COURT_DEPTH/2 + 0.3));
      post.castShadow = true;
      this.scene.add(post);
    }
    // Net mesh (translucent grid)
    const netGeo = new THREE.PlaneGeometry(0.05, 1.0);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,256,64);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 32; i++) {
      ctx.beginPath(); ctx.moveTo(i*8, 0); ctx.lineTo(i*8, 64); ctx.stroke();
    }
    for (let j = 0; j <= 8; j++) {
      ctx.beginPath(); ctx.moveTo(0, j*8); ctx.lineTo(256, j*8); ctx.stroke();
    }
    // White top band
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 256, 4);
    const netTex = new THREE.CanvasTexture(canvas);
    const netMat = new THREE.MeshBasicMaterial({
      map: netTex, transparent: true, side: THREE.DoubleSide, opacity: 0.9,
    });
    const netMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT_DEPTH + 0.6, 1.0),
      netMat
    );
    netMesh.rotation.y = Math.PI / 2;
    netMesh.position.set(0, NET_HEIGHT - 0.5, 0);
    this.scene.add(netMesh);
  }

  _buildBall() {
    // Volleyball — sphere with procedural panel pattern
    const geo = new THREE.SphereGeometry(0.11, 24, 18);
    const tex = this._makeVolleyballTexture();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 1.2, 0);
    mesh.castShadow = true;
    return mesh;
  }

  _makeVolleyballTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff8e7'; ctx.fillRect(0, 0, 256, 256);
    // Panel lines (3 sinuous bands)
    ctx.strokeStyle = '#e5b23a'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 4) {
        const y = 42 + i * 80 + Math.sin(x * 0.06) * 8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    const dt = this._clock.getDelta();

    // Update all rigs
    for (const rig of this.rigs.values()) rig.update(dt);

    // Ball spin
    this.ball.rotation.x += dt * 6;
    this.ball.rotation.y += dt * 4;

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  destroy() {
    this._running = false;
    this.renderer.dispose();
  }

  // ─────────────────────────────────────────────────────
  // MATCH INTEGRATION
  // ─────────────────────────────────────────────────────

  /** Attach a match: create player rigs from home + away lineups. */
  attachMatch(match) {
    // Clear existing rigs
    for (const rig of this.rigs.values()) rig.dispose(this.scene);
    this.rigs.clear();

    for (const side of ['home', 'away']) {
      const team = match[side];
      team.lineup.forEach((slot, i) => {
        if (!slot || !slot.player) return;
        const rig = new PlayerRig({
          scene: this.scene,
          player: slot.player,
          teamColor: team.color,
          side,
        });
        rig.moveTo(slot.spot, /*instant*/ true);
        this.rigs.set(slot.player.id, rig);
      });
    }
  }

  /** Refresh positions from the current lineup (call after each rally). */
  syncPositions(match) {
    for (const side of ['home', 'away']) {
      const team = match[side];
      team.lineup.forEach((slot) => {
        if (!slot || !slot.player) return;
        const rig = this.rigs.get(slot.player.id);
        if (rig) rig.moveTo(slot.spot, false);
      });
    }
  }

  /** Play a single event from the engine stream. Returns a promise that resolves
   *  when this event's visual choreography finishes. */
  async playEvent(ev, prevEv, nextEv, speed = 1) {
    if (!ev.actor || !ev.actor.player) {
      await this._sleep(120 / speed);
      return;
    }
    const rig = this.rigs.get(ev.actor.player.id);
    if (!rig) return;

    // ─ Signature move cinematic (BIG camera swoop + slow-mo)
    if (ev.ability === 'signature') {
      await this._playSignatureCam(rig, ev, speed);
    }

    // ─ Set stance based on event type
    const stance = STANCE_FOR_EVENT[ev.type] || 'idle';
    rig.setStance(stance);

    // ─ Move actor to contact position (if they need to)
    if (ev.type === 'serve' || ev.type === 'ace') {
      // Server steps behind endline
      const world = engineToWorld({ x: ev.actor.spot.x, y: ev.actor.spot.y > 0.5 ? 1.15 : -0.15 });
      await rig.walkTo(world.x, world.z, 400 / speed);
    } else if (ev.actor.spot) {
      const world = engineToWorld(ev.actor.spot);
      await rig.walkTo(world.x, world.z, 300 / speed);
    }

    // ─ Fly ball to destination
    if (ev.toSpot) {
      await this._flyBall(ev, 400 / speed);
    }

    // ─ Tier reaction
    if (ev.tier === 'PERFECT') rig.pulse('gold');
    else if (ev.tier === 'BAD') rig.pulse('red');

    // ─ Follow-through
    await this._sleep(200 / speed);
    rig.setStance('idle');
  }

  async _flyBall(ev, minMs) {
    const dest = engineToWorld(ev.toSpot);
    const isSpike = ['attack','kill','ace','tip','setter-dump'].includes(ev.type);
    const isSet   = ev.type === 'set';
    const arcHeight = isSpike ? 3.5 : isSet ? 4.0 : 2.5;
    const startPos = this.ball.position.clone();
    const dur = Math.max(minMs, 350);
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startPos.x + (dest.x - startPos.x) * t;
      const z = startPos.z + (dest.z - startPos.z) * t;
      // Arc: sin curve, apex at t=0.5
      const y = 1.2 + Math.sin(t * Math.PI) * arcHeight;
      this.ball.position.set(x, y, z);
      await this._sleep(dur / steps);
    }
    // Special "out of bounds" reveal — let it keep flying and hit the floor
    if (ev.type === 'attack-out') {
      await this._sleep(150);
      const extraDx = (dest.x - startPos.x) * 0.3;
      const extraDz = (dest.z - startPos.z) * 0.3;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        this.ball.position.x = dest.x + extraDx * t;
        this.ball.position.z = dest.z + extraDz * t;
        this.ball.position.y = Math.max(0.11, 1.2 - t * 1.5);
        await this._sleep(30);
      }
    }
  }

  async _playSignatureCam(rig, ev, speed) {
    this._sigActive = true;
    const target = rig.mesh.position.clone();
    // Swoop camera in low behind the player
    const startPos = this.camera.position.clone();
    const startTarget = new THREE.Vector3(0, 1, 0);
    const goalPos = target.clone().add(new THREE.Vector3(0, 2.5, 5));
    const goalTarget = target.clone().add(new THREE.Vector3(0, 1.8, 0));
    const dur = Math.max(500, 1200 / speed);
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(startPos, goalPos, ease);
      const look = new THREE.Vector3().lerpVectors(startTarget, goalTarget, ease);
      this.camera.lookAt(look);
      await this._sleep(dur / steps);
    }
    rig.pulse('gold', 800);
    await this._sleep(600 / speed);
    // Return camera to default
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ease = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(goalPos, this._camDefault.pos, ease);
      const look = new THREE.Vector3().lerpVectors(goalTarget, this._camDefault.target, ease);
      this.camera.lookAt(look);
      await this._sleep(dur / (steps * 2));
    }
    this._sigActive = false;
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// ═══════════════════════════════════════════════════════════════════════
// PLAYER RIG — placeholder character (capsule body, sphere head, jersey)
//
// Every method here corresponds to something a Mixamo-rigged GLTF model
// would do via animation clips. When we swap in real 3D models later:
//   - Replace body/head/base meshes with a loaded GLTF scene
//   - Replace setStance() with animation clip crossfades (via AnimationMixer)
//   - Replace pulse() with material emissive intensity on the model
// The public API stays identical, so nothing else changes.
// ═══════════════════════════════════════════════════════════════════════

const STANCE_FOR_EVENT = {
  'serve':   'crouching',
  'ace':     'jumping',
  'pass':    'crouching',
  'set':     'jumping',
  'attack':  'spiking',
  'kill':    'spiking',
  'block':   'jumping',
  'dig':     'diving',
  'attack-net':   'spiking',
  'attack-out':   'spiking',
  'attack-error': 'spiking',
  'pass-error':   'diving',
  'serve-error':  'crouching',
  'setter-dump':  'jumping',
  'tip':          'jumping',
};

class PlayerRig {
  constructor({ scene, player, teamColor, side }) {
    this.player = player;
    this.side = side;
    this.teamColor = new THREE.Color(teamColor || '#dc2626');

    // Body (capsule)
    const heightM = ((player.heightCm || 180) / 100);
    const bodyGeo = new THREE.CapsuleGeometry(0.28, heightM - 0.9, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.teamColor, roughness: 0.55, metalness: 0.05,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = heightM / 2;
    this.body.castShadow = true;

    // Head (sphere)
    const headGeo = new THREE.SphereGeometry(0.22, 16, 12);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xf0c393, roughness: 0.6,
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = heightM + 0.05;
    this.head.castShadow = true;

    // Group so we can move them as one
    this.mesh = new THREE.Group();
    this.mesh.add(this.body);
    this.mesh.add(this.head);
    scene.add(this.mesh);

    // Jersey number sprite (canvas texture)
    this._addJerseyLabel(player.jerseyNum || player.name?.[0] || '?');

    // State
    this.stance = 'idle';
    this._targetPos = this.mesh.position.clone();
    this._walkSpeed = 5;   // m/s
    this._idlePhase = Math.random() * Math.PI * 2;
    this._stanceStartTime = 0;
    this._pulseColor = null;
    this._pulseUntil = 0;
    this._elapsed = 0;
  }

  _addJerseyLabel(text) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(text).slice(0, 2), 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.45, 0.45, 1);
    sprite.position.set(0, this.head.position.y + 0.55, 0);
    this.mesh.add(sprite);
    this.label = sprite;
  }

  moveTo(engineSpot, instant = false) {
    const world = engineToWorld(engineSpot);
    if (instant) {
      this.mesh.position.set(world.x, 0, world.z);
      this._targetPos.set(world.x, 0, world.z);
    } else {
      this._targetPos.set(world.x, 0, world.z);
    }
  }

  async walkTo(x, z, minMs) {
    this._targetPos.set(x, 0, z);
    const dist = this.mesh.position.distanceTo(this._targetPos);
    const dur = Math.max(minMs, (dist / this._walkSpeed) * 1000);
    this.stance = 'walking';
    await new Promise(r => setTimeout(r, dur));
    this.stance = 'idle';
  }

  setStance(stance) {
    this.stance = stance;
    this._stanceStartTime = this._elapsed;
  }

  pulse(color, ms = 500) {
    this._pulseColor = color === 'gold' ? new THREE.Color(0xfbbf24)
                     : color === 'red'  ? new THREE.Color(0xef4444)
                     : new THREE.Color(0xffffff);
    this._pulseUntil = this._elapsed + ms / 1000;
  }

  update(dt) {
    this._elapsed += dt;

    // Smooth walk toward target
    const dx = this._targetPos.x - this.mesh.position.x;
    const dz = this._targetPos.z - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.02) {
      const step = Math.min(dist, this._walkSpeed * dt);
      this.mesh.position.x += (dx / dist) * step;
      this.mesh.position.z += (dz / dist) * step;
      // Face movement direction
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Stance animations (procedural — replace with mixer.clipAction() when GLTF arrives)
    const stanceTime = this._elapsed - this._stanceStartTime;
    switch (this.stance) {
      case 'idle': {
        this._idlePhase += dt * 2;
        this.mesh.position.y = Math.sin(this._idlePhase) * 0.02;
        this.body.rotation.z = Math.sin(this._idlePhase * 0.5) * 0.03;
        break;
      }
      case 'walking': {
        this._idlePhase += dt * 8;
        this.body.rotation.z = Math.sin(this._idlePhase) * 0.08;
        this.mesh.position.y = Math.abs(Math.sin(this._idlePhase * 0.5)) * 0.05;
        break;
      }
      case 'crouching': {
        // Bend down
        const dip = Math.min(0.25, stanceTime * 2);
        this.mesh.position.y = -dip;
        this.body.scale.y = 1 - dip * 0.5;
        break;
      }
      case 'jumping': {
        // Take off, hang, come down
        const t = Math.min(1, stanceTime * 2);
        const jumpH = Math.sin(t * Math.PI) * 1.2;
        this.mesh.position.y = jumpH;
        this.body.scale.y = 1;
        break;
      }
      case 'spiking': {
        // Jump + arm swing (approximated by rotating body forward at apex)
        const t = Math.min(1, stanceTime * 2.2);
        const jumpH = Math.sin(t * Math.PI) * 1.5;
        this.mesh.position.y = jumpH;
        this.body.rotation.z = Math.sin(t * Math.PI * 2) * 0.3;
        break;
      }
      case 'diving': {
        // Fall forward
        const t = Math.min(1, stanceTime * 2.5);
        this.body.rotation.x = t * Math.PI * 0.35;
        this.mesh.position.y = -0.35 + Math.sin(t * Math.PI) * 0.1;
        break;
      }
    }
    // Reset non-idle stances after a beat
    if (this.stance !== 'idle' && this.stance !== 'walking' && stanceTime > 0.8) {
      this.body.scale.y = 1;
      this.body.rotation.set(0, 0, 0);
      this.stance = 'idle';
      this._stanceStartTime = this._elapsed;
    }

    // Pulse glow (tier flash / signature)
    if (this._pulseColor && this._elapsed < this._pulseUntil) {
      const t = (this._pulseUntil - this._elapsed) / 0.5;
      const intensity = Math.max(0, Math.min(1, t));
      this.body.material.emissive = this._pulseColor;
      this.body.material.emissiveIntensity = intensity * 0.9;
    } else if (this._pulseColor) {
      this.body.material.emissive = new THREE.Color(0x000000);
      this.body.material.emissiveIntensity = 0;
      this._pulseColor = null;
    }
  }

  dispose(scene) {
    scene.remove(this.mesh);
    this.body.geometry.dispose();
    this.body.material.dispose();
    this.head.geometry.dispose();
    this.head.material.dispose();
  }
}
