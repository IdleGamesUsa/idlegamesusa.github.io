/* Maple Homes pole prototype — plant primaries, tap service-pole spots. */
(() => {
  const M = window.MAPLE;
  const R = M.rules;
  const W = M.W, H = M.H;
  const HOUSES = M.houses;
  const CLUSTERS = M.clusters;
  const ENTRY = M.entry;
  const KEY = 'ipg-maple-poles-v1';
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

  let dpr = 1, litImg, dimImg, maskPix;
  let cash, poles, spans, services, lit, undo, tAcc, lastTs, done, doneShown;
  let aim = null, shake = null, pops = [], pulses = [], highlight = null, flash = 0;
  let plantingLock = 0, toastTimer = 0, hover = null;
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
  function loadMask(src) {
    return loadImage(src).then((img) => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      return ctx.getImageData(0, 0, W, H).data;
    });
  }
  function maskAt(x, y) {
    const xi = x | 0, yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= W || yi >= H) return 0;
    return maskPix[(yi * W + xi) * 4]; // R channel
  }

  function snap(x, y) {
    const rad = R.snapRadius;
    let dS = rad + 1, dV = rad + 1, s = null, v = null;
    const x0 = Math.max(0, Math.floor(x - rad)), x1 = Math.min(W - 1, Math.ceil(x + rad));
    const y0 = Math.max(0, Math.floor(y - rad)), y1 = Math.min(H - 1, Math.ceil(y + rad));
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const m = maskPix[(yy * W + xx) * 4];
        if (m < 160) continue;
        const d = hypot(xx - x, yy - y);
        if (m >= 240 && d < dS) { dS = d; s = [xx, yy]; }
        else if (d < dV) { dV = d; v = [xx, yy]; }
      }
    }
    const p = s || v;
    if (!p) return { x, y, valid: false };
    return { x: p[0], y: p[1], valid: true, onCenter: !!s };
  }

  function allNodes() {
    return [{ id: 'entry', x: ENTRY.x, y: ENTRY.y, on: true }, ...poles];
  }
  function distP(a, b) { return hypot(a.x - b.x, a.y - b.y); }

  function nearestNode(x, y, pred) {
    let best = null, bd = 1e9;
    for (const p of allNodes()) {
      if (pred && !pred(p)) continue;
      const d = hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { node: best, d: bd } : null;
  }

  function tooClose(x, y, ignoreId) {
    if (hypot(x - ENTRY.x, y - ENTRY.y) < R.minPoleDist) return true;
    for (const p of poles) if (p.id !== ignoreId && hypot(x - p.x, y - p.y) < R.minPoleDist) return true;
    for (const c of CLUSTERS) {
      if (services.some((s) => s.id === c.id)) continue;
      if (hypot(x - c.x, y - c.y) < 18) return true;
    }
    return false;
  }

  function inc() { return lit.size * R.houseIncome; }

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

  function hasSpan(a, b) {
    return spans.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a));
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
          spans.push({ a: p.id, b: n.node.id, on: false, zip: now() });
          added = true;
        }
      }
      if (added) energize();
    }
  }

  function canFeed(c) {
    if (services.some((s) => s.id === c.id)) return false;
    const n = nearestNode(c.x, c.y, (q) => q.on);
    return !!(n && n.d <= R.feedReach);
  }

  function plantPole(x, y, opts = {}) {
    const s = snap(x, y);
    if (!s.valid) return { ok: false, reason: 'invalid' };
    if (tooClose(s.x, s.y)) return { ok: false, reason: 'close', x: s.x, y: s.y };
    if (cash < R.poleCost && !opts.free) return { ok: false, reason: 'cash' };
    if (!opts.free) cash -= R.poleCost;
    const id = 'p' + (poles.reduce((m, p) => Math.max(m, parseInt(p.id.slice(1), 10) || 0), 0) + 1);
    const pole = { id, x: s.x, y: s.y, on: false, plant: now() };
    poles.push(pole);
    const nOn = nearestNode(s.x, s.y, (q) => q.id !== id && q.on);
    const nAny = nearestNode(s.x, s.y, (q) => q.id !== id);
    const n = (nOn && nOn.d <= R.maxSpan) ? nOn : (nAny && nAny.d <= R.maxSpan ? nAny : null);
    if (n) spans.push({ a: id, b: n.node.id, on: false, zip: now() });
    rebridge();
    pulses.push({ x: s.x, y: s.y, t: now(), r: R.feedReach });
    undo.push({ typ: 'pole', id });
    flash = now();
    save(); ui();
    return { ok: true, pole };
  }

  function connectService(cid) {
    const c = CLUSTERS.find((x) => x.id === cid) || CLUSTERS[cid];
    if (!c) return { ok: false, reason: 'missing' };
    if (services.some((s) => s.id === c.id)) return { ok: false, reason: 'done' };
    if (!canFeed(c)) return { ok: false, reason: 'reach', cluster: c };
    const cost = svcCost(c.n);
    if (cash < cost) return { ok: false, reason: 'cash' };
    cash -= cost;
    const t = now();
    services.push({ id: c.id, x: c.x, y: c.y, n: c.n, houses: c.houses.slice(), plant: t, zip: t });
    // houses light as the drops finish (staggered slightly)
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
    save(); ui();
    return { ok: true, cluster: c };
  }

  function doUndo() {
    const last = undo.pop();
    if (!last) return;
    if (last.typ === 'pole') {
      // don't undo a pole if a later service depended? we only undo last action
      poles = poles.filter((p) => p.id !== last.id);
      spans = spans.filter((s) => s.a !== last.id && s.b !== last.id);
      cash += R.poleCost;
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
    aim = null;
    done = false;
    doneShown = false;
    tAcc = 0;
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
      if (!o) return;
      cash = o.cash;
      poles = o.poles || [];
      spans = o.spans || [];
      services = o.services || [];
      lit = new Set(o.lit || []);
      undo = o.undo || [];
      done = !!o.done;
      doneShown = false;
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
    const readySvc = CLUSTERS.filter(canFeed);
    if (readySvc.length) {
      const c = readySvc[0];
      return `Tap the glowing <b>${c.n}-can</b> spot ($${svcCost(c.n)}) to light ${c.n} house${c.n > 1 ? 's' : ''}.`;
    }
    if (!poles.length) return 'Plant a <b>pole</b> on the street — a dashed preview shows the span from #1.';
    return 'Extend the line: plant another pole within reach, then tap a service spot.';
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
      : (lit.size ? (lit.size + ' lit · +' + fmt(inc()) + '/min') : 'Plant poles on the street · tap a service spot');
  }

  /* ---------- drawing ---------- */
  function sagBezier(ax, ay, bx, by, sag) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    return { mx, my };
  }
  function drawWire(ax, ay, bx, by, state, width, tZip, dashOff) {
    const len = hypot(bx - ax, by - ay);
    const sag = Math.min(10, 3 + len * 0.04);
    const { mx, my } = sagBezier(ax, ay, bx, by, sag);
    const cut = tZip == null ? 1 : clamp((now() - tZip) / 260, 0, 1);
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    if (cut < 1) {
      g.beginPath();
      g.moveTo(ax, ay);
      // approximate cut along quadratic
      const steps = 16, keep = Math.max(2, Math.floor(steps * easeOut(cut)));
      for (let i = 1; i <= keep; i++) {
        const t = i / steps, u = 1 - t;
        g.lineTo(u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by);
      }
    } else {
      g.beginPath();
      g.moveTo(ax, ay);
      g.quadraticCurveTo(mx, my, bx, by);
    }
    if (state === 'live') {
      g.shadowColor = '#4fc3f7';
      g.shadowBlur = 6;
      g.strokeStyle = 'rgba(20,40,70,.9)';
      g.lineWidth = width + 2;
      g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = '#7dd8ff';
      g.lineWidth = width;
      g.setLineDash([7, 6]);
      g.lineDashOffset = -(dashOff || 0);
      g.stroke();
      g.setLineDash([]);
    } else if (state === 'preview') {
      g.strokeStyle = 'rgba(245,184,75,.95)';
      g.lineWidth = width;
      g.setLineDash([5, 5]);
      g.stroke();
      g.setLineDash([]);
    } else if (state === 'out') {
      g.strokeStyle = 'rgba(230,100,90,.85)';
      g.lineWidth = width;
      g.setLineDash([5, 5]);
      g.stroke();
      g.setLineDash([]);
    } else {
      g.strokeStyle = 'rgba(150,165,185,.7)';
      g.lineWidth = width;
      g.setLineDash([4, 5]);
      g.stroke();
      g.setLineDash([]);
    }
    g.restore();
  }

  function drawPole(x, y, opt) {
    const t = opt.plant ? clamp((now() - opt.plant) / 280, 0, 1) : 1;
    const k = easeOutBack(Math.min(1, t));
    const drop = (1 - k) * 16;
    const hgt = (opt.service ? 21 : 25);
    const top = y - hgt - drop;
    const on = !!opt.on;
    g.save();
    g.translate(x, y);
    g.scale(1, k || 0.01);
    g.translate(-x, -y);
    // base shadow
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath();
    g.ellipse(x + 1, y + 1.5, 5.5, 2.2, 0, 0, 7);
    g.fill();
    // shaft
    const grd = g.createLinearGradient(x - 3, top, x + 4, y);
    grd.addColorStop(0, on ? '#8a6238' : '#5c4a38');
    grd.addColorStop(.45, on ? '#c49a62' : '#8a7356');
    grd.addColorStop(1, on ? '#6b4a28' : '#4a3b2c');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - 2.1, top + 2);
    g.lineTo(x + 2.1, top + 2);
    g.lineTo(x + 2.6, y);
    g.lineTo(x - 2.6, y);
    g.closePath();
    g.fill();
    // crossarm
    const cy = top + 6;
    g.fillStyle = on ? '#6b4a28' : '#4a3b2c';
    g.fillRect(x - 7.5, cy, 15, 2.1);
    // insulators
    g.fillStyle = on ? '#dfe8f2' : '#9aa6b4';
    g.beginPath(); g.arc(x - 5.2, cy - 1.1, 1.15, 0, 7); g.fill();
    g.beginPath(); g.arc(x + 5.2, cy - 1.1, 1.15, 0, 7); g.fill();
    // live glow
    if (on) {
      g.fillStyle = 'rgba(80,200,255,.35)';
      g.beginPath(); g.arc(x, top + 3, 3.2, 0, 7); g.fill();
    }
    // transformer cans
    const cans = opt.cans || 0;
    if (cans > 0) {
      const xs = cans === 1 ? [0] : cans === 2 ? [-4.2, 4.2] : [-5.6, 0, 5.6];
      xs.forEach((dx) => {
        const cx = x + dx, ty = cy + 2.4;
        g.fillStyle = '#3d4c5c';
        g.fillRect(cx - 2.1, ty, 4.2, 6.2);
        g.fillStyle = '#8ea0b4';
        g.fillRect(cx - 2.1, ty, 4.2, 1.4);
        g.fillStyle = '#2a333e';
        g.fillRect(cx - 2.1, ty + 5.5, 4.2, 1.2);
        // bushing
        g.strokeStyle = '#c5d0da';
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(cx, ty); g.lineTo(cx, cy + 2.1); g.stroke();
      });
    }
    g.restore();
    // entry badge is drawn separately
  }

  function drawBadge(x, y, text, live) {
    const pad = 4, fs = 8;
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
    if (lit.size >= HOUSES.length) { g.drawImage(litImg, 0, 0, W, H); return; }
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const og = off.getContext('2d');
    og.drawImage(litImg, 0, 0, W, H);
    og.globalCompositeOperation = 'destination-in';
    for (const hid of lit) {
      const h = HOUSES[hid];
      const grd = og.createRadialGradient(h.cx, h.cy - 4, 6, h.cx, h.cy - 2, 34);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(.62, 'rgba(0,0,0,.85)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      og.fillStyle = grd;
      og.beginPath();
      og.ellipse(h.cx, h.cy - 2, 30, 34, 0, 0, 7);
      og.fill();
    }
    og.globalCompositeOperation = 'source-over';
    g.drawImage(off, 0, 0);
  }

  function nodeById(id) {
    if (id === 'entry') return { x: ENTRY.x, y: ENTRY.y, on: true };
    return poles.find((p) => p.id === id);
  }

  function draw() {
    const t = now();
    const dash = (t / 45) % 40;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    lightHouses();

    // pulses (range circles after a plant)
    for (const p of pulses) {
      const k = clamp((t - p.t) / 700, 0, 1);
      if (k >= 1) continue;
      g.strokeStyle = `rgba(80,200,255,${(1 - k) * .35})`;
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(p.x, p.y, p.r * easeOut(k), 0, 7); g.stroke();
    }
    pulses = pulses.filter((p) => t - p.t < 700);

    // spans
    for (const s of spans) {
      const a = nodeById(s.a), b = nodeById(s.b);
      if (!a || !b) continue;
      drawWire(a.x, a.y, b.x, b.y, s.on ? 'live' : 'grey', 1.7, s.zip, dash);
    }

    // service drops
    for (const s of services) {
      const c = CLUSTERS.find((x) => x.id === s.id);
      if (!c) continue;
      c.houses.forEach((hid, i) => {
        const h = HOUSES[hid];
        const delay = i * 90;
        const zip = s.zip + delay;
        const live = lit.has(hid) || (t - zip > 200);
        drawWire(c.x, c.y - 16, h.ex, h.ey, live ? 'live' : 'grey', 1.15, zip, dash);
      });
    }

    // ghost preview
    if (aim && aim.valid) {
      const n = nearestNode(aim.x, aim.y, (q) => q.on);
      const any = nearestNode(aim.x, aim.y);
      const tgt = (n && n.d <= R.maxSpan) ? n : any;
      if (tgt) {
        const ok = tgt.d <= R.maxSpan && tgt.node.on;
        drawWire(tgt.node.x, tgt.node.y, aim.x, aim.y, ok ? 'preview' : 'out', 1.85, 0, 0);
      }
      g.strokeStyle = 'rgba(245,184,75,.28)';
      g.lineWidth = 1.2;
      g.setLineDash([4, 5]);
      g.beginPath(); g.arc(aim.x, aim.y, R.maxSpan, 0, 7); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 0.92;
      drawPole(aim.x, aim.y, { on: !!(n && n.d <= R.maxSpan), plant: t - 240, cans: 0 });
      g.globalAlpha = 1;
    }

    // shake mark
    if (shake && t - shake.t < 240) {
      const k = (t - shake.t) / 240;
      const ox = Math.sin(k * 28) * 4 * (1 - k);
      g.save();
      g.translate(ox, 0);
      g.strokeStyle = `rgba(255,90,80,${1 - k})`;
      g.lineWidth = 2;
      g.beginPath(); g.arc(shake.x, shake.y, 10, 0, 7); g.stroke();
      g.font = '700 11px system-ui';
      g.fillStyle = `rgba(255,140,130,${1 - k})`;
      g.textAlign = 'center';
      g.fillText(shake.msg || 'Street only', shake.x, shake.y - 16);
      g.textAlign = 'left';
      g.restore();
    } else shake = shake && t - shake.t < 240 ? shake : null;

    // service dots (unbuilt)
    for (const c of CLUSTERS) {
      if (services.some((s) => s.id === c.id)) continue;
      const feed = canFeed(c);
      const hi = highlight && highlight === c.id;
      if (!feed && !hi && poles.length === 0 && !canFeed(c)) {
        // still draw very faint planning dots? only west1 is feedable at start.
      }
      const pulse = 1 + Math.sin(t / 220) * 0.12;
      const r0 = feed ? 7 * pulse : 4.5;
      g.beginPath();
      g.arc(c.x, c.y, r0, 0, 7);
      if (feed) {
        g.fillStyle = hi ? '#fff3c4' : '#f5b84b';
        g.shadowColor = '#f5b84b';
        g.shadowBlur = 10;
        g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = '#fff8e0';
        g.lineWidth = 1.4;
        g.stroke();
      } else {
        g.fillStyle = 'rgba(160,170,185,.4)';
        g.fill();
        g.strokeStyle = 'rgba(200,210,220,.35)';
        g.lineWidth = 1;
        g.stroke();
      }
      // can-count badge
      if (feed || hi) {
        g.font = '700 8px system-ui,sans-serif';
        g.fillStyle = '#2b1c00';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(c.n), c.x, c.y + 0.4);
        g.textAlign = 'left';
        g.textBaseline = 'alphabetic';
      }
      if (hi) {
        // reach ring + lines to houses
        g.strokeStyle = 'rgba(245,184,75,.55)';
        g.lineWidth = 1.2;
        g.setLineDash([4, 3]);
        g.beginPath(); g.arc(c.x, c.y, 16, 0, 7); g.stroke();
        g.setLineDash([]);
        for (const hid of c.houses) {
          const h = HOUSES[hid];
          if (lit.has(hid)) continue;
          g.strokeStyle = 'rgba(245,184,75,.7)';
          g.setLineDash([3, 3]);
          g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(h.cx, h.cy); g.stroke();
          g.setLineDash([]);
        }
      }
    }

    // reach hint ring when user tapped a house with no feed
    if (highlight && highlight.ring) {
      const c = CLUSTERS.find((x) => x.id === highlight);
      // handled above
    }

    // poles (entry + primaries + service poles), painter's order by y
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
    // locked flavor badges
    for (const e of (M.locked || [])) drawBadge(e.sx || e.x, e.sy || e.y, e.label, false);

    // house highlight outlines when pointing
    if (hover && hover.k === 'house' && !lit.has(hover.id)) {
      const h = HOUSES[hover.id];
      g.strokeStyle = 'rgba(245,184,75,.8)';
      g.lineWidth = 1.4;
      g.setLineDash([3, 2]);
      g.strokeRect(h.x - 2, h.y - 2, h.w + 4, h.h + 8);
      g.setLineDash([]);
    }

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

  function hitService(x, y, onlyFeed) {
    let best = null, bd = 22;
    for (const c of CLUSTERS) {
      if (services.some((s) => s.id === c.id)) continue;
      if (onlyFeed && !canFeed(c)) continue;
      const d = hypot(c.x - x, c.y - y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  function hitHouse(x, y) {
    let best = null, bd = 28;
    for (const h of HOUSES) {
      const d = hypot(h.cx - x, h.cy - y);
      const inBox = x >= h.x - 8 && x <= h.x + h.w + 8 && y >= h.y - 10 && y <= h.y + h.h + 14;
      const dd = hypot(h.cx - x, h.cy - y);
      if ((inBox || dd < 26) && dd < bd) { bd = dd; best = h; }
    }
    return best;
  }

  let ptr = null;
  function onDown(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    ptr = { x, y, t: now(), moved: false };
    const svc = hitService(x, y, false);
    if (svc) { ptr.mode = 'svc'; ptr.cid = svc.id; return; }
    const h = hitHouse(x, y);
    if (h && !lit.has(h.id)) { ptr.mode = 'house'; ptr.hid = h.id; return; }
    ptr.mode = 'aim';
    const s = snap(x, y);
    aim = { ...s, rawX: x, rawY: y };
  }
  function onMove(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    hover = null;
    const h = hitHouse(x, y);
    if (h) hover = { k: 'house', id: h.id };
    const svc = hitService(x, y, true);
    if (svc) hover = { k: 'svc', id: svc.id };
    if (!ptr) return;
    if (hypot(x - ptr.x, y - ptr.y) > 8) ptr.moved = true;
    if (ptr.mode === 'aim') {
      const s = snap(x, y);
      aim = { ...s, rawX: x, rawY: y };
    }
  }
  function onUp(ev) {
    ev.preventDefault();
    const { x, y } = canvasXY(ev);
    const p = ptr; ptr = null;
    aim = null;
    if (!p) return;
    if (now() < plantingLock) return;
    if (p.mode === 'svc') {
      const svc = hitService(x, y, false) || CLUSTERS.find((c) => c.id === p.cid);
      if (!svc) return;
      const res = connectService(svc.id);
      if (!res.ok) {
        if (res.reason === 'reach') {
          highlight = svc.id;
          toast('Place a pole closer');
          pulses.push({ x: svc.x, y: svc.y, t: now(), r: R.feedReach });
        } else if (res.reason === 'cash') toast('Not enough cash yet');
      } else {
        plantingLock = now() + 280;
      }
      return;
    }
    if (p.mode === 'house') {
      const h = HOUSES[p.hid];
      const c = CLUSTERS.find((cl) => cl.houses.includes(h.id));
      if (!c) return;
      if (services.some((s) => s.id === c.id) || lit.has(h.id)) return;
      highlight = c.id;
      if (!canFeed(c)) {
        toast('Place a pole closer');
        pulses.push({ x: c.x, y: c.y, t: now(), r: R.feedReach });
      } else {
        toast('Tap the ' + c.n + '-can service spot');
      }
      return;
    }
    // plant
    const s = snap(x, y);
    if (!s.valid) {
      shake = { x, y, t: now(), msg: 'Street only' };
      return;
    }
    if (tooClose(s.x, s.y)) {
      shake = { x: s.x, y: s.y, t: now(), msg: 'Too close' };
      return;
    }
    const res = plantPole(s.x, s.y);
    if (!res.ok) {
      if (res.reason === 'cash') toast('Not enough cash yet');
      else if (res.reason === 'close') shake = { x: s.x, y: s.y, t: now(), msg: 'Too close' };
    } else {
      plantingLock = now() + 260;
    }
  }

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', () => { ptr = null; aim = null; });
  cv.addEventListener('pointerleave', () => { if (!ptr) { aim = null; hover = null; } });

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

  /* ---------- loop ---------- */
  function frame(ts) {
    if (!running) return;
    const prev = lastTs || ts;
    const dt = Math.min(0.08, (ts - prev) / 1000);
    lastTs = ts;
    if (inc() > 0) { cash += inc() * dt / 60; tAcc += dt; }
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

  // Public test API
  window.__game = {
    get ready() { return ready; },
    get cash() { return cash; },
    get inc() { return inc(); },
    get lit() { return lit.size; },
    get poles() { return poles; },
    get services() { return services; },
    get clusters() { return CLUSTERS; },
    get houses() { return HOUSES; },
    get entry() { return ENTRY; },
    get rules() { return R; },
    snap,
    canFeed,
    plantPole,
    connectService,
    reset: () => reset(),
    undo: () => doUndo(),
    extendToward(cid) {
      const t = CLUSTERS.find((c) => c.id === cid);
      if (!t) return { ok: false, reason: 'missing' };
      if (canFeed(t)) return { ok: true, feed: true };
      const on = allNodes().filter((n) => n.on);
      const cands = [];
      // ring around the service spot, outside min distance
      for (let r = 22; r <= 64; r += 6) {
        for (let a = 0; a < 16; a++) {
          cands.push([t.x + Math.cos((a + 0.2) * Math.PI / 8) * r, t.y + Math.sin((a + 0.2) * Math.PI / 8) * r]);
        }
      }
      // steps from each energized node toward the target
      for (const n of on) {
        const len = hypot(t.x - n.x, t.y - n.y) || 1;
        for (const f of [0.45, 0.6, 0.72, 0.85, 0.95]) {
          const step = Math.min(R.maxSpan * f, len - 4);
          if (step < 16) continue;
          cands.push([n.x + (t.x - n.x) / len * step, n.y + (t.y - n.y) / len * step]);
        }
      }
      let best = null, bd = 1e9;
      for (const [x, y] of cands) {
        const s = snap(x, y);
        if (!s.valid || tooClose(s.x, s.y)) continue;
        const n = nearestNode(s.x, s.y, (q) => q.on);
        if (!n || n.d > R.maxSpan) continue;
        const d = hypot(s.x - t.x, s.y - t.y);
        // prefer points that will feed the cluster
        const score = d + (d <= R.feedReach ? 0 : 80);
        if (score < bd) { bd = score; best = s; }
      }
      if (!best) return { ok: false, reason: 'no-spot' };
      if (cash < R.poleCost) cash += R.poleCost;
      return plantPole(best.x, best.y);
    },
    aimAt(x, y) { const s = snap(x, y); aim = { ...s, rawX: x, rawY: y }; return s; },

    clearAim() { aim = null; },
    grant(n) { cash += n; ui(); },
    svcCost,
    state() {
      return { cash, inc: inc(), lit: lit.size, poles: poles.length, services: services.length, done };
    }
  };

  Promise.all([
    loadImage('art/sq-02-lit.webp'),
    loadImage('art/sq-02-dim.webp'),
    loadMask('art/street-mask.png')
  ]).then(([lit, dim, mask]) => {
    litImg = lit; dimImg = dim; maskPix = mask;
    start();
  }).catch((err) => {
    boot.textContent = 'Failed to load art';
    console.error(err);
  });
})();
