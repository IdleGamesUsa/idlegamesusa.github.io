import * as THREE from "./vendor/three.module.min.js";
import { canFireArrow, legalMoves, bestHint, EXIT_RULE_TEXT } from "./puzzle.js";
import { LEVEL } from "./level.js";

const canvas = document.getElementById("c");
const heartsEl = document.getElementById("hearts");
const countEl = document.getElementById("count");
const ringEl = document.getElementById("ring");
const progressFill = document.getElementById("progressFill");
const toastEl = document.getElementById("toast");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovBody = document.getElementById("ovBody");
const ovBtn = document.getElementById("ovBtn");
const hintBtn = document.getElementById("hintBtn");
const restartBtn = document.getElementById("restartBtn");
const infoBtn = document.getElementById("infoBtn");
const info = document.getElementById("info");
const infoClose = document.getElementById("infoClose");
const hintline = document.getElementById("hintline");
const fpsEl = document.getElementById("fps");
const DEBUG = /(?:\?|&)debug=1(?:&|$)/.test(location.search);
if (DEBUG) fpsEl.style.display = "block";

const MAX_HEARTS = 3;
const CORE_W = 0.22;
const GLOW_W = 0.4;
const HEAD_LEN = 0.5;
const HEAD_W = 0.34;
const LIFT = 0.52;
const RING_C = 2 * Math.PI * 24;

let hearts = MAX_HEARTS;
let remaining = [];
let won = false;
let lost = false;
let hintId = null;
let hoverId = null;
let autoRotate = true;
let interacting = false;
let ready = false;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.008);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 200);
const sph = { theta: 0.58, phi: 1.16, r: 40, rMin: 16, rMax: 80 };
const target = new THREE.Vector3(0, 0.2, 0);
let vTheta = 0,
  vPhi = 0;

scene.add(new THREE.HemisphereLight(0x8aa4d8, 0x04060c, 0.55));
scene.add(new THREE.AmbientLight(0x334466, 0.25));
const key = new THREE.DirectionalLight(0xe8f0ff, 0.55);
key.position.set(-8, 16, 10);
scene.add(key);

const root = new THREE.Group();
scene.add(root);

/* ---------- starfield ---------- */
(function makeStars() {
  const n = 700;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 40 + Math.random() * 70;
    const u = Math.random();
    const v = Math.random();
    const th = u * Math.PI * 2;
    const ph = Math.acos(2 * v - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = 0.45 + Math.random() * 0.55;
    col[i * 3] = c * 0.75;
    col[i * 3 + 1] = c * 0.85;
    col[i * 3 + 2] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, m);
  pts.name = "stars";
  scene.add(pts);
})();

/* ---------- dark berry shell ---------- */
function buildShell() {
  const occ = new Set(LEVEL.voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const axes = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const positions = [];
  const normals = [];
  const colors = [];
  const tint = { body: [0.05, 0.07, 0.12], calyx: [0.09, 0.04, 0.12], leaf: [0.04, 0.09, 0.05] };
  for (const v of LEVEL.voxels) {
    for (const n of axes) {
      if (occ.has(`${v.x + n[0]},${v.y + n[1]},${v.z + n[2]}`)) continue;
      const c = [v.x + n[0] * 0.5, v.y + n[1] * 0.5, v.z + n[2] * 0.5];
      let u, vv;
      if (Math.abs(n[0]) === 1) {
        u = [0, 0.5, 0];
        vv = [0, 0, 0.5];
        if (n[0] < 0) vv = [0, 0, -0.5];
      } else if (Math.abs(n[1]) === 1) {
        u = [0.5, 0, 0];
        vv = [0, 0, 0.5];
        if (n[1] < 0) u = [-0.5, 0, 0];
      } else {
        u = [0.5, 0, 0];
        vv = [0, 0.5, 0];
        if (n[2] < 0) u = [-0.5, 0, 0];
      }
      const p00 = [c[0] - u[0] - vv[0], c[1] - u[1] - vv[1], c[2] - u[2] - vv[2]];
      const p10 = [c[0] + u[0] - vv[0], c[1] + u[1] - vv[1], c[2] + u[2] - vv[2]];
      const p11 = [c[0] + u[0] + vv[0], c[1] + u[1] + vv[1], c[2] + u[2] + vv[2]];
      const p01 = [c[0] - u[0] + vv[0], c[1] - u[1] + vv[1], c[2] - u[2] + vv[2]];
      const quads = [p00, p10, p11, p00, p11, p01];
      const t = tint[v.part] || tint.body;
      // slight depth: faces toward the light are a touch brighter
      const lit = 0.7 + 0.55 * Math.max(0, n[0] * -0.35 + n[1] * 0.75 + n[2] * 0.4);
      for (const p of quads) {
        positions.push(...p);
        normals.push(...n);
        colors.push(t[0] * lit, t[1] * lit, t[2] * lit);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.12,
    emissive: new THREE.Color(0x02030a),
    emissiveIntensity: 0.4,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = "shell";
  root.add(mesh);
  return mesh;
}
const shell = buildShell();

/* ---------- arrow polylines ---------- */
const _y = new THREE.Vector3(0, 1, 0);

function faceCenter(c, lift = LIFT) {
  return new THREE.Vector3(c.x + c.nx * lift, c.y + c.ny * lift, c.z + c.nz * lift);
}
function edgeMid(c, d, lift = LIFT) {
  return new THREE.Vector3(
    c.x + c.nx * lift + d[0] * 0.5,
    c.y + c.ny * lift + d[1] * 0.5,
    c.z + c.nz * lift + d[2] * 0.5
  );
}
function tangents(n) {
  const N = new THREE.Vector3(n[0], n[1], n[2]);
  const tmp = Math.abs(N.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(N, tmp).normalize();
  const v = new THREE.Vector3().crossVectors(N, u).normalize();
  return { u, v, n: N };
}
function faceCorners(c) {
  const { u, v, n } = tangents([c.nx, c.ny, c.nz]);
  const ctr = new THREE.Vector3(c.x, c.y, c.z).addScaledVector(n, 0.5);
  return [
    ctr.clone().addScaledVector(u, 0.5).addScaledVector(v, 0.5),
    ctr.clone().addScaledVector(u, 0.5).addScaledVector(v, -0.5),
    ctr.clone().addScaledVector(u, -0.5).addScaledVector(v, 0.5),
    ctr.clone().addScaledVector(u, -0.5).addScaledVector(v, -0.5),
  ];
}
function sharedMid(a, b) {
  const ca = faceCorners(a);
  const cb = faceCorners(b);
  const uniq = [];
  for (const p of ca) {
    for (const q of cb) {
      if (p.distanceTo(q) < 0.08 && !uniq.some((u) => u.distanceTo(p) < 0.05)) uniq.push(p);
    }
  }
  if (uniq.length) {
    const mid = new THREE.Vector3();
    for (const p of uniq) mid.add(p);
    mid.multiplyScalar(1 / uniq.length);
    const n = new THREE.Vector3(a.nx + b.nx, a.ny + b.ny, a.nz + b.nz);
    if (n.lengthSq() > 0.01) n.normalize();
    mid.addScaledVector(n, LIFT - 0.5);
    return mid;
  }
  return faceCenter(a).lerp(faceCenter(b), 0.5);
}

function arrowPolyline(arrow) {
  const cells = arrow.cells;
  const d = new THREE.Vector3(...arrow.dir);
  const pts = [];
  if (cells.length === 1) {
    pts.push(faceCenter(cells[0]).addScaledVector(d, -0.32));
    pts.push(faceCenter(cells[0]).addScaledVector(d, 0.08));
    return { pts, headAt: faceCenter(cells[0]).addScaledVector(d, 0.08) };
  }
  const mids = [];
  for (let i = 0; i < cells.length - 1; i++) mids.push(sharedMid(cells[i], cells[i + 1]));
  // tail
  const tdir = new THREE.Vector3().subVectors(mids[0], faceCenter(cells[0]));
  if (tdir.lengthSq() > 1e-8) tdir.normalize();
  pts.push(faceCenter(cells[0]).addScaledVector(tdir, -0.32));
  for (let i = 0; i < cells.length; i++) {
    const ctr = faceCenter(cells[i]);
    const prev = i === 0 ? pts[0] : mids[i - 1];
    const next = i === cells.length - 1 ? ctr.clone().addScaledVector(d, 0.06) : mids[i];
    const inV = new THREE.Vector3().subVectors(ctr, prev);
    const outV = new THREE.Vector3().subVectors(next, ctr);
    const turn = inV.lengthSq() > 1e-8 && outV.lengthSq() > 1e-8 && inV.normalize().dot(outV.normalize()) < 0.72;
    if (i > 0) pts.push(prev);
    if (turn) pts.push(ctr);
  }
  const headAt = faceCenter(cells[cells.length - 1]).addScaledVector(d, 0.06);
  pts.push(headAt);
  // dedup tiny segments
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distanceTo(clean[clean.length - 1]) > 0.04) clean.push(pts[i]);
  }
  return { pts: clean, headAt };
}

function centroidOf(arrow) {
  const c = new THREE.Vector3();
  for (const f of arrow.cells) c.add(faceCenter(f));
  return c.multiplyScalar(1 / arrow.cells.length);
}

const arrowGeom = LEVEL.arrows.map((a) => {
  const poly = arrowPolyline(a);
  return {
    id: a.id,
    color: a.color,
    part: a.part,
    dir: new THREE.Vector3(...a.dir),
    pts: poly.pts,
    headAt: poly.headAt,
    centroid: centroidOf(a),
    cells: a.cells,
  };
});
const byId = new Map(LEVEL.arrows.map((a) => [a.id, a]));
const geomById = new Map(arrowGeom.map((g) => [g.id, g]));

/* ---------- instanced meshes ---------- */
let segCount = 0;
for (const g of arrowGeom) segCount += Math.max(0, g.pts.length - 1);
const MAX_SEG = segCount + 8;
const MAX_HEAD = LEVEL.arrows.length + 4;

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCone = new THREE.ConeGeometry(0.5, 1, 4); // sharp diamond-ish head
const coreMat = new THREE.MeshBasicMaterial({ toneMapped: false, vertexColors: false });
const glowMat = new THREE.MeshBasicMaterial({
  toneMapped: false,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const coreIM = new THREE.InstancedMesh(unitBox, coreMat, MAX_SEG);
const glowIM = new THREE.InstancedMesh(unitBox, glowMat, MAX_SEG);
const headIM = new THREE.InstancedMesh(unitCone, coreMat.clone(), MAX_HEAD);
const headGlowIM = new THREE.InstancedMesh(unitCone, glowMat.clone(), MAX_HEAD);
headGlowIM.material.opacity = 0.4;
for (const m of [coreIM, glowIM, headIM, headGlowIM]) {
  m.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(m);
}

// slightly thicker invisible pick mesh
const pickMat = new THREE.MeshBasicMaterial({ visible: false });
const pickIM = new THREE.InstancedMesh(unitBox, pickMat, MAX_SEG);
pickIM.frustumCulled = false;
root.add(pickIM);

const dummy = new THREE.Object3D();
const tmpQ = new THREE.Quaternion();
const tmpC = new THREE.Color();

const ranges = new Map(); // id -> {seg0, segs, head}

function placeSegment(mesh, index, a, b, w) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-5) return false;
  dummy.position.copy(a).add(b).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(_y, dir.normalize());
  dummy.scale.set(w, len, w);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  return true;
}
function placeHead(mesh, index, at, dir, w, len) {
  dummy.position.copy(at).addScaledVector(dir, len * 0.52);
  dummy.quaternion.setFromUnitVectors(_y, dir);
  dummy.scale.set(w, len, w);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function hexColor(hex) {
  tmpC.set(hex);
  // Lift mid/shadow tones so the maze stays neon-readable on black.
  tmpC.r = Math.min(1, tmpC.r * 1.18 + 0.05);
  tmpC.g = Math.min(1, tmpC.g * 1.16 + 0.04);
  tmpC.b = Math.min(1, tmpC.b * 1.12 + 0.05);
  return tmpC;
}

function packAll(visibleSet) {
  let si = 0,
    hi = 0;
  ranges.clear();
  for (const g of arrowGeom) {
    if (visibleSet && !visibleSet.has(g.id)) continue;
    const rec = { seg0: si, segs: 0, head: hi, base: [] };
    const col = hexColor(g.color);
    for (let i = 0; i < g.pts.length - 1; i++) {
      if (placeSegment(coreIM, si, g.pts[i], g.pts[i + 1], CORE_W)) {
        placeSegment(glowIM, si, g.pts[i], g.pts[i + 1], GLOW_W);
        placeSegment(pickIM, si, g.pts[i], g.pts[i + 1], 0.55);
        coreIM.setColorAt(si, col);
        glowIM.setColorAt(si, col);
        pickIM.setColorAt?.(si, col);
        rec.base.push({ a: g.pts[i].clone(), b: g.pts[i + 1].clone() });
        rec.segs++;
        si++;
      }
    }
    placeHead(headIM, hi, g.headAt, g.dir, HEAD_W, HEAD_LEN);
    placeHead(headGlowIM, hi, g.headAt, g.dir, HEAD_W * 1.55, HEAD_LEN * 1.15);
    headIM.setColorAt(hi, col);
    headGlowIM.setColorAt(hi, col);
    rec.headAt = g.headAt.clone();
    rec.dir = g.dir.clone();
    ranges.set(g.id, rec);
    hi++;
  }
  coreIM.count = si;
  glowIM.count = si;
  pickIM.count = si;
  headIM.count = hi;
  headGlowIM.count = hi;
  coreIM.instanceMatrix.needsUpdate = true;
  glowIM.instanceMatrix.needsUpdate = true;
  pickIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  headGlowIM.instanceMatrix.needsUpdate = true;
  if (coreIM.instanceColor) coreIM.instanceColor.needsUpdate = true;
  if (glowIM.instanceColor) glowIM.instanceColor.needsUpdate = true;
  if (headIM.instanceColor) headIM.instanceColor.needsUpdate = true;
  if (headGlowIM.instanceColor) headGlowIM.instanceColor.needsUpdate = true;
}

function hideArrow(id) {
  const rec = ranges.get(id);
  if (!rec) return;
  dummy.scale.set(0, 0, 0);
  dummy.position.set(0, 0, 0);
  dummy.quaternion.identity();
  dummy.updateMatrix();
  for (let i = 0; i < rec.segs; i++) {
    coreIM.setMatrixAt(rec.seg0 + i, dummy.matrix);
    glowIM.setMatrixAt(rec.seg0 + i, dummy.matrix);
    pickIM.setMatrixAt(rec.seg0 + i, dummy.matrix);
  }
  headIM.setMatrixAt(rec.head, dummy.matrix);
  headGlowIM.setMatrixAt(rec.head, dummy.matrix);
  coreIM.instanceMatrix.needsUpdate = true;
  glowIM.instanceMatrix.needsUpdate = true;
  pickIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  headGlowIM.instanceMatrix.needsUpdate = true;
}

function tintArrow(id, color, glowBoost = false) {
  const rec = ranges.get(id);
  if (!rec) return;
  const c = hexColor(color);
  for (let i = 0; i < rec.segs; i++) {
    coreIM.setColorAt(rec.seg0 + i, c);
    glowIM.setColorAt(rec.seg0 + i, c);
  }
  headIM.setColorAt(rec.head, c);
  headGlowIM.setColorAt(rec.head, c);
  coreIM.instanceColor.needsUpdate = true;
  glowIM.instanceColor.needsUpdate = true;
  headIM.instanceColor.needsUpdate = true;
  headGlowIM.instanceColor.needsUpdate = true;
  if (glowBoost) glowIM.material.opacity = 0.5;
}

function restoreTint(id) {
  const g = geomById.get(id);
  if (g) tintArrow(id, g.color);
}

/* ---------- particles ---------- */
const sparkTex = (() => {
  const g = document.createElement("canvas");
  g.width = 64;
  g.height = 64;
  const ctx = g.getContext("2d");
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.4, "rgba(180,220,255,0.65)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(g);
})();

const sparks = [];
function spawnSparks(origin, dir, color, n, speed = 6) {
  const col = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({
      map: sparkTex,
      color: col,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(origin);
    s.scale.setScalar(0.18 + Math.random() * 0.28);
    const v = dir
      .clone()
      .multiplyScalar(speed * (0.6 + Math.random()))
      .add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3.2));
    sparks.push({ sprite: s, v, life: 0.3 + Math.random() * 0.35, age: 0, mat });
    scene.add(s);
  }
}

function spawnConfetti() {
  const palette = [0x9ec5ff, 0xffffff, 0xb14cff, 0x3edc5a, 0x7eb0ff, 0xffe08a];
  for (let i = 0; i < 120; i++) {
    const col = palette[i % palette.length];
    const mat = new THREE.SpriteMaterial({
      map: sparkTex,
      color: col,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(target);
    s.scale.setScalar(0.25 + Math.random() * 0.4);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5)
      .normalize()
      .multiplyScalar(6 + Math.random() * 8);
    sparks.push({ sprite: s, v, life: 0.9 + Math.random() * 0.7, age: 0, mat, gravity: 6 });
    scene.add(s);
  }
}

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.age += dt;
    const t = s.age / s.life;
    if (t >= 1) {
      scene.remove(s.sprite);
      s.mat.dispose();
      sparks.splice(i, 1);
      continue;
    }
    s.sprite.position.addScaledVector(s.v, dt);
    s.v.y -= (s.gravity || 2) * dt;
    s.sprite.material.opacity = 1 - t * t;
    s.sprite.scale.setScalar(0.15 + 0.35 * (1 - t));
  }
}

/* ---------- fly / shake animations ---------- */
const flyers = [];
const tweens = [];
function animateTo(obj, dur, fn, onDone) {
  tweens.push({ obj, dur, t: 0, fn, onDone });
}
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    tw.fn(tw.obj, tw.t);
    if (tw.t >= 1) {
      if (tw.onDone) tw.onDone();
      tweens.splice(i, 1);
    }
  }
}
function easeIn(t) {
  return t * t * t;
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function flyOff(id, instant) {
  const rec = ranges.get(id);
  const g = geomById.get(id);
  if (!g) return;
  if (!instant) spawnSparks(g.headAt, g.dir, g.color, 14, 7);
  if (instant || !rec) {
    hideArrow(id);
    return;
  }
  const startMats = [];
  for (let i = 0; i < rec.segs; i++) {
    const m = new THREE.Matrix4();
    coreIM.getMatrixAt(rec.seg0 + i, m);
    startMats.push(m.clone());
  }
  const headM = new THREE.Matrix4();
  headIM.getMatrixAt(rec.head, headM);
  const headMG = new THREE.Matrix4();
  headGlowIM.getMatrixAt(rec.head, headMG);
  const pos = new THREE.Vector3();
  flyers.push({ id, rec, startMats, headM, headMG, t: 0, dur: 0.42, dir: g.dir.clone(), color: g.color });
}

function updateFlyers(dt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.t += dt / f.dur;
    const k = easeIn(Math.min(1, f.t));
    const off = f.dir.clone().multiplyScalar(k * 10);
    const _m = new THREE.Matrix4();
    const _p = new THREE.Vector3(),
      _q = new THREE.Quaternion(),
      _s = new THREE.Vector3();
    for (let s = 0; s < f.rec.segs; s++) {
      f.startMats[s].decompose(_p, _q, _s);
      _p.add(off);
      if (f.t > 0.45) _s.multiplyScalar(1 - (Math.min(1, f.t) - 0.45) / 0.55);
      dummy.position.copy(_p);
      dummy.quaternion.copy(_q);
      dummy.scale.copy(_s);
      dummy.updateMatrix();
      coreIM.setMatrixAt(f.rec.seg0 + s, dummy.matrix);
      dummy.scale.set(_s.x * (GLOW_W / CORE_W), _s.y, _s.z * (GLOW_W / CORE_W));
      dummy.updateMatrix();
      glowIM.setMatrixAt(f.rec.seg0 + s, dummy.matrix);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      pickIM.setMatrixAt(f.rec.seg0 + s, dummy.matrix);
    }
    f.headM.decompose(_p, _q, _s);
    _p.add(off);
    dummy.position.copy(_p);
    dummy.quaternion.copy(_q);
    dummy.scale.copy(_s);
    dummy.updateMatrix();
    headIM.setMatrixAt(f.rec.head, dummy.matrix);
    dummy.scale.multiplyScalar(1.55);
    dummy.updateMatrix();
    headGlowIM.setMatrixAt(f.rec.head, dummy.matrix);
    coreIM.instanceMatrix.needsUpdate = true;
    glowIM.instanceMatrix.needsUpdate = true;
    pickIM.instanceMatrix.needsUpdate = true;
    headIM.instanceMatrix.needsUpdate = true;
    headGlowIM.instanceMatrix.needsUpdate = true;
    if (f.t > 0.15 && f.t < 0.7 && Math.random() < 0.4) {
      spawnSparks(geomById.get(f.id).headAt.clone().add(off), f.dir, f.color, 1, 4);
    }
    if (f.t >= 1) {
      hideArrow(f.id);
      flyers.splice(i, 1);
    }
  }
}

function shakeFlash(id) {
  const rec = ranges.get(id);
  const g = geomById.get(id);
  if (!rec || !g) return;
  tintArrow(id, "#ff3355");
  const base = rec.base;
  const t0 = performance.now();
  animateTo(
    rec,
    0.28,
    (_, t) => {
      const s = Math.sin(t * Math.PI * 10) * (1 - t) * 0.12;
      const shake = new THREE.Vector3(s, 0, s * 0.4);
      for (let i = 0; i < rec.segs; i++) {
        const a = base[i].a.clone().add(shake);
        const b = base[i].b.clone().add(shake);
        placeSegment(coreIM, rec.seg0 + i, a, b, CORE_W);
        placeSegment(glowIM, rec.seg0 + i, a, b, GLOW_W);
      }
      coreIM.instanceMatrix.needsUpdate = true;
      glowIM.instanceMatrix.needsUpdate = true;
    },
    () => {
      for (let i = 0; i < rec.segs; i++) {
        placeSegment(coreIM, rec.seg0 + i, base[i].a, base[i].b, CORE_W);
        placeSegment(glowIM, rec.seg0 + i, base[i].a, base[i].b, GLOW_W);
      }
      coreIM.instanceMatrix.needsUpdate = true;
      glowIM.instanceMatrix.needsUpdate = true;
      restoreTint(id);
    }
  );
}

/* ---------- camera ---------- */
function applyCamera() {
  const { theta, phi, r } = sph;
  camera.position.set(
    target.x + r * Math.sin(phi) * Math.sin(theta),
    target.y + r * Math.cos(phi),
    target.z + r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
}

function fitCamera() {
  // Fit the dark shell only so stars, sparks and unused instances cannot
  // push the camera out into the void.
  if (!shell.geometry.boundingSphere) shell.geometry.computeBoundingSphere();
  const s = shell.geometry.boundingSphere.clone();
  target.copy(s.center);
  const fov = (camera.fov * Math.PI) / 180;
  const aspect = Math.max(0.3, camera.aspect);
  const uiPad = 0.78;
  const vFov = 2 * Math.atan(Math.tan(fov / 2) * uiPad);
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const margin = 1.04;
  const distV = (s.radius * margin) / Math.sin(vFov / 2);
  const distH = (s.radius * margin) / Math.sin(hFov / 2);
  sph.r = Math.max(distV, distH) * 0.70;
  sph.rMin = sph.r * 0.45;
  sph.rMax = sph.r * 2.4;
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  fitCamera();
}
window.addEventListener("resize", resize);

/* ---------- UI ---------- */
function heartSvg(on) {
  const fill = on ? "#ff4d75" : "#3a2430";
  const glow = on ? "filter:drop-shadow(0 0 5px #ff4d75cc)" : "opacity:.5";
  return `<svg width="20" height="18" viewBox="0 0 24 24" aria-hidden="true" style="${glow}"><path fill="${fill}" d="M12 21s-6.7-4.35-9.33-8.1C.5 10.1.7 6.5 3.5 4.9 5.7 3.6 8.3 4.2 12 7.3c3.7-3.1 6.3-3.7 8.5-2.4 2.8 1.6 3 5.2.83 8C18.7 16.65 12 21 12 21z"/></svg>`;
}
function renderHearts() {
  heartsEl.innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => heartSvg(i < hearts)).join("");
  heartsEl.setAttribute("aria-label", `${hearts} hearts`);
}
function renderProgress() {
  const n = remaining.length;
  const total = LEVEL.arrows.length;
  const done = total - n;
  countEl.innerHTML = `${n}<small>${n === 1 ? "line" : "left"}</small>`;
  const frac = total ? done / total : 0;
  ringEl.style.strokeDashoffset = String(RING_C * (1 - frac));
  progressFill.style.width = `${frac * 100}%`;
}
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 900);
}
function showOverlay(title, body) {
  ovTitle.textContent = title;
  ovBody.textContent = body;
  overlay.classList.add("show");
}
function hideOverlay() {
  overlay.classList.remove("show");
}

function setRemainingFromLevel() {
  remaining = LEVEL.arrows.map((a) => ({
    id: a.id,
    cells: a.cells,
    dir: a.dir.slice(),
    color: a.color,
    part: a.part,
  }));
}

function restart() {
  hearts = MAX_HEARTS;
  won = false;
  lost = false;
  hintId = null;
  hoverId = null;
  hideOverlay();
  setRemainingFromLevel();
  packAll(new Set(remaining.map((a) => a.id)));
  shell.material.emissiveIntensity = 0.4;
  renderHearts();
  renderProgress();
  hintline.textContent = "Drag to turn · Pinch to zoom · Tap an arrow";
}

function checkEnd() {
  if (remaining.length === 0 && !won) {
    won = true;
    const kept = hearts;
    spawnConfetti();
    animateTo(
      shell,
      0.8,
      (_, t) => {
        shell.material.emissive = new THREE.Color(0x15204a);
        shell.material.emissiveIntensity = 0.5 + 1.4 * t;
        shell.material.color = new THREE.Color(1.2 + 0.5 * t, 1.2 + 0.5 * t, 1.2 + 0.5 * t);
      }
    );
    setTimeout(() => {
      showOverlay(
        "Berry cleared!",
        `${LEVEL.arrows.length} lines · ${kept} ${kept === 1 ? "heart" : "hearts"} left`
      );
      hintline.textContent = "Nice work";
    }, 420);
  }
}

function tryFire(id, instant = false) {
  if (won || lost) return { ok: false, reason: "ended" };
  const arrow = remaining.find((a) => a.id === id);
  if (!arrow) return { ok: false, reason: "missing" };
  if (!canFireArrow(arrow, remaining)) {
    if (!instant) {
      shakeFlash(id);
      hearts = Math.max(0, hearts - 1);
      renderHearts();
      showToast("Blocked");
      if (hearts <= 0) {
        lost = true;
        showOverlay("Out of hearts", "A blocked arrow costs a heart. Try a different angle — or restart.");
      }
    }
    return { ok: false, reason: "blocked" };
  }
  remaining = remaining.filter((a) => a.id !== id);
  if (hintId === id) hintId = null;
  if (hoverId === id) hoverId = null;
  flyOff(id, instant);
  renderProgress();
  checkEnd();
  return { ok: true };
}

function lookAtArrow(arrow) {
  const g = geomById.get(arrow.id);
  const c = g ? g.centroid.clone() : target.clone();
  const dir = new THREE.Vector3(...arrow.dir).normalize();
  const back = dir.clone().multiplyScalar(-1);
  back.y = 0;
  if (back.lengthSq() < 0.1) back.set(0.55, 0, 0.65);
  back.normalize();
  const wish = c.clone().addScaledVector(back, sph.r * 0.85).add(new THREE.Vector3(0, sph.r * 0.35, 0));
  const rel = wish.sub(target);
  const r = Math.max(sph.rMin, Math.min(sph.rMax, rel.length()));
  const phi = Math.acos(Math.max(-1, Math.min(1, rel.y / r)));
  const theta = Math.atan2(rel.x, rel.z);
  const from = { theta: sph.theta, phi: sph.phi, r: sph.r };
  let toTheta = theta;
  while (toTheta - from.theta > Math.PI) toTheta -= Math.PI * 2;
  while (toTheta - from.theta < -Math.PI) toTheta += Math.PI * 2;
  autoRotate = false;
  animateTo(sph, 0.65, (_, t) => {
    const k = easeOut(t);
    sph.theta = from.theta + (toTheta - from.theta) * k;
    sph.phi = from.phi + (phi - from.phi) * k;
    sph.r = from.r + (r - from.r) * k;
  });
}

function doHint() {
  if (won || lost) return;
  const pick = bestHint(remaining);
  if (!pick) {
    showToast("No clear arrow?");
    return;
  }
  hintId = pick.id;
  lookAtArrow(pick);
  hintline.textContent = "This arrow has a clear path out";
}

hintBtn.addEventListener("click", doHint);
restartBtn.addEventListener("click", () => {
  autoRotate = false;
  restart();
});
ovBtn.addEventListener("click", restart);
infoBtn.addEventListener("click", () => info.classList.add("show"));
infoClose.addEventListener("click", () => info.classList.remove("show"));
info.addEventListener("click", (e) => {
  if (e.target === info) info.classList.remove("show");
});

/* ---------- picking & orbit ---------- */
const raycaster = new THREE.Raycaster();
raycaster.params.Line = { threshold: 0.4 };
const ptr = new THREE.Vector2();
let dragging = false;
let moved = false;
let lastX = 0,
  lastY = 0,
  lastDist = 0,
  lastT = 0;
const pointers = new Map();

function setPtr(x, y) {
  ptr.x = (x / window.innerWidth) * 2 - 1;
  ptr.y = -(y / window.innerHeight) * 2 + 1;
}

function pickArrowAt(x, y) {
  setPtr(x, y);
  raycaster.setFromCamera(ptr, camera);
  const hits = raycaster.intersectObject(pickIM, false);
  if (!hits.length) return null;
  const inst = hits[0].instanceId;
  if (inst == null) return null;
  for (const [id, rec] of ranges) {
    if (inst >= rec.seg0 && inst < rec.seg0 + rec.segs) {
      if (!remaining.some((a) => a.id === id)) return null;
      return id;
    }
  }
  return null;
}

function setHover(id) {
  if (hoverId === id) return;
  if (hoverId != null && hoverId !== hintId) restoreTint(hoverId);
  hoverId = id;
  if (id != null) tintArrow(id, "#ffffff");
}

function pinchDist() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

canvas.addEventListener("pointerdown", (e) => {
  autoRotate = false;
  interacting = true;
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    vTheta = 0;
    vPhi = 0;
    const id = pickArrowAt(e.clientX, e.clientY);
    if (id != null) setHover(id);
  } else {
    lastDist = pinchDist();
    dragging = false;
    setHover(null);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) {
    // desktop hover
    if (!interacting && e.pointerType === "mouse") setHover(pickArrowAt(e.clientX, e.clientY));
    return;
  }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const d = pinchDist();
    if (lastDist > 0 && d > 0) sph.r = Math.max(sph.rMin, Math.min(sph.rMax, sph.r / (d / lastDist)));
    lastDist = d;
    moved = true;
    return;
  }
  if (!dragging) return;
  const now = performance.now();
  const dt = Math.max(8, now - lastT);
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  if (Math.hypot(dx, dy) > 7) {
    moved = true;
    if (hoverId != null) setHover(null);
  }
  lastX = e.clientX;
  lastY = e.clientY;
  lastT = now;
  const k = 0.0076;
  sph.theta -= dx * k;
  sph.phi = Math.max(0.22, Math.min(Math.PI - 0.22, sph.phi - dy * k));
  vTheta = (-dx * k) / (dt / 1000);
  vPhi = (-dy * k) / (dt / 1000);
});

function endPointer(e) {
  const wasOne = pointers.size === 1;
  const pt = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch (_) {}
  if (pointers.size < 2) lastDist = 0;
  if (pointers.size === 0) {
    dragging = false;
    interacting = false;
    // clamp spin
    const cap = 2.8;
    vTheta = Math.max(-cap, Math.min(cap, vTheta));
    vPhi = Math.max(-cap, Math.min(cap, vPhi));
    if (wasOne && !moved && pt && !overlay.classList.contains("show") && !info.classList.contains("show")) {
      const aid = pickArrowAt(pt.x, pt.y);
      setHover(null);
      if (aid != null) tryFire(aid);
    } else {
      setHover(null);
    }
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", (e) => {
  if (!interacting) setHover(null);
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    autoRotate = false;
    const k = Math.exp(e.deltaY * 0.0014);
    sph.r = Math.max(sph.rMin, Math.min(sph.rMax, sph.r * k));
  },
  { passive: false }
);

/* ---------- frame ---------- */
let last = performance.now();
let fpsFrames = 0,
  fpsT = 0,
  fpsVal = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (autoRotate && !interacting) sph.theta += dt * 0.18;
  if (!dragging && !interacting) {
    sph.theta += vTheta * dt;
    sph.phi = Math.max(0.22, Math.min(Math.PI - 0.22, sph.phi + vPhi * dt));
    const damp = Math.exp(-dt * 3.2);
    vTheta *= damp;
    vPhi *= damp;
  }
  updateTweens(dt);
  updateFlyers(dt);
  updateSparks(dt);
  if (hintId != null && ranges.has(hintId)) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
    const g = geomById.get(hintId);
    if (g) {
      const c = new THREE.Color(g.color).lerp(new THREE.Color(0xffffff), 0.35 + 0.4 * pulse);
      tintArrow(hintId, `#${c.getHexString()}`);
    }
  }
  applyCamera();
  renderer.render(scene, camera);
  if (DEBUG) {
    fpsFrames++;
    fpsT += dt;
    if (fpsT >= 0.5) {
      fpsVal = fpsFrames / fpsT;
      fpsEl.textContent = `${fpsVal.toFixed(0)} fps · ${coreIM.count} segs · ${headIM.count} heads`;
      fpsFrames = 0;
      fpsT = 0;
    }
  }
  ready = true;
  requestAnimationFrame(frame);
}

setRemainingFromLevel();
packAll(new Set(remaining.map((a) => a.id)));
renderHearts();
renderProgress();
resize();
applyCamera();
requestAnimationFrame(frame);

window.__game = {
  EXIT_RULE_TEXT,
  get ready() {
    return ready;
  },
  getState() {
    return {
      hearts,
      remaining: remaining.length,
      total: LEVEL.arrows.length,
      won,
      lost,
      legal: legalMoves(remaining).map((a) => a.id),
      theta: sph.theta,
      phi: sph.phi,
      r: sph.r,
      segs: coreIM.count,
      heads: headIM.count,
      fps: fpsVal,
    };
  },
  setView({ theta, phi, r, auto } = {}) {
    if (theta != null) sph.theta = theta;
    if (phi != null) sph.phi = phi;
    if (r != null) sph.r = Math.max(sph.rMin, Math.min(sph.rMax, r));
    if (auto != null) autoRotate = !!auto;
  },
  fit: fitCamera,
  fire(id, instant = false) {
    return tryFire(id, instant);
  },
  fireLegal(instant = false) {
    const m = legalMoves(remaining);
    if (!m.length) return { ok: false };
    return tryFire(m[0].id, instant);
  },
  fireMany(n, instant = true) {
    const ids = [];
    for (let i = 0; i < n; i++) {
      const m = legalMoves(remaining);
      if (!m.length) break;
      tryFire(m[0].id, instant);
      ids.push(m[0].id);
    }
    return ids;
  },
  solveAll(instant = true) {
    const ids = [];
    while (remaining.length) {
      const m = legalMoves(remaining);
      if (!m.length) break;
      tryFire(m[0].id, instant);
      ids.push(m[0].id);
    }
    return ids;
  },
  hint: doHint,
  restart,
  hideChrome(hide) {
    document.querySelector("header").style.visibility = hide ? "hidden" : "";
    document.querySelector("footer").style.visibility = hide ? "hidden" : "";
    document.getElementById("vignette").style.visibility = hide ? "hidden" : "";
    document.getElementById("progressBar").style.visibility = hide ? "hidden" : "";
  },
};

console.info("Arrow Trails 3D · Blueberry v2", LEVEL.stats, EXIT_RULE_TEXT);
