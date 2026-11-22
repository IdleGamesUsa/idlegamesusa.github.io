import * as THREE from "./vendor/three.module.min.js";
import { canFireArrow, legalMoves, keyF, inPlaneDirs, eq, neg, EXIT_RULE_TEXT } from "./puzzle.js";
import { LEVEL } from "./level.js";

const canvas = document.getElementById("c");
const heartsEl = document.getElementById("hearts");
const countEl = document.getElementById("count");
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

const MAX_HEARTS = 3;
const CUBE = 0.92;
const ARROW_R = 0.145;
const GLOW_R = 0.34;

let hearts = MAX_HEARTS;
let remaining = [];
let won = false;
let lost = false;
let hintId = null;
let autoRotate = true;
let interacting = false;

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
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.012);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 160);
const sph = { theta: 0.62, phi: 1.18, r: 26 };
const target = new THREE.Vector3(0.15, 0.1, 0);

scene.add(new THREE.HemisphereLight(0x9eb6ff, 0x0a1020, 0.85));
scene.add(new THREE.AmbientLight(0x6a7aaa, 0.55));
const key = new THREE.DirectionalLight(0xfff4e8, 1.55);
key.position.set(-6, 14, 9);
scene.add(key);
const fill = new THREE.DirectionalLight(0x8aa4ff, 0.55);
fill.position.set(8, 2, -6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xc5d4ff, 0.4);
rim.position.set(0, -8, 6);
scene.add(rim);

const root = new THREE.Group();
scene.add(root);

function makeGroundGlow() {
  const g = document.createElement("canvas");
  g.width = 256;
  g.height = 256;
  const ctx = g.getContext("2d");
  const grd = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, "rgba(80,120,220,0.28)");
  grd.addColorStop(0.4, "rgba(40,60,140,0.12)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(g);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -6.2;
  scene.add(mesh);
}
makeGroundGlow();

function mergeGeometries(geos) {
  let nPos = 0,
    nIdx = 0;
  for (const g of geos) {
    nPos += g.getAttribute("position").count;
    nIdx += g.index ? g.index.count : g.getAttribute("position").count;
  }
  const pos = new Float32Array(nPos * 3);
  const nrm = new Float32Array(nPos * 3);
  const col = new Float32Array(nPos * 3);
  const idx = new Uint32Array(nIdx);
  let po = 0,
    io = 0,
    vo = 0;
  for (const g of geos) {
    const p = g.getAttribute("position");
    const n = g.getAttribute("normal");
    const c = g.getAttribute("color");
    for (let i = 0; i < p.count; i++) {
      pos[po] = p.getX(i);
      nrm[po] = n ? n.getX(i) : 0;
      col[po] = c ? c.getX(i) : 1;
      po++;
      pos[po] = p.getY(i);
      nrm[po] = n ? n.getY(i) : 1;
      col[po] = c ? c.getY(i) : 1;
      po++;
      pos[po] = p.getZ(i);
      nrm[po] = n ? n.getZ(i) : 0;
      col[po] = c ? c.getZ(i) : 1;
      po++;
    }
    if (g.index) {
      const ix = g.index;
      for (let i = 0; i < ix.count; i++) idx[io++] = ix.getX(i) + vo;
    } else {
      for (let i = 0; i < p.count; i++) idx[io++] = vo + i;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

function colorGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function buildVoxels() {
  const groups = { body: [], calyx: [], leaf: [] };
  const box = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
  for (const v of LEVEL.voxels) {
    const g = box.clone();
    g.translate(v.x, v.y, v.z);
    colorGeo(g, v.color);
    groups[v.part].push(g);
  }
  box.dispose();
  const mats = {
    body: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.08,
      envMapIntensity: 0.4,
    }),
    calyx: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.04,
    }),
    leaf: new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.03,
    }),
  };
  for (const part of ["body", "calyx", "leaf"]) {
    if (!groups[part].length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(groups[part]), mats[part]);
    mesh.name = "berry-" + part;
    root.add(mesh);
  }
}

function hexToColor(hex) {
  return new THREE.Color(hex);
}

function lighten(hex, amt) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * (1 - amt) + amt);
  c.g = Math.min(1, c.g * (1 - amt) + amt);
  c.b = Math.min(1, c.b * (1 - amt) + amt);
  return c;
}

const _y = new THREE.Vector3(0, 1, 0);
function orientY(obj, from, to) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 1e-5) return 0;
  obj.position.copy(from).add(to).multiplyScalar(0.5);
  obj.quaternion.setFromUnitVectors(_y, dir.normalize());
  return len;
}

function faceCenter(c, lift = 0.52) {
  return new THREE.Vector3(c.x + c.nx * lift, c.y + c.ny * lift, c.z + c.nz * lift);
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
  const hits = [];
  for (const p of ca) {
    for (const q of cb) {
      if (p.distanceTo(q) < 0.08) hits.push(p);
    }
  }
  if (hits.length) {
    const mid = new THREE.Vector3();
    const uniq = [];
    for (const p of hits) {
      if (!uniq.some((u) => u.distanceTo(p) < 0.05)) uniq.push(p);
    }
    for (const p of uniq) mid.add(p);
    mid.multiplyScalar(1 / uniq.length);
    const n = new THREE.Vector3(a.nx + b.nx, a.ny + b.ny, a.nz + b.nz);
    if (n.lengthSq() > 0.01) n.normalize();
    mid.addScaledVector(n, 0.08);
    return mid;
  }
  return faceCenter(a).lerp(faceCenter(b), 0.5);
}

function arrowPolyline(arrow) {
  const cells = arrow.cells;
  const pts = [];
  if (cells.length === 1) {
    const c = cells[0];
    const d = new THREE.Vector3(...arrow.dir);
    const mid = faceCenter(c);
    pts.push(mid.clone().addScaledVector(d, -0.28));
    pts.push(mid.clone().addScaledVector(d, 0.18));
    return pts;
  }
  const first = cells[0];
  const d0 = new THREE.Vector3().subVectors(sharedMid(cells[0], cells[1]), faceCenter(first));
  if (d0.lengthSq() > 1e-6) d0.normalize();
  pts.push(faceCenter(first).addScaledVector(d0, -0.16));
  pts.push(faceCenter(first));
  for (let i = 0; i < cells.length - 1; i++) {
    pts.push(sharedMid(cells[i], cells[i + 1]));
    pts.push(faceCenter(cells[i + 1]));
  }
  const last = cells[cells.length - 1];
  const d = new THREE.Vector3(...arrow.dir);
  pts.push(faceCenter(last).addScaledVector(d, 0.16));
  return pts;
}

function transformed(geo, fn) {
  fn(geo);
  geo.computeVertexNormals();
  return geo;
}

function cylBetween(p1, p2, r) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  if (len < 1e-4) return null;
  const geo = new THREE.CylinderGeometry(r, r, len, 8, 1, false);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(_y, dir.normalize());
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
  geo.applyMatrix4(m);
  return geo;
}

function sphereAt(p, r) {
  const geo = new THREE.SphereGeometry(r, 8, 6);
  geo.translate(p.x, p.y, p.z);
  return geo;
}

const arrowGroups = new Map();
function matsFor(color) {
  // Per-arrow materials so flash/fade never tints a neighbor.
  const core = new THREE.MeshBasicMaterial({
    color: lighten(color, 0.18),
    toneMapped: false,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: hexToColor(color),
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return { core, glow };
}

function buildArrow(arrow) {
  const pts = arrowPolyline(arrow);
  const cores = [];
  const glows = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const c = cylBetween(pts[i], pts[i + 1], ARROW_R);
    const g = cylBetween(pts[i], pts[i + 1], GLOW_R);
    if (c) cores.push(c);
    if (g) glows.push(g);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    cores.push(sphereAt(pts[i], ARROW_R * 1.02));
    glows.push(sphereAt(pts[i], GLOW_R * 0.95));
  }
  const headPos = pts[pts.length - 1];
  const dir = new THREE.Vector3(...arrow.dir).normalize();
  const coneH = 0.48;
  const cone = new THREE.ConeGeometry(0.26, coneH, 10);
  const tip = headPos.clone().addScaledVector(dir, coneH * 0.55);
  const q = new THREE.Quaternion().setFromUnitVectors(_y, dir);
  cone.applyMatrix4(new THREE.Matrix4().compose(tip, q, new THREE.Vector3(1, 1, 1)));
  cores.push(cone);
  const coneG = new THREE.ConeGeometry(0.42, coneH * 1.15, 10);
  const tipG = headPos.clone().addScaledVector(dir, coneH * 0.55);
  coneG.applyMatrix4(new THREE.Matrix4().compose(tipG, q, new THREE.Vector3(1, 1, 1)));
  glows.push(coneG);

  const { core, glow } = matsFor(arrow.color);
  const group = new THREE.Group();
  group.name = "arrow-" + arrow.id;
  group.userData.arrowId = arrow.id;
  const coreMesh = new THREE.Mesh(mergeGeometries(cores), core);
  const glowMesh = new THREE.Mesh(mergeGeometries(glows), glow);
  glowMesh.renderOrder = 1;
  coreMesh.userData.arrowId = arrow.id;
  glowMesh.userData.arrowId = arrow.id;
  group.add(glowMesh);
  group.add(coreMesh);
  const centroid = new THREE.Vector3();
  for (const c of arrow.cells) centroid.add(faceCenter(c));
  centroid.multiplyScalar(1 / arrow.cells.length);
  group.userData.centroid = centroid;
  group.userData.dir = dir.clone();
  group.userData.color = arrow.color;
  root.add(group);
  arrowGroups.set(arrow.id, group);
  return group;
}

buildVoxels();

function resetArrows() {
  for (const g of arrowGroups.values()) {
    root.remove(g);
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  arrowGroups.clear();
  for (const a of LEVEL.arrows) buildArrow(a);
}

resetArrows();

const sparkTex = (() => {
  const g = document.createElement("canvas");
  g.width = 64;
  g.height = 64;
  const ctx = g.getContext("2d");
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(180,220,255,0.7)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(g);
})();

const sparks = [];
function spawnSparks(origin, dir, color, n = 16) {
  const col = lighten(color, 0.4);
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
    s.scale.setScalar(0.25 + Math.random() * 0.35);
    const v = dir
      .clone()
      .multiplyScalar(4 + Math.random() * 7)
      .add(
        new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3.5)
      );
    sparks.push({ sprite: s, v, life: 0.35 + Math.random() * 0.35, age: 0, mat });
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
    s.v.y -= 2 * dt;
    s.sprite.material.opacity = 1 - t;
    const sc = 0.2 + 0.4 * (1 - t);
    s.sprite.scale.setScalar(sc);
  }
}

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

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
function easeIn(t) {
  return t * t * t;
}

function applyCamera() {
  const { theta, phi, r } = sph;
  camera.position.set(
    target.x + r * Math.sin(phi) * Math.sin(theta),
    target.y + r * Math.cos(phi),
    target.z + r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(target);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);

function heartSvg(on) {
  const fill = on ? "#ff4d75" : "#3a2430";
  const glow = on ? "filter:drop-shadow(0 0 5px #ff4d75cc)" : "opacity:.55";
  return `<svg width="20" height="18" viewBox="0 0 24 24" aria-hidden="true" style="${glow}"><path fill="${fill}" d="M12 21s-6.7-4.35-9.33-8.1C.5 10.1.7 6.5 3.5 4.9 5.7 3.6 8.3 4.2 12 7.3c3.7-3.1 6.3-3.7 8.5-2.4 2.8 1.6 3 5.2.83 8C18.7 16.65 12 21 12 21z"/></svg>`;
}
function renderHearts() {
  heartsEl.innerHTML = Array.from({ length: MAX_HEARTS }, (_, i) => heartSvg(i < hearts)).join("");
  heartsEl.setAttribute("aria-label", `${hearts} hearts`);
}

function renderCount() {
  const n = remaining.length;
  countEl.innerHTML = `${n}<small>${n === 1 ? "line left" : "left"}</small>`;
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
  hideOverlay();
  setRemainingFromLevel();
  resetArrows();
  renderHearts();
  renderCount();
  hintline.textContent = "Drag to turn · Pinch to zoom · Tap an arrow";
}

function centroidOf(arrow) {
  const g = arrowGroups.get(arrow.id);
  if (g) return g.userData.centroid.clone();
  const c = new THREE.Vector3();
  for (const f of arrow.cells) c.add(faceCenter(f));
  return c.multiplyScalar(1 / arrow.cells.length);
}

function flyOff(arrow, instant) {
  const g = arrowGroups.get(arrow.id);
  if (!g) return;
  const dir = new THREE.Vector3(...arrow.dir).normalize();
  const start = g.position.clone();
  const origin = centroidOf(arrow);
  if (!instant) spawnSparks(origin, dir, arrow.color, 18);
  if (instant) {
    root.remove(g);
    arrowGroups.delete(arrow.id);
    return;
  }
  g.userData.flying = true;
  animateTo(
    g,
    0.55,
    (obj, t) => {
      const k = easeIn(t);
      obj.position.copy(start).addScaledVector(dir, k * 11);
      obj.traverse((o) => {
        if (o.material && o.material.transparent) o.material = o.material;
      });
      const fade = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
      obj.scale.setScalar(1 - 0.15 * k);
      obj.traverse((child) => {
        if (child.material && child.material.opacity != null && child.material.transparent) {
          if (!child.userData._baseOp) child.userData._baseOp = child.material.opacity;
          child.material.opacity = child.userData._baseOp * (1 - t * t);
        }
      });
    },
    () => {
      root.remove(g);
      arrowGroups.delete(arrow.id);
    }
  );
}

function shakeFlash(arrow) {
  const g = arrowGroups.get(arrow.id);
  if (!g) return;
  const base = g.position.clone();
  const core = g.children.find((c) => !c.material || !c.material.transparent) || g.children[1];
  const orig = core && core.material ? core.material.color.clone() : null;
  if (core && core.material && core.material.color) core.material.color.set(0xff3355);
  animateTo(
    g,
    0.32,
    (obj, t) => {
      const s = Math.sin(t * Math.PI * 8) * (1 - t) * 0.16;
      obj.position.set(base.x + s, base.y, base.z + s * 0.5);
    },
    () => {
      g.position.copy(base);
      if (core && orig) core.material.color.copy(orig);
    }
  );
}

function checkEnd() {
  if (remaining.length === 0 && !won) {
    won = true;
    const kept = hearts;
    setTimeout(() => {
      showOverlay(
        "Berry cleared!",
        `${LEVEL.arrows.length} lines · ${kept} ${kept === 1 ? "heart" : "hearts"} left`
      );
      hintline.textContent = "Nice work";
    }, 480);
  }
}

function tryFire(id, instant = false) {
  if (won || lost) return { ok: false, reason: "ended" };
  const arrow = remaining.find((a) => a.id === id);
  if (!arrow) return { ok: false, reason: "missing" };
  const legal = canFireArrow(arrow, remaining);
  if (!legal) {
    if (!instant) {
      shakeFlash(arrow);
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
  flyOff(arrow, instant);
  renderCount();
  checkEnd();
  return { ok: true };
}

function pulseHint(id) {
  hintId = id;
  const g = arrowGroups.get(id);
  if (!g) return;
  const base = 1;
  animateTo(g, 1.1, (obj, t) => {
    const s = base + Math.sin(t * Math.PI * 3) * 0.12;
    obj.scale.setScalar(s);
  });
}

function lookAtArrow(arrow) {
  const c = centroidOf(arrow);
  const dir = new THREE.Vector3(...arrow.dir).normalize();
  // Stand a little behind and above the arrow, looking toward the exit path
  const back = dir.clone().multiplyScalar(-1);
  back.y = 0;
  if (back.lengthSq() < 0.1) back.set(0.6, 0, 0.6);
  back.normalize();
  const wish = c.clone().addScaledVector(back, 18).add(new THREE.Vector3(0, 9, 0));
  const rel = wish.sub(target);
  const r = rel.length();
  const phi = Math.acos(Math.max(-1, Math.min(1, rel.y / r)));
  const theta = Math.atan2(rel.x, rel.z);
  const from = { theta: sph.theta, phi: sph.phi, r: sph.r };
  // unwrap theta
  let toTheta = theta;
  while (toTheta - from.theta > Math.PI) toTheta -= Math.PI * 2;
  while (toTheta - from.theta < -Math.PI) toTheta += Math.PI * 2;
  autoRotate = false;
  animateTo(
    sph,
    0.7,
    (_, t) => {
      const k = easeOut(t);
      sph.theta = from.theta + (toTheta - from.theta) * k;
      sph.phi = from.phi + (phi - from.phi) * k;
      sph.r = from.r + (Math.max(20, Math.min(30, r)) - from.r) * k;
    }
  );
}

function doHint() {
  if (won || lost) return;
  const moves = legalMoves(remaining);
  if (!moves.length) {
    showToast("No clear arrow?");
    return;
  }
  const pick = moves[0];
  pulseHint(pick.id);
  lookAtArrow(pick);
  hintline.textContent = "This arrow has a clear path out";
}

hintBtn.addEventListener("click", doHint);
restartBtn.addEventListener("click", () => {
  autoRotate = false;
  restart();
});
ovBtn.addEventListener("click", () => {
  restart();
});
infoBtn.addEventListener("click", () => info.classList.add("show"));
infoClose.addEventListener("click", () => info.classList.remove("show"));
info.addEventListener("click", (e) => {
  if (e.target === info) info.classList.remove("show");
});

const raycaster = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let dragging = false;
let moved = false;
let lastX = 0,
  lastY = 0;
let lastDist = 0;
const pointers = new Map();

function setPtr(x, y) {
  ptr.x = (x / window.innerWidth) * 2 - 1;
  ptr.y = -(y / window.innerHeight) * 2 + 1;
}

function pickArrow(x, y) {
  setPtr(x, y);
  raycaster.setFromCamera(ptr, camera);
  const meshes = [];
  for (const g of arrowGroups.values()) {
    if (g.userData.flying) continue;
    g.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
  }
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && obj.userData.arrowId == null) obj = obj.parent;
  return obj ? obj.userData.arrowId : null;
}

function pinchDist() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return 0;
  const dx = pts[0].x - pts[1].x;
  const dy = pts[0].y - pts[1].y;
  return Math.hypot(dx, dy);
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
  } else if (pointers.size === 2) {
    lastDist = pinchDist();
    dragging = false;
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const d = pinchDist();
    if (lastDist > 0 && d > 0) {
      const sc = d / lastDist;
      sph.r = Math.max(14, Math.min(38, sph.r / sc));
    }
    lastDist = d;
    moved = true;
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  if (Math.hypot(dx, dy) > 6) moved = true;
  lastX = e.clientX;
  lastY = e.clientY;
  sph.theta -= dx * 0.0075;
  sph.phi = Math.max(0.22, Math.min(Math.PI - 0.22, sph.phi - dy * 0.0075));
});

function endPointer(e) {
  const wasOne = pointers.size === 1;
  const id = e.pointerId;
  const pt = pointers.get(id);
  pointers.delete(id);
  try {
    canvas.releasePointerCapture(id);
  } catch (_) {}
  if (pointers.size < 2) lastDist = 0;
  if (pointers.size === 0) {
    dragging = false;
    interacting = false;
    if (wasOne && !moved && pt && !overlay.classList.contains("show") && !info.classList.contains("show")) {
      const aid = pickArrow(pt.x, pt.y);
      if (aid != null) tryFire(aid);
    }
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    autoRotate = false;
    const k = Math.exp(e.deltaY * 0.0015);
    sph.r = Math.max(14, Math.min(38, sph.r * k));
  },
  { passive: false }
);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (autoRotate && !interacting) sph.theta += dt * 0.22;
  updateTweens(dt);
  updateSparks(dt);
  if (hintId != null) {
    const g = arrowGroups.get(hintId);
    if (g && !g.userData.flying) {
      const pulse = 1 + Math.sin(now * 0.008) * 0.08;
      g.scale.setScalar(pulse);
    }
  }
  applyCamera();
  renderer.render(scene, camera);
  window.__game.ready = true;
  requestAnimationFrame(frame);
}

setRemainingFromLevel();
renderHearts();
renderCount();
applyCamera();
requestAnimationFrame(frame);

window.__game = {
  ready: false,
  EXIT_RULE_TEXT,
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
    };
  },
  setView({ theta, phi, r, auto } = {}) {
    if (theta != null) sph.theta = theta;
    if (phi != null) sph.phi = phi;
    if (r != null) sph.r = r;
    if (auto != null) autoRotate = !!auto;
  },
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
  },
};

console.info("Arrow Trails 3D · Blueberry", LEVEL.stats, EXIT_RULE_TEXT);
