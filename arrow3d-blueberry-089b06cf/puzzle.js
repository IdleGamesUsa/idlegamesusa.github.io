/**
 * Arrow Trails 3D — blueberry puzzle logic
 *
 * 3D EXIT RULE
 * ------------
 * Each arrow occupies a sequence of exposed voxel faces and has a single
 * head direction D, one of the six axis directions. When fired, the whole
 * arrow (every face cell, even if the painted path bends) translates in
 * direction D and flies off the model.
 *
 * A face is treated as a thin axis-aligned box: the unit face square
 * extruded 0.2 units outward along its normal.
 *
 * An arrow may be fired if and only if no face-box of any *other remaining*
 * arrow lies in its flight path:
 *   - Their projections strictly overlap on the two axes perpendicular to D, AND
 *   - The other box is completely in front of (or exactly touching) this box
 *     along D.
 *
 * The berry voxels themselves do not block. Only remaining arrows do, including
 * arrows around the far side or on a protruding stairstep or the calyx, if they
 * sit in that flight corridor. Firing an already-legal arrow is always safe:
 * blockers only disappear, so a reverse-constructed level cannot be bricked.
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

/** Voxel is a unit cube centered on the integer coordinate. */
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

/** True if box B blocks box A from sliding in direction D. */
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

export function canFireCells(cells, dir, otherCells) {
  const aabbs = cells.map((c) => faceAABB(c));
  for (const other of otherCells) {
    const b = faceAABB(other);
    for (const a of aabbs) {
      if (boxBlocks(a, b, dir)) return false;
    }
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

/** Greedy solver: any legal fire is safe on a reverse-constructed level. */
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

/**
 * Next surface face when walking off face (v, n) across the edge in in-plane
 * direction d. Standard 3-case voxel surface walk.
 */
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

function lerpHex(a, b, t) {
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

function shadeBody(x, y, z, rand) {
  const cx = 0,
    cy = -0.15,
    cz = 0;
  const vx = x - cx,
    vy = y - cy,
    vz = z - cz;
  const len = Math.hypot(vx, vy, vz) || 1;
  const nx = vx / len,
    ny = vy / len,
    nz = vz / len;
  const Lx = -0.42,
    Ly = 0.72,
    Lz = 0.52;
  const lLen = Math.hypot(Lx, Ly, Lz);
  const lambert = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / lLen);
  const noise = (rand() - 0.5) * 0.12;
  const t = Math.min(1, Math.max(0, lambert * 0.95 + noise + 0.16));
  const deep = "#151c48";
  const mid = "#2c3d96";
  const high = "#7fa0c2";
  const dust = "#d0e2f2";
  if (t < 0.45) return lerpHex(deep, mid, t / 0.45);
  if (t < 0.78) return lerpHex(mid, high, (t - 0.45) / 0.33);
  return lerpHex(high, dust, (t - 0.78) / 0.22);
}

function shadeCalyx(x, y, z, rand) {
  const L = Math.max(0, -0.3 * (x > 0 ? 0.2 : 0) + 0.55 + 0.4 * (z > 0 ? 0.2 : 0) + (rand() - 0.5) * 0.15);
  return lerpHex("#3a1848", "#8a4a9a", 0.25 + 0.6 * Math.max(0, Math.min(1, L)));
}

function shadeLeaf(x, y, z, rand) {
  const t = 0.35 + 0.5 * Math.max(0, 0.5 + 0.4 * x + 0.3 * y + (rand() - 0.5) * 0.2);
  return lerpHex("#246830", "#7ed45e", Math.max(0, Math.min(1, t)));
}

export function neonFromSurface(hex, part) {
  const p = parseInt(hex.slice(1), 16);
  let r = (p >> 16) & 255,
    g = (p >> 8) & 255,
    b = p & 255;
  if (part === "leaf") {
    r = Math.min(255, Math.round(r * 0.6 + 40));
    g = Math.min(255, Math.round(g * 1.35 + 70));
    b = Math.min(255, Math.round(b * 0.7 + 40));
  } else if (part === "calyx") {
    r = Math.min(255, Math.round(r * 1.15 + 80));
    g = Math.min(255, Math.round(g * 0.7 + 20));
    b = Math.min(255, Math.round(b * 1.35 + 90));
  } else {
    r = Math.min(255, Math.round(r * 0.7 + 50));
    g = Math.min(255, Math.round(g * 0.85 + 70));
    b = Math.min(255, Math.round(b * 1.25 + 110));
    if (r + g + b < 280) {
      r = Math.min(255, r + 30);
      g = Math.min(255, g + 40);
      b = Math.min(255, b + 70);
    }
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function buildBlueberry(rand) {
  const voxels = [];
  const voxelSet = new Set();
  const RX = 5.35;
  const RY = 5.05;
  const RZ = 5.35;
  for (let x = -6; x <= 6; x++) {
    for (let y = -6; y <= 6; y++) {
      for (let z = -6; z <= 6; z++) {
        const sx = x / RX;
        const sy = (y + 0.15) / RY;
        const sz = z / RZ;
        if (sx * sx + sy * sy + sz * sz <= 1) {
          const color = shadeBody(x, y, z, rand);
          voxels.push({ x, y, z, color, part: "body" });
          voxelSet.add(keyV(x, y, z));
        }
      }
    }
  }

  let maxY = -Infinity;
  for (const v of voxels) if (v.part === "body" && v.y > maxY) maxY = v.y;

  // Slight dip at the crown: remove a very top-center body voxel if present
  const dipKey = keyV(0, maxY, 0);
  if (voxelSet.has(dipKey)) {
    const i = voxels.findIndex((v) => v.x === 0 && v.y === maxY && v.z === 0);
    if (i >= 0) voxels.splice(i, 1);
    voxelSet.delete(dipKey);
  }

  const calyxY = maxY;
  const calyxY2 = maxY + 1;
  // Hand-placed 5-point crown, one arm toward +Z (front).
  // Top view (x right, z down): the star reads as five short arms.
  const calyxPts = [
    // center, slightly lower in the dip, and a raised boss
    [0, calyxY, 0],
    [0, calyxY2, 0],
    [0, calyxY, 1],
    [0, calyxY2, 1],
    // front arm (+Z)
    [0, calyxY2, 2],
    // right-front arm
    [2, calyxY2, 1],
    [1, calyxY, 1],
    // right-back arm
    [1, calyxY2, -2],
    [1, calyxY, -1],
    // left-back arm
    [-1, calyxY2, -2],
    [-1, calyxY, -1],
    // left-front arm
    [-2, calyxY2, 1],
    [-1, calyxY, 1],
  ];
  const calyxCells = new Set();
  const addCalyx = (x, y, z) => {
    const k = keyV(x, y, z);
    if (calyxCells.has(k)) return;
    calyxCells.add(k);
    if (voxelSet.has(k)) {
      const i = voxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
      if (i >= 0) {
        voxels[i].part = "calyx";
        voxels[i].color = shadeCalyx(x, y, z, rand);
        return;
      }
    }
    voxelSet.add(k);
    voxels.push({ x, y, z, color: shadeCalyx(x, y, z, rand), part: "calyx" });
  };
  for (const [x, y, z] of calyxPts) addCalyx(x, y, z);

  // Small pointed green leaf off the right side of the crown
  const leaf = [
    [3, calyxY2, 1],
    [4, calyxY2, 1],
    [4, calyxY2, 2],
    [5, calyxY2 - 1, 2],
    [5, calyxY2 - 1, 1],
    [6, calyxY2 - 1, 2],
    [4, calyxY2 - 1, 2],
  ];
  for (const [x, y, z] of leaf) {
    const k = keyV(x, y, z);
    if (voxelSet.has(k)) continue;
    voxelSet.add(k);
    voxels.push({ x, y, z, color: shadeLeaf(x, y, z, rand), part: "leaf" });
  }

  return { voxels, voxelSet, maxY };
}

export function exposedFaces(voxels, voxelSet) {
  const faces = [];
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
          color: v.color,
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

function dirToward(adjList, fromKey, toKey) {
  const list = adjList.get(fromKey) || [];
  for (const n of list) {
    if (keyF(n.face) === toKey) return n.dir;
  }
  return null;
}

function pathHeadDirs(path, adj) {
  const head = path[path.length - 1];
  const hk = keyF(head);
  const incoming =
    path.length >= 2 ? dirToward(adj.get(hk) ? adj : adj, hk, keyF(path[path.length - 2])) : null;
  // The dir stored on adj of head toward previous is the incoming direction.
  const towardPrev = incoming;
  const candidates = inPlaneDirs([head.nx, head.ny, head.nz]);
  // Prefer straight-ish: opposite of incoming, then the rest
  const ordered = [];
  if (towardPrev) {
    const opp = neg(towardPrev);
    const match = candidates.find((d) => eq(d, opp));
    if (match) ordered.push(match);
  }
  for (const d of candidates) {
    if (!ordered.some((o) => eq(o, d)) && !(towardPrev && eq(d, towardPrev))) ordered.push(d);
  }
  // last resort: include toward prev (U-turn), almost never used
  if (towardPrev && !ordered.some((o) => eq(o, towardPrev))) ordered.push(towardPrev);
  return ordered;
}

export function generateLevel(seed = 20261121) {
  const rand = mulberry32(seed);
  const { voxels, voxelSet } = buildBlueberry(rand);
  const faces = exposedFaces(voxels, voxelSet);
  const adj = buildAdjacency(faces, voxelSet);
  const free = new Set(faces.map((f) => keyF(f)));
  const byKey = new Map(faces.map((f) => [keyF(f), f]));
  const placed = []; // construction order (reverse of solve)
  const placedCells = []; // flat list of cells already placed

  const tryPlacePath = (path) => {
    if (path.length < 1) return false;
    const orientations = [path];
    if (path.length > 1) orientations.push([...path].reverse());
    for (const p of orientations) {
      const dirs = pathHeadDirs(p, adj);
      for (const dir of dirs) {
        if (canFireCells(p, dir, placedCells)) {
          const parts = {};
          for (const c of p) parts[c.part] = (parts[c.part] || 0) + 1;
          const part = Object.entries(parts).sort((a, b) => b[1] - a[1])[0][0];
          const avg = p[Math.floor(p.length / 2)];
          const color = neonFromSurface(avg.color, part);
          const id = placed.length;
          const arrow = {
            id,
            cells: p.map((c) => ({
              x: c.x,
              y: c.y,
              z: c.z,
              nx: c.nx,
              ny: c.ny,
              nz: c.nz,
            })),
            dir: dir.slice(),
            color,
            part,
          };
          placed.push(arrow);
          for (const c of p) {
            placedCells.push(c);
            free.delete(keyF(c));
          }
          return true;
        }
      }
    }
    return false;
  };

  const walk = (start, targetLen) => {
    const path = [start];
    const used = new Set([keyF(start)]);
    let guard = 0;
    while (path.length < targetLen && guard++ < 20) {
      const cur = path[path.length - 1];
      let nbrs = (adj.get(keyF(cur)) || []).filter((n) => !used.has(keyF(n.face)) && free.has(keyF(n.face)));
      if (!nbrs.length) break;
      // Prefer continuing straight if we can
      if (path.length >= 2) {
        const prev = path[path.length - 2];
        const back = (adj.get(keyF(cur)) || []).find((n) => keyF(n.face) === keyF(prev));
        if (back) {
          const straight = neg(back.dir);
          const hit = nbrs.find((n) => eq(n.dir, straight));
          if (hit && rand() < 0.72) nbrs = [hit];
          else {
            // slight preference for same part
            const same = nbrs.filter((n) => n.face.part === cur.part);
            if (same.length && rand() < 0.7) nbrs = same;
            shuffle(nbrs, rand);
          }
        } else shuffle(nbrs, rand);
      } else {
        const same = nbrs.filter((n) => n.face.part === cur.part);
        if (same.length && rand() < 0.75) nbrs = same;
        shuffle(nbrs, rand);
      }
      const pick = nbrs[0].face;
      path.push(pick);
      used.add(keyF(pick));
    }
    return path;
  };

  // Longer paths first, then fill
  const TARGET_ARROWS = 50;
  const BODY_COVER = 0.58;
  const bodyFaceCount = faces.filter((f) => f.part === "body").length;
  const bodyCovered = () =>
    bodyFaceCount - [...free].filter((k) => byKey.get(k)?.part === "body").length;

  const passes = [
    { minFree: 8, len: [5, 6, 7], tries: 700, minPath: 4, bodyOnlyCap: true },
    { minFree: 4, len: [3, 4, 5], tries: 500, minPath: 3, bodyOnlyCap: true },
    { minFree: 2, len: [2, 3], tries: 400, minPath: 2, bodyOnlyCap: true },
    // Prefer to finish calyx/leaf so the crown and leaf stay painted
    { minFree: 1, len: [2, 3, 4], tries: 300, minPath: 2, preferParts: true },
  ];

  for (const pass of passes) {
    let tries = 0;
    while (free.size >= pass.minFree && tries < pass.tries && placed.length < TARGET_ARROWS + 8) {
      tries++;
      if (pass.bodyOnlyCap && bodyCovered() / bodyFaceCount >= BODY_COVER && placed.length >= 36) {
        break;
      }
      let keys = [...free];
      if (pass.preferParts) {
        const pref = keys.filter((k) => {
          const p = byKey.get(k)?.part;
          return p === "calyx" || p === "leaf";
        });
        if (pref.length) keys = pref;
        else break;
      }
      const start = byKey.get(keys[Math.floor(rand() * keys.length)]);
      if (!start) break;
      const target = pass.len[Math.floor(rand() * pass.len.length)];
      const path = walk(start, target);
      if (path.length < pass.minPath) continue;
      tryPlacePath(path);
    }
  }

  // Construction order is reverse solve order: last placed is first to fire
  const solveOrder = placed.map((a) => a.id).reverse();
  const arrows = placed;
  const greedy = solveGreedy(arrows);
  const official = verifyOrder(arrows, solveOrder);

  return {
    seed,
    voxels: voxels.map((v) => ({ x: v.x, y: v.y, z: v.z, color: v.color, part: v.part })),
    arrows: arrows.map((a) => ({
      id: a.id,
      cells: a.cells,
      dir: a.dir,
      color: a.color,
      part: a.part,
    })),
    solveOrder,
    stats: {
      voxelCount: voxels.length,
      faceCount: faces.length,
      arrowCount: arrows.length,
      facesCovered: faces.length - free.size,
      facesFree: free.size,
      greedyOk: greedy.ok,
      officialOk: official.ok,
      officialReason: official.reason || null,
      greedyOrder: greedy.order,
    },
  };
}

export const EXIT_RULE_TEXT =
  "An arrow slides off in the direction its head points. The whole line moves that way, even if it bends. It can only leave if no other remaining arrow sits in that flight path — including arrows around the far side of the berry or on a protruding step. The berry itself does not block, only other arrows.";

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
  const sliceY = (y) => {
    const lines = [];
    for (let z = minZ; z <= maxZ; z++) {
      let row = "";
      for (let x = minX; x <= maxX; x++) {
        const v = by.get(keyV(x, y, z));
        row += v ? ch(v.part) : ".";
      }
      lines.push(row);
    }
    return lines.join("\n");
  };
  const front = []; // looking from +Z, x right, y up
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
  const side = []; // looking from +X, z right, y up
  for (let y = maxY; y >= minY; y--) {
    let row = "";
    for (let z = minZ; z <= maxZ; z++) {
      let hit = null;
      for (let x = maxX; x >= minX; x--) {
        const v = by.get(keyV(x, y, z));
        if (v) {
          hit = v;
          break;
        }
      }
      row += hit ? ch(hit.part) : ".";
    }
    side.push(row);
  }
  const top = []; // looking from +Y, x right, z down
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
  return { top: top.join("\n"), front: front.join("\n"), side: side.join("\n"), sliceTop: sliceY(maxY) };
}
