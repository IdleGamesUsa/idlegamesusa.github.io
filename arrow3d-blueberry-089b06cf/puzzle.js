/**
 * Arrow Trails 3D — blueberry puzzle logic (v2)
 *
 * 3D EXIT RULE
 * ------------
 * Each arrow occupies a sequence of exposed voxel faces and has a single
 * head direction D, one of the six axis directions. When fired, the whole
 * arrow (every face cell, even if the painted path bends) translates in
 * direction D and flies off the model.
 *
 * Collision is a head-exit ray. The arrowhead occupies its parent voxel.
 * When an arrow fires in direction D (one axis), look down that axis along
 * a 5×5 integer corridor (the same row or up to two rows away). The arrow may
 * leave only if no cell of any other remaining arrow sits in that corridor
 * strictly in front of the head. The rest of a bent line still slides in
 * direction D, but only the head's corridor has to be clear — like checking
 * an exit ray off the sculpture.
 *
 * This is what lets an arrow be blocked by another on the far side of the
 * berry: a line on the left pointing +X has to wait for arrows at the same
 * Y,Z with a greater X. The berry voxels themselves do not block, only
 * remaining arrows. Firing an already-legal arrow is always safe: blockers
 * only disappear, so a reverse-constructed level cannot be bricked.
 */

export const FACE_THICKNESS = 0.2;
export const AXES = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export const EXIT_RULE_TEXT =
  "An arrow slides off in the direction its head points. The whole line moves that way, even if it bends. Each cell uses its voxel as a lane: when firing along an axis, no other remaining arrow may sit in the 5×5 corridor in front of the arrowhead — including arrows on the far side of the berry. The berry itself does not block, only other arrows.";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function keyV(x, y, z) {
  return `${x},${y},${z}`;
}

export function keyF(c) {
  return `${c.x},${c.y},${c.z}:${c.nx},${c.ny},${c.nz}`;
}

export function parseF(k) {
  const [a, b] = k.split(":");
  const [x, y, z] = a.split(",").map(Number);
  const [nx, ny, nz] = b.split(",").map(Number);
  return { x, y, z, nx, ny, nz };
}

export function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function eq(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function neg(a) {
  return [-a[0], -a[1], -a[2]];
}

export function inPlaneDirs(n) {
  return AXES.filter((d) => d[0] * n[0] + d[1] * n[1] + d[2] * n[2] === 0);
}

export function faceAABB(c, thick = FACE_THICKNESS) {
  const min = [c.x - 0.5, c.y - 0.5, c.z - 0.5];
  const max = [c.x + 0.5, c.y + 0.5, c.z + 0.5];
  if (c.nx > 0) {
    min[0] = c.x + 0.5;
    max[0] = c.x + 0.5 + thick;
  } else if (c.nx < 0) {
    min[0] = c.x - 0.5 - thick;
    max[0] = c.x - 0.5;
  } else if (c.ny > 0) {
    min[1] = c.y + 0.5;
    max[1] = c.y + 0.5 + thick;
  } else if (c.ny < 0) {
    min[1] = c.y - 0.5 - thick;
    max[1] = c.y - 0.5;
  } else if (c.nz > 0) {
    min[2] = c.z + 0.5;
    max[2] = c.z + 0.5 + thick;
  } else if (c.nz < 0) {
    min[2] = c.z - 0.5 - thick;
    max[2] = c.z - 0.5;
  }
  return { min, max };
}

function overlaps(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0) > 1e-6;
}

export function boxBlocks(a, b, dir) {
  for (let axis = 0; axis < 3; axis++) {
    if (dir[axis] !== 0) continue;
    if (!overlaps(a.min[axis], a.max[axis], b.min[axis], b.max[axis])) return false;
  }
  const i = dir[0] !== 0 ? 0 : dir[1] !== 0 ? 1 : 2;
  const s = dir[i];
  if (s > 0) return b.min[i] >= a.max[i] - 1e-6;
  return b.max[i] <= a.min[i] + 1e-6;
}

/** Axis index of a unit direction. */
export function dirAxis(dir) {
  return dir[0] !== 0 ? 0 : dir[1] !== 0 ? 1 : 2;
}

/** Lane slack of 1 means a 3×3 corridor: neighboring rows also block. */
export const LANE_SLACK = 2;

export function sameLane(a, b, axis, slack = LANE_SLACK) {
  const ca = [a.x, a.y, a.z];
  const cb = [b.x, b.y, b.z];
  for (let i = 0; i < 3; i++) {
    if (i === axis) continue;
    if (Math.abs(ca[i] - cb[i]) > slack) return false;
  }
  return true;
}

/** True if cell B sits in cell A's flight lane and is strictly further along dir. */
export function voxelBlocks(a, b, dir) {
  const i = dirAxis(dir);
  if (!sameLane(a, b, i)) return false;
  const s = dir[i];
  const ca = [a.x, a.y, a.z][i];
  const cb = [b.x, b.y, b.z][i];
  return s > 0 ? cb > ca : cb < ca;
}

export function canFireCells(cells, dir, otherCells) {
  const head = cells[cells.length - 1];
  for (const other of otherCells) {
    if (voxelBlocks(head, other, dir)) return false;
  }
  return true;
}

export function canFireArrow(arrow, remaining) {
  const others = [];
  for (const a of remaining) {
    if (a.id === arrow.id) continue;
    for (const c of a.cells) others.push(c);
  }
  return canFireCells(arrow.cells, arrow.dir, others);
}

export function legalMoves(arrows) {
  return arrows.filter((a) => canFireArrow(a, arrows));
}

export function solveGreedy(arrows) {
  const remaining = arrows.map((a) => ({
    id: a.id,
    cells: a.cells,
    dir: a.dir.slice(),
  }));
  const order = [];
  while (remaining.length) {
    let fired = false;
    for (let i = 0; i < remaining.length; i++) {
      if (canFireArrow(remaining[i], remaining)) {
        order.push(remaining[i].id);
        remaining.splice(i, 1);
        fired = true;
        break;
      }
    }
    if (!fired) return { ok: false, order, stuck: remaining.map((a) => a.id) };
  }
  return { ok: true, order };
}

export function verifyOrder(arrows, order) {
  const remaining = arrows.map((a) => ({
    id: a.id,
    cells: a.cells,
    dir: a.dir.slice(),
  }));
  for (const id of order) {
    const i = remaining.findIndex((a) => a.id === id);
    if (i < 0) return { ok: false, reason: `missing id ${id}` };
    if (!canFireArrow(remaining[i], remaining)) {
      return { ok: false, reason: `illegal fire ${id}` };
    }
    remaining.splice(i, 1);
  }
  if (remaining.length) return { ok: false, reason: "leftover arrows" };
  return { ok: true };
}

function hasVoxel(set, p) {
  return set.has(keyV(p[0], p[1], p[2]));
}

export function neighborFace(v, n, d, voxelSet) {
  const vd = add(v, d);
  const vdn = add(add(v, d), n);
  if (hasVoxel(voxelSet, vd)) {
    if (hasVoxel(voxelSet, vdn)) return { v: vdn, n: neg(d) };
    return { v: vd.slice(), n: n.slice() };
  }
  if (hasVoxel(voxelSet, vdn)) return { v: vdn, n: neg(n) };
  return { v: v.slice(), n: d.slice() };
}

export function faceFromWalk(nf) {
  return { x: nf.v[0], y: nf.v[1], z: nf.v[2], nx: nf.n[0], ny: nf.n[1], nz: nf.n[2] };
}

export function buildAdjacency(faces, voxelSet) {
  const byKey = new Map(faces.map((f) => [keyF(f), f]));
  const adj = new Map();
  for (const f of faces) {
    const v = [f.x, f.y, f.z];
    const n = [f.nx, f.ny, f.nz];
    const list = [];
    for (const d of inPlaneDirs(n)) {
      const nf = faceFromWalk(neighborFace(v, n, d, voxelSet));
      const k = keyF(nf);
      if (byKey.has(k)) list.push({ face: byKey.get(k), dir: d });
    }
    adj.set(keyF(f), list);
  }
  return adj;
}

function hash01(x, y, z, salt = 0) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + salt;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n >>> 0) % 10000) / 10000;
}

export function lerpHex(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ra = (pa >> 16) & 255,
    ga = (pa >> 8) & 255,
    ba = pa & 255;
  const rb = (pb >> 16) & 255,
    gb = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ra + (rb - ra) * t);
  const g = Math.round(ga + (gb - ga) * t);
  const bl = Math.round(ba + (bb - ba) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, "0")}`;
}

const LIGHT = [-0.45, 0.78, 0.48];
const LIGHT_LEN = Math.hypot(...LIGHT);

export function surfaceLight(x, y, z, nx, ny, nz) {
  const vx = x,
    vy = y + 0.2,
    vz = z;
  const len = Math.hypot(vx, vy, vz) || 1;
  const px = vx / len,
    py = vy / len,
    pz = vz / len;
  // Mix outward shell normal and local face normal
  const fn = nx || ny || nz ? [nx, ny, nz] : [px, py, pz];
  const mx = px * 0.55 + fn[0] * 0.45;
  const my = py * 0.55 + fn[1] * 0.45;
  const mz = pz * 0.55 + fn[2] * 0.45;
  const ml = Math.hypot(mx, my, mz) || 1;
  const lambert = Math.max(0, (mx * LIGHT[0] + my * LIGHT[1] + mz * LIGHT[2]) / (ml * LIGHT_LEN));
  const noise = (hash01(x, y, z) - 0.5) * 0.1;
  return Math.max(0, Math.min(1, lambert * 0.96 + noise + 0.08));
}

export function colorForCell(cell) {
  const t = surfaceLight(cell.x, cell.y, cell.z, cell.nx, cell.ny, cell.nz);
  const part = cell.part || "body";
  if (part === "leaf") {
    if (t > 0.78) return lerpHex("#b8ff7a", "#f5ffe8", (t - 0.78) / 0.22);
    if (t > 0.5) return lerpHex("#3edc5a", "#b8ff7a", (t - 0.5) / 0.28);
    return lerpHex("#0c5a22", "#3edc5a", t / 0.5);
  }
  if (part === "calyx") {
    if (t > 0.78) return lerpHex("#e8a0ff", "#fff0ff", (t - 0.78) / 0.22);
    if (t > 0.5) return lerpHex("#b14cff", "#e8a0ff", (t - 0.5) / 0.28);
    return lerpHex("#3a0a58", "#b14cff", t / 0.5);
  }
  // body: deep indigo → dusty blue → white-hot
  if (t > 0.82) return lerpHex("#d8ecff", "#ffffff", (t - 0.82) / 0.18);
  if (t > 0.62) return lerpHex("#7eb0ff", "#d8ecff", (t - 0.62) / 0.2);
  if (t > 0.38) return lerpHex("#3a6bff", "#7eb0ff", (t - 0.38) / 0.24);
  if (t > 0.18) return lerpHex("#1a2db8", "#3a6bff", (t - 0.18) / 0.2);
  return lerpHex("#0a1248", "#1a2db8", t / 0.18);
}

export function colorForArrow(arrow) {
  // Weight toward the brightest cell so highlight runs pop like the reel
  let best = arrow.cells[0];
  let bestT = -1;
  let acc = [0, 0, 0];
  for (const c of arrow.cells) {
    const t = surfaceLight(c.x, c.y, c.z, c.nx, c.ny, c.nz);
    if (t > bestT) {
      bestT = t;
      best = c;
    }
    const hex = colorForCell({ ...c, part: arrow.part || c.part });
    const p = parseInt(hex.slice(1), 16);
    acc[0] += (p >> 16) & 255;
    acc[1] += (p >> 8) & 255;
    acc[2] += p & 255;
  }
  const n = arrow.cells.length;
  const avg = `#${(
    ((Math.round(acc[0] / n) << 16) | (Math.round(acc[1] / n) << 8) | Math.round(acc[2] / n)) >>>
    0
  )
    .toString(16)
    .padStart(6, "0")}`;
  const hot = colorForCell({ ...best, part: arrow.part || best.part });
  return lerpHex(avg, hot, 0.55);
}

const BODY_RX = 14.6;
const BODY_RY = 13.7;
const BODY_RZ = 14.6;

export function buildBlueberry() {
  const voxels = [];
  const voxelSet = new Set();
  const R = 16;
  for (let x = -R; x <= R; x++) {
    for (let y = -R; y <= R; y++) {
      for (let z = -R; z <= R; z++) {
        const sx = x / BODY_RX;
        const sy = (y + 0.25) / BODY_RY;
        const sz = z / BODY_RZ;
        if (sx * sx + sy * sy + sz * sz <= 1) {
          voxels.push({ x, y, z, part: "body" });
          voxelSet.add(keyV(x, y, z));
        }
      }
    }
  }

  let maxY = -Infinity;
  for (const v of voxels) if (v.part === "body" && v.y > maxY) maxY = v.y;

  // Small dip at the crown
  for (const [dx, dz] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const k = keyV(dx, maxY, dz);
    if (voxelSet.has(k)) {
      const i = voxels.findIndex((v) => v.x === dx && v.y === maxY && v.z === dz);
      if (i >= 0) voxels.splice(i, 1);
      voxelSet.delete(k);
    }
  }

  const y0 = maxY;
  const y1 = maxY + 1;
  const y2 = maxY + 2;

  const setPart = (x, y, z, part) => {
    const k = keyV(x, y, z);
    if (voxelSet.has(k)) {
      const i = voxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
      if (i >= 0) voxels[i].part = part;
      return;
    }
    voxelSet.add(k);
    voxels.push({ x, y, z, part });
  };

  // 5-point crown, one arm toward +Z (front), two layers tall.
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 5;
    for (let r = 0; r <= 5; r++) {
      const x = Math.round(Math.cos(a) * r);
      const z = Math.round(Math.sin(a) * r);
      setPart(x, r <= 2 ? y0 : y1, z, "calyx");
      if (r <= 4) setPart(x, r <= 1 ? y1 : y2, z, "calyx");
      // thicken mid-arm so the star reads at a glance
      if (r >= 2 && r <= 4) {
        const tx = -Math.round(Math.sin(a));
        const tz = Math.round(Math.cos(a));
        setPart(x + tx, y1, z + tz, "calyx");
        setPart(x - tx, y1, z - tz, "calyx");
      }
    }
  }
  // boss in the center
  setPart(0, y0, 0, "calyx");
  setPart(0, y1, 0, "calyx");
  setPart(0, y2, 0, "calyx");
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    setPart(dx, y0, dz, "calyx");
    setPart(dx, y1, dz, "calyx");
  }

  // Pointed leaf off the right-front of the crown, slightly down
  const leaf = [];
  const leafPath = [
    [4, y1, 2],
    [5, y1, 3],
    [6, y1, 3],
    [7, y1, 4],
    [8, y0, 4],
    [9, y0, 5],
    [10, y0, 5],
    [11, y0 - 1, 6],
    [12, y0 - 1, 6],
    [13, y0 - 2, 6],
  ];
  for (const [x, y, z] of leafPath) {
    leaf.push([x, y, z]);
    leaf.push([x, y, z + 1]);
    leaf.push([x, y - 1, z]);
  }
  // widen mid-leaf and taper the tip
  for (const [x, y, z] of [
    [7, y1, 3],
    [7, y1, 5],
    [8, y0, 3],
    [8, y0, 5],
    [9, y0, 4],
    [9, y0, 6],
    [10, y0, 4],
    [10, y0, 6],
    [11, y0 - 1, 5],
    [11, y0 - 1, 7],
    [12, y0 - 1, 5],
    [12, y0 - 1, 7],
    [13, y0 - 2, 5],
    [14, y0 - 2, 6],
  ]) {
    leaf.push([x, y, z]);
  }
  for (const [x, y, z] of leaf) setPart(x, y, z, "leaf");

  return { voxels, voxelSet, maxY };
}

export function exposedFaces(voxels, voxelSet) {
  const faces = [];
  const partAt = new Map(voxels.map((v) => [keyV(v.x, v.y, v.z), v.part]));
  for (const v of voxels) {
    for (const n of AXES) {
      const p = [v.x + n[0], v.y + n[1], v.z + n[2]];
      if (!hasVoxel(voxelSet, p)) {
        faces.push({
          x: v.x,
          y: v.y,
          z: v.z,
          nx: n[0],
          ny: n[1],
          nz: n[2],
          part: v.part,
        });
      }
    }
  }
  return faces;
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dirToward(adj, fromKey, toKey) {
  const list = adj.get(fromKey) || [];
  for (const n of list) {
    if (keyF(n.face) === toKey) return n.dir;
  }
  return null;
}

function pathHeadDirs(path, adj) {
  const head = path[path.length - 1];
  const hk = keyF(head);
  const towardPrev =
    path.length >= 2 ? dirToward(adj, hk, keyF(path[path.length - 2])) : null;
  const candidates = inPlaneDirs([head.nx, head.ny, head.nz]);
  const ordered = [];
  if (towardPrev) {
    const opp = neg(towardPrev);
    const match = candidates.find((d) => eq(d, opp));
    if (match) ordered.push(match);
  }
  for (const d of candidates) {
    if (!ordered.some((o) => eq(o, d)) && !(towardPrev && eq(d, towardPrev))) ordered.push(d);
  }
  if (towardPrev && !ordered.some((o) => eq(o, towardPrev))) ordered.push(towardPrev);
  return ordered;
}

/** How many already-placed arrows would this new path block if added? */
function countBlocksCreated(path, placed) {
  let n = 0;
  for (const a of placed) {
    const head = a.cells[a.cells.length - 1];
    for (const p of path) {
      if (voxelBlocks(head, p, a.dir)) {
        n++;
        break;
      }
    }
  }
  return n;
}

/** Does direction D point more toward the sculpture than off into empty space? */
function inwardScore(head, dir, voxelSet) {
  let hits = 0;
  for (let s = 1; s <= 16; s++) {
    const p = [head.x + dir[0] * s, head.y + dir[1] * s, head.z + dir[2] * s];
    if (voxelSet.has(keyV(p[0], p[1], p[2]))) hits++;
  }
  return hits;
}

export function generateLevel(seed = 20261121) {
  const rand = mulberry32(seed);
  const { voxels, voxelSet } = buildBlueberry();
  const faces = exposedFaces(voxels, voxelSet);
  const adj = buildAdjacency(faces, voxelSet);
  const free = new Set(faces.map((f) => keyF(f)));
  const byKey = new Map(faces.map((f) => [keyF(f), f]));
  const placed = [];
  const placedCells = [];

  // Phase 1: carve a dense maze of paths with no fire-direction constraint
  // so coverage can stay near 100%.
  const carved = [];
  const walk = (start, targetLen, turnBias) => {
    const path = [start];
    const used = new Set([keyF(start)]);
    let guard = 0;
    let lastDir = null;
    while (path.length < targetLen && guard++ < 24) {
      const cur = path[path.length - 1];
      let nbrs = (adj.get(keyF(cur)) || []).filter(
        (n) => !used.has(keyF(n.face)) && free.has(keyF(n.face))
      );
      if (!nbrs.length) break;
      const same = nbrs.filter((n) => n.face.part === cur.part);
      if (same.length && rand() < 0.82) nbrs = same;
      let picked = null;
      if (lastDir) {
        const straight = nbrs.find((n) => eq(n.dir, lastDir));
        const turns = nbrs.filter((n) => !eq(n.dir, lastDir));
        if (turns.length && (rand() < turnBias || !straight)) {
          picked = turns[Math.floor(rand() * turns.length)];
        } else if (straight) {
          picked = straight;
        }
      }
      if (!picked) {
        shuffle(nbrs, rand);
        picked = nbrs[0];
      }
      path.push(picked.face);
      used.add(keyF(picked.face));
      lastDir = picked.dir;
    }
    return path;
  };

  const reserve = (path) => {
    carved.push(path.map((c) => ({
      x: c.x, y: c.y, z: c.z, nx: c.nx, ny: c.ny, nz: c.nz, part: c.part,
    })));
    for (const c of path) free.delete(keyF(c));
  };

  const passes = [
    { len: [6, 7, 8, 9], tries: 5000, minPath: 5, turn: 0.64 },
    { len: [4, 5, 6], tries: 4000, minPath: 4, turn: 0.7 },
    { len: [3, 4], tries: 3000, minPath: 3, turn: 0.72 },
    { len: [2, 3], tries: 4000, minPath: 2, turn: 0.5 },
  ];
  for (const pass of passes) {
    let tries = 0;
    let stagnant = 0;
    while (free.size >= 1 && tries < pass.tries) {
      tries++;
      const keys = [...free];
      const startF = byKey.get(keys[Math.floor(rand() * keys.length)]);
      if (!startF) break;
      const target = pass.len[Math.floor(rand() * pass.len.length)];
      const path = walk(startF, target, pass.turn);
      if (path.length < pass.minPath) {
        stagnant++;
        if (stagnant > 400) break;
        continue;
      }
      reserve(path);
      stagnant = 0;
    }
  }

  // Phase 2: assign a fire direction and a reverse-construction order.
  // First place deep "through the berry" arrows (they fire last), then
  // repeatedly place arrows that sit in front of them (they fire earlier).
  // Never place an illegal direction. If a whole path is boxed in, split it
  // into single-cell arrows and place whatever is still legal.

  const laneKey = (c, axis) =>
    axis === 0 ? `${c.y},${c.z}` : axis === 1 ? `${c.x},${c.z}` : `${c.x},${c.y}`;

  const index = [new Map(), new Map(), new Map()];
  const addIndexed = (cell) => {
    for (let axis = 0; axis < 3; axis++) {
      const k = laneKey(cell, axis);
      let arr = index[axis].get(k);
      if (!arr) {
        arr = [];
        index[axis].set(k, arr);
      }
      arr.push(cell);
    }
  };
  const othersInCorridor = (cell, dir) => {
    const axis = dirAxis(dir);
    const ca = [cell.x, cell.y, cell.z];
    const out = [];
    for (let d1 = -LANE_SLACK; d1 <= LANE_SLACK; d1++) {
      for (let d2 = -LANE_SLACK; d2 <= LANE_SLACK; d2++) {
        const q = ca.slice();
        const perps = [0, 1, 2].filter((i) => i !== axis);
        q[perps[0]] += d1;
        q[perps[1]] += d2;
        const k =
          axis === 0 ? `${q[1]},${q[2]}` : axis === 1 ? `${q[0]},${q[2]}` : `${q[0]},${q[1]}`;
        const arr = index[axis].get(k);
        if (arr) out.push(...arr);
      }
    }
    return out;
  };
  const canFireFast = (cells, dir) => {
    const c = cells[cells.length - 1];
    const others = othersInCorridor(c, dir);
    for (const o of others) {
      if (voxelBlocks(c, o, dir)) return false;
    }
    return true;
  };

  const scoreCandidate = (p, dir) => {
    const head = p[p.length - 1];
    const toward = inwardScore(head, dir, voxelSet);
    const blocks = countBlocksCreated(p, placed);
    const stackBias = placed.length === 0 ? toward * 12 : blocks * 40 + toward * 2;
    return stackBias + p.length * 0.05 + rand() * 0.2;
  };

  const consider = (path) => {
    const orientations = path.length > 1 ? [path, [...path].reverse()] : [path];
    let best = null;
    let bestScore = -1e12;
    let nLegal = 0;
    for (const p of orientations) {
      const dirs = pathHeadDirs(p, adj);
      for (const dir of dirs) {
        if (!canFireFast(p, dir)) continue;
        nLegal++;
        const sc = scoreCandidate(p, dir);
        if (sc > bestScore) {
          bestScore = sc;
          best = { p, dir, score: sc, nLegal: 0 };
        }
      }
    }
    if (best) {
      // Urgency: place a path before its last legal direction disappears,
      // and place long maze lines early (they fire last) while the board
      // is still open enough to accept them.
      best.nLegal = nLegal;
      best.score =
        bestScore +
        path.length * 25 +
        (nLegal === 1 ? 800 : nLegal === 2 ? 120 : 0);
    }
    return best;
  };

  let leftover = carved.map((cells) => ({ cells }));
  let cache = leftover.map((L) => consider(L.cells));
  let splitOnce = false;
  while (leftover.length) {
    let bi = -1;
    let bestScore = -1e12;
    for (let i = 0; i < leftover.length; i++) {
      if (cache[i] && cache[i].score > bestScore) {
        bestScore = cache[i].score;
        bi = i;
      }
    }
    if (bi < 0) {
      if (!splitOnce) {
        const singles = [];
        for (const L of leftover) {
          for (const c of L.cells) singles.push({ cells: [c] });
        }
        leftover = singles;
        cache = leftover.map((L) => consider(L.cells));
        splitOnce = true;
        continue;
      }
      break; // uncovered leftovers; do not place illegal moves
    }
    const pick = cache[bi];
    const p = pick.p;
    const parts = {};
    for (const c of p) parts[c.part] = (parts[c.part] || 0) + 1;
    const part = Object.entries(parts).sort((a, b) => b[1] - a[1])[0][0];
    const arrow = { id: placed.length, cells: p, dir: pick.dir.slice(), part };
    arrow.color = colorForArrow(arrow);
    placed.push(arrow);
    for (const c of p) {
      placedCells.push(c);
      addIndexed(c);
    }
    leftover.splice(bi, 1);
    cache.splice(bi, 1);
    // Re-score leftovers that share a corridor with the new arrow.
    for (let i = 0; i < leftover.length; i++) {
      let touched = !cache[i];
      if (!touched) {
        outer: for (const c of leftover[i].cells) {
          for (const n of p) {
            for (let axis = 0; axis < 3; axis++) {
              if (sameLane(c, n, axis)) {
                touched = true;
                break outer;
              }
            }
          }
        }
      }
      if (touched) cache[i] = consider(leftover[i].cells);
    }
  }

  // Tighten opening moves with a cheap acyclicity check (no full solver
  // on every try). Re-point a legal arrow into a blocked direction if that
  // would not create a wait-cycle. Target about 16% free.
  const blockersOf = (arrow) => {
    const head = arrow.cells[arrow.cells.length - 1];
    const ids = [];
    for (const b of placed) {
      if (b.id === arrow.id) continue;
      let hit = false;
      for (const c of b.cells) {
        if (voxelBlocks(head, c, arrow.dir)) {
          hit = true;
          break;
        }
      }
      if (hit) ids.push(b.id);
    }
    return ids;
  };
  const createsCycle = (fromId, dependsOnIds, graph) => {
    // If we add edges fromId -> each dependsOn (from waits for them),
    // is there a path from any dependsOn back to fromId?
    const need = new Set(dependsOnIds);
    const seen = new Set();
    const stack = [...need];
    while (stack.length) {
      const id = stack.pop();
      if (id === fromId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      const nxt = graph.get(id);
      if (nxt) for (const n of nxt) stack.push(n);
    }
    return false;
  };
  const tighten = () => {
    const target = Math.max(8, Math.round(placed.length * 0.16));
    const graph = new Map(); // id -> ids it waits for
    for (const a of placed) graph.set(a.id, blockersOf(a));
    let guard = 0;
    while (guard++ < 2000) {
      const legal = placed.filter((a) => (graph.get(a.id) || []).length === 0);
      if (legal.length <= target) break;
      let changed = false;
      shuffle(legal, rand);
      for (const a of legal) {
        const head = a.cells[a.cells.length - 1];
        const orig = a.dir.slice();
        const alts = inPlaneDirs([head.nx, head.ny, head.nz]).filter(
          (d) => d[0] !== orig[0] || d[1] !== orig[1] || d[2] !== orig[2]
        );
        shuffle(alts, rand);
        for (const d of alts) {
          a.dir = d.slice();
          const deps = blockersOf(a);
          if (deps.length === 0) {
            a.dir = orig;
            continue;
          }
          if (createsCycle(a.id, deps, graph)) {
            a.dir = orig;
            continue;
          }
          graph.set(a.id, deps);
          changed = true;
          break;
        }
        if (changed) break;
        a.dir = orig;
      }
      if (!changed) break;
    }
  };
  tighten();

  // After a tighten pass, the original construction order may no longer
  // apply. Prefer a fresh greedy solution as the official order.
  const greedy = solveGreedy(placed);
  const solveOrder = greedy.ok ? greedy.order.slice() : placed.map((a) => a.id).reverse();
  const official = verifyOrder(placed, solveOrder);
  const opening = official.ok ? legalMoves(placed).length : -1;

  const surface = [];
  const seenV = new Set();
  for (const v of voxels) {
    let exposed = false;
    for (const n of AXES) {
      if (!voxelSet.has(keyV(v.x + n[0], v.y + n[1], v.z + n[2]))) {
        exposed = true;
        break;
      }
    }
    if (exposed && !seenV.has(keyV(v.x, v.y, v.z))) {
      seenV.add(keyV(v.x, v.y, v.z));
      surface.push({ x: v.x, y: v.y, z: v.z, part: v.part });
    }
  }

  return {
    seed,
    voxels: surface,
    allVoxelCount: voxels.length,
    arrows: placed.map((a) => ({
      id: a.id,
      cells: a.cells,
      dir: a.dir,
      color: a.color,
      part: a.part,
    })),
    solveOrder,
    stats: {
      voxelCount: voxels.length,
      surfaceVoxels: surface.length,
      faceCount: faces.length,
      arrowCount: placed.length,
      facesCovered: faces.length - free.size,
      facesFree: free.size,
      openingMoves: opening,
      openingPct: placed.length ? opening / placed.length : 0,
      greedyOk: greedy.ok,
      officialOk: official.ok,
      officialReason: official.reason || null,
    },
  };
}

/** Among legal moves, pick the one that unlocks the most new legal arrows. */
export function bestHint(arrows) {
  const legal = legalMoves(arrows);
  if (!legal.length) return null;
  // Avoid O(n^2) legalMoves on hundreds of arrows when many are legal:
  // first compute which arrows each legal move blocks (i.e. who has this one in front).
  const blockedBy = new Map(); // arrowId -> ids that currently block it
  for (const a of arrows) {
    const blockers = [];
    for (const b of arrows) {
      if (a.id === b.id) continue;
      let blocks = false;
      const head = a.cells[a.cells.length - 1];
      for (const cb of b.cells) {
        if (voxelBlocks(head, cb, a.dir)) {
          blocks = true;
          break;
        }
      }
      if (blocks) blockers.push(b.id);
    }
    blockedBy.set(a.id, blockers);
  }
  const legalSet = new Set(legal.map((a) => a.id));
  let best = legal[0];
  let bestScore = -1e9;
  for (const a of legal) {
    let unlocks = 0;
    for (const other of arrows) {
      if (other.id === a.id) continue;
      if (legalSet.has(other.id)) continue;
      const blockers = blockedBy.get(other.id) || [];
      const rest = blockers.filter((id) => id !== a.id);
      if (blockers.length > 0 && rest.length === 0) unlocks++;
    }
    const score = unlocks * 20 + a.cells.length + (a.part === "body" ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  best._hintUnlocks = bestScore;
  return best;
}

export function asciiViews(voxels) {
  const xs = voxels.map((v) => v.x);
  const ys = voxels.map((v) => v.y);
  const zs = voxels.map((v) => v.z);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  const ch = (part) => (part === "leaf" ? "L" : part === "calyx" ? "C" : "#");
  const by = new Map();
  for (const v of voxels) by.set(keyV(v.x, v.y, v.z), v);
  const front = [];
  for (let y = maxY; y >= minY; y--) {
    let row = "";
    for (let x = minX; x <= maxX; x++) {
      let hit = null;
      for (let z = maxZ; z >= minZ; z--) {
        const v = by.get(keyV(x, y, z));
        if (v) {
          hit = v;
          break;
        }
      }
      row += hit ? ch(hit.part) : ".";
    }
    front.push(row);
  }
  const top = [];
  for (let z = minZ; z <= maxZ; z++) {
    let row = "";
    for (let x = minX; x <= maxX; x++) {
      let hit = null;
      for (let y = maxY; y >= minY; y--) {
        const v = by.get(keyV(x, y, z));
        if (v) {
          hit = v;
          break;
        }
      }
      row += hit ? ch(hit.part) : ".";
    }
    top.push(row);
  }
  return { top: top.join("\n"), front: front.join("\n") };
}
