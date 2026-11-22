/* Last Outpost — playable prototype
   Idle Games USA. Hidden test page, not a store build.
   Works in the browser and in Node (for sim.js). */
(function (root) {
  "use strict";

  const W = 1080;
  let H = 1920;
  let RAIL_Y = 1410;
  const SHIP_X = 540;
  let SHIP_Y = 1390;
  const CONSOLE_H = 510;
  const STORAGE_KEY = "idleusa.lastOutpost.v2";

  const C = {
    cyan: "#00f6ff", magenta: "#ff2bd6", pink: "#ff4aa8", lime: "#c8ff00",
    yellow: "#ffe500", orange: "#ff7a00", violet: "#b14cff", red: "#ff3355",
    white: "#f4fbff", ice: "#eaffff"
  };

  const BAL = {
    baseDmg: 11, dmgPerLv: 5, baseInterval: 0.34, rateDecay: 0.88, minInterval: 0.10,
    baseHp: 100, hpPerBuy: 15, hpHealFrac: 0.42, permaDmg: 5, permaHp: 30,
    permaArmor: 0.05, permaCrit: 0.05, permaStartCoins: 35, permaCoinValue: 0.18,
    permaGemBonus: 0.15, permaShield: 20, interestPerWave: 10, gemPerWave: 10,
    gemKillDiv: 5, gemPerBoss: 28, hpScale: 1.148, spdScale: 1.04, dmgScale: 1.11,
    countBase: 5, countPerWave: 1.18, countMax: 30, bulletSpd: 980,
    waveBreak: 1.7, bossIntro: 2.1, maxShieldBase: 50, shieldPerLv: 28,
    shieldRegenDelay: 3.0, shieldRegenPerSec: 10
  };

  const UPGRADES = [
    { id: "dmg",     name: "DAMAGE",    base: 25,  grow: 1.45, max: 12, unlock: 0 },
    { id: "rate",    name: "FIRE RATE", base: 40,  grow: 1.50, max: 12, unlock: 0 },
    { id: "hp",      name: "HEALTH",    base: 30,  grow: 1.40, max: 12, unlock: 0 },
    { id: "shield",  name: "SHIELD",    base: 80,  grow: 1.55, max: 8,  unlock: 4 },
    { id: "spread",  name: "SPREAD",    base: 55,  grow: 1.55, max: 5,  unlock: 3 },
    { id: "laser",   name: "LASER",     base: 200, grow: 1.60, max: 5,  unlock: 6 },
    { id: "missile", name: "MISSILES",  base: 250, grow: 1.65, max: 5,  unlock: 8 },
    { id: "drone",   name: "DRONE",     base: 180, grow: 1.60, max: 4,  unlock: 7 }
  ];

  const PERMA = {
    atk: [
      { id: "dmg", name: "Starting Damage", max: 8, base: 35, grow: 1.5 },
      { id: "rate", name: "Starting Fire Rate", max: 8, base: 35, grow: 1.5 },
      { id: "crit", name: "Crit Chance", max: 8, base: 50, grow: 1.55 },
      { id: "slot", name: "Weapon Slot", max: 2, base: 120, grow: 1.7 }
    ],
    def: [
      { id: "hp", name: "Max Health", max: 8, base: 40, grow: 1.5 },
      { id: "shield", name: "Shield Strength", max: 8, base: 60, grow: 1.55 },
      { id: "armor", name: "Armor", max: 6, base: 45, grow: 1.5 },
      { id: "wind", name: "Second Wind", max: 1, base: 200, grow: 1 }
    ],
    eco: [
      { id: "startCoins", name: "Starting Coins", max: 8, base: 28, grow: 1.5 },
      { id: "coinValue", name: "Coin Value", max: 8, base: 40, grow: 1.5 },
      { id: "gemBonus", name: "Gem Bonus", max: 6, base: 80, grow: 1.6 },
      { id: "interest", name: "Interest", max: 5, base: 100, grow: 1.55 }
    ]
  };

  const ENEMY = {
    spark:     { hp: 8,  spd: 76,  r: 16, dmg: 6,  coins: 5,  color: C.magenta },
    drifter:   { hp: 16, spd: 58,  r: 24, dmg: 8,  coins: 7,  color: C.orange },
    razor:     { hp: 12, spd: 92,  r: 16, dmg: 7,  coins: 8,  color: C.lime },
    shooter:   { hp: 20, spd: 52,  r: 22, dmg: 8,  coins: 8,  color: C.orange, shoot: 2.6, shotDmg: 5 },
    shellback: { hp: 36, spd: 46,  r: 26, dmg: 11, coins: 10, color: C.violet, shield: 18 },
    splitter:  { hp: 18, spd: 68,  r: 20, dmg: 8,  coins: 8,  color: C.yellow, split: 2 },
    needle:    { hp: 14, spd: 140, r: 14, dmg: 10, coins: 8,  color: C.pink },
    coil:      { hp: 26, spd: 82,  r: 22, dmg: 12, coins: 9,  color: C.cyan },
    brood:     { hp: 48, spd: 46,  r: 32, dmg: 16, coins: 14, color: C.violet, spawn: 3.4 }
  };

  const BOSS = {
    10: { name: "THE HERALD",     kind: "herald",     hp: 720,  r: 70,  coins: 80 },
    20: { name: "TWIN SPIRE",     kind: "twin",       hp: 1100, r: 80,  coins: 120 },
    30: { name: "THE LATTICE",    kind: "lattice",    hp: 1600, r: 90,  coins: 160 },
    40: { name: "THE HARBINGER",  kind: "harbinger",  hp: 2300, r: 110, coins: 220 },
    50: { name: "ECLIPSE ENGINE", kind: "eclipse",    hp: 3200, r: 100, coins: 280 }
  };

  function bossInfo(wave) {
    const tier = Math.floor(wave / 10) * 10;
    const table = BOSS[tier] || BOSS[50];
    const extra = Math.max(0, (tier - 50) / 10);
    const roman = ["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
    const name = tier <= 50 ? table.name : table.name + " " + (roman[Math.floor(tier / 10) - 4] || String(tier));
    const kind = tier <= 40 ? table.kind : (tier === 50 ? "eclipse" : (tier % 40 === 0 ? "harbinger" : table.kind));
    const src = BOSS[Math.min(50, tier)] || BOSS[50];
    return { name, kind, hp: Math.floor(src.hp * Math.pow(1.32, extra)), r: src.r, coins: Math.floor(src.coins * (1 + extra * 0.4)) };
  }

  function makeRng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function defaultPerma() {
    return { dmg: 0, rate: 0, crit: 0, slot: 0, hp: 0, shield: 0, armor: 0, wind: 0, startCoins: 0, coinValue: 0, gemBonus: 0, interest: 0 };
  }
  function defaultMid() {
    return { dmg: 0, rate: 0, hp: 0, shield: 0, spread: 0, laser: 0, missile: 0, drone: 0 };
  }
  function defaultSave() { return { bestWave: 0, gems: 0, perma: defaultPerma(), mid: defaultMid(), carryCoins: 0, mute: false }; }

  function loadSave() {
    if (typeof localStorage === "undefined") return defaultSave();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      const s = JSON.parse(raw);
      const d = defaultSave();
      d.bestWave = s.bestWave | 0; d.gems = s.gems | 0; d.mute = !!s.mute;
      d.perma = Object.assign(defaultPerma(), s.perma || {});
      d.mid = Object.assign(defaultMid(), s.mid || {});
      d.carryCoins = Math.max(0, s.carryCoins | 0);
      return d;
    } catch (e) { return defaultSave(); }
  }
  function writeSave(save) {
    if (typeof localStorage === "undefined") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  function costOf(def, level) { return Math.floor(def.base * Math.pow(def.grow, level)); }
  function midCost(id, level) { return costOf(UPGRADES.find(u => u.id === id), level); }

  function isUnlocked(id, wave, up) {
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return false;
    if ((up[id] || 0) > 0) return true;
    if (wave >= def.unlock) return true;
    if (id === "spread" && (up.dmg + up.rate) >= 3) return true;
    if (id === "shield" && up.hp >= 1) return true;
    if (id === "laser" && up.spread >= 1) return true;
    if (id === "missile" && (up.laser >= 1 || up.spread >= 2)) return true;
    if (id === "drone" && up.spread >= 1) return true;
    return false;
  }

  function hpScale(wave) {
    const n = Math.max(0, wave - 1);
    // early waves stay close to the original curve; later waves ramp so kept upgrades don't steamroll
    return Math.pow(1.148, Math.min(n, 6)) * Math.pow(1.17, Math.max(0, Math.min(n, 16) - 6)) * Math.pow(1.19, Math.max(0, Math.min(n, 26) - 16)) * Math.pow(1.215, Math.max(0, n - 26));
  }
  function spdScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.min(2.45, Math.pow(1.035, Math.min(n, 6)) * Math.pow(1.048, Math.max(0, n - 6)));
  }
  function dmgScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.pow(1.11, Math.min(n, 8)) * Math.pow(1.125, Math.max(0, n - 8));
  }

  function playerStats(run) {
    const p = run.perma, u = run.up;
    const dmg = BAL.baseDmg + BAL.dmgPerLv * (u.dmg + p.dmg);
    const interval = Math.max(BAL.minInterval, BAL.baseInterval * Math.pow(BAL.rateDecay, u.rate + p.rate));
    const maxHp = BAL.baseHp + BAL.hpPerBuy * u.hp + BAL.permaHp * p.hp;
    const armor = Math.min(0.45, p.armor * BAL.permaArmor);
    const crit = Math.min(0.45, p.crit * BAL.permaCrit);
    const coinMul = 1 + p.coinValue * BAL.permaCoinValue;
    const gemMul = 1 + p.gemBonus * BAL.permaGemBonus;
    let maxShield = 0;
    if (u.shield > 0) maxShield += BAL.maxShieldBase + BAL.shieldPerLv * (u.shield - 1);
    if (p.shield > 0) maxShield += BAL.permaShield * p.shield;
    return { dmg, interval, maxHp, armor, crit, coinMul, gemMul, maxShield };
  }

  function createRun(perma, opts) {
    opts = opts || {};
    const run = {
      perma: Object.assign(defaultPerma(), perma || {}),
      up: Object.assign(defaultMid(), opts.mid || {}),
      wave: 0, coins: 0, kills: 0, bossesBeaten: 0,
      hp: 0, shield: 0, shieldWait: 0, invuln: 0, usedWind: false,
      dead: false, dyingT: 0, time: 0, waveTime: 0,
      phase: "break", phaseT: 0, pending: [], spawnCd: 0,
      enemies: [], bullets: [], pickups: [], floaters: [], particles: [], lasers: [],
      fireCd: 0, missileCd: 0, laserCd: 0, droneFire: [0, 0],
      shake: 0, flash: 0, banner: null,
      rng: makeRng(opts.seed || (Date.now() & 0x7fffffff)),
      bestWave: opts.bestWave || 0,
      persist: opts.persist !== false
    };
    if (run.perma.slot >= 1) run.up.spread = Math.max(run.up.spread, 1);
    if (run.perma.slot >= 2) run.up.laser = Math.max(run.up.laser, 1);
    const st = playerStats(run);
    run.hp = st.maxHp;
    run.shield = st.maxShield;
    run.coins = (opts.carryCoins || 0) + run.perma.startCoins * BAL.permaStartCoins;
    return run;
  }

  function settlePickups(run) {
    if (!run || !run.pickups) return;
    for (let i = 0; i < run.pickups.length; i++) run.coins += run.pickups[i].v;
    run.pickups = [];
  }

  function beginWave(run, n) {
    run.wave = n; run.waveTime = 0; run.pending = []; run.spawnCd = 0;
    if (n > 1 && run.perma.interest > 0) run.coins += BAL.interestPerWave * run.perma.interest;
    if (n % 10 === 0) {
      run.phase = "intro"; run.phaseT = BAL.bossIntro;
      run.banner = { type: "boss", name: bossInfo(n).name, t: BAL.bossIntro };
      run.flash = 0.8;
    } else {
      run.phase = "break"; run.phaseT = n === 1 ? 1.2 : BAL.waveBreak;
      run.banner = { type: "wave", n: n, t: run.phaseT };
    }
  }

  function composeWave(run) {
    const n = run.wave;
    if (n % 10 === 0) {
      const b = bossInfo(n);
      run.pending.push({ type: "boss", boss: b, delay: 0 });
      const escorts = n >= 20 ? 4 : 2;
      for (let i = 0; i < escorts; i++) {
        run.pending.push({ type: n >= 30 ? "coil" : "spark", delay: 0.4 + i * 0.25 });
      }
      return;
    }
    const count = Math.min(BAL.countMax, Math.floor(BAL.countBase + n * BAL.countPerWave));
    const pool = ["spark", "drifter"];
    if (n >= 3) pool.push("razor");
    if (n >= 6) pool.push("shooter");
    if (n >= 7) pool.push("shellback");
    if (n >= 9) pool.push("splitter");
    if (n >= 12) pool.push("needle");
    if (n >= 15) pool.push("coil");
    if (n >= 18) pool.push("brood");
    const weights = pool.map((t) => t === "spark" || t === "drifter" ? 3 : (t === "brood" || t === "shellback" ? 0.8 : 1.4));
    const wsum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count; i++) {
      let r = run.rng() * wsum, pick = pool[0];
      for (let k = 0; k < pool.length; k++) { r -= weights[k]; if (r <= 0) { pick = pool[k]; break; } }
      run.pending.push({ type: pick, delay: 0.12 + i * (n < 5 ? 0.32 : 0.22) });
    }
  }

  function spawnEnemy(run, type, extra) {
    extra = extra || {};
    const rnd = run.rng;
    if (type === "boss") {
      const b = extra.boss || bossInfo(run.wave);
      const e = {
        type: "boss", bossKind: b.kind, name: b.name,
        x: extra.x != null ? extra.x : 540, y: extra.y != null ? extra.y : -40,
        hp: b.hp, maxHp: b.hp, r: b.r, dmg: 22 * dmgScale(run.wave),
        coins: b.coins, color: C.magenta, t: 0, fireCd: 1.2, fireEvery: 1.35,
        weave: b.kind === "twin" ? 1.4 : 0.7, weaveAmp: b.kind === "harbinger" ? 80 : 140,
        vx: 0, shield: 0, phase: rnd() * 6
      };
      run.enemies.push(e);
      return e;
    }
    const def = ENEMY[type] || ENEMY.spark;
    const scH = hpScale(run.wave), scS = spdScale(run.wave), scD = dmgScale(run.wave);
    const e = {
      type: type,
      x: extra.x != null ? extra.x : 80 + rnd() * (W - 160),
      y: extra.y != null ? extra.y : -20 - rnd() * 40,
      hp: Math.max(1, Math.round(def.hp * scH)), maxHp: 0, r: def.r,
      spd: def.spd * scS, dmg: def.dmg * scD, coins: def.coins, color: def.color,
      shield: def.shield ? Math.round(def.shield * scH) : 0,
      fireCd: def.shoot ? 0.4 + rnd() * def.shoot : 0, fireEvery: def.shoot || 0,
      shotDmg: def.shotDmg ? def.shotDmg * scD : 0, split: def.split || 0,
      spawnCd: def.spawn || 0, phase: rnd() * 6.28, cx: 0,
      dashing: false, dashT: 0, dashEvery: 1.8 + rnd() * 1.4, phaseT: rnd() * 0.8,
      orbit: rnd() * 6.28
    };
    e.maxHp = e.hp + e.shield;
    e.cx = e.x;
    if (!extra.x && Math.abs(e.x - SHIP_X) < 20) e.x += 40;
    run.enemies.push(e);
    return e;
  }

  function shootEnemyAtPlayer(run, e) {
    const ang = Math.atan2(SHIP_Y - e.y, SHIP_X - e.x);
    const spd = 280 + 20 * Math.min(run.wave, 20);
    run.bullets.push({
      x: e.x, y: e.y + e.r, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      r: 6, dmg: e.shotDmg || 7, friendly: false, color: e.color || C.magenta, life: 3
    });
  }

  function threatScore(e, fromX, fromY) {
    const dx = e.x - fromX, dy = e.y - fromY;
    // Closest to the ship; a modest bias toward lower (near-rail) threats so leaks get priority.
    return Math.sqrt(dx * dx + dy * dy) - 0.2 * Math.max(0, e.y);
  }

  function closestEnemy(run, fromX, fromY) {
    let best = null, bestS = 1e15;
    for (let i = 0; i < run.enemies.length; i++) {
      const e = run.enemies[i];
      if (e.y < -40 || e.hp <= 0) continue;
      const s = threatScore(e, fromX, fromY);
      if (s < bestS) { bestS = s; best = e; }
    }
    return best;
  }

  function closestEnemies(run, fromX, fromY, n) {
    const list = [];
    for (let i = 0; i < run.enemies.length; i++) {
      const e = run.enemies[i];
      if (e.y < -40 || e.hp <= 0) continue;
      list.push(e);
    }
    list.sort((a, b) => threatScore(a, fromX, fromY) - threatScore(b, fromX, fromY));
    return list.slice(0, n);
  }

  function aimAngle(run) {
    const best = closestEnemy(run, SHIP_X, SHIP_Y);
    if (!best) return -Math.PI / 2;
    // Full-width aim: no forward-cone clamp, so side enemies near the rail get shot.
    return Math.atan2(best.y - SHIP_Y, best.x - SHIP_X);
  }

  function distToSegment(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - x0) * dx + (py - y0) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
  }

  function fireBlaster(run, st) {
    const ang = aimAngle(run);
    const ways = run.up.spread <= 0 ? 1 : (run.up.spread === 1 ? 3 : 5);
    const spreadW = ways === 1 ? 0 : (ways === 3 ? 0.22 : 0.16);
    const start = -((ways - 1) / 2);
    for (let i = 0; i < ways; i++) {
      const a = ang + (start + i) * spreadW;
      const crit = run.rng() < st.crit;
      const dmg = st.dmg * (crit ? 2 : 1) * (ways > 1 && i !== (ways - 1) / 2 ? 0.85 : 1);
      run.bullets.push({
        x: SHIP_X + Math.cos(a) * 20, y: SHIP_Y - 78,
        vx: Math.cos(a) * BAL.bulletSpd, vy: Math.sin(a) * BAL.bulletSpd,
        r: crit ? 7 : 5, dmg: dmg, friendly: true, color: crit ? C.white : C.cyan,
        life: 1.85, crit: crit, kind: "blast"
      });
    }
  }

  function fireMissile(run, st) {
    const target = closestEnemy(run, SHIP_X, SHIP_Y);
    const ang = target ? Math.atan2(target.y - SHIP_Y, target.x - SHIP_X) : -Math.PI / 2;
    run.bullets.push({
      x: SHIP_X, y: SHIP_Y - 40, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320,
      r: 8, dmg: st.dmg * (2.4 + 0.5 * run.up.missile), friendly: true, color: C.orange,
      life: 2.4, kind: "missile", target: target, turn: 7
    });
  }

  function fireLaser(run, st) {
    const beams = run.up.laser >= 2 ? 2 : 1;
    const targets = closestEnemies(run, SHIP_X, SHIP_Y, beams);
    for (let i = 0; i < beams; i++) {
      const e = targets[i] || targets[0];
      const x0 = SHIP_X + (beams === 2 ? (i === 0 ? -24 : 24) : 0);
      const y0 = SHIP_Y - 80;
      let tx = e ? e.x : SHIP_X, ty = e ? e.y : 80;
      const d = Math.hypot(tx - x0, ty - y0) || 1;
      const x1 = x0 + (tx - x0) / d * 1700;
      const y1 = y0 + (ty - y0) / d * 1700;
      run.lasers.push({
        x0: x0, y0: y0, x1: x1, y1: y1,
        t: 0.18, dmg: st.dmg * (1.1 + 0.35 * run.up.laser), tick: 0
      });
    }
  }

  function fireDrone(run, st, x, y) {
    const e = closestEnemy(run, SHIP_X, SHIP_Y);
    const ang = e ? Math.atan2(e.y - y, e.x - x) : -Math.PI / 2;
    run.bullets.push({
      x: x, y: y, vx: Math.cos(ang) * 860, vy: Math.sin(ang) * 860,
      r: 4, dmg: st.dmg * 0.55, friendly: true, color: C.lime, life: 1.2, kind: "drone"
    });
  }

  function dronePos(i, t) {
    const side = i === 0 ? -1 : 1;
    return { x: SHIP_X + side * 190, y: SHIP_Y - 30 + Math.sin(t * 3 + i) * 8 };
  }

  function burst(run, x, y, color, n) {
    if (run.particles.length > 260) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + run.rng() * 0.4;
      const s = 80 + run.rng() * 260;
      run.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + run.rng() * 0.4, t: 0, color: color, r: 2 + run.rng() * 3 });
    }
  }
  function floater(run, x, y, text, color, kind) {
    run.floaters.push({ x, y, text, color, kind: kind || "dmg", t: 0, life: 0.7, vy: -60 });
  }

  function hurt(run, dmg) {
    if (run.dead || run.invuln > 0) return;
    const st = playerStats(run);
    dmg = dmg * (1 - st.armor);
    if (run.shield > 0) {
      const used = Math.min(run.shield, dmg);
      run.shield -= used; dmg -= used; run.shieldWait = BAL.shieldRegenDelay;
    }
    if (dmg <= 0) { run.shake = Math.max(run.shake, 6); return; }
    run.hp -= dmg; run.invuln = 0.55; run.shake = 14; run.flash = 0.18;
    if (run.hp <= 0) {
      if (run.perma.wind && !run.usedWind) {
        run.usedWind = true;
        run.hp = Math.max(1, Math.floor(st.maxHp * 0.2));
        run.invuln = 1.6; run.flash = 0.5;
      } else {
        run.hp = 0; run.dead = true; run.dyingT = 1.15;
        burst(run, SHIP_X, SHIP_Y, C.cyan, 28);
        burst(run, SHIP_X, SHIP_Y, C.magenta, 16);
      }
    }
  }

  function killEnemy(run, e, giveCoins) {
    const st = playerStats(run);
    const idx = run.enemies.indexOf(e);
    if (idx >= 0) run.enemies.splice(idx, 1);
    run.kills++;
    if (e.type === "boss") run.bossesBeaten++;
    burst(run, e.x, e.y, e.color || C.orange, e.type === "boss" ? 36 : 14);
    if (giveCoins !== false) {
      const c = Math.max(1, Math.round(e.coins * st.coinMul));
      run.pickups.push({ x: e.x, y: e.y, v: c, t: 0, wait: 0.12, vx: (run.rng() - 0.5) * 80, vy: -80 });
    }
    if (e.split && e.type === "splitter") {
      spawnEnemy(run, "spark", { x: e.x - 18, y: e.y });
      spawnEnemy(run, "spark", { x: e.x + 18, y: e.y });
    }
  }

  function hitEnemy(run, e, dmg, crit) {
    if (e.shield > 0) {
      const used = Math.min(e.shield, dmg);
      e.shield -= used; dmg -= used;
    }
    if (dmg > 0) e.hp -= dmg;
    floater(run, e.x + (run.rng() - 0.5) * 20, e.y - e.r, String(Math.round(Math.max(1, dmg))), crit ? C.white : C.yellow, "dmg");
    if (e.hp <= 0) killEnemy(run, e, true);
  }

  function gemsFor(run) {
    const st = playerStats(run);
    const raw = BAL.gemPerWave * run.wave + Math.floor(run.kills / BAL.gemKillDiv) + BAL.gemPerBoss * run.bossesBeaten;
    return Math.max(1, Math.round(raw * st.gemMul));
  }

  function updateRun(run, dt) {
    if (dt > 0.05) dt = 0.05;
    if (run.dead) {
      run.dyingT -= dt; run.time += dt; updateFx(run, dt); return;
    }
    run.time += dt; run.waveTime += dt;
    if (run.invuln > 0) run.invuln -= dt;
    if (run.shake > 0) run.shake = Math.max(0, run.shake - dt * 28);
    if (run.flash > 0) run.flash = Math.max(0, run.flash - dt);
    const st = playerStats(run);

    if (st.maxShield > 0) {
      if (run.shieldWait > 0) run.shieldWait -= dt;
      else if (run.shield < st.maxShield) run.shield = Math.min(st.maxShield, run.shield + BAL.shieldRegenPerSec * dt);
    }

    if (run.wave === 0) beginWave(run, 1);

    if (run.phase === "break" || run.phase === "intro") {
      run.phaseT -= dt;
      if (run.banner) run.banner.t -= dt;
      if (run.phaseT <= 0) {
        run.phase = "combat"; run.banner = null;
        if (run.pending.length === 0) composeWave(run);
      }
    } else if (run.phase === "combat") {
      for (let i = 0; i < run.pending.length; i++) run.pending[i].delay -= dt;
      const ready = run.pending.filter(p => p.delay <= 0);
      run.pending = run.pending.filter(p => p.delay > 0);
      for (const p of ready) spawnEnemy(run, p.type, p);
      if (run.pending.length === 0 && run.enemies.length === 0 && run.waveTime > 0.6) beginWave(run, run.wave + 1);
    }

    run.fireCd -= dt;
    if (run.fireCd <= 0) { fireBlaster(run, st); run.fireCd = st.interval; }
    if (run.up.missile > 0) {
      run.missileCd -= dt;
      if (run.missileCd <= 0 && run.enemies.length) { fireMissile(run, st); run.missileCd = 1.35 * Math.pow(0.9, run.up.missile - 1); }
    }
    if (run.up.laser > 0) {
      run.laserCd -= dt;
      if (run.laserCd <= 0 && run.enemies.length) { fireLaser(run, st); run.laserCd = 1.25 * Math.pow(0.9, run.up.laser - 1); }
    }
    const drones = Math.min(2, run.up.drone);
    for (let i = 0; i < drones; i++) {
      run.droneFire[i] -= dt;
      if (run.droneFire[i] <= 0 && run.enemies.length) {
        const p = dronePos(i, run.time);
        fireDrone(run, st, p.x, p.y);
        run.droneFire[i] = st.interval * 1.15;
      }
    }

    for (let i = run.lasers.length - 1; i >= 0; i--) {
      const L = run.lasers[i];
      L.t -= dt; L.tick -= dt;
      if (L.tick <= 0) {
        L.tick = 0.05;
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          const x0 = L.x0 != null ? L.x0 : L.x, y0 = L.y0;
          const x1 = L.x1 != null ? L.x1 : L.x, y1 = L.y1 != null ? L.y1 : 80;
          if (distToSegment(e.x, e.y, x0, y0, x1, y1) < e.r + 12) hitEnemy(run, e, L.dmg * 0.35, false);
        }
      }
      if (L.t <= 0) run.lasers.splice(i, 1);
    }

    for (let i = run.bullets.length - 1; i >= 0; i--) {
      const b = run.bullets[i];
      if (b.kind === "missile") {
        const closest = closestEnemy(run, SHIP_X, SHIP_Y);
        let tgt = b.target && run.enemies.indexOf(b.target) >= 0 ? b.target : null;
        if (!tgt) {
          tgt = closest;
          b.target = tgt;
        } else if (closest && closest !== tgt) {
          const cur = threatScore(tgt, SHIP_X, SHIP_Y);
          const nxt = threatScore(closest, SHIP_X, SHIP_Y);
          if (nxt + 8 < cur) { tgt = closest; b.target = tgt; }
        }
        if (tgt) {
          const want = Math.atan2(tgt.y - b.y, tgt.x - b.x);
          let have = Math.atan2(b.vy, b.vx);
          let diff = want - have;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          have += Math.max(-b.turn * dt, Math.min(b.turn * dt, diff));
          const spd = Math.hypot(b.vx, b.vy) + 80 * dt;
          b.vx = Math.cos(have) * spd; b.vy = Math.sin(have) * spd;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -60 || b.y > RAIL_Y + 40) {
        run.bullets.splice(i, 1); continue;
      }
      if (b.friendly) {
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
            hitEnemy(run, e, b.dmg, b.crit);
            if (b.kind !== "pierce") run.bullets.splice(i, 1);
            break;
          }
        }
      } else if (Math.hypot(SHIP_X - b.x, SHIP_Y - b.y) < ((st.maxShield > 0 && run.shield > 0) ? 95 : 36) + b.r) {
        hurt(run, b.dmg);
        run.bullets.splice(i, 1);
      }
    }

    for (let i = run.enemies.length - 1; i >= 0; i--) {
      const e = run.enemies[i];
      if (run.enemies.indexOf(e) < 0) continue;
      stepEnemy(run, e, dt);
      if (run.dead) break;
    }

    for (let i = run.pickups.length - 1; i >= 0; i--) {
      const p = run.pickups[i];
      p.t += dt;
      if (p.t < p.wait) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
      else {
        const tx = 920, ty = 56;
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
        const spd = 900 + p.t * 400;
        p.x += dx / d * spd * dt; p.y += dy / d * spd * dt;
        if (d < 24) {
          run.coins += p.v;
          floater(run, tx, ty + 20, "+" + p.v, C.yellow, "coin");
          run.pickups.splice(i, 1);
        }
      }
    }
    updateFx(run, dt);
  }

  function stepEnemy(run, e, dt) {
    switch (e.type) {
      case "spark":
        e.x += Math.sin(e.phase + run.time * 3.2) * 28 * dt; e.y += e.spd * dt; break;
      case "drifter":
        e.x += Math.sin(run.time * 0.9 + e.phase) * 18 * dt; e.y += e.spd * dt; break;
      case "razor":
        e.phaseT += dt;
        if (e.dashing) { e.y += e.spd * 1.7 * dt; e.dashT -= dt; if (e.dashT <= 0) e.dashing = false; }
        else {
          e.x += Math.sin(run.time * 4.2 + e.phase) * 90 * dt; e.y += e.spd * 0.65 * dt;
          if (e.phaseT > e.dashEvery) { e.dashing = true; e.dashT = 0.28; e.phaseT = 0; }
        }
        break;
      case "shooter":
        e.y += e.spd * dt; e.x += Math.sin(run.time * 1.2 + e.phase) * 22 * dt;
        e.fireCd -= dt;
        if (e.fireCd <= 0 && e.y > 40 && e.y < RAIL_Y - 80) { shootEnemyAtPlayer(run, e); e.fireCd = e.fireEvery; }
        break;
      case "shellback": e.y += e.spd * dt; break;
      case "splitter": e.y += e.spd * dt; e.x += Math.sin(run.time * 2.2 + e.phase) * 34 * dt; break;
      case "needle": e.y += e.spd * dt; break;
      case "coil": e.orbit += dt * 2.6; e.x = e.cx + Math.sin(e.orbit) * 56; e.y += e.spd * dt; break;
      case "brood":
        e.y += e.spd * dt; e.spawnCd -= dt;
        if (e.spawnCd <= 0 && run.enemies.length < 36) { spawnEnemy(run, "spark", { x: e.x, y: e.y + 20 }); e.spawnCd = ENEMY.brood.spawn; }
        break;
      case "boss": stepBoss(run, e, dt); break;
    }
    e.x = Math.max(40, Math.min(W - 40, e.x));
    const hitShip = Math.hypot(e.x - SHIP_X, e.y - SHIP_Y) < e.r + 42;
    const hitRail = e.y + e.r >= RAIL_Y;
    if (hitShip || hitRail) {
      hurt(run, e.dmg);
      if (e.type === "boss") e.y = Math.min(e.y, RAIL_Y - e.r - 8);
      else {
        burst(run, e.x, e.y, e.color, 10);
        const idx = run.enemies.indexOf(e);
        if (idx >= 0) run.enemies.splice(idx, 1);
      }
    }
  }

  function stepBoss(run, e, dt) {
    e.t += dt;
    const targetY = e.bossKind === "harbinger" ? 560 : (e.bossKind === "lattice" ? 420 : 480);
    e.y += (targetY - e.y) * Math.min(1, 1.4 * dt);
    if (e.y < 80) e.y += 200 * dt;
    e.x = 540 + Math.sin(e.t * e.weave) * e.weaveAmp;
    e.fireCd -= dt;
    if (e.fireCd <= 0) {
      const n = e.bossKind === "herald" ? 3 : (e.bossKind === "twin" ? 4 : 5);
      const spread = 0.28;
      const base = Math.atan2(SHIP_Y - e.y, SHIP_X - e.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * spread;
        run.bullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 7, dmg: 9 * dmgScale(run.wave), friendly: false, color: C.magenta, life: 4 });
      }
      if (e.bossKind === "harbinger" || e.bossKind === "lattice" || e.bossKind === "eclipse") {
        for (const sx of [-180, 180]) {
          run.bullets.push({ x: e.x + sx * (e.r / 110), y: e.y + 40, vx: 0, vy: 300, r: 6, dmg: 10 * dmgScale(run.wave), friendly: false, color: C.pink, life: 4 });
        }
      }
      e.fireCd = e.fireEvery;
    }
  }

  function updateFx(run, dt) {
    for (let i = run.particles.length - 1; i >= 0; i--) {
      const p = run.particles[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98;
      if (p.t >= p.life) run.particles.splice(i, 1);
    }
    for (let i = run.floaters.length - 1; i >= 0; i--) {
      const f = run.floaters[i];
      f.t += dt; f.y += f.vy * dt;
      if (f.t >= f.life) run.floaters.splice(i, 1);
    }
  }

  function tryBuy(run, id) {
    if (run.dead) return false;
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return false;
    if (!isUnlocked(id, run.wave, run.up)) return false;
    const lv = run.up[id] || 0;
    if (lv >= def.max) return false;
    const cost = midCost(id, lv);
    if (run.coins < cost) return false;
    run.coins -= cost;
    run.up[id] = lv + 1;
    if (id === "hp") {
      const st = playerStats(run);
      run.hp = Math.min(st.maxHp, run.hp + Math.round(st.maxHp * BAL.hpHealFrac));
    }
    if (id === "shield") {
      const st = playerStats(run);
      run.shield = st.maxShield; run.shieldWait = 0;
    }
    return true;
  }

  function autoBuyMid(run) {
    const st = playerStats(run);
    const hpFrac = run.hp / st.maxHp;
    const order = [];
    if (hpFrac < 0.35 && isUnlocked("hp", run.wave, run.up)) order.push("hp");
    if (run.up.rate < run.up.dmg) order.push("rate", "dmg"); else order.push("dmg", "rate");
    order.push("spread");
    if (hpFrac < 0.6) order.push("hp");
    order.push("drone", "shield", "laser", "missile", "hp");
    for (const id of order) { if (tryBuy(run, id)) return true; }
    return false;
  }

  function permaDef(id) {
    for (const k of ["atk", "def", "eco"]) {
      const d = PERMA[k].find(x => x.id === id);
      if (d) return d;
    }
    return null;
  }

  function tryBuyPerma(perma, gems, id) {
    const def = permaDef(id);
    if (!def) return gems;
    const lv = perma[id] || 0;
    if (lv >= def.max) return gems;
    const c = costOf(def, lv);
    if (gems < c) return gems;
    perma[id] = lv + 1;
    return gems - c;
  }

  function autoBuyPerma(perma, gems) {
    const order = ["dmg", "hp", "startCoins", "rate", "coinValue", "armor", "shield", "crit", "interest", "slot", "gemBonus", "wind"];
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of order) {
        const before = gems;
        gems = tryBuyPerma(perma, gems, id);
        if (gems !== before) { changed = true; break; }
      }
    }
    return gems;
  }

  function simulateUntilDeath(run, opts) {
    opts = opts || {};
    const dt = opts.dt || 1 / 30;
    const maxT = opts.maxTime || 60 * 18;
    let t = 0;
    while (!run.dead && t < maxT && run.wave < 200) {
      if (opts.autoBuy) { for (let k = 0; k < 4; k++) if (!autoBuyMid(run)) break; }
      updateRun(run, dt);
      t += dt;
      if (run.dead) { run.dyingT = 0; break; }
    }
    return {
      waveReached: run.wave, kills: run.kills, gemsEarned: gemsFor(run),
      coins: run.coins, time: t, bossesBeaten: run.bossesBeaten, dead: run.dead,
      up: Object.assign({}, run.up)
    };
  }

  function simulateRuns(n, opts) {
    opts = opts || {};
    let perma = defaultPerma(), gems = 0, best = 0, mid = defaultMid(), carryCoins = 0;
    const rows = [];
    for (let i = 0; i < n; i++) {
      gems = autoBuyPerma(perma, gems);
      const run = createRun(perma, { seed: (opts.seed || 77001) + i * 997, bestWave: best, persist: false, mid: mid, carryCoins: carryCoins });
      const end = simulateUntilDeath(run, { autoBuy: true });
      settlePickups(run);
      mid = Object.assign(defaultMid(), end.up);
      carryCoins = Math.floor(run.coins / 2);
      gems += end.gemsEarned;
      best = Math.max(best, end.waveReached);
      rows.push({
        run: i + 1, wave: end.waveReached, kills: end.kills, gemsEarned: end.gemsEarned,
        gemsBank: gems, carryCoins: carryCoins, bosses: end.bossesBeaten,
        time: Math.round(end.time * 10) / 10,
        perma: Object.assign({}, perma), mid: Object.assign({}, mid)
      });
    }
    return rows;
  }

  const LO = {
    BAL, UPGRADES, PERMA, ENEMY,
    createRun, updateRun, tryBuy, tryBuyPerma, autoBuyMid, autoBuyPerma,
    playerStats, gemsFor, simulateUntilDeath, simulateRuns, beginWave, spawnEnemy,
    defaultPerma, defaultMid, defaultSave, loadSave, writeSave, midCost, costOf, isUnlocked,
    bossInfo, W, H, RAIL_Y, SHIP_X, SHIP_Y, C
  };

  if (typeof document === "undefined") {
    root.LastOutpost = LO;
    if (typeof module !== "undefined") module.exports = LO;
    return;
  }

  const stage = document.getElementById("stage");
  const frame = document.getElementById("frame");
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d", { alpha: false });
  let dprScale = 1;
  let save = loadSave();
  let mode = "title";
  let paused = false;
  let speed = 1;
  let run = null;
  let demo = null;
  try { demo = new URLSearchParams(location.search).get("demo"); } catch (e) { demo = null; }

  const audio = {
    ctx: null, mute: !!save.mute, master: null,
    unlock() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.mute ? 0 : 0.18;
      this.master.connect(this.ctx.destination);
    },
    setMute(m) { this.mute = m; if (this.master) this.master.gain.value = m ? 0 : 0.18; },
    tone(freq, dur, type, vol, slide) {
      if (this.mute || !this.ctx) return;
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    shoot() { this.tone(720, 0.05, "square", 0.04, 420); },
    explode() { this.tone(180, 0.22, "sawtooth", 0.1, 60); },
    coin() { this.tone(880, 0.07, "square", 0.07); setTimeout(() => this.tone(1180, 0.08, "square", 0.06), 40); },
    hurt() { this.tone(140, 0.16, "sawtooth", 0.12, 70); },
    buy() { this.tone(520, 0.08, "square", 0.08, 800); },
    deny() { this.tone(120, 0.1, "triangle", 0.06); },
    banner() { this.tone(440, 0.12, "square", 0.08); this.tone(660, 0.18, "square", 0.06); },
    boss() { this.tone(110, 0.4, "sawtooth", 0.14, 70); setTimeout(() => this.tone(147, 0.35, "sawtooth", 0.1, 80), 120); },
    death() { this.tone(200, 0.5, "sawtooth", 0.14, 50); }
  };

  function fit() {
    const fitEl = document.getElementById("fit");
    const vw = Math.max(1, fitEl.clientWidth);
    const vh = Math.max(1, fitEl.clientHeight);
    const scale = vw / W;
    const logicalH = Math.max(1920, Math.round(vh / scale));
    H = logicalH;
    RAIL_Y = H - CONSOLE_H;
    SHIP_Y = RAIL_Y - 96;
    stage.style.width = W + "px";
    stage.style.height = H + "px";
    frame.style.width = Math.round(W * scale) + "px";
    frame.style.height = Math.round(H * scale) + "px";
    stage.style.transform = "scale(" + scale + ")";
    const want = Math.min(window.devicePixelRatio || 1, 2);
    dprScale = want;
    canvas.width = Math.round(W * dprScale);
    canvas.height = Math.round(H * dprScale);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);
  }

  function neonStroke(g, color, width, pathFn, opts) {
    opts = opts || {};
    const bloom = opts.bloom != null ? opts.bloom : 16;
    g.save();
    g.lineJoin = "round"; g.lineCap = "round";
    g.globalAlpha = opts.outerA != null ? opts.outerA : 0.28;
    g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = bloom;
    g.lineWidth = width + 6; pathFn(); g.stroke();
    g.globalAlpha = 0.85; g.shadowBlur = bloom * 0.5; g.lineWidth = width + 2;
    pathFn(); g.stroke();
    g.globalAlpha = 1; g.shadowBlur = 6; g.strokeStyle = opts.core || "#fff";
    g.lineWidth = Math.max(1.1, width * 0.7); pathFn(); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = color; g.lineWidth = Math.max(0.8, width * 0.45);
    pathFn(); g.stroke();
    g.restore();
  }
  function neonFill(g, color, pathFn, alpha) {
    g.save(); g.globalAlpha = alpha == null ? 0.12 : alpha;
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 10;
    pathFn(); g.fill(); g.restore();
  }

  const sprites = {};
  function sprite(key, w, h, draw) {
    if (sprites[key]) return sprites[key];
    const pad = 28;
    const c = document.createElement("canvas");
    c.width = w + pad * 2; c.height = h + pad * 2;
    const g = c.getContext("2d");
    g.translate(w / 2 + pad, h / 2 + pad);
    draw(g);
    c._ox = w / 2 + pad; c._oy = h / 2 + pad;
    sprites[key] = c;
    return c;
  }
  function blit(g, key, x, y, s) {
    const im = sprites[key];
    if (!im) return;
    s = s || 1;
    g.drawImage(im, x - im._ox * s, y - im._oy * s, im.width * s, im.height * s);
  }

  function pathPlayer(g) {
    g.beginPath();
    g.moveTo(0, -78); g.lineTo(5, -52); g.lineTo(7, -18); g.lineTo(9, 10);
    g.lineTo(18, 28); g.lineTo(14, 38); g.lineTo(6, 32); g.lineTo(0, 36);
    g.lineTo(-6, 32); g.lineTo(-14, 38); g.lineTo(-18, 28); g.lineTo(-9, 10);
    g.lineTo(-7, -18); g.lineTo(-5, -52); g.closePath();
  }
  function pathLWing(g) { g.beginPath(); g.moveTo(-8, -6); g.lineTo(-82, 34); g.lineTo(-94, 44); g.lineTo(-88, 56); g.lineTo(-70, 50); g.lineTo(-14, 26); g.closePath(); }
  function pathRWing(g) { g.beginPath(); g.moveTo(8, -6); g.lineTo(82, 34); g.lineTo(94, 44); g.lineTo(88, 56); g.lineTo(70, 50); g.lineTo(14, 26); g.closePath(); }
  function pathCanopy(g) { g.beginPath(); g.moveTo(0, -40); g.lineTo(7, -14); g.lineTo(0, 8); g.lineTo(-7, -14); g.closePath(); }

  function drawPlayerTo(g) {
    neonFill(g, C.cyan, () => pathLWing(g), 0.1);
    neonFill(g, C.cyan, () => pathRWing(g), 0.1);
    neonFill(g, C.cyan, () => pathPlayer(g), 0.14);
    neonStroke(g, C.cyan, 2.2, () => pathLWing(g), { bloom: 16 });
    neonStroke(g, C.cyan, 2.2, () => pathRWing(g), { bloom: 16 });
    neonStroke(g, C.cyan, 2.4, () => pathPlayer(g), { bloom: 16 });
    neonFill(g, C.magenta, () => pathCanopy(g), 0.35);
    neonStroke(g, C.magenta, 1.8, () => pathCanopy(g), { bloom: 12 });
    neonStroke(g, C.cyan, 2, () => { g.beginPath(); g.moveTo(0, -86); g.lineTo(0, -60); }, { bloom: 10 });
    for (const p of [[-88, 48], [88, 48]]) {
      g.save(); g.fillStyle = C.magenta; g.shadowColor = C.magenta; g.shadowBlur = 12;
      g.beginPath(); g.arc(p[0], p[1], 3.2, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }

  function buildSprites() {
    sprite("player", 220, 200, drawPlayerTo);
    sprite("spark", 50, 50, g => {
      const p = () => { g.beginPath(); g.moveTo(0, -16); g.lineTo(10, 0); g.lineTo(0, 16); g.lineTo(-10, 0); g.closePath(); };
      neonFill(g, C.magenta, p, 0.22); neonStroke(g, C.magenta, 1.8, p, { bloom: 12 });
    });
    sprite("drifter", 70, 50, g => {
      neonFill(g, C.orange, () => { g.beginPath(); g.ellipse(0, 2, 22, 10, 0, 0, Math.PI * 2); }, 0.18);
      neonStroke(g, C.orange, 2, () => { g.beginPath(); g.ellipse(0, 4, 28, 8, 0, 0, Math.PI * 2); }, { bloom: 12 });
      neonStroke(g, C.orange, 1.8, () => { g.beginPath(); g.ellipse(0, 2, 22, 10, 0, 0, Math.PI * 2); }, { bloom: 10 });
      neonFill(g, C.yellow, () => { g.beginPath(); g.ellipse(0, -2, 14, 14, 0, 0, Math.PI * 2); }, 0.2);
      neonStroke(g, C.yellow, 1.6, () => { g.beginPath(); g.ellipse(0, -2, 14, 14, 0, 0, Math.PI * 2); }, { bloom: 10 });
    });
    sprite("razor", 40, 70, g => {
      const p = () => { g.beginPath(); g.moveTo(0, -30); g.lineTo(6, 6); g.lineTo(0, 22); g.lineTo(-6, 6); g.closePath(); };
      neonFill(g, C.lime, p, 0.16); neonStroke(g, C.lime, 1.8, p, { bloom: 12 });
    });
    sprite("shooter", 60, 60, g => {
      const p = () => { g.beginPath(); g.moveTo(0, -22); g.lineTo(20, -8); g.lineTo(18, 16); g.lineTo(0, 24); g.lineTo(-18, 16); g.lineTo(-20, -8); g.closePath(); };
      neonFill(g, C.orange, p, 0.16); neonStroke(g, C.orange, 2, p, { bloom: 12 });
      g.save(); g.fillStyle = C.yellow; g.shadowColor = C.yellow; g.shadowBlur = 12;
      g.beginPath(); g.arc(0, 6, 6, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("shellback", 70, 70, g => {
      const hex = r => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); };
      neonFill(g, C.violet, () => hex(26), 0.16); neonStroke(g, C.violet, 2.2, () => hex(26), { bloom: 12 });
      neonStroke(g, C.violet, 1.5, () => hex(14), { bloom: 8 });
    });
    sprite("splitter", 60, 50, g => {
      const left = () => { g.beginPath(); g.moveTo(-4, 0); g.lineTo(-22, -16); g.lineTo(-18, 16); g.closePath(); };
      const right = () => { g.beginPath(); g.moveTo(4, 0); g.lineTo(22, -16); g.lineTo(18, 16); g.closePath(); };
      neonFill(g, C.yellow, left, 0.18); neonFill(g, C.yellow, right, 0.18);
      neonStroke(g, C.yellow, 1.8, left, { bloom: 10 }); neonStroke(g, C.yellow, 1.8, right, { bloom: 10 });
    });
    sprite("needle", 40, 80, g => {
      const p = () => { g.beginPath(); g.moveTo(0, -36); g.lineTo(5, -4); g.lineTo(3, 28); g.lineTo(0, 22); g.lineTo(-3, 28); g.lineTo(-5, -4); g.closePath(); };
      neonFill(g, C.pink, p, 0.18); neonStroke(g, C.pink, 1.8, p, { bloom: 12 });
    });
    sprite("coil", 60, 60, g => {
      neonStroke(g, C.cyan, 2, () => { g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); }, { bloom: 12 });
      neonStroke(g, C.violet, 1.6, () => { g.beginPath(); g.arc(0, 0, 12, 0.4, Math.PI * 1.6); }, { bloom: 8 });
    });
    sprite("brood", 90, 70, g => {
      const p = () => { g.beginPath(); g.moveTo(0, -28); g.lineTo(36, -6); g.lineTo(40, 10); g.lineTo(22, 22); g.lineTo(0, 14); g.lineTo(-22, 22); g.lineTo(-40, 10); g.lineTo(-36, -6); g.closePath(); };
      neonFill(g, C.violet, p, 0.14); neonStroke(g, C.violet, 2.1, p, { bloom: 12 });
      neonStroke(g, C.magenta, 1.5, () => { g.beginPath(); g.rect(-22, -4, 16, 12); g.rect(6, -4, 16, 12); }, { bloom: 8 });
    });
    sprite("drone", 50, 50, g => {
      const body = () => { g.beginPath(); g.moveTo(0, -28); g.lineTo(18, 0); g.lineTo(0, 18); g.lineTo(-18, 0); g.closePath(); };
      neonFill(g, C.lime, body, 0.16); neonStroke(g, C.lime, 2, body, { bloom: 12 });
    });
  }

  function drawHarbinger(g, x, y, s, kind) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const col = kind === "herald" ? C.orange : (kind === "lattice" ? C.cyan : C.magenta);
    const leftWing = () => { g.beginPath(); g.moveTo(-40, -20); g.lineTo(-260, 10); g.lineTo(-300, 40); g.lineTo(-280, 90); g.lineTo(-200, 80); g.lineTo(-70, 50); g.closePath(); };
    const rightWing = () => { g.beginPath(); g.moveTo(40, -20); g.lineTo(260, 10); g.lineTo(300, 40); g.lineTo(280, 90); g.lineTo(200, 80); g.lineTo(70, 50); g.closePath(); };
    const body = () => { g.beginPath(); g.moveTo(0, -90); g.lineTo(48, -30); g.lineTo(56, 30); g.lineTo(30, 110); g.lineTo(0, 90); g.lineTo(-30, 110); g.lineTo(-56, 30); g.lineTo(-48, -30); g.closePath(); };
    if (kind === "herald") {
      neonFill(g, col, () => { g.beginPath(); g.ellipse(0, 10, 90, 40, 0, 0, Math.PI * 2); }, 0.16);
      neonStroke(g, col, 3, () => { g.beginPath(); g.ellipse(0, 16, 120, 36, 0, 0, Math.PI * 2); }, { bloom: 16 });
      neonStroke(g, C.yellow, 2, () => { g.beginPath(); g.ellipse(0, 0, 50, 50, 0, 0, Math.PI * 2); }, { bloom: 12 });
    } else if (kind === "twin") {
      for (const sx of [-70, 70]) {
        neonFill(g, C.violet, () => { g.beginPath(); g.arc(sx, 0, 50, 0, Math.PI * 2); }, 0.16);
        neonStroke(g, C.violet, 2.4, () => { g.beginPath(); g.arc(sx, 0, 50, 0, Math.PI * 2); }, { bloom: 14 });
        neonStroke(g, C.cyan, 2, () => { g.beginPath(); g.arc(sx, 0, 22, 0, Math.PI * 2); }, { bloom: 10 });
      }
      neonStroke(g, C.magenta, 2.2, () => { g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); }, { bloom: 10 });
    } else if (kind === "lattice") {
      neonStroke(g, C.cyan, 2.4, () => {
        g.beginPath(); g.rect(-160, -60, 320, 140);
        for (let i = 0; i < 5; i++) { g.moveTo(-160 + i * 80, -60); g.lineTo(-160 + i * 80, 80); }
        for (let j = 0; j < 3; j++) { g.moveTo(-160, -60 + j * 70); g.lineTo(160, -60 + j * 70); }
      }, { bloom: 14 });
      neonFill(g, C.cyan, () => { g.beginPath(); g.arc(0, 10, 24, 0, Math.PI * 2); }, 0.3);
    } else {
      neonFill(g, col, leftWing, 0.1); neonFill(g, col, rightWing, 0.1); neonFill(g, col, body, 0.12);
      neonStroke(g, col, 2.4, leftWing, { bloom: 14 }); neonStroke(g, col, 2.4, rightWing, { bloom: 14 }); neonStroke(g, col, 2.6, body, { bloom: 16 });
      const spikes = [-70, -42, -18, 0, 18, 42, 70], heights = [40, 70, 95, 130, 95, 70, 40];
      neonStroke(g, C.cyan, 2.2, () => { g.beginPath(); spikes.forEach((sx, i) => { g.moveTo(sx - 8, -70); g.lineTo(sx, -70 - heights[i]); g.lineTo(sx + 8, -70); }); }, { bloom: 12 });
      g.save(); g.globalAlpha = 0.35; g.fillStyle = C.magenta; g.shadowColor = C.magenta; g.shadowBlur = 28;
      g.beginPath(); g.arc(0, 8, 44, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.85; g.fillStyle = "#ffb0ee"; g.beginPath(); g.arc(0, 8, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 8, 7, 0, Math.PI * 2); g.fill(); g.restore();
      neonStroke(g, C.magenta, 2.4, () => { g.beginPath(); g.arc(0, 8, 36, 0, Math.PI * 2); }, { bloom: 14 });
      for (const tx of [-210, 210]) {
        neonStroke(g, C.cyan, 2, () => { g.beginPath(); g.ellipse(tx, 52, 28, 20, 0, 0, Math.PI * 2); }, { bloom: 10 });
      }
    }
    g.restore();
  }

  const stars = [];
  (function () {
    const rnd = makeRng(42);
    for (let i = 0; i < 180; i++) {
      stars.push({ x: rnd() * W, y: rnd() * 2600, r: rnd() < 0.12 ? 1.5 + rnd() * 1.3 : 0.6 + rnd() * 0.9, a: 0.35 + rnd() * 0.65, col: rnd() < 0.12 ? C.magenta : rnd() < 0.22 ? C.cyan : "#dcefff", tw: rnd() < 0.1 });
    }
  })();

  function drawStars(g) {
    for (const s of stars) {
      g.save(); g.globalAlpha = s.a; g.fillStyle = s.col;
      if (s.r > 1.4) { g.shadowColor = s.col; g.shadowBlur = 8; }
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      if (s.tw) {
        g.globalAlpha = s.a * 0.6; g.strokeStyle = s.col; g.lineWidth = 0.7; g.shadowBlur = 6;
        g.beginPath(); g.moveTo(s.x - s.r * 3, s.y); g.lineTo(s.x + s.r * 3, s.y);
        g.moveTo(s.x, s.y - s.r * 3); g.lineTo(s.x, s.y + s.r * 3); g.stroke();
      }
      g.restore();
    }
  }

  function drawGrid(g, horizon, bottom, vanishY, alpha) {
    const vpX = W / 2, vpY = vanishY, cols = 18, rows = 16;
    g.save();
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const y = horizon + Math.pow(t, 1.55) * (bottom - horizon);
      g.globalAlpha = alpha * (0.15 + t * 0.85);
      g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = i % 4 === 0 ? 8 : 0;
      g.lineWidth = i % 4 === 0 ? 1.8 : 1;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    for (let i = -cols; i <= cols; i++) {
      const xb = vpX + i * 90;
      g.globalAlpha = alpha * (0.25 + 0.75 * (1 - Math.min(1, Math.abs(i) / cols)));
      g.strokeStyle = i === 0 ? C.magenta : C.cyan;
      g.shadowColor = i === 0 ? C.magenta : "transparent";
      g.shadowBlur = i === 0 ? 12 : 0;
      g.lineWidth = i === 0 ? 2 : 1;
      g.beginPath(); g.moveTo(vpX, vpY); g.lineTo(xb, bottom); g.stroke();
    }
    g.globalAlpha = alpha * 1.1; g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 16; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, horizon); g.lineTo(W, horizon); g.stroke();
    g.restore();
  }

  function drawEngines(g, x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const flick = 0.85 + Math.sin(t * 30) * 0.15;
    for (const sx of [-11, 11]) {
      g.save(); g.globalAlpha = 0.55 * flick; g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 20;
      g.beginPath(); g.moveTo(sx - 6, 44); g.lineTo(sx + 6, 44); g.lineTo(sx + 1.5, 92); g.lineTo(sx - 1.5, 92); g.closePath(); g.fill();
      g.globalAlpha = 0.95 * flick; g.fillStyle = "#fff"; g.shadowBlur = 10;
      g.beginPath(); g.moveTo(sx - 2.4, 44); g.lineTo(sx + 2.4, 44); g.lineTo(sx + 0.7, 76); g.lineTo(sx - 0.7, 76); g.closePath(); g.fill();
      g.restore();
    }
    g.restore();
  }

  function drawShield(g, x, y, t, frac) {
    g.save(); g.translate(x, y);
    g.globalAlpha = 0.12 + 0.08 * frac;
    g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 24;
    g.beginPath(); g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.save(); g.translate(x, y);
    neonStroke(g, C.cyan, 2.2, () => { g.beginPath(); g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2); }, { bloom: 14 });
    g.restore();
  }

  let titleShots = [];
  function drawBackground(g, kind) {
    const grd = g.createRadialGradient(W / 2, 420, 40, W / 2, 800, 1200);
    if (kind === "over") { grd.addColorStop(0, "#14000c"); grd.addColorStop(0.45, "#050008"); grd.addColorStop(1, "#000"); }
    else { grd.addColorStop(0, "#0a0014"); grd.addColorStop(0.45, "#000008"); grd.addColorStop(1, "#000"); }
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    drawStars(g);
    if (kind === "title") drawGrid(g, 860, H, 620, 0.42);
    if (kind === "over") drawGrid(g, Math.min(1200, H - 720), H, Math.min(1036, H - 900), 0.3);
  }

  function render() {
    const g = ctx;
    g.setTransform(dprScale, 0, 0, dprScale, 0, 0);
    const kind = mode === "title" ? "title" : (mode === "over" ? "over" : "play");
    const sh = (run && run.shake) ? run.shake : 0;
    if (sh > 0) { g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh); }
    drawBackground(g, kind);

    if (mode === "title") {
      const t = performance.now() / 1000;
      blit(g, "player", SHIP_X, 1120, 1.25);
      drawEngines(g, SHIP_X, 1120, 1.25, t);
      if (titleShots.length === 0 || titleShots[titleShots.length - 1].y < 980) titleShots.push({ x: 540, y: 1040 });
      g.save(); g.globalCompositeOperation = "lighter";
      for (const s of titleShots) {
        s.y -= 6;
        g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 12; g.lineWidth = 3; g.lineCap = "round";
        g.beginPath(); g.moveTo(s.x, s.y + 10); g.lineTo(s.x, s.y - 10); g.stroke();
      }
      g.restore();
      titleShots = titleShots.filter(s => s.y > 580);
    } else if (mode === "over") {
      blit(g, "player", 900, 1310, 0.58);
    } else if (run) {
      const t = run.time;
      g.save();
      const haze = g.createLinearGradient(0, RAIL_Y - 210, 0, RAIL_Y);
      haze.addColorStop(0, "rgba(0,246,255,0)"); haze.addColorStop(1, "rgba(0,246,255,0.07)");
      g.fillStyle = haze; g.fillRect(0, RAIL_Y - 210, W, 220); g.restore();

      for (const e of run.enemies) {
        if (e.type === "boss") {
          const sc = e.bossKind === "harbinger" ? 1.05 : (e.bossKind === "lattice" ? 0.95 : 0.85);
          drawHarbinger(g, e.x, e.y, sc, e.bossKind);
        } else {
          blit(g, sprites[e.type] ? e.type : "spark", e.x, e.y, 1);
          if (e.shield > 0) {
            g.save(); g.strokeStyle = C.violet; g.shadowColor = C.violet; g.shadowBlur = 8; g.lineWidth = 2; g.globalAlpha = 0.7;
            g.beginPath(); g.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2); g.stroke(); g.restore();
          }
        }
      }

      for (const L of run.lasers) {
        const x0 = L.x0 != null ? L.x0 : L.x, y0 = L.y0;
        const x1 = L.x1 != null ? L.x1 : L.x, y1 = L.y1 != null ? L.y1 : 80;
        g.save();
        g.strokeStyle = C.lime; g.shadowColor = C.lime; g.shadowBlur = 18; g.lineWidth = 6; g.globalAlpha = 0.35 * (L.t / 0.18);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.globalAlpha = Math.max(0, L.t / 0.18); g.lineWidth = 2.2; g.strokeStyle = "#f5ffd8";
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.restore();
      }

      for (const b of run.bullets) {
        g.save();
        if (b.kind === "missile") {
          const a = Math.atan2(b.vy, b.vx);
          g.translate(b.x, b.y); g.rotate(a);
          g.strokeStyle = C.orange; g.shadowColor = C.orange; g.shadowBlur = 12; g.lineWidth = 3;
          g.beginPath(); g.moveTo(-16, 0); g.lineTo(-4, 0); g.stroke();
          g.fillStyle = C.orange;
          g.beginPath(); g.moveTo(10, 0); g.lineTo(-6, 4); g.lineTo(-6, -4); g.closePath(); g.fill();
        } else if (!b.friendly) {
          g.translate(b.x, b.y);
          g.fillStyle = b.color; g.shadowColor = b.color; g.shadowBlur = 10;
          g.beginPath(); g.moveTo(0, 8); g.lineTo(3.5, -4); g.lineTo(0, -2); g.lineTo(-3.5, -4); g.closePath(); g.fill();
        } else {
          const a = Math.atan2(b.vy, b.vx);
          g.translate(b.x, b.y); g.rotate(a);
          g.strokeStyle = b.color; g.shadowColor = b.color; g.shadowBlur = 12; g.lineWidth = 3; g.lineCap = "round";
          g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke();
          g.strokeStyle = "#fff"; g.lineWidth = 1.3; g.shadowBlur = 4;
          g.beginPath(); g.moveTo(-5, 0); g.lineTo(5, 0); g.stroke();
        }
        g.restore();
      }

      for (const p of run.pickups) {
        g.save(); g.translate(p.x, p.y);
        g.fillStyle = C.yellow; g.shadowColor = C.yellow; g.shadowBlur = 10;
        g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#fff4c2"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      for (const p of run.particles) {
        g.save(); g.globalAlpha = 1 - p.t / p.life;
        g.fillStyle = p.color; g.shadowColor = p.color; g.shadowBlur = 8;
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); g.restore();
      }

      if (!run.dead) {
        const st = playerStats(run);
        const drones = Math.min(2, run.up.drone);
        for (let i = 0; i < drones; i++) {
          const p = dronePos(i, t);
          blit(g, "drone", p.x, p.y, 0.85);
        }
        if (st.maxShield > 0 && run.shield > 0) drawShield(g, SHIP_X, SHIP_Y, t, run.shield / st.maxShield);
        const blink = run.invuln > 0 && Math.sin(t * 30) > 0;
        if (!blink) { blit(g, "player", SHIP_X, SHIP_Y, 1.05); drawEngines(g, SHIP_X, SHIP_Y, 1.05, t); }
      }

      g.font = "700 22px Orbitron, sans-serif"; g.textAlign = "center";
      for (const f of run.floaters) {
        g.save(); g.globalAlpha = 1 - f.t / f.life;
        g.fillStyle = f.color; g.shadowColor = f.color; g.shadowBlur = 8;
        g.fillText(f.text, f.x, f.y); g.restore();
      }
      if (run.flash > 0) {
        g.save();
        g.fillStyle = run.phase === "intro" ? "rgba(255,43,214,0.22)" : "rgba(255,80,80,0.18)";
        g.globalAlpha = Math.min(1, run.flash * 1.4);
        g.fillRect(0, 0, W, RAIL_Y);
        g.restore();
      }
    }
    if (sh > 0) g.restore();
  }

  const el = (id) => document.getElementById(id);

  function railTicks() {
    const rail = el("rail-ticks");
    rail.innerHTML = "";
    for (let i = 0; i < 11; i++) {
      const s = document.createElement("span");
      s.className = "tick"; s.style.left = (8 + i * 9.2) + "%";
      rail.appendChild(s);
    }
  }

  function buildUpgradeGrid() {
    const grid = el("up-grid");
    grid.innerHTML = "";
    UPGRADES.forEach(def => {
      const b = document.createElement("button");
      b.className = "up-btn"; b.dataset.id = def.id;
      b.innerHTML = '<div class="name"></div><div class="lvl"></div><div class="cost"></div>';
      b.addEventListener("click", () => onBuyMid(def.id));
      grid.appendChild(b);
    });
  }

  function pipsHtml(n, max) {
    let h = '<span class="pips">';
    for (let i = 0; i < max; i++) h += '<span class="pip' + (i < n ? " on" : "") + '"></span>';
    return h + "</span>";
  }

  function onBuyMid(id) {
    if (!run || mode !== "play" || paused) return;
    audio.unlock();
    if (tryBuy(run, id)) { audio.buy(); refreshConsole(); }
    else audio.deny();
  }

  function refreshConsole() {
    if (!run) return;
    const st = playerStats(run);
    const armed = [];
    if (run.up.spread) armed.push("SPREAD");
    if (run.up.laser) armed.push("LASER");
    if (run.up.missile) armed.push("MISSILES");
    if (run.up.drone) armed.push("DRONE");
    el("console-sub").textContent = armed.length ? "WEAPONS ONLINE" : "TRAINING FIRE  ·  SINGLE BLASTER";
    document.querySelectorAll("#up-grid .up-btn").forEach(btn => {
      const id = btn.dataset.id;
      const def = UPGRADES.find(u => u.id === id);
      const lv = run.up[id] || 0;
      const unlocked = isUnlocked(id, run.wave, run.up);
      const maxed = lv >= def.max;
      const cost = maxed ? 0 : midCost(id, lv);
      const can = unlocked && !maxed && run.coins >= cost;
      btn.querySelector(".name").textContent = def.name;
      btn.querySelector(".lvl").textContent = !unlocked ? "LOCKED" : (maxed ? "MAX" : "Lv. " + lv);
      btn.querySelector(".cost").textContent = !unlocked ? midCost(id, 0) + " ¢" : (maxed ? "—" : cost + " ¢");
      let cls = "up-btn";
      if (!unlocked) cls += " locked";
      else if (maxed) cls += " dim";
      else if (!can) cls += " dim";
      else if (id === "hp" && run.hp < st.maxHp * 0.5) cls += " hot";
      else if (id === "laser") cls += " hot";
      else if (id === "shield") cls += " mag";
      btn.className = cls;
    });
  }

  function refreshHud() {
    if (!run) return;
    const st = playerStats(run);
    el("hud-wave").textContent = String(run.wave).padStart(2, "0");
    el("hud-coins").textContent = Math.floor(run.coins).toLocaleString("en-US");
    el("hud-best").textContent = String(Math.max(save.bestWave, run.wave, run.bestWave || 0));
    const hpPct = Math.max(0, run.hp / st.maxHp * 100);
    el("hp-fill").style.width = hpPct + "%";
    el("hp-fill").className = "hp-fill" + (hpPct <= 35 ? " low" : "");
    el("hp-num").textContent = Math.max(0, Math.ceil(run.hp)) + "/" + st.maxHp;
    if (st.maxShield > 0) {
      el("shield-row").style.display = "flex";
      el("sh-fill").style.width = (run.shield / st.maxShield * 100) + "%";
      el("sh-num").textContent = Math.ceil(run.shield) + "/" + st.maxShield;
    } else el("shield-row").style.display = "none";
    const boss = run.enemies.find(e => e.type === "boss");
    if (boss) {
      el("boss-tag").classList.add("show");
      el("boss-hud").classList.add("show");
      el("boss-name").textContent = boss.name;
      const pct = Math.max(0, Math.round(boss.hp / boss.maxHp * 100));
      el("boss-fill").style.width = pct + "%";
      el("boss-hp").textContent = pct + "%";
    } else {
      el("boss-tag").classList.remove("show");
      el("boss-hud").classList.remove("show");
    }
    const wb = el("wave-banner"), bb = el("boss-banner");
    if (run.banner && run.banner.type === "wave") {
      wb.classList.add("show"); el("wave-banner-v").textContent = String(run.banner.n).padStart(2, "0");
      bb.classList.remove("show");
    } else if (run.banner && run.banner.type === "boss") {
      bb.classList.add("show"); el("boss-banner-v").textContent = run.banner.name;
      wb.classList.remove("show");
    } else { wb.classList.remove("show"); bb.classList.remove("show"); }
  }

  function buildTrees() {
    const host = el("trees");
    host.innerHTML = "";
    const groups = [
      { key: "atk", title: "ATTACK", cls: "atk" },
      { key: "def", title: "DEFENSE", cls: "def" },
      { key: "eco", title: "ECONOMY", cls: "eco" }
    ];
    groups.forEach(gr => {
      const col = document.createElement("div");
      col.className = "tree " + gr.cls;
      col.innerHTML = "<h3>" + gr.title + "</h3>";
      PERMA[gr.key].forEach(def => {
        const lv = save.perma[def.id] || 0;
        const maxed = lv >= def.max;
        const cost = maxed ? 0 : costOf(def, lv);
        const can = !maxed && save.gems >= cost;
        const row = document.createElement("div");
        row.className = "upg" + (maxed ? " maxed" : (can ? " buyable" : " costly"));
        row.dataset.id = def.id;
        const lvlLine = def.id === "slot" ? (lv + " / " + def.max)
          : (def.id === "wind" ? (lv ? "READY" : "LOCKED") : ("Lv. " + lv + " " + pipsHtml(lv, def.max)));
        row.innerHTML = '<div class="un">' + def.name + '</div><div class="ul">' + lvlLine + '</div><div class="uc">' + (maxed ? "MAX" : (cost + " ◆")) + "</div>";
        row.addEventListener("click", () => onBuyPerma(def.id));
        col.appendChild(row);
      });
      host.appendChild(col);
    });
  }

  function onBuyPerma(id) {
    audio.unlock();
    const before = save.gems;
    const g2 = tryBuyPerma(save.perma, save.gems, id);
    if (g2 === before) { audio.deny(); return; }
    save.gems = g2; audio.buy();
    if (!demo) writeSave(save);
    el("over-bank").textContent = String(save.gems);
    buildTrees();
  }

  function showTitle() {
    mode = "title"; paused = false;
    el("title").classList.remove("hidden");
    el("play-ui").classList.add("hidden");
    el("over").classList.remove("show");
    el("pause").classList.remove("show");
    el("title-best").textContent = String(save.bestWave);
  }

  function startRun() {
    audio.unlock();
    run = createRun(save.perma, { bestWave: save.bestWave, persist: !demo, seed: (Date.now() ^ 0x9e3779b9) >>> 0, mid: save.mid, carryCoins: save.carryCoins });
    mode = "play"; paused = false; speed = 1;
    el("btn-speed").textContent = "1x"; el("btn-speed").classList.remove("on");
    el("title").classList.add("hidden");
    el("over").classList.remove("show");
    el("pause").classList.remove("show");
    el("play-ui").classList.remove("hidden");
    beginWave(run, run.wave || 1);
    audio.banner();
    refreshHud(); refreshConsole();
  }

  function finishRun() {
    if (!run) return;
    settlePickups(run);
    const earned = gemsFor(run);
    const reached = run.wave;
    const carry = Math.floor(Math.max(0, run.coins) / 2);
    if (!demo) {
      save.gems += earned;
      save.mid = Object.assign(defaultMid(), run.up);
      save.carryCoins = carry;
      if (reached > save.bestWave) save.bestWave = reached;
      writeSave(save);
    }
    mode = "over"; paused = false;
    el("play-ui").classList.add("hidden");
    el("over").classList.add("show");
    el("over-wave").textContent = String(reached);
    el("over-earned").textContent = "+" + earned;
    el("over-bank").textContent = String(save.gems);
    el("over-best").textContent = String(Math.max(save.bestWave, reached));
    el("over-carry").textContent = "+" + carry + " coins carried (50%)";
    buildTrees();
  }

  function setPaused(p) {
    if (mode !== "play" || !run || run.dead) return;
    paused = p;
    el("pause").classList.toggle("show", p);
  }
  function toggleSpeed() {
    speed = speed === 1 ? 2 : 1;
    el("btn-speed").textContent = speed + "x";
    el("btn-speed").classList.toggle("on", speed === 2);
  }
  function toggleMute() {
    audio.unlock();
    audio.setMute(!audio.mute);
    save.mute = audio.mute;
    if (!demo) writeSave(save);
    el("btn-mute").classList.toggle("on", audio.mute);
    el("btn-mute").textContent = audio.mute ? "\u2715" : "\u266A";
  }

  el("btn-play").addEventListener("click", () => { audio.unlock(); startRun(); });
  el("btn-again").addEventListener("click", () => { audio.unlock(); startRun(); });
  el("btn-pause").addEventListener("click", () => setPaused(!paused));
  el("btn-resume").addEventListener("click", () => setPaused(false));
  el("btn-speed").addEventListener("click", toggleSpeed);
  el("btn-mute").addEventListener("click", toggleMute);

  window.addEventListener("keydown", ev => {
    if (ev.code === "Space" || ev.code === "KeyP") { ev.preventDefault(); if (mode === "play") setPaused(!paused); }
    if (ev.code === "KeyM") toggleMute();
    if (ev.code === "Digit2" || ev.code === "KeyF") toggleSpeed();
    if (ev.code === "Enter") {
      if (mode === "title" || mode === "over") startRun();
      else if (paused) setPaused(false);
    }
    if (ev.code === "Escape" && mode === "play") setPaused(!paused);
  });

  let lastCoins = 0, lastHp = 999, lastKills = 0, lastBanner = null;

  function tickSfx() {
    if (!run || mode !== "play") return;
    if (run.coins > lastCoins) audio.coin();
    if (run.hp < lastHp - 0.5) audio.hurt();
    if (run.kills > lastKills) audio.explode();
    if (run.banner && run.banner !== lastBanner) {
      if (run.banner.type === "boss") audio.boss(); else audio.banner();
    }
    lastCoins = run.coins; lastHp = run.hp; lastKills = run.kills; lastBanner = run.banner;
  }

  let lastT = 0, hudAcc = 0;
  function loop(ts) {
    if (!lastT) lastT = ts;
    let dt = (ts - lastT) / 1000;
    lastT = ts;
    if (dt > 0.05) dt = 0.05;
    if (mode === "play" && run && !paused) {
      for (let i = 0; i < speed; i++) {
        const wasAlive = !run.dead;
        updateRun(run, dt);
        if (wasAlive && run.dead) audio.death();
      }
      if (run.dead && run.dyingT <= 0) finishRun();
      tickSfx();
    }
    render();
    hudAcc += dt;
    if (hudAcc > 0.08 && mode === "play" && run) { hudAcc = 0; refreshHud(); refreshConsole(); }
    requestAnimationFrame(loop);
  }

  function applyDemo(name) {
    if (!name) return;
    save = defaultSave();
    save.bestWave = 47; save.gems = 260;
    if (name === "title") { showTitle(); return; }
    if (name === "over") {
      save.perma = { dmg: 3, rate: 2, crit: 1, slot: 0, hp: 4, shield: 1, armor: 2, wind: 0, startCoins: 3, coinValue: 2, gemBonus: 1, interest: 0 };
      run = createRun(save.perma, { bestWave: 47, persist: false, seed: 23 });
      run.wave = 23; run.kills = 80; run.bossesBeaten = 2; run.dead = true;
      mode = "over";
      el("title").classList.add("hidden");
      el("play-ui").classList.add("hidden");
      el("over").classList.add("show");
      el("over-wave").textContent = "23";
      el("over-earned").textContent = "+184";
      el("over-bank").textContent = "260";
      el("over-best").textContent = "47";
      el("over-carry").textContent = "+24 coins carried (50%)";
      buildTrees();
      return;
    }
    if (name === "aim") {
      startRun();
      run.wave = 0; beginWave(run, 5);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = { dmg: 3, rate: 2, hp: 1, shield: 0, spread: 1, laser: 0, missile: 1, drone: 0 };
      run.coins = 80;
      const st = playerStats(run); run.hp = st.maxHp;
      run.enemies = [];
      // Low-left threat is closest to the ship/rail; high-center should NOT steal aim.
      spawnEnemy(run, "shellback", { x: 130, y: SHIP_Y - 220 });
      spawnEnemy(run, "spark", { x: 70, y: SHIP_Y - 340 });
      spawnEnemy(run, "drifter", { x: 210, y: SHIP_Y - 430 });
      spawnEnemy(run, "spark", { x: 540, y: 240 });
      spawnEnemy(run, "spark", { x: 980, y: 360 });
      spawnEnemy(run, "coil", { x: 860, y: 520 });
      refreshHud(); refreshConsole();
      return;
    }
    startRun();
    if (name === "early") {
      run.wave = 0; beginWave(run, 3);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.coins = 48; run.up.dmg = 1; run.up.rate = 1; run.up.hp = 1;
      run.hp = Math.min(80, playerStats(run).maxHp); run.enemies = [];
      [["spark",330,310],["spark",780,270],["spark",200,470],["spark",900,430],["drifter",540,400],["drifter",820,560],["spark",470,220]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    if (name === "late") {
      run.wave = 0; beginWave(run, 37);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = { dmg: 8, rate: 7, hp: 5, shield: 3, spread: 4, laser: 3, missile: 2, drone: 2 };
      run.coins = 1240;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.85); run.shield = st.maxShield;
      run.enemies = [];
      [["spark",140,260],["spark",260,210],["spark",400,190],["spark",700,200],["spark",860,240],["spark",980,300],
       ["razor",200,380],["razor",880,360],["drifter",340,470],["drifter",760,450],["shellback",540,430],
       ["needle",120,560],["needle",960,540],["splitter",280,640],["splitter",800,620],["shooter",430,580],
       ["coil",660,560],["brood",540,720],["shellback",180,720],["coil",900,700],["shooter",320,820],["razor",740,800]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    if (name === "boss") {
      run.wave = 0; beginWave(run, 40);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = { dmg: 8, rate: 7, hp: 5, shield: 3, spread: 4, laser: 3, missile: 2, drone: 2 };
      run.coins = 980;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.55); run.shield = st.maxShield * 0.6;
      run.enemies = [];
      const b = spawnEnemy(run, "boss", { boss: bossInfo(40), x: 540, y: 560 });
      b.hp = Math.round(b.maxHp * 0.72);
      [["spark",160,480],["spark",920,500],["coil",150,880],["coil",930,860],["needle",80,600],["needle",1000,620]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    refreshHud(); refreshConsole();
  }

  function boot() {
    fit();
    buildSprites();
    railTicks();
    buildUpgradeGrid();
    el("btn-mute").classList.toggle("on", audio.mute);
    el("btn-mute").textContent = audio.mute ? "\u2715" : "\u266A";
    el("title-best").textContent = String(save.bestWave);
    if (demo) applyDemo(demo);
    else showTitle();
    window.addEventListener("resize", fit);
    requestAnimationFrame(loop);
    document.body.dataset.ready = "1";
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    setTimeout(() => { if (!document.body.dataset.ready) boot(); }, 1500);
  } else boot();

  LO.startRun = startRun;
  LO.showTitle = showTitle;
  LO.getRun = () => run;
  LO.getSave = () => save;
  root.LastOutpost = LO;
  if (typeof module !== "undefined") module.exports = LO;
})(typeof globalThis !== "undefined" ? globalThis : this);
