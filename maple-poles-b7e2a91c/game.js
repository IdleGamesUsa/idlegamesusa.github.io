/* Maple Homes — fixed transmission & service dots, street-routed lines. */
(() => {
  const M = window.MAPLE;
  const R = M.rules;
  const W = M.W, H = M.H;
  const HOUSES = M.houses;
  const CLUSTERS = M.clusters;
  const TX = M.txSpots;
  const ENTRY = M.entry;
  const STREETS = M.streets;
  const KEY = 'ipg-maple-poles-v3';
  const svcCost = (n) => R.serviceBase + R.servicePerCan * n;

  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  const boot = document.getElementById('boot');
  const $inc = document.getElementById('inc');
  const $cash = document.getElementById('cash');
  const $houses = document.getElementById('houses');
  const $poles = document.getElementById('poles');
  const $svcs = document.getElementById('svcs');
  const $hint = document.getElementById('hint');
  const $undo = document.getElementById('undo');
  const $reset = document.getElementById('reset');
  const $toast = document.getElementById('toast');
  const $popup = document.getElementById('popup');
  const $popBox = document.getElementById('popBox');
  const $sub = document.getElementById('tbarsub');

  let dpr = 1, litImg, dimImg, graph;
  let poleImg, poleSvc = {};
  const POLE = { artH: 112, shaftFrac: 0.529, armBotFrac: 0.277, armFracs: [0.12, 0.185, 0.255] };
  let cash, poles, spans, services, lit, undo, lastTs, done, doneShown;
  let pops = [], pulses = [], highlight = null, hover = null, press = null;
  let plantingLock = 0, toastTimer = 0;
  let ready = false, running = false;

  const now = () => performance.now();
  const hypot = Math.hypot;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n) => {
    n = Math.floor(n);
    if (n < 1000) return '$' + n;
    if (n < 10000) return '$' + (n / 1000).toFixed(1) + 'k';
    if (n < 1e6) return '$' + Math.round(n / 1000) + 'k';
    return '$' + (n / 1e6).toFixed(2) + 'M';
  };
  const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  /* ---- street graph for line routing ---- */
  function buildGraph() {
    const nodes = [], adj = [];
    const mergeR = 5;
    function findOrAdd(x, y) {
      for (let i = 0; i < nodes.length; i++) {
        if (hypot(nodes[i].x - x, nodes[i].y - y) <= mergeR) return i;
      }
      nodes.push({ x, y }); adj.push([]); return nodes.length - 1;
    }
    function link(i, j) {
      if (i === j) return;
      const d = hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (!adj[i].some((e) => e.j === j)) { adj[i].push({ j, d }); adj[j].push({ j: i, d }); }
    }
    for (const poly of STREETS) {
      let prev = null;
      for (let s = 0; s < poly.length - 1; s++) {
        const ax = poly[s][0], ay = poly[s][1], bx = poly[s + 1][0], by = poly[s + 1][1];
        const len = hypot(bx - ax, by - ay) || 1;
        const n = Math.max(1, Math.round(len / 6));
        for (let k = 0; k <= n; k++) {
          const t = k / n, i = findOrAdd(ax + t * (bx - ax), ay + t * (by - ay));
          if (prev != null) link(prev, i);
          prev = i;
        }
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) <= 8) link(i, j);
      }
    }
    return { nodes, adj };
  }
  function nearestGraph(x, y) {
    let bi = 0, bd = 1e9;
    const ns = graph.nodes;
    for (let i = 0; i < ns.length; i++) {
      const d = hypot(ns[i].x - x, ns[i].y - y);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  }
  function streetPath(ax, ay, bx, by) {
    const s = nearestGraph(ax, ay), t = nearestGraph(bx, by);
    if (s === t) return [[ax, ay], [bx, by]];
    const N = graph.nodes.length, dist = new Float64Array(N), prev = new Int32Array(N);
    dist.fill(1e15); prev.fill(-1); dist[s] = 0;
    const used = new Uint8Array(N);
    for (let n = 0; n < N; n++) {
      let u = -1, best = 1e15;
      for (let i = 0; i < N; i++) if (!used[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === t) break;
      used[u] = 1;
      const edges = graph.adj[u];
      for (let k = 0; k < edges.length; k++) {
        const j = edges[k].j, nd = dist[u] + edges[k].d;
        if (nd < dist[j]) { dist[j] = nd; prev[j] = u; }
      }
    }
    if (prev[t] < 0 && s !== t) return [[ax, ay], [bx, by]];
    const chain = [];
    for (let v = t; v >= 0; v = prev[v]) { chain.push(v); if (v === s) break; }
    chain.reverse();
    const pts = [[ax, ay]];
    for (const i of chain) {
      const p = graph.nodes[i];
      const last = pts[pts.length - 1];
      if (hypot(p.x - last[0], p.y - last[1]) > 1.5) pts.push([p.x, p.y]);
    }
    const last = pts[pts.length - 1];
    if (hypot(bx - last[0], by - last[1]) > 1.5) pts.push([bx, by]);
    return pts;
  }

  /* ---- state helpers ---- */
  function allNodes() {
    return [{ id: 'entry', x: ENTRY.x, y: ENTRY.y, on: true }, ...poles];
  }
  function nearestNode(x, y, pred) {
    let best = null, bd = 1e9;
    for (const p of allNodes()) {
      if (pred && !pred(p)) continue;
      const d = hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { node: best, d: bd } : null;
  }
  function inc() { return lit.size * R.houseIncome; }
  function hasSpan(a, b) {
    return spans.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a));
  }
  function energize() {
    const on = new Set(['entry']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const s of spans) {
        if (on.has(s.a) && !on.has(s.b)) { on.add(s.b); changed = true; }
        if (on.has(s.b) && !on.has(s.a)) { on.add(s.a); changed = true; }
      }
    }
    for (const p of poles) p.on = on.has(p.id);
    for (const s of spans) s.on = on.has(s.a) && on.has(s.b);
  }
  function rebridge() {
    energize();
    let added = true;
    while (added) {
      added = false;
      for (const p of poles) {
        if (p.on) continue;
        const n = nearestNode(p.x, p.y, (q) => q.id !== p.id && q.on);
        if (n && n.d <= R.maxSpan && !hasSpan(p.id, n.node.id)) {
          spans.push({ a: p.id, b: n.node.id, on: false, zip: now(), pts: streetPath(p.x, p.y, n.node.x, n.node.y) });
          added = true;
        }
      }
      if (added) energize();
    }
  }

  function txBuilt(id) { return poles.some((p) => p.spotId === id); }
  function svcBuilt(id) { return services.some((s) => s.id === id); }

  function canBuyTx(spot) {
    if (typeof spot === 'string') spot = TX.find((s) => s.id === spot);
    if (!spot || txBuilt(spot.id)) return false;
    const n = nearestNode(spot.x, spot.y, (q) => q.on);
    return !!(n && n.d <= R.maxSpan);
  }
  function canBuySvc(c) {
    if (typeof c === 'string') c = CLUSTERS.find((x) => x.id === c);
    if (!c || svcBuilt(c.id)) return false;
    const n = nearestNode(c.x, c.y, (q) => q.on);
    return !!(n && n.d <= R.feedReach);
  }
  function squareDone() { return !!done || lit.size >= 20; }
  function availableTx() { return squareDone() ? [] : TX.filter(canBuyTx); }
  function availableSvc() { return squareDone() ? [] : CLUSTERS.filter(canBuySvc); }

  function buyTx(id, opts = {}) {
    const spot = TX.find((s) => s.id === id);
    if (!spot) return { ok: false, reason: 'missing' };
    if (txBuilt(id)) return { ok: false, reason: 'done' };
    if (!canBuyTx(spot)) return { ok: false, reason: 'reach' };
    if (cash < R.poleCost && !opts.free) return { ok: false, reason: 'cash' };
    if (!opts.free) cash -= R.poleCost;
    const pole = { id, spotId: id, x: spot.x, y: spot.y, on: false, plant: now() };
    poles.push(pole);
    const nOn = nearestNode(spot.x, spot.y, (q) => q.id !== id && q.on);
    if (nOn && nOn.d <= R.maxSpan) {
      spans.push({
        a: id, b: nOn.node.id, on: false, zip: now(),
        pts: streetPath(spot.x, spot.y, nOn.node.x, nOn.node.y)
      });
    }
    rebridge();
    pulses.push({ x: spot.x, y: spot.y, t: now(), r: 18, spark: true });
    undo.push({ typ: 'pole', id, cost: R.poleCost });
    save(); ui();
    return { ok: true, pole };
  }

  function buySvc(cid) {
    const c = CLUSTERS.find((x) => x.id === cid);
    if (!c) return { ok: false, reason: 'missing' };
    if (svcBuilt(c.id)) return { ok: false, reason: 'done' };
    if (!canBuySvc(c)) return { ok: false, reason: 'reach' };
    const cost = svcCost(c.n);
    if (cash < cost) return { ok: false, reason: 'cash' };
    cash -= cost;
    const t = now();
    const feeder = nearestNode(c.x, c.y, (q) => q.on);
    services.push({
      id: c.id, x: c.x, y: c.y, n: c.n, houses: c.houses.slice(), plant: t, zip: t,
      feeder: feeder ? feeder.node.id : 'entry',
      pts: feeder ? streetPath(feeder.node.x, feeder.node.y, c.x, c.y) : [[ENTRY.x, ENTRY.y], [c.x, c.y]]
    });
    c.houses.forEach((hid, i) => {
      setTimeout(() => {
        if (!lit.has(hid)) {
          lit.add(hid);
          const h = HOUSES[hid];
          pops.push({ x: h.cx, y: h.y - 8, t: now(), text: '+' + fmt(R.houseIncome) + '/min' });
          ui();
          if (lit.size >= 20) onComplete();
        }
      }, 180 + i * 90);
    });
    undo.push({ typ: 'service', id: c.id, cost, houses: c.houses.slice() });
    highlight = null;
    pulses.push({ x: c.x, y: c.y, t: now(), r: 16, spark: true });
    save(); ui();
    return { ok: true, cluster: c };
  }

  function doUndo() {
    const last = undo.pop();
    if (!last) return;
    if (last.typ === 'pole') {
      poles = poles.filter((p) => p.id !== last.id);
      spans = spans.filter((s) => s.a !== last.id && s.b !== last.id);
      cash += last.cost || R.poleCost;
      rebridge();
    } else if (last.typ === 'service') {
      services = services.filter((s) => s.id !== last.id);
      for (const hid of last.houses) lit.delete(hid);
      cash += last.cost;
      done = false; doneShown = false;
    }
    save(); ui();
  }

  function onComplete() {
    if (doneShown) return;
    done = true; doneShown = true;
    save();
    $popBox.innerHTML = '<h3>🏆 Maple Homes fully powered</h3><p>All 20 houses are lit. The neighborhood is on the grid.</p><p class="sm">This is a focused prototype of the new pole-and-service flow.</p><div style="text-align:right;margin-top:10px"><button data-k="close">Nice!</button></div>';
    $popup.classList.remove('hide');
    ui();
  }

  function reset(hard) {
    cash = R.startCash;
    poles = [];
    spans = [];
    services = [];
    lit = new Set();
    undo = [];
    pops = [];
    pulses = [];
    highlight = null;
    hover = null;
    done = false;
    doneShown = false;
    lastTs = now();
    if (hard !== false) try { localStorage.removeItem(KEY); } catch (e) {}
    ui();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cash, poles, spans, services, lit: [...lit], undo, done, t: Date.now()
      }));
    } catch (e) {}
  }
  function load() {
    reset(false);
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!o || !Array.isArray(o.poles)) return;
      cash = o.cash;
      poles = o.poles || [];
      spans = o.spans || [];
      services = o.services || [];
      lit = new Set(o.lit || []);
      undo = o.undo || [];
      done = !!o.done;
      doneShown = false;
      // rehydrate street paths if missing (old saves)
      for (const s of spans) {
        if (!s.pts || s.pts.length < 2) {
          const a = nodeById(s.a), b = nodeById(s.b);
          if (a && b) s.pts = streetPath(a.x, a.y, b.x, b.y);
        }
      }
      for (const s of services) {
        const f = nodeById(s.feeder) || nearestNode(s.x, s.y, (q) => q.on);
        const fn = f && f.node ? f.node : f;
        if (fn) {
          s.feeder = fn.id;
          if (!s.pts || s.pts.length < 2) s.pts = streetPath(fn.x, fn.y, s.x, s.y);
        }
      }
      rebridge();
    } catch (e) { reset(false); }
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $toast.style.display = 'none'; }, 1600);
  }

  function hintFor() {
    if (lit.size >= 20) return 'Maple Homes is fully powered.';
    const sv = availableSvc(), tx = availableTx();
    if (sv.length) {
      const c = sv[0];
      const aff = cash >= svcCost(c.n);
      return aff
        ? `Tap a <b>small</b> dot to place a ${c.n}-can service pole ($${svcCost(c.n)}) and light ${c.n} house${c.n > 1 ? 's' : ''}.`
        : `A service pole is ready ($${svcCost(c.n)}) — not enough cash yet.`;
    }
    if (tx.length) {
      return cash >= R.poleCost
        ? 'Tap a <b>larger</b> grey dot to plant a transmission pole ($6) and extend the line.'
        : 'A transmission pole is ready ($6) — not enough cash yet.';
    }
    return 'The next dots appear once the live line reaches them.';
  }

  function ui() {
    $inc.textContent = fmt(inc()) + '/min';
    $cash.textContent = fmt(cash);
    $houses.textContent = lit.size + '/20';
    $poles.textContent = String(poles.length);
    $svcs.textContent = services.length + '/' + CLUSTERS.length;
    $hint.innerHTML = hintFor();
    $undo.disabled = !undo.length;
    $sub.textContent = lit.size >= 20
      ? 'Square complete'
      : (lit.size ? (lit.size + ' lit · +' + fmt(inc()) + '/min') : 'Tap the next grey dots to grow the grid');
  }

  /* ---------- drawing ---------- */
  /* ---------- drawing ---------- */
  function poleScale(y) {
    // Source painted pole sits near canvas y≈200; nearer streets are a bit taller.
    return 0.78 + 0.22 * (y / 220);
  }
  function poleH(y) { return POLE.artH * 0.5 * poleScale(y); }
  function attachLift(y, frac) { return poleH(y) * (1 - frac); }

  function trimPath(pts, cut) {
    if (!pts || pts.length < 2) return pts;
    if (cut >= 1 || cut == null) return pts;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const keep = acc[acc.length - 1] * easeOut(cut);
    const use = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (acc[i] <= keep) use.push(pts[i]);
      else {
        const t = (keep - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
        use.push([pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])]);
        break;
      }
    }
    return use;
  }

  /* Thin dark sagging conductors, like the painted wires along the island's back edge. */
  function drawWires(pts, yA, yB, tZip, preview) {
    if (!pts || pts.length < 2) return;
    const cut = tZip == null ? 1 : clamp((now() - tZip) / 300, 0, 1);
    const use = trimPath(pts, cut);
    if (!use || use.length < 2) return;
    let total = 0;
    for (let i = 1; i < use.length; i++) total += hypot(use[i][0] - use[i - 1][0], use[i][1] - use[i - 1][1]);
    const sag = clamp(total * 0.022, 1.1, 3.4);
    const colors = preview
      ? ['rgba(90,78,74,0.32)', 'rgba(82,72,68,0.28)', 'rgba(88,76,72,0.24)']
      : ['rgba(88,76,72,0.5)', 'rgba(78,68,64,0.42)', 'rgba(96,84,80,0.38)'];
    const widths = preview ? [0.45, 0.4, 0.38] : [0.52, 0.45, 0.42];
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowBlur = 0;
    for (let w = 0; w < 3; w++) {
      const arm = POLE.armFracs[w];
      const la = attachLift(yA, arm);
      const lb = attachLift(yB, arm);
      g.strokeStyle = colors[w];
      g.lineWidth = widths[w];
      if (preview) g.setLineDash([3.5, 3.5]);
      g.beginPath();
      let dist = 0;
      for (let i = 0; i < use.length; i++) {
        if (i > 0) dist += hypot(use[i][0] - use[i - 1][0], use[i][1] - use[i - 1][1]);
        const t = total > 0 ? dist / total : 0;
        const lift = la + (lb - la) * t;
        const droop = sag * 4 * t * (1 - t);
        const x = use[i][0], y = use[i][1] - lift + droop;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();
  }
  function drawPoly(pts, state, width, tZip, dashOff) {
    if (!pts || pts.length < 2) return;
    drawWires(pts, pts[0][1], pts[pts.length - 1][1], tZip, state === 'preview');
  }

  function drawDrop(ax, ay, bx, by, tZip) {
    const len = hypot(bx - ax, by - ay);
    const sag = Math.min(7, 2.5 + len * 0.045);
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    const cut = tZip == null ? 1 : clamp((now() - tZip) / 280, 0, 1);
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(70,62,58,0.5)';
    g.lineWidth = 0.5;
    g.shadowBlur = 0;
    g.beginPath();
    g.moveTo(ax, ay);
    if (cut < 1) {
      const steps = 14, keep = Math.max(2, Math.floor(steps * easeOut(cut)));
      for (let i = 1; i <= keep; i++) {
        const t = i / steps, u = 1 - t;
        g.lineTo(u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by);
      }
    } else {
      g.quadraticCurveTo(mx, my, bx, by);
    }
    g.stroke();
    g.restore();
  }

  function drawPole(x, y, opt) {
    const t = opt.plant ? clamp((now() - opt.plant) / 300, 0, 1) : 1;
    const k = easeOutBack(Math.min(1, t));
    const img = (opt.service && opt.cans && poleSvc[opt.cans]) ? poleSvc[opt.cans] : poleImg;
    const hgt = poleH(y) * (0.88 + 0.12 * k);
    const drop = (1 - k) * 10;
    const top = y - hgt - drop;
    const wid = img ? (hgt * (img.width / img.height)) : 8;
    const ax = x - wid * POLE.shaftFrac;
    g.save();
    g.fillStyle = 'rgba(20,14,10,' + (0.28 * k) + ')';
    g.beginPath();
    g.ellipse(x + 0.6, y + 1.2, Math.max(3.2, wid * 0.42), 2.1, 0, 0, 7);
    g.fill();
    if (img) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, ax, top, wid, hgt);
    }
    g.restore();
  }

  function drawBadge(x, y, text, live) {
    const pad = 4;
    g.font = '700 8px system-ui,sans-serif';
    const tw = g.measureText(text).width;
    const w = tw + pad * 2, h = 12;
    const bx = x - w / 2, by = y - 28;
    g.fillStyle = live ? 'rgba(8,30,48,.88)' : 'rgba(20,22,30,.8)';
    g.strokeStyle = live ? '#4fc3f7' : '#6a7384';
    g.lineWidth = 1;
    const rr = 6;
    g.beginPath();
    g.moveTo(bx + rr, by);
    g.arcTo(bx + w, by, bx + w, by + h, rr);
    g.arcTo(bx + w, by + h, bx, by + h, rr);
    g.arcTo(bx, by + h, bx, by, rr);
    g.arcTo(bx, by, bx + w, by, rr);
    g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = live ? '#bfefff' : '#c5ccd6';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, by + h / 2 + 0.5);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

  function lightHouses() {
    g.drawImage(dimImg, 0, 0, W, H);
    if (lit.size <= 0) return;
    if (lit.size >= HOUSES.length) {
      g.drawImage(litImg, 0, 0, W, H);
      // extra warm window bloom on the fully-lit painting
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (const h of HOUSES) {
        const grd = g.createRadialGradient(h.cx, h.cy - 4, 2, h.cx, h.cy - 2, 28);
        grd.addColorStop(0, 'rgba(255, 210, 120, 0.28)');
        grd.addColorStop(0.45, 'rgba(255, 170, 70, 0.12)');
        grd.addColorStop(1, 'rgba(255, 140, 40, 0)');
        g.fillStyle = grd;
        g.beginPath();
        g.ellipse(h.cx, h.cy - 2, 26, 30, 0, 0, 7);
        g.fill();
      }
      g.restore();
      return;
    }
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const og = off.getContext('2d');
    og.drawImage(litImg, 0, 0, W, H);
    og.globalCompositeOperation = 'destination-in';
    for (const hid of lit) {
      const h = HOUSES[hid];
      const grd = og.createRadialGradient(h.cx, h.cy - 4, 4, h.cx, h.cy - 2, 44);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(.55, 'rgba(0,0,0,.9)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      og.fillStyle = grd;
      og.beginPath();
      og.ellipse(h.cx, h.cy - 2, 38, 44, 0, 0, 7);
      og.fill();
    }
    og.globalCompositeOperation = 'source-over';
    g.drawImage(off, 0, 0);
    // warm bloom on top of the already-lit houses
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const hid of lit) {
      const h = HOUSES[hid];
      const grd = g.createRadialGradient(h.cx, h.cy - 4, 2, h.cx, h.cy - 2, 28);
      grd.addColorStop(0, 'rgba(255, 210, 120, 0.32)');
      grd.addColorStop(0.45, 'rgba(255, 170, 70, 0.14)');
      grd.addColorStop(1, 'rgba(255, 140, 40, 0)');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(h.cx, h.cy - 2, 26, 30, 0, 0, 7);
      g.fill();
    }
    g.restore();
  }

  function nodeById(id) {
    if (id === 'entry') return { x: ENTRY.x, y: ENTRY.y, on: true };
    return poles.find((p) => p.id === id);
  }

  function drawDot(x, y, kind, afford, price, pulseT) {
    // kind: 'tx' medium, 'svc' small
    const base = kind === 'tx' ? 9.8 : 5.2;
    const pulse = afford ? (1 + Math.sin(pulseT / 240) * 0.1) : 1;
    const r = base * pulse;
    g.save();
    g.globalAlpha = afford ? 1 : 0.78;
    // soft halo so it reads on dusk streets
    g.fillStyle = afford ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.1)';
    g.beginPath(); g.arc(x, y, r + 4, 0, 7); g.fill();
    g.fillStyle = afford ? '#c8d0da' : '#9aa4b0';
    g.shadowColor = 'rgba(0,0,0,.4)';
    g.shadowBlur = 3;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = afford ? 'rgba(255,255,255,.95)' : 'rgba(236,240,246,.75)';
    g.lineWidth = kind === 'tx' ? 1.9 : 1.45;
    g.stroke();
    // inner pin
    g.fillStyle = afford ? 'rgba(40,48,60,.35)' : 'rgba(40,48,60,.2)';
    g.beginPath(); g.arc(x, y, Math.max(1.4, r * 0.28), 0, 7); g.fill();
    g.restore();
    // price label
    const label = '$' + price;
    g.font = '700 9px system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    const ly = y - r - 4;
    g.lineWidth = 3.2;
    g.strokeStyle = 'rgba(10,16,28,.75)';
    g.strokeText(label, x, ly);
    g.fillStyle = afford ? '#f4f7fb' : 'rgba(200,208,220,.7)';
    g.fillText(label, x, ly);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
  }

  function draw() {
    const t = now();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    lightHouses();

    // transmission lines along streets — thin dark wires, no glow
    for (const s of spans) {
      const a = nodeById(s.a), b = nodeById(s.b);
      if (!a || !b) continue;
      const pts = (s.pts && s.pts.length >= 2) ? s.pts : streetPath(a.x, a.y, b.x, b.y);
      drawWires(pts, a.y, b.y, s.zip, false);
    }

    // distribution laterals from the feeding pole to each service, along streets
    for (const s of services) {
      const f = nodeById(s.feeder) || (nearestNode(s.x, s.y, (q) => q.on) || {}).node;
      const pts = (s.pts && s.pts.length >= 2)
        ? s.pts
        : (f ? streetPath(f.x, f.y, s.x, s.y) : null);
      if (pts) drawWires(pts, f ? f.y : s.y, s.y, s.zip, false);
    }

    // thin dark service drops to houses
    for (const s of services) {
      const c = CLUSTERS.find((x) => x.id === s.id);
      if (!c) continue;
      const dropFromY = c.y - attachLift(c.y, POLE.armBotFrac) + 3;
      c.houses.forEach((hid, i) => {
        const h = HOUSES[hid];
        const zip = s.zip + i * 90;
        drawDrop(c.x, dropFromY, h.ex, h.ey, zip);
      });
    }

    // hover preview of the next transmission span
    if (hover && hover.k === 'tx') {
      const spot = TX.find((s) => s.id === hover.id);
      if (spot && canBuyTx(spot)) {
        const n = nearestNode(spot.x, spot.y, (q) => q.on);
        if (n) drawWires(streetPath(n.node.x, n.node.y, spot.x, spot.y), n.node.y, spot.y, 0, true);
      }
    }

    // purchasable dots only
    const txAvail = availableTx();
    const svcAvail = availableSvc();
    for (const s of txAvail) {
      drawDot(s.x, s.y, 'tx', cash >= R.poleCost, R.poleCost, t);
    }
    for (const c of svcAvail) {
      drawDot(c.x, c.y, 'svc', cash >= svcCost(c.n), svcCost(c.n), t);
    }

    // highlight a service from a house tap
    if (highlight) {
      const c = CLUSTERS.find((x) => x.id === highlight);
      if (c && !svcBuilt(c.id)) {
        g.strokeStyle = 'rgba(245,184,75,.7)';
        g.lineWidth = 1.4;
        g.setLineDash([4, 3]);
        g.beginPath(); g.arc(c.x, c.y, 14, 0, 7); g.stroke();
        g.setLineDash([]);
        for (const hid of c.houses) {
          if (lit.has(hid)) continue;
          const h = HOUSES[hid];
          g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(h.cx, h.cy); g.stroke();
        }
      }
    }

    // poles, painter's order
    const drawList = [];
    drawList.push({ x: ENTRY.x, y: ENTRY.y, on: true, service: false, cans: 0, entry: true });
    for (const p of poles) drawList.push({ x: p.x, y: p.y, on: p.on, plant: p.plant, cans: 0 });
    for (const s of services) {
      const c = CLUSTERS.find((x) => x.id === s.id);
      drawList.push({ x: s.x, y: s.y, on: true, plant: s.plant, service: true, cans: c ? c.n : s.n });
    }
    drawList.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const p of drawList) {
      drawPole(p.x, p.y, p);
      if (p.entry) drawBadge(p.x, p.y, '#1 live', true);
    }
    for (const e of (M.locked || [])) drawBadge(e.sx || e.x, e.sy || e.y, e.label, false);

    // brief warm spark on energize — no blue glow
    for (const p of pulses) {
      const k = clamp((t - p.t) / 380, 0, 1);
      if (k >= 1) continue;
      const fade = 1 - k;
      const ax = p.x, ay = p.y - attachLift(p.y, POLE.armFracs[1]);
      g.save();
      g.globalAlpha = fade * 0.85;
      g.strokeStyle = 'rgba(255, 220, 160, 0.85)';
      g.fillStyle = 'rgba(255, 236, 200, 0.7)';
      g.lineWidth = 0.8;
      const rad = 2 + easeOut(k) * 7;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5) + k * 0.4;
        const r0 = 1.2, r1 = rad;
        g.beginPath();
        g.moveTo(ax + Math.cos(a) * r0, ay + Math.sin(a) * r0);
        g.lineTo(ax + Math.cos(a) * r1, ay + Math.sin(a) * r1);
        g.stroke();
      }
      g.beginPath(); g.arc(ax, ay, 1.4 * fade, 0, 7); g.fill();
      g.restore();
    }
    pulses = pulses.filter((p) => t - p.t < 380);

    // +$ pops
    for (const p of pops) {
      const k = clamp((t - p.t) / 900, 0, 1);
      if (k >= 1) continue;
      g.globalAlpha = 1 - k;
      g.font = '700 11px system-ui,sans-serif';
      g.fillStyle = '#38d39f';
      g.strokeStyle = 'rgba(8,16,28,.7)';
      g.lineWidth = 3;
      g.textAlign = 'center';
      const yy = p.y - 8 - k * 22;
      g.strokeText(p.text, p.x, yy);
      g.fillText(p.text, p.x, yy);
      g.textAlign = 'left';
      g.globalAlpha = 1;
    }
    pops = pops.filter((p) => t - p.t < 900);
  }

  /* ---------- input ---------- */
  function canvasXY(ev) {
    const r = cv.getBoundingClientRect();
    const src = ev.touches ? ev.touches[0] || ev.changedTouches[0] : ev;
    return { x: (src.clientX - r.left) * (W / r.width), y: (src.clientY - r.top) * (H / r.height) };
  }

  function hitDot(x, y) {
    let best = null, bd = 1e9;
    for (const s of availableTx()) {
      const d = hypot(s.x - x, s.y - y);
      if (d < 22 && d < bd) { bd = d; best = { k: 'tx', id: s.id, d }; }
    }
    for (const c of availableSvc()) {
      const d = hypot(c.x - x, c.y - y);
      if (d < 16 && d < bd) { bd = d; best = { k: 'svc', id: c.id, d }; }
    }
    return best;
  }
  function hitHouse(x, y) {
    let best = null, bd = 28;
    for (const h of HOUSES) {
      const inBox = x >= h.x - 8 && x <= h.x + h.w + 8 && y >= h.y - 10 && y <= h.y + h.h + 14;
      const dd = hypot(h.cx - x, h.cy - y);
      if ((inBox || dd < 26) && dd < bd) { bd = dd; best = h; }
    }
    return best;
  }

  function onDown(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    press = { x, y, t: now(), hit: hitDot(x, y) };
    if (press.hit) hover = press.hit;
  }
  function onMove(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    hover = hitDot(x, y);
    if (press && hypot(x - press.x, y - press.y) > 10) press.moved = true;
  }
  function onUp(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    const p = press; press = null;
    hover = hitDot(x, y);
    if (!p || now() < plantingLock) return;
    const hit = hitDot(x, y);
    if (hit && p.hit && hit.k === p.hit.k && hit.id === p.hit.id) {
      if (hit.k === 'tx') {
        const res = buyTx(hit.id);
        if (!res.ok && res.reason === 'cash') toast('Not enough cash yet');
        else if (res.ok) plantingLock = now() + 260;
        return;
      }
      if (hit.k === 'svc') {
        const res = buySvc(hit.id);
        if (!res.ok && res.reason === 'cash') toast('Not enough cash yet');
        else if (res.ok) plantingLock = now() + 280;
        return;
      }
    }
    // house tap highlights its service spot if that spot is purchasable (or tells you to extend)
    const h = hitHouse(x, y);
    if (h && !lit.has(h.id)) {
      const c = CLUSTERS.find((cl) => cl.houses.includes(h.id));
      if (!c || svcBuilt(c.id)) return;
      highlight = c.id;
      if (!canBuySvc(c)) toast('Extend the line closer first');
      else toast('Tap the $' + svcCost(c.n) + ' service dot');
    }
  }

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', () => { press = null; hover = null; });
  cv.addEventListener('pointerleave', () => { if (!press) hover = null; });

  $undo.addEventListener('click', () => doUndo());
  $reset.addEventListener('click', () => {
    if (poles.length || services.length || lit.size) {
      $popBox.innerHTML = '<h3>Reset Maple Homes?</h3><p>This clears every pole and house on this prototype.</p><div style="text-align:right;margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button class="alt" data-k="close">Cancel</button><button data-k="reset">Reset</button></div>';
      $popup.classList.remove('hide');
    } else reset();
  });
  $popup.addEventListener('click', (e) => {
    if (e.target === $popup || e.target.dataset.k === 'close') $popup.classList.add('hide');
    if (e.target.dataset.k === 'reset') { reset(); $popup.classList.add('hide'); toast('Progress reset'); }
  });

  function frame(ts) {
    if (!running) return;
    const prev = lastTs || ts;
    const dt = Math.min(0.08, (ts - prev) / 1000);
    lastTs = ts;
    if (inc() > 0) cash += inc() * dt / 60;
    draw();
    if ((ts / 200 | 0) !== (prev / 200 | 0)) ui();
    requestAnimationFrame(frame);
  }
  function size() {
    dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  function start() {
    size();
    load();
    boot.classList.add('hide');
    cv.classList.remove('hide');
    ready = true;
    running = true;
    lastTs = now();
    ui();
    requestAnimationFrame(frame);
    window.__game.ready = true;
  }
  window.addEventListener('resize', size);

  window.__game = {
    get ready() { return ready; },
    get cash() { return cash; },
    get inc() { return inc(); },
    get lit() { return lit.size; },
    get poles() { return poles; },
    get services() { return services; },
    get clusters() { return CLUSTERS; },
    get txSpots() { return TX; },
    get houses() { return HOUSES; },
    get entry() { return ENTRY; },
    get rules() { return R; },
    canBuyTx, canBuySvc, availableTx, availableSvc,
    buyTx, buySvc,
    reset: () => reset(),
    undo: () => doUndo(),
    grant(n) { cash += n; ui(); },
    svcCost,
    state() {
      return {
        cash, inc: inc(), lit: lit.size, poles: poles.length, services: services.length, done,
        tx: availableTx().map((s) => s.id),
        svc: availableSvc().map((s) => s.id)
      };
    }
  };

  graph = buildGraph();
  Promise.all([
    loadImage('art/sq-02-lit.webp'),
    loadImage('art/sq-02-dim.webp'),
    loadImage('art/pole.png'),
    loadImage('art/pole-svc-1.png'),
    loadImage('art/pole-svc-2.png'),
    loadImage('art/pole-svc-3.png')
  ]).then(([lit, dim, pole, s1, s2, s3]) => {
    litImg = lit; dimImg = dim;
    poleImg = pole;
    poleSvc = { 1: s1, 2: s2, 3: s3 };
    start();
  }).catch((err) => {
    boot.textContent = 'Failed to load art';
    console.error(err);
  });
})();
