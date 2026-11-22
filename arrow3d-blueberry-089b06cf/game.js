import * as THREE from "./vendor/three.module.min.js";
import {
  canFireArrow,
  legalMoves,
  bestHint,
  findBlocker,
  EXIT_RULE_TEXT,
  ARROW_COLORS,
} from "./puzzle.js";
import { LEVEL } from "./level.js";

const canvas = document.getElementById("c");
const stage = document.getElementById("stage");
const heartsEl = document.getElementById("hearts");
const countEl = document.getElementById("cnt");
const toastEl = document.getElementById("tt");
const overlay = document.getElementById("dc");
const ovTitle = document.getElementById("ovTitle");
const ovBody = document.getElementById("ovBody");
const ovBtn = document.getElementById("ovBtn");
const hintBtn = document.getElementById("hi");
const undoBtn = document.getElementById("un");
const resetBtn = document.getElementById("rs");
const infoBtn = document.getElementById("infoBtn");
const info = document.getElementById("info");
const infoClose = document.getElementById("infoClose");
const fpsEl = document.getElementById("fps");
const DEBUG = /(?:\?|&)debug=1(?:&|$)/.test(location.search);
if (DEBUG) fpsEl.style.display = "block";

/* Arrow Trails 2D proportions, with cell size S = 1 voxel. */
const S = 1;
const W = S * 0.14;
const TUBE_R = W / 2;
const HEAD_LEN = S * 0.42;
const HEAD_W = S * 0.22;
const HEAD_TIP = HEAD_LEN * 0.45;
const HEAD_BACK = HEAD_LEN * 0.55;
const BODY_TRIM = S * 0.15;
const TAIL_R = S * 0.09;
const TAIL_STROKE = S * 0.06;
const LIFT = 0.5 + TAIL_R + TAIL_STROKE / 2 + 0.05;
const CELL_PX = 8.2;
const FOV = 36;
const BODY_RX = 18.0, BODY_RY = 16.8, BODY_RZ = 18.0;
const MAX_HEARTS = 4;

const PALETTE = ARROW_COLORS || ["#2a8c86", "#e0664f", "#d4a23a", "#4f9a5a", "#1b4d35"];

let hearts = MAX_HEARTS;
let remaining = [];
let undoStack = [];
let won = false;
let lost = false;
let hintId = null;
let hintUntil = 0;
let blockerId = null;
let blockerUntil = 0;
let shakeId = null;
let shakeUntil = 0;
let autoRotate = false;
let interacting = false;
let ready = false;
let toastTimer = 0;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0xfffaf0, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfffaf0);

const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);
const sph = { theta: 0.55, phi: 1.18, r: 60, rMin: 16, rMax: 120, rFit: 60 };
const target = new THREE.Vector3(0, 0.4, 0);
let vTheta = 0,
  vPhi = 0;

scene.add(new THREE.HemisphereLight(0xfff8ee, 0x6a7488, 1.0));
scene.add(new THREE.AmbientLight(0xfff4e6, 0.7));
const key = new THREE.DirectionalLight(0xfffaf4, 0.55);
key.position.set(-10, 18, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(0xd8e0f4, 0.35);
fill.position.set(12, 4, -8);
scene.add(fill);

const root = new THREE.Group();
scene.add(root);

const _y = new THREE.Vector3(0, 1, 0);
const dummy = new THREE.Object3D();
const tmpC = new THREE.Color();

function faceCenter(c, lift = LIFT) {
  return new THREE.Vector3(c.x + c.nx * lift, c.y + c.ny * lift, c.z + c.nz * lift);
}

/** Map a point onto the dusty body ellipsoid, then lift along the surface normal. Crown/leaf stay on their voxels. */
function ellipsoidNormal(p) {
  const y = p.y + 0.25;
  const n = new THREE.Vector3(p.x / (BODY_RX * BODY_RX), y / (BODY_RY * BODY_RY), p.z / (BODY_RZ * BODY_RZ));
  if (n.lengthSq() < 1e-8) n.set(0, 1, 0);
  return n.normalize();
}
function onBerry(p, part, extra = TUBE_R + 0.03) {
  if (part && part !== "body") return p.clone();
  const q = new THREE.Vector3(p.x, p.y + 0.25, p.z);
  const denom = Math.hypot(q.x / BODY_RX, q.y / BODY_RY, q.z / BODY_RZ);
  if (denom < 1e-8) return p.clone();
  const surf = new THREE.Vector3(q.x / denom, q.y / denom - 0.25, q.z / denom);
  return surf.addScaledVector(ellipsoidNormal(surf), extra);
}
function cellPart(c) {
  return c.part || "body";
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

/** Polyline through cell centers (and edge mids when wrapping a corner), then onto the berry skin. */
function projectPathPoint(p, cell) {
  return onBerry(p, cellPart(cell));
}
function arrowPolyline(arrow) {
  const cells = arrow.cells;
  const d = new THREE.Vector3(...arrow.dir);
  const pts = [];
  if (cells.length === 1) {
    const c = projectPathPoint(faceCenter(cells[0]), cells[0]);
    pts.push(c.clone());
    pts.push(c.clone());
    return { pts, headAt: c.clone(), tailAt: c.clone(), dir: d };
  }
  pts.push(projectPathPoint(faceCenter(cells[0]), cells[0]));
  for (let i = 0; i < cells.length - 1; i++) {
    const mid = projectPathPoint(sharedMid(cells[i], cells[i + 1]), cells[i]);
    const ctrB = projectPathPoint(faceCenter(cells[i + 1]), cells[i + 1]);
    if (mid.distanceTo(pts[pts.length - 1]) > 0.04 && mid.distanceTo(ctrB) > 0.04) pts.push(mid);
    pts.push(ctrB);
  }
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distanceTo(clean[clean.length - 1]) > 0.04) clean.push(pts[i]);
  }
  if (clean.length === 1) clean.push(clean[0].clone().addScaledVector(d, 0.2));
  const headAt = projectPathPoint(faceCenter(cells[cells.length - 1]), cells[cells.length - 1]);
  const tailAt = projectPathPoint(faceCenter(cells[0]), cells[0]);
  return { pts: clean, headAt, tailAt, dir: d };
}

function paletteColor(id) {
  return PALETTE[id % PALETTE.length];
}

const arrowGeom = LEVEL.arrows.map((a) => {
  const poly = arrowPolyline(a);
  return {
    id: a.id,
    color: paletteColor(a.id),
    part: a.part,
    dir: poly.dir,
    pts: poly.pts,
    headAt: poly.headAt,
    tailAt: poly.tailAt,
    cells: a.cells,
  };
});
const byId = new Map(LEVEL.arrows.map((a) => [a.id, a]));
const geomById = new Map(arrowGeom.map((g) => [g.id, g]));

/* ---------- berry shell (blueberry body, green-brown crown, leaf) ---------- */
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
  // Smooth dusty-bloom body so the five Arrow Trails colors (including forest green) stay readable, like on the 2D cream board.
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x8e9ac4),
      roughness: 0.86,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  );
  // Match buildBlueberry: sx=x/RX, sy=(y+0.25)/RY, sz=z/RZ, plus a hair of inflate so arrows rest on the skin.
  body.scale.set(BODY_RX, BODY_RY, BODY_RZ);
  body.position.y = -0.25;
  body.name = "body";
  root.add(body);

  const positions = [];
  const normals = [];
  const colors = [];
  const tint = {
    calyx: [0.50, 0.52, 0.28],
    leaf: [0.31, 0.58, 0.34],
  };
  for (const v of LEVEL.voxels) {
    if (v.part === "body") continue;
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
      const t = tint[v.part] || tint.calyx;
      const lit = 0.82 + 0.28 * Math.max(0, n[0] * -0.3 + n[1] * 0.8 + n[2] * 0.35);
      for (const p of quads) {
        positions.push(...p);
        normals.push(...n);
        colors.push(Math.min(1, t[0] * lit), Math.min(1, t[1] * lit), Math.min(1, t[2] * lit));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const crown = new THREE.Mesh(g, mat);
  crown.name = "crown";
  root.add(crown);
  return { body, crown };
}
const shell = buildShell();

/* ---------- instanced arrows (round tubes, 2D-proportion heads, cream tails) ---------- */
let segCount = 0;
for (const g of arrowGeom) segCount += Math.max(0, g.pts.length - 1);
const MAX_SEG = segCount + 16;
const MAX_HEAD = LEVEL.arrows.length + 4;
const MAX_JOINT = LEVEL.arrows.length * 4 + segCount + 16;

const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const unitSphere = new THREE.SphereGeometry(1, 12, 10);
// Flat triangle in XY, tip at +Y, matching headPts (tip / two base wings).
const headShape = new THREE.Shape();
headShape.moveTo(0, HEAD_TIP);
headShape.lineTo(-HEAD_W, -HEAD_BACK);
headShape.lineTo(HEAD_W, -HEAD_BACK);
headShape.closePath();
const unitHead = new THREE.ShapeGeometry(headShape);
unitHead.rotateX(-Math.PI / 2); // lay in XZ with tip along +Z? we'll orient via quaternion from +Y
// ShapeGeometry is in XY (z=0). Rotate so the triangle's "up" (Y/tip) becomes the default +Y
// and the face normal is +Z, then we'll spin so +Y aligns with dir and +Z with face normal.
// Actually: after rotateX(-90), tip goes from +Y to +Z, normal from +Z to +Y. That's wrong.
// We want tip along +Y (to use setFromUnitVectors(_y, dir)). Face should be in a plane containing dir.
// Leave ShapeGeometry in XY with tip at +Y, normal +Z. When we align +Y to dir, the triangle
// stands in a plane; we then twist so the plane is as close as possible to the head's face.

const coreMat = new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide });
const creamMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0, toneMapped: false });

const coreIM = new THREE.InstancedMesh(unitCyl, coreMat, MAX_SEG);
const jointIM = new THREE.InstancedMesh(unitSphere, coreMat.clone(), MAX_JOINT);
const headIM = new THREE.InstancedMesh(unitHead, coreMat.clone(), MAX_HEAD);
const tailFillIM = new THREE.InstancedMesh(unitSphere, creamMat, MAX_HEAD);
const tailRingIM = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.32, 8, 16), coreMat.clone(), MAX_HEAD);
const pickIM = new THREE.InstancedMesh(unitCyl, new THREE.MeshBasicMaterial({ visible: false }), MAX_SEG);

for (const m of [coreIM, jointIM, headIM, tailFillIM, tailRingIM, pickIM]) {
  m.frustumCulled = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(m);
}

const ranges = new Map();

function placeCylinder(mesh, index, a, b, radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-5) return false;
  dummy.position.copy(a).add(b).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(_y, dir.normalize());
  dummy.scale.set(radius, len, radius);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  return true;
}
function placeSphere(mesh, index, at, radius) {
  dummy.position.copy(at);
  dummy.quaternion.identity();
  dummy.scale.set(radius, radius, radius);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
function headBasis(at, dir, faceN) {
  const d = dir.clone().normalize();
  let n = faceN.clone();
  // Keep the triangle in the surface plane as much as possible.
  const proj = n.clone().addScaledVector(d, -n.dot(d));
  if (proj.lengthSq() > 1e-6) n = proj.normalize();
  else {
    const tmp = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    n = new THREE.Vector3().crossVectors(d, tmp).normalize();
  }
  const side = new THREE.Vector3().crossVectors(n, d).normalize();
  const n2 = new THREE.Vector3().crossVectors(d, side).normalize();
  const m = new THREE.Matrix4().makeBasis(side, d, n2);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return { q, at };
}
function placeHead(mesh, index, at, dir, faceN, scale = 1) {
  const { q } = headBasis(at, dir, faceN);
  dummy.position.copy(at);
  dummy.quaternion.copy(q);
  dummy.scale.set(scale, scale, scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
function placeRing(mesh, index, at, dir, faceN, radius, tube) {
  const d = dir.clone().normalize();
  let n = faceN.clone();
  const proj = n.clone().addScaledVector(d, -n.dot(d));
  if (proj.lengthSq() > 1e-6) n = proj.normalize();
  dummy.position.copy(at);
  dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  dummy.scale.set(radius, radius, tube);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
function hideInstance(mesh, index) {
  dummy.position.set(0, 0, 0);
  dummy.scale.set(0, 0, 0);
  dummy.quaternion.identity();
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function bodyPoints(pts) {
  // 2D shape(): body stops BODY_TRIM before the last point so it meets the head.
  if (pts.length < 2) return pts.map((p) => p.clone());
  const h = pts[pts.length - 1];
  const q = pts[pts.length - 2];
  const dir = new THREE.Vector3().subVectors(h, q);
  const m = dir.length() || 1;
  dir.multiplyScalar(1 / m);
  const last = h.clone().addScaledVector(dir, -Math.min(BODY_TRIM, m * 0.8));
  const out = pts.slice(0, -1).map((p) => p.clone());
  out.push(last);
  return out;
}

function packAll(visibleSet) {
  let si = 0,
    ji = 0,
    hi = 0;
  ranges.clear();
  for (const g of arrowGeom) {
    if (visibleSet && !visibleSet.has(g.id)) continue;
    const rec = { seg0: si, segs: 0, joints: [], joint0: ji, head: hi, basePts: g.pts.map((p) => p.clone()) };
    const col = tmpC.set(g.color);
    const body = bodyPoints(g.pts);
    rec.body = body;
    const last = g.cells[g.cells.length - 1];
    const first = g.cells[0];
    const faceN = cellPart(last) === "body" ? ellipsoidNormal(g.headAt) : new THREE.Vector3(last.nx, last.ny, last.nz);
    const tailN = cellPart(first) === "body" ? ellipsoidNormal(g.tailAt) : new THREE.Vector3(first.nx, first.ny, first.nz);
    rec.faceN = faceN;
    rec.tailN = tailN;
    rec.dir = g.dir.clone();
    rec.headAt = g.headAt.clone();
    rec.tailAt = g.tailAt.clone();
    rec.color = g.color;

    for (let i = 0; i < body.length - 1; i++) {
      if (placeCylinder(coreIM, si, body[i], body[i + 1], TUBE_R)) {
        placeCylinder(pickIM, si, body[i], body[i + 1], TUBE_R * 3.2);
        coreIM.setColorAt(si, col);
        rec.segs++;
        si++;
      }
    }
    // Round caps / joins (2D stroke-linecap/join: round)
    for (const p of body) {
      placeSphere(jointIM, ji, p, TUBE_R);
      jointIM.setColorAt(ji, col);
      rec.joints.push(ji);
      ji++;
    }
    placeHead(headIM, hi, rec.headAt, rec.dir, faceN, 1);
    headIM.setColorAt(hi, col);
    // Tail: cream fill + colored ring, like the 2D circle (r=0.09, stroke 0.06)
    placeSphere(tailFillIM, hi, rec.tailAt, TAIL_R);
    placeRing(tailRingIM, hi, rec.tailAt, rec.dir, tailN, TAIL_R, TAIL_STROKE);
    tailRingIM.setColorAt(hi, col);
    hi++;
    rec.segCount = rec.segs;
    ranges.set(g.id, rec);
  }
  coreIM.count = si;
  pickIM.count = si;
  jointIM.count = ji;
  headIM.count = hi;
  tailFillIM.count = hi;
  tailRingIM.count = hi;
  for (const m of [coreIM, pickIM, jointIM, headIM, tailFillIM, tailRingIM]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

function hideArrow(id) {
  const rec = ranges.get(id);
  if (!rec) return;
  for (let i = 0; i < rec.segs; i++) {
    hideInstance(coreIM, rec.seg0 + i);
    hideInstance(pickIM, rec.seg0 + i);
  }
  for (const j of rec.joints) hideInstance(jointIM, j);
  hideInstance(headIM, rec.head);
  hideInstance(tailFillIM, rec.head);
  hideInstance(tailRingIM, rec.head);
  coreIM.instanceMatrix.needsUpdate = true;
  pickIM.instanceMatrix.needsUpdate = true;
  jointIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  tailFillIM.instanceMatrix.needsUpdate = true;
  tailRingIM.instanceMatrix.needsUpdate = true;
}

function tintArrow(id, hex, widthScale = 1) {
  const rec = ranges.get(id);
  if (!rec) return;
  const col = tmpC.set(hex);
  for (let i = 0; i < rec.segs; i++) {
    coreIM.setColorAt(rec.seg0 + i, col);
    const a = rec.body[i];
    const b = rec.body[i + 1];
    if (a && b) {
      placeCylinder(coreIM, rec.seg0 + i, a, b, TUBE_R * widthScale);
      placeCylinder(pickIM, rec.seg0 + i, a, b, TUBE_R * 3.2 * widthScale);
    }
  }
  for (const j of rec.joints) {
    jointIM.setColorAt(j, col);
    const pt = rec.body[rec.joints.indexOf(j)];
    if (pt) placeSphere(jointIM, j, pt, TUBE_R * widthScale);
  }
  headIM.setColorAt(rec.head, col);
  tailRingIM.setColorAt(rec.head, col);
  placeHead(headIM, rec.head, rec.headAt, rec.dir, rec.faceN, widthScale);
  coreIM.instanceMatrix.needsUpdate = true;
  pickIM.instanceMatrix.needsUpdate = true;
  jointIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  if (coreIM.instanceColor) coreIM.instanceColor.needsUpdate = true;
  if (jointIM.instanceColor) jointIM.instanceColor.needsUpdate = true;
  if (headIM.instanceColor) headIM.instanceColor.needsUpdate = true;
  if (tailRingIM.instanceColor) tailRingIM.instanceColor.needsUpdate = true;
}

function applyShakeOffset(id, ox, oy, oz) {
  const rec = ranges.get(id);
  if (!rec) return;
  const off = new THREE.Vector3(ox, oy, oz);
  const body = rec.body.map((p) => p.clone().add(off));
  for (let i = 0; i < rec.segs; i++) {
    if (body[i] && body[i + 1]) placeCylinder(coreIM, rec.seg0 + i, body[i], body[i + 1], TUBE_R);
  }
  rec.joints.forEach((j, k) => {
    if (body[k]) placeSphere(jointIM, j, body[k], TUBE_R);
  });
  placeHead(headIM, rec.head, rec.headAt.clone().add(off), rec.dir, rec.faceN, 1);
  placeSphere(tailFillIM, rec.head, rec.tailAt.clone().add(off), TAIL_R);
  placeRing(tailRingIM, rec.head, rec.tailAt.clone().add(off), rec.dir, rec.tailN, TAIL_R, TAIL_STROKE);
  coreIM.instanceMatrix.needsUpdate = true;
  jointIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  tailFillIM.instanceMatrix.needsUpdate = true;
  tailRingIM.instanceMatrix.needsUpdate = true;
}

/* ---------- path-following clear (same easing and window as 2D fly) ---------- */
const flyers = [];

function polylineLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]);
  return L;
}
function atOn(pts, cum, s) {
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const span = cum[i] - cum[i - 1] || 1;
  const f = (s - cum[i - 1]) / span;
  return pts[i - 1].clone().lerp(pts[i], f);
}
function windowPts(pts, cum, s0, s1) {
  const o = [atOn(pts, cum, s0)];
  for (let i = 0; i < pts.length; i++) if (cum[i] > s0 && cum[i] < s1) o.push(pts[i].clone());
  o.push(atOn(pts, cum, s1));
  return o;
}

function startFly(arrow, instant, done) {
  const g = geomById.get(arrow.id);
  if (!g || instant) {
    hideArrow(arrow.id);
    if (done) done();
    return;
  }
  const rec = ranges.get(arrow.id);
  const base = (rec ? rec.body : bodyPoints(g.pts)).map((p) => p.clone());
  const dir = g.dir.clone().normalize();
  // Extend past the head in D, like 2D's E = P.concat(head + D * K * S)
  const K = 28;
  const E = base.concat([base[base.length - 1].clone().addScaledVector(dir, K * S)]);
  const cum = [0];
  for (let i = 1; i < E.length; i++) cum.push(cum[i - 1] + E[i].distanceTo(E[i - 1]));
  const Lp = cum[base.length - 1] || 1;
  const dist = Lp + (K * 0.55 + 1.6) * S;
  const dur = Math.min(1500, Math.max(700, 500 + arrow.cells.length * 35 + 80));
  flyers.push({ id: arrow.id, E, cum, Lp, dist, dur, t0: performance.now(), rec, dir, faceN: rec?.faceN, done });
}

function drawFlyer(f, pts) {
  const rec = f.rec;
  if (!rec) return;
  const col = tmpC.set(rec.color);
  // Hide original slots, then reuse them for the sliding window (pad extras as hidden).
  for (let i = 0; i < rec.segs; i++) {
    hideInstance(coreIM, rec.seg0 + i);
    hideInstance(pickIM, rec.seg0 + i);
  }
  for (const j of rec.joints) hideInstance(jointIM, j);
  let used = 0;
  for (let i = 0; i < pts.length - 1 && used < rec.segs; i++) {
    if (placeCylinder(coreIM, rec.seg0 + used, pts[i], pts[i + 1], TUBE_R)) {
      coreIM.setColorAt(rec.seg0 + used, col);
      used++;
    }
  }
  const jcount = Math.min(pts.length, rec.joints.length);
  for (let k = 0; k < jcount; k++) {
    placeSphere(jointIM, rec.joints[k], pts[k], TUBE_R);
    jointIM.setColorAt(rec.joints[k], col);
  }
  const tip = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 2)];
  const d = new THREE.Vector3().subVectors(tip, prev);
  if (d.lengthSq() < 1e-8) d.copy(f.dir);
  else d.normalize();
  // Head sits at the window's front, as in 2D (headPts uses the last point of the window).
  placeHead(headIM, rec.head, tip, d, f.faceN || rec.faceN, 1);
  // Tail rides the back of the window.
  const tail = pts[0];
  placeSphere(tailFillIM, rec.head, tail, TAIL_R);
  placeRing(tailRingIM, rec.head, tail, d, rec.tailN, TAIL_R, TAIL_STROKE);
  coreIM.instanceMatrix.needsUpdate = true;
  jointIM.instanceMatrix.needsUpdate = true;
  headIM.instanceMatrix.needsUpdate = true;
  tailFillIM.instanceMatrix.needsUpdate = true;
  tailRingIM.instanceMatrix.needsUpdate = true;
}

function updateFlyers(now) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    const u = Math.min(1, (now - f.t0) / f.dur);
    const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const s = e * f.dist;
    const pts = windowPts(f.E, f.cum, s, s + f.Lp);
    if (u >= 1) {
      hideArrow(f.id);
      flyers.splice(i, 1);
      if (f.done) f.done();
    } else {
      drawFlyer(f, pts);
    }
  }
}

/* ---------- game state ---------- */
function setRemainingFromLevel() {
  remaining = LEVEL.arrows.map((a) => a);
  undoStack = [];
  won = false;
  lost = false;
  hearts = MAX_HEARTS;
  hintId = null;
  blockerId = null;
  shakeId = null;
  overlay.classList.remove("show");
}

function renderHearts() {
  heartsEl.innerHTML = "";
  for (let i = 0; i < MAX_HEARTS; i++) {
    const s = document.createElement("span");
    s.className = i < hearts ? "heart" : "heart empty";
    s.textContent = i < hearts ? "♥" : "♡";
    heartsEl.appendChild(s);
  }
  heartsEl.setAttribute("aria-label", `${hearts} of ${MAX_HEARTS} hearts`);
}
function renderCount() {
  const n = remaining.length;
  const cover = LEVEL.stats && LEVEL.stats.facesCovered != null ? " · full cover" : "";
  countEl.textContent = `${n} left${cover}`;
  undoBtn.disabled = undoStack.length === 0 || won || lost;
}
function toast(msg, ms = 1600) {
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  if (msg) toastTimer = setTimeout(() => { if (toastEl.textContent === msg) toastEl.textContent = ""; }, ms);
}
function showDone(title, body, btn) {
  ovTitle.textContent = title;
  ovBody.textContent = body;
  ovBtn.textContent = btn || "Play again";
  overlay.classList.add("show");
}

function tryFire(id, instant = false) {
  if (won || lost) return { ok: false };
  const arrow = remaining.find((a) => a.id === id);
  if (!arrow) return { ok: false };
  if (!canFireArrow(arrow, remaining)) {
    const blocker = findBlocker(arrow, remaining);
    shakeId = id;
    shakeUntil = performance.now() + 350;
    if (blocker) {
      blockerId = blocker.id;
      blockerUntil = performance.now() + 700;
      tintArrow(blocker.id, shade(geomById.get(blocker.id)?.color || "#e0664f", 0.9), 2.1);
    }
    toast("Something is in the way — clear that first.");
    if (hearts > 0) hearts--;
    renderHearts();
    if (hearts <= 0) {
      lost = true;
      showDone("Out of hearts", "Your progress is kept. Reset the board to refill hearts and try again.", "Reset");
    }
    return { ok: false, blocked: true, blocker: blocker?.id };
  }
  remaining = remaining.filter((a) => a.id !== id);
  undoStack.push(arrow);
  if (hintId === id) hintId = null;
  renderCount();
  startFly(arrow, instant, () => {
    if (remaining.length === 0 && !won) {
      won = true;
      showDone("Blueberry cleared!", `All ${LEVEL.arrows.length} arrows slid off the berry.`, "Play again");
    }
  });
  if (instant && remaining.length === 0 && !won) {
    won = true;
    showDone("Blueberry cleared!", `All ${LEVEL.arrows.length} arrows slid off the berry.`, "Play again");
  }
  return { ok: true };
}

function shade(hex, brightness) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(brightness);
  return `#${c.getHexString()}`;
}

function undo() {
  if (!undoStack.length || won && remaining.length === 0 && flyers.length) {
    // allow undo only of successful fires while the board isn't in a terminal win overlay... 
  }
  if (!undoStack.length || lost) return;
  // If we just won, undo the last clear and hide the card.
  const arrow = undoStack.pop();
  remaining = remaining.concat([arrow]).sort((a, b) => a.id - b.id);
  won = false;
  overlay.classList.remove("show");
  packAll(new Set(remaining.map((a) => a.id)));
  renderCount();
  renderHearts();
}

function restart() {
  setRemainingFromLevel();
  packAll(new Set(remaining.map((a) => a.id)));
  renderHearts();
  renderCount();
  toast("");
}

function doHint() {
  if (won || lost) return;
  const h = bestHint(remaining);
  if (!h) {
    toast("No legal move — try undoing.");
    return;
  }
  hintId = h.id;
  hintUntil = performance.now() + 550 * 3;
  toast("");
}

/* ---------- picking / camera / input ---------- */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function canvasRect() {
  return canvas.getBoundingClientRect();
}
function pickArrowAt(clientX, clientY) {
  const r = canvasRect();
  ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(pickIM);
  if (!hits.length) return null;
  const inst = hits[0].instanceId;
  for (const [id, rec] of ranges) {
    if (inst >= rec.seg0 && inst < rec.seg0 + rec.segs) return id;
  }
  return null;
}

function fitCamera() {
  const rct = canvasRect();
  const h = Math.max(1, rct.height || stage.clientHeight || 360);
  const fov = (FOV * Math.PI) / 180;
  // Frame the ~36-wide berry at ~82% of the stage (cell pitch ~8.2px on a 390 phone, close to Arrow Trails' 7.3px).
  const worldD = 36;
  const fill = 0.82;
  const r = worldD / (fill * 2 * Math.tan(fov / 2));
  sph.rFit = r;
  sph.r = r;
  sph.rMin = r / 3;
  sph.rMax = r * 1.12;
}

function applyCamera() {
  const p = sph.phi;
  const t = sph.theta;
  camera.position.set(
    target.x + sph.r * Math.sin(p) * Math.sin(t),
    target.y + sph.r * Math.cos(p),
    target.z + sph.r * Math.sin(p) * Math.cos(t)
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function resize() {
  const r = stage.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fitCamera();
}

const pointers = new Map();
let dragging = false;
let moved = false;
let lastX = 0,
  lastY = 0,
  lastDist = 0,
  downId = null;

function pinchDist() {
  const pts = [...pointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

stage.addEventListener("pointerdown", (e) => {
  if (overlay.classList.contains("show")) return;
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  interacting = true;
  autoRotate = false;
  if (pointers.size === 1) {
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    downId = pickArrowAt(e.clientX, e.clientY);
    vTheta = 0;
    vPhi = 0;
    stage.classList.add("drag");
  } else {
    dragging = false;
    lastDist = pinchDist();
    downId = null;
  }
});
stage.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const d = pinchDist();
    if (lastDist > 0 && d > 0) {
      const scale = lastDist / d;
      sph.r = Math.max(sph.rMin, Math.min(sph.rMax, sph.r * scale));
    }
    lastDist = d;
    moved = true;
    return;
  }
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  if (Math.hypot(dx, dy) > 8) moved = true;
  if (moved) {
    sph.theta -= dx * 0.008;
    sph.phi = Math.max(0.2, Math.min(Math.PI - 0.2, sph.phi - dy * 0.008));
    vTheta = -dx * 0.02;
    vPhi = -dy * 0.02;
  }
  lastX = e.clientX;
  lastY = e.clientY;
});
function endPointer(e) {
  const wasOne = pointers.size === 1;
  const pt = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  try {
    stage.releasePointerCapture(e.pointerId);
  } catch {}
  if (pointers.size < 2) lastDist = 0;
  if (pointers.size === 0) {
    stage.classList.remove("drag");
    dragging = false;
    interacting = false;
    if (wasOne && !moved && pt && !won && !lost) {
      const id = pickArrowAt(pt.x, pt.y);
      if (id != null) tryFire(id, false);
    }
    downId = null;
  }
}
stage.addEventListener("pointerup", endPointer);
stage.addEventListener("pointercancel", endPointer);
stage.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const f = Math.exp(e.deltaY * 0.0018);
    sph.r = Math.max(sph.rMin, Math.min(sph.rMax, sph.r * f));
  },
  { passive: false }
);

document.getElementById("zIn").addEventListener("click", () => {
  sph.r = Math.max(sph.rMin, sph.r / 1.25);
});
document.getElementById("zOut").addEventListener("click", () => {
  sph.r = Math.min(sph.rMax, sph.r * 1.25);
});
document.getElementById("zFit").addEventListener("click", () => {
  sph.r = sph.rFit;
});
hintBtn.addEventListener("click", doHint);
undoBtn.addEventListener("click", undo);
resetBtn.addEventListener("click", restart);
ovBtn.addEventListener("click", restart);
infoBtn.addEventListener("click", () => info.classList.add("show"));
infoClose.addEventListener("click", () => info.classList.remove("show"));
info.addEventListener("click", (e) => {
  if (e.target === info) info.classList.remove("show");
});

window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

/* ---------- frame ---------- */
let lastT = performance.now();
let fpsFrames = 0,
  fpsT = 0,
  fpsVal = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (autoRotate && !interacting) sph.theta += dt * 0.12;
  if (!dragging && !interacting) {
    sph.theta += vTheta * dt;
    sph.phi = Math.max(0.2, Math.min(Math.PI - 0.2, sph.phi + vPhi * dt));
    const damp = Math.exp(-dt * 3.2);
    vTheta *= damp;
    vPhi *= damp;
  }
  updateFlyers(now);

  // Hint pulse: 3 cycles of 0.55s, stroke ~1.9× (2D @keyframes pu)
  if (hintId != null && ranges.has(hintId) && now < hintUntil) {
    const t = (hintUntil - now) / (550 * 3);
    const cycle = (1 - t) * 3;
    const pulse = 0.5 - 0.5 * Math.cos((cycle % 1) * Math.PI * 2);
    const w = 1 + 0.9 * pulse;
    tintArrow(hintId, geomById.get(hintId).color, w);
  } else if (hintId != null && now >= hintUntil) {
    if (ranges.has(hintId)) tintArrow(hintId, geomById.get(hintId).color, 1);
    hintId = null;
  }

  // Blocker: solid thicker stroke, brightness .9, 700ms
  if (blockerId != null && now >= blockerUntil) {
    if (ranges.has(blockerId)) tintArrow(blockerId, geomById.get(blockerId).color, 1);
    blockerId = null;
  }

  // Shake: 2D keyframes sh 0.35s, translate along a small tangent
  if (shakeId != null && ranges.has(shakeId)) {
    if (now >= shakeUntil) {
      applyShakeOffset(shakeId, 0, 0, 0);
      shakeId = null;
    } else {
      const u = 1 - (shakeUntil - now) / 350;
      const rec = ranges.get(shakeId);
      const side = new THREE.Vector3().crossVectors(rec.dir, rec.faceN);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize();
      const amp = 0.18;
      let k = 0;
      if (u < 0.2 || (u >= 0.4 && u < 0.6)) k = 1;
      else if ((u >= 0.2 && u < 0.4) || (u >= 0.6 && u < 0.8)) k = -0.5;
      applyShakeOffset(shakeId, side.x * amp * k, side.y * amp * k, side.z * amp * k);
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
renderCount();
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
      rFit: sph.rFit,
      segs: coreIM.count,
      heads: headIM.count,
      fps: fpsVal,
      cellPx: CELL_PX,
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
  undo,
  hideChrome(hide) {
    document.querySelector("header").style.visibility = hide ? "hidden" : "";
    document.querySelector(".row").style.visibility = hide ? "hidden" : "";
    document.querySelector(".board-top").style.visibility = hide ? "hidden" : "";
    document.querySelector(".hint-line").style.visibility = hide ? "hidden" : "";
    document.querySelector(".bar").style.visibility = hide ? "hidden" : "";
    document.querySelector(".toast").style.visibility = hide ? "hidden" : "";
  },
};

console.info("Arrow Trails 3D · Blueberry v3", LEVEL.stats, EXIT_RULE_TEXT);
