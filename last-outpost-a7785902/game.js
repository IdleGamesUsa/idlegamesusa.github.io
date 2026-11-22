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
  const MAX_PARTICLES = 90;
  const MAX_FLOATERS = 18;
  const MAX_PICKUPS = 48;
  const HIT_PAD = 7;
  const STEP = 1 / 60;

  const C = {
    cyan: "#00f6ff", magenta: "#ff2bd6", pink: "#ff4aa8", lime: "#c8ff00",
    yellow: "#ffe500", orange: "#ff7a00", violet: "#b14cff", red: "#ff3355",
    white: "#f4fbff", ice: "#eaffff"
  };

  const BAL = {
    baseDmg: 10, dmgPerLv: 6, baseInterval: 0.36, rateDecay: 0.885, minInterval: 0.09,
    baseHp: 100, hpPerBuy: 16, hpHealFrac: 0.42, permaDmg: 5, permaHp: 28,
    permaArmor: 0.04, permaCrit: 0.04, permaStartCoins: 35, permaCoinValue: 0.16,
    permaGemBonus: 0.14, permaShield: 20, interestPerWave: 8, gemPerWave: 10,
    gemKillDiv: 5, gemPerBoss: 28, countBase: 5, countPerWave: 1.12, countMax: 24,
    bulletSpd: 980, waveBreak: 1.55, bossIntro: 2.0, maxShieldBase: 50, shieldPerLv: 26,
    shieldRegenDelay: 3.0, shieldRegenPerSec: 10
  };

  const UPGRADES = [
    { id: "dmg",      name: "DAMAGE",     tab: "atk",  base: 25,  grow: 1.38, max: 40, unlock: 0 },
    { id: "rate",     name: "FIRE RATE",  tab: "atk",  base: 40,  grow: 1.40, max: 40, unlock: 0 },
    { id: "spread",   name: "SPREAD",     tab: "atk",  base: 55,  grow: 1.48, max: 12, unlock: 3 },
    { id: "crit",     name: "CRIT %",     tab: "atk",  base: 70,  grow: 1.42, max: 20, unlock: 4 },
    { id: "critDmg",  name: "CRIT DMG",   tab: "atk",  base: 80,  grow: 1.45, max: 20, unlock: 5 },
    { id: "pierce",   name: "PIERCE",     tab: "atk",  base: 90,  grow: 1.50, max: 12, unlock: 6 },
    { id: "multi",    name: "MULTISHOT",  tab: "atk",  base: 100, grow: 1.50, max: 10, unlock: 8 },
    { id: "bspd",     name: "BULLET SPD", tab: "atk",  base: 60,  grow: 1.40, max: 15, unlock: 2 },
    { id: "burn",     name: "BURN",       tab: "atk",  base: 110, grow: 1.48, max: 15, unlock: 10 },
    { id: "chain",    name: "CHAIN",      tab: "atk",  base: 140, grow: 1.50, max: 12, unlock: 14 },
    { id: "laser",    name: "LASER",      tab: "atk",  base: 200, grow: 1.50, max: 15, unlock: 6 },
    { id: "missile",  name: "MISSILES",   tab: "atk",  base: 250, grow: 1.50, max: 15, unlock: 8 },
    { id: "hp",       name: "HEALTH",     tab: "def",  base: 30,  grow: 1.36, max: 40, unlock: 0 },
    { id: "shield",   name: "SHIELD",     tab: "def",  base: 80,  grow: 1.45, max: 20, unlock: 4 },
    { id: "shRegen",  name: "SH. REGEN",  tab: "def",  base: 90,  grow: 1.42, max: 15, unlock: 6 },
    { id: "armor",    name: "ARMOR",      tab: "def",  base: 70,  grow: 1.45, max: 15, unlock: 5 },
    { id: "regen",    name: "REGEN",      tab: "def",  base: 85,  grow: 1.42, max: 15, unlock: 7 },
    { id: "thorns",   name: "THORNS",     tab: "def",  base: 95,  grow: 1.45, max: 12, unlock: 9 },
    { id: "knock",    name: "KNOCKBACK",  tab: "def",  base: 75,  grow: 1.42, max: 12, unlock: 8 },
    { id: "freeze",   name: "FREEZE",     tab: "def",  base: 120, grow: 1.48, max: 12, unlock: 12 },
    { id: "drone",    name: "DRONE",      tab: "util", base: 180, grow: 1.48, max: 15, unlock: 7 },
    { id: "dcount",   name: "DRONE #",    tab: "util", base: 220, grow: 1.50, max: 6,  unlock: 10 },
    { id: "dmgDrone", name: "DRONE DMG",  tab: "util", base: 150, grow: 1.45, max: 20, unlock: 9 },
    { id: "laserW",   name: "LASER W",    tab: "util", base: 130, grow: 1.45, max: 12, unlock: 8 },
    { id: "mcount",   name: "MISSILE #",  tab: "util", base: 200, grow: 1.50, max: 8,  unlock: 11 },
    { id: "ricochet", name: "RICOCHET",   tab: "util", base: 160, grow: 1.50, max: 8,  unlock: 13 },
    { id: "magnet",   name: "MAGNET",     tab: "util", base: 50,  grow: 1.38, max: 15, unlock: 2 },
    { id: "coinVal",  name: "COIN VALUE", tab: "util", base: 60,  grow: 1.40, max: 20, unlock: 3 },
    { id: "interest", name: "INTEREST",   tab: "util", base: 90,  grow: 1.42, max: 15, unlock: 5 },
    { id: "skip",     name: "WAVE SKIP",  tab: "util", base: 150, grow: 1.50, max: 10, unlock: 12 },
    { id: "orbit",    name: "ORBITAL",    tab: "util", base: 400, grow: 1.55, max: 12, unlock: 25, milestone: 25 },
    { id: "emp",      name: "EMP PULSE",  tab: "util", base: 700, grow: 1.55, max: 10, unlock: 50, milestone: 50 }
  ];
  const UP_BY_ID = {};
  for (let i = 0; i < UPGRADES.length; i++) UP_BY_ID[UPGRADES[i].id] = UPGRADES[i];

  const TABS = [
    { id: "atk", label: "ATTACK" },
    { id: "def", label: "DEFENSE" },
    { id: "util", label: "UTILITY" }
  ];

  const PERMA = {
    atk: [
      { id: "dmg", name: "Starting Damage", max: 20, base: 35, grow: 1.42 },
      { id: "rate", name: "Starting Fire Rate", max: 20, base: 35, grow: 1.42 },
      { id: "crit", name: "Crit Chance", max: 15, base: 50, grow: 1.48 },
      { id: "critDmg", name: "Crit Damage", max: 15, base: 55, grow: 1.48 },
      { id: "pierce", name: "Starting Pierce", max: 8, base: 80, grow: 1.52 },
      { id: "multi", name: "Starting Multishot", max: 6, base: 90, grow: 1.55 },
      { id: "slot", name: "Weapon Slot", max: 4, base: 120, grow: 1.65 }
    ],
    def: [
      { id: "hp", name: "Max Health", max: 20, base: 40, grow: 1.42 },
      { id: "shield", name: "Shield Strength", max: 15, base: 60, grow: 1.48 },
      { id: "armor", name: "Armor", max: 12, base: 45, grow: 1.48 },
      { id: "regen", name: "Hull Regen", max: 12, base: 55, grow: 1.48 },
      { id: "shRegen", name: "Shield Regen", max: 12, base: 60, grow: 1.48 },
      { id: "thorns", name: "Thorns", max: 10, base: 70, grow: 1.5 },
      { id: "wind", name: "Second Wind", max: 1, base: 200, grow: 1 }
    ],
    eco: [
      { id: "startCoins", name: "Starting Coins", max: 20, base: 28, grow: 1.42 },
      { id: "coinValue", name: "Coin Value", max: 15, base: 40, grow: 1.45 },
      { id: "gemBonus", name: "Gem Bonus", max: 12, base: 80, grow: 1.52 },
      { id: "interest", name: "Interest", max: 12, base: 90, grow: 1.48 },
      { id: "magnet", name: "Coin Magnet", max: 10, base: 40, grow: 1.42 },
      { id: "skip", name: "Wave Skip", max: 8, base: 110, grow: 1.52 }
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
    return { name, kind, hp: Math.floor(src.hp * Math.pow(1.28, extra)), r: src.r, coins: Math.floor(src.coins * (1 + extra * 0.4)) };
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
    return {
      dmg: 0, rate: 0, crit: 0, critDmg: 0, pierce: 0, multi: 0, slot: 0,
      hp: 0, shield: 0, armor: 0, regen: 0, shRegen: 0, thorns: 0, wind: 0,
      startCoins: 0, coinValue: 0, gemBonus: 0, interest: 0, magnet: 0, skip: 0
    };
  }
  function defaultMid() {
    return {
      dmg: 0, rate: 0, spread: 0, crit: 0, critDmg: 0, pierce: 0, multi: 0, bspd: 0, burn: 0, chain: 0, laser: 0, missile: 0,
      hp: 0, shield: 0, shRegen: 0, armor: 0, regen: 0, thorns: 0, knock: 0, freeze: 0,
      drone: 0, dcount: 0, dmgDrone: 0, laserW: 0, mcount: 0, ricochet: 0,
      magnet: 0, coinVal: 0, interest: 0, skip: 0, orbit: 0, emp: 0
    };
  }
  function defaultSave() {
    return { bestWave: 0, gems: 0, perma: defaultPerma(), mid: defaultMid(), carryCoins: 0, mute: false, ver: 3 };
  }

  function migrateSave(s) {
    const d = defaultSave();
    if (!s || typeof s !== "object") return d;
    d.bestWave = s.bestWave | 0;
    d.gems = s.gems | 0;
    d.mute = !!s.mute;
    d.carryCoins = Math.max(0, s.carryCoins | 0);
    d.perma = Object.assign(defaultPerma(), s.perma || {});
    d.mid = Object.assign(defaultMid(), s.mid || {});
    d.ver = 3;
    return d;
  }

  function loadSave() {
    if (typeof localStorage === "undefined") return defaultSave();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSave();
      return migrateSave(JSON.parse(raw));
    } catch (e) { return defaultSave(); }
  }
  function writeSave(save) {
    if (typeof localStorage === "undefined") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  function costOf(def, level) { return Math.floor(def.base * Math.pow(def.grow, level)); }
  function midCost(id, level) { return costOf(UP_BY_ID[id], level); }

  function isUnlocked(id, wave, up, bestWave) {
    const def = UP_BY_ID[id];
    if (!def) return false;
    if ((up[id] || 0) > 0) return true;
    const best = bestWave || 0;
    if (def.milestone && wave < def.milestone && best < def.milestone) return false;
    if (wave >= def.unlock) return true;
    if (id === "spread" && (up.dmg + up.rate) >= 3) return true;
    if (id === "shield" && up.hp >= 1) return true;
    if (id === "laser" && up.spread >= 1) return true;
    if (id === "missile" && (up.laser >= 1 || up.spread >= 2)) return true;
    if (id === "drone" && up.spread >= 1) return true;
    if (id === "shRegen" && up.shield >= 1) return true;
    if (id === "laserW" && up.laser >= 1) return true;
    if (id === "mcount" && up.missile >= 1) return true;
    if (id === "dcount" && up.drone >= 1) return true;
    if (id === "dmgDrone" && up.drone >= 1) return true;
    return false;
  }

  function hpScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.pow(1.16, Math.min(n, 6))
      * Math.pow(1.205, Math.max(0, Math.min(n, 22) - 6))
      * Math.pow(1.13, Math.max(0, Math.min(n, 40) - 22))
      * Math.pow(1.095, Math.max(0, Math.min(n, 70) - 40))
      * Math.pow(1.11, Math.max(0, n - 70));
  }
  function spdScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.min(2.35, Math.pow(1.032, Math.min(n, 6)) * Math.pow(1.03, Math.max(0, n - 6)));
  }
  function dmgScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.pow(1.10, Math.min(n, 8)) * Math.pow(1.08, Math.max(0, Math.min(n, 40) - 8)) * Math.pow(1.10, Math.max(0, n - 40));
  }

  function playerStats(run) {
    const p = run.perma, u = run.up;
    let st = run._st;
    if (!st) st = run._st = {};
    st.dmg = BAL.baseDmg + BAL.dmgPerLv * (u.dmg + p.dmg);
    st.interval = Math.max(BAL.minInterval, BAL.baseInterval * Math.pow(BAL.rateDecay, u.rate + p.rate));
    st.maxHp = BAL.baseHp + BAL.hpPerBuy * u.hp + BAL.permaHp * p.hp;
    st.armor = Math.min(0.6, p.armor * BAL.permaArmor + u.armor * 0.035);
    st.crit = Math.min(0.7, p.crit * BAL.permaCrit + u.crit * 0.035);
    st.critMul = 2 + u.critDmg * 0.22 + (p.critDmg || 0) * 0.18;
    st.coinMul = 1 + p.coinValue * BAL.permaCoinValue + u.coinVal * 0.10;
    st.gemMul = 1 + p.gemBonus * BAL.permaGemBonus;
    st.bulletSpd = BAL.bulletSpd * (1 + 0.10 * u.bspd);
    st.pierce = (u.pierce || 0) + (p.pierce || 0);
    st.multi = (u.multi || 0) + (p.multi || 0);
    st.regen = (u.regen || 0) * 2.2 + (p.regen || 0) * 2.0;
    st.thorns = (u.thorns || 0) * 0.14 + (p.thorns || 0) * 0.12;
    st.knock = (u.knock || 0) * 18;
    st.chill = Math.min(0.55, (u.freeze || 0) * 0.06);
    st.burn = (u.burn || 0) * 0.22;
    st.chain = u.chain || 0;
    st.ricochet = u.ricochet || 0;
    st.magnet = 0 + u.magnet * 70 + (p.magnet || 0) * 55;
    st.laserW = 12 + (u.laserW || 0) * 5;
    st.mcount = 1 + (u.mcount || 0);
    st.drones = Math.min(6, (u.drone > 0 ? 1 : 0) + (u.dcount || 0));
    st.droneDmg = 0.55 + (u.dmgDrone || 0) * 0.18;
    st.shRegen = BAL.shieldRegenPerSec + (u.shRegen || 0) * 6 + (p.shRegen || 0) * 5;
    let maxShield = 0;
    if (u.shield > 0) maxShield += BAL.maxShieldBase + BAL.shieldPerLv * (u.shield - 1);
    if (p.shield > 0) maxShield += BAL.permaShield * p.shield;
    st.maxShield = maxShield;
    st.orbits = u.orbit || 0;
    st.emp = u.emp || 0;
    st.skip = (u.skip || 0) + (p.skip || 0);
    return st;
  }

  const pool = { bullets: [], particles: [], floaters: [], pickups: [], lasers: [] };
  function take(name) { return pool[name].length ? pool[name].pop() : {}; }
  function give(name, obj) {
    for (const k in obj) obj[k] = undefined;
    pool[name].push(obj);
  }
  function popAt(arr, i) {
    const o = arr[i];
    const last = arr.pop();
    if (i < arr.length) arr[i] = last;
    return o;
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
      fireCd: 0, missileCd: 0, laserCd: 0, droneFire: [0, 0, 0, 0, 0, 0],
      empCd: 0, orbitT: 0, hullAng: -Math.PI / 2, aimAng: -Math.PI / 2,
      shake: 0, flash: 0, banner: null,
      rng: makeRng(opts.seed || (Date.now() & 0x7fffffff)),
      bestWave: opts.bestWave || 0,
      persist: opts.persist !== false
    };
    if (run.perma.slot >= 1) run.up.spread = Math.max(run.up.spread, 1);
    if (run.perma.slot >= 2) run.up.laser = Math.max(run.up.laser, 1);
    if (run.perma.slot >= 3) run.up.missile = Math.max(run.up.missile, 1);
    if (run.perma.slot >= 4) run.up.drone = Math.max(run.up.drone, 1);
    const st = playerStats(run);
    run.hp = st.maxHp;
    run.shield = st.maxShield;
    run.coins = (opts.carryCoins || 0) + run.perma.startCoins * BAL.permaStartCoins;
    return run;
  }

  function settlePickups(run) {
    if (!run || !run.pickups) return;
    for (let i = 0; i < run.pickups.length; i++) run.coins += run.pickups[i].v || 0;
    while (run.pickups.length) give("pickups", run.pickups.pop());
  }

  function beginWave(run, n) {
    run.wave = n; run.waveTime = 0; run.pending = []; run.spawnCd = 0;
    const st = playerStats(run);
    if (n > 1) {
      const interestLv = (run.perma.interest || 0) + (run.up.interest || 0);
      if (interestLv > 0) run.coins += BAL.interestPerWave * interestLv;
    }
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
    const poolE = ["spark", "drifter"];
    if (n >= 3) poolE.push("razor");
    if (n >= 6) poolE.push("shooter");
    if (n >= 7) poolE.push("shellback");
    if (n >= 9) poolE.push("splitter");
    if (n >= 12) poolE.push("needle");
    if (n >= 15) poolE.push("coil");
    if (n >= 18) poolE.push("brood");
    const weights = poolE.map((t) => t === "spark" || t === "drifter" ? 3 : (t === "brood" || t === "shellback" ? 0.8 : 1.4));
    const wsum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < count; i++) {
      let r = run.rng() * wsum, pick = poolE[0];
      for (let k = 0; k < poolE.length; k++) { r -= weights[k]; if (r <= 0) { pick = poolE[k]; break; } }
      run.pending.push({ type: pick, delay: 0.12 + i * (n < 5 ? 0.32 : 0.22) });
    }
    const skipN = Math.min(run.pending.length - 1, playerStats(run).skip | 0);
    if (skipN > 0 && n % 10 !== 0) {
      let granted = 0;
      for (let s = 0; s < skipN; s++) {
        const p = run.pending.shift();
        if (!p) break;
        const def = ENEMY[p.type];
        if (def) granted += Math.max(1, Math.round(def.coins * playerStats(run).coinMul));
      }
      run.coins += granted;
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
        vx: 0, vy: 0, shield: 0, phase: rnd() * 6, burn: 0, burnDps: 0, chill: 0, stun: 0,
        hitCd: 0
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
      orbit: rnd() * 6.28, vx: 0, vy: 0, burn: 0, burnDps: 0, chill: 0, stun: 0, hitCd: 0
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
    const b = take("bullets");
    b.x = e.x; b.y = e.y + e.r; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    b.r = 6; b.dmg = e.shotDmg || 7; b.friendly = false; b.color = e.color || C.magenta;
    b.life = 3; b.kind = "enemy"; b.crit = false; b.pierce = 0; b.bounces = 0; b.target = null; b.turn = 0;
    run.bullets.push(b);
  }

  function threatScore(e, fromX, fromY) {
    const dx = e.x - fromX, dy = e.y - fromY;
    return Math.sqrt(dx * dx + dy * dy) - 0.2 * Math.max(0, e.y);
  }

  function closestEnemy(run, fromX, fromY, ignore) {
    let best = null, bestS = 1e15;
    for (let i = 0; i < run.enemies.length; i++) {
      const e = run.enemies[i];
      if (e === ignore || e.y < -40 || e.hp <= 0) continue;
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
    if (list.length > n) list.length = n;
    return list;
  }

  function distToSegment(px, py, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - x0) * dx + (py - y0) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
  }

  function leadPoint(fromX, fromY, e, projSpd) {
    const vx = e.vx || 0, vy = e.vy || 0;
    const dx = e.x - fromX, dy = e.y - fromY;
    const a = vx * vx + vy * vy - projSpd * projSpd;
    const b = 2 * (dx * vx + dy * vy);
    const c = dx * dx + dy * dy;
    let t = -1;
    if (Math.abs(a) < 1e-4) {
      t = (Math.abs(b) < 1e-4) ? -1 : -c / b;
    } else {
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
        t = (t1 > 0.02 && t2 > 0.02) ? Math.min(t1, t2) : (t1 > 0.02 ? t1 : t2);
      }
    }
    if (!(t > 0) || t > 1.8) return { x: e.x, y: e.y, ang: Math.atan2(dy, dx) };
    const ix = e.x + vx * t, iy = e.y + vy * t;
    return { x: ix, y: iy, ang: Math.atan2(iy - fromY, ix - fromX) };
  }

  function muzzle(run) {
    const a = run.hullAng != null ? run.hullAng : -Math.PI / 2;
    return { x: SHIP_X + Math.cos(a) * 78, y: SHIP_Y + Math.sin(a) * 78 };
  }

  function aimAngle(run, fromX, fromY, spd) {
    const best = closestEnemy(run, SHIP_X, SHIP_Y);
    if (!best) return -Math.PI / 2;
    return leadPoint(fromX, fromY, best, spd).ang;
  }

  function fireBlaster(run, st) {
    const m = muzzle(run);
    const ang = aimAngle(run, m.x, m.y, st.bulletSpd);
    run.aimAng = ang;
    const spreadWays = run.up.spread <= 0 ? 1 : (run.up.spread === 1 ? 3 : (run.up.spread < 4 ? 5 : 7));
    const extra = st.multi || 0;
    const ways = Math.min(9, spreadWays + extra);
    const spreadW = ways === 1 ? 0 : (ways <= 3 ? 0.18 : (ways <= 5 ? 0.14 : 0.11));
    const start = -((ways - 1) / 2);
    const mid = (ways - 1) / 2;
    for (let i = 0; i < ways; i++) {
      const a = ang + (start + i) * spreadW;
      const crit = run.rng() < st.crit;
      const dmg = st.dmg * (crit ? st.critMul : 1) * (ways > 1 && i !== mid ? 0.85 : 1);
      const b = take("bullets");
      b.x = m.x + Math.cos(a) * 8; b.y = m.y + Math.sin(a) * 8;
      b.vx = Math.cos(a) * st.bulletSpd; b.vy = Math.sin(a) * st.bulletSpd;
      b.r = crit ? 7 : 5; b.dmg = dmg; b.friendly = true; b.color = crit ? C.white : C.cyan;
      b.life = 1.85; b.crit = crit; b.kind = "blast"; b.target = null; b.turn = 0;
      b.pierce = st.pierce; b.bounces = st.ricochet; b.hitSet = 0;
      run.bullets.push(b);
    }
  }

  function fireMissile(run, st) {
    const n = Math.max(1, st.mcount | 0);
    const m = muzzle(run);
    const targets = closestEnemies(run, SHIP_X, SHIP_Y, n);
    for (let i = 0; i < n; i++) {
      const target = targets[i] || targets[0];
      const ang = target ? leadPoint(m.x, m.y, target, 420).ang : -Math.PI / 2;
      const b = take("bullets");
      const off = (i - (n - 1) / 2) * 18;
      b.x = m.x + Math.cos(ang + Math.PI / 2) * off;
      b.y = m.y + Math.sin(ang + Math.PI / 2) * off;
      b.vx = Math.cos(ang) * 340; b.vy = Math.sin(ang) * 340;
      b.r = 8; b.dmg = st.dmg * (2.4 + 0.5 * run.up.missile); b.friendly = true;
      b.color = C.orange; b.life = 2.6; b.kind = "missile"; b.crit = false;
      b.target = target; b.turn = 7; b.pierce = 0; b.bounces = 0;
      run.bullets.push(b);
    }
  }

  function fireLaser(run, st) {
    const beams = run.up.laser >= 2 ? 2 : 1;
    const targets = closestEnemies(run, SHIP_X, SHIP_Y, beams);
    const m = muzzle(run);
    for (let i = 0; i < beams; i++) {
      const e = targets[i] || targets[0];
      const x0 = m.x + (beams === 2 ? (i === 0 ? -24 : 24) : 0);
      const y0 = m.y;
      let tx = e ? e.x : SHIP_X, ty = e ? e.y : 80;
      if (e) { const lp = leadPoint(x0, y0, e, 2200); tx = lp.x; ty = lp.y; }
      const d = Math.hypot(tx - x0, ty - y0) || 1;
      const L = take("lasers");
      L.x0 = x0; L.y0 = y0; L.x1 = x0 + (tx - x0) / d * 1700; L.y1 = y0 + (ty - y0) / d * 1700;
      L.t = 0.18; L.dmg = st.dmg * (1.1 + 0.35 * run.up.laser); L.tick = 0; L.w = st.laserW;
      run.lasers.push(L);
    }
  }

  function fireDrone(run, st, x, y) {
    const e = closestEnemy(run, SHIP_X, SHIP_Y);
    const spd = st.bulletSpd * 0.88;
    const ang = e ? leadPoint(x, y, e, spd).ang : -Math.PI / 2;
    const b = take("bullets");
    b.x = x; b.y = y; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    b.r = 4; b.dmg = st.dmg * st.droneDmg; b.friendly = true; b.color = C.lime;
    b.life = 1.3; b.kind = "drone"; b.crit = false; b.target = e; b.turn = 0;
    b.pierce = Math.min(1, st.pierce); b.bounces = 0;
    run.bullets.push(b);
  }

  function dronePos(i, t, n) {
    const total = Math.max(1, n || 2);
    const side = (i % 2 === 0) ? -1 : 1;
    const row = Math.floor(i / 2);
    return { x: SHIP_X + side * (190 + row * 40), y: SHIP_Y - 30 - row * 50 + Math.sin(t * 3 + i) * 8 };
  }


  function burst(run, x, y, color, n) {
    if (run.particles.length >= MAX_PARTICLES) return;
    const count = Math.min(n, MAX_PARTICLES - run.particles.length, 12);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + run.rng() * 0.4;
      const s = 80 + run.rng() * 260;
      const p = take("particles");
      p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.life = 0.28 + run.rng() * 0.28; p.t = 0; p.color = color; p.r = 2 + run.rng() * 3;
      run.particles.push(p);
    }
  }
  function floater(run, x, y, text, color, kind) {
    if (run.floaters.length >= MAX_FLOATERS) {
      give("floaters", popAt(run.floaters, 0));
    }
    const f = take("floaters");
    f.x = x; f.y = y; f.text = text; f.color = color; f.kind = kind || "dmg"; f.t = 0; f.life = 0.55; f.vy = -60;
    run.floaters.push(f);
  }

  function hurt(run, dmg, src) {
    if (run.dead || run.invuln > 0) return;
    const st = playerStats(run);
    dmg = dmg * (1 - st.armor);
    if (run.shield > 0) {
      const used = Math.min(run.shield, dmg);
      run.shield -= used; dmg -= used; run.shieldWait = BAL.shieldRegenDelay;
    }
    if (dmg <= 0) { run.shake = Math.max(run.shake, 6); return; }
    run.hp -= dmg; run.invuln = 0.55; run.shake = 14; run.flash = 0.18;
    if (src && st.thorns > 0 && src.hp > 0) {
      hitEnemy(run, src, dmg * st.thorns, false, true);
    }
    if (run.hp <= 0) {
      if (run.perma.wind && !run.usedWind) {
        run.usedWind = true;
        run.hp = Math.max(1, Math.floor(st.maxHp * 0.2));
        run.invuln = 1.6; run.flash = 0.5;
      } else {
        run.hp = 0; run.dead = true; run.dyingT = 1.15;
        burst(run, SHIP_X, SHIP_Y, C.cyan, 16);
      }
    }
  }

  function killEnemy(run, e, giveCoins) {
    const st = playerStats(run);
    const idx = run.enemies.indexOf(e);
    if (idx >= 0) run.enemies.splice(idx, 1);
    run.kills++;
    if (e.type === "boss") run.bossesBeaten++;
    burst(run, e.x, e.y, e.color || C.orange, e.type === "boss" ? 16 : 8);
    if (giveCoins !== false) {
      spawnCoin(run, e.x, e.y, Math.max(1, Math.round(e.coins * st.coinMul)));
    }
    if (e.split && e.type === "splitter") {
      spawnEnemy(run, "spark", { x: e.x - 18, y: e.y });
      spawnEnemy(run, "spark", { x: e.x + 18, y: e.y });
    }
  }

  function spawnCoin(run, x, y, v) {
    if (run.pickups.length >= MAX_PICKUPS) {
      const old = popAt(run.pickups, 0);
      run.coins += old.v || 0;
      give("pickups", old);
    }
    const p = take("pickups");
    p.x = x; p.y = y; p.v = v; p.t = 0; p.wait = 0.12; p.vx = (run.rng() - 0.5) * 80; p.vy = -80;
    run.pickups.push(p);
  }

  function applyOnHit(run, e, dmg, crit, st) {
    if (st.burn > 0) { e.burn = Math.max(e.burn, 1.6 + run.up.burn * 0.15); e.burnDps = st.dmg * st.burn; }
    if (st.chill > 0) e.chill = Math.max(e.chill, 0.7);
    if (st.knock > 0 && e.type !== "boss") e.y -= st.knock * 0.35;
    if (st.chain > 0) {
      const hops = Math.min(4, 1 + (st.chain / 3 | 0));
      let from = e, carry = dmg * (0.40 + 0.04 * st.chain);
      for (let h = 0; h < hops; h++) {
        const nxt = closestEnemy(run, from.x, from.y, from);
        if (!nxt || Math.hypot(nxt.x - from.x, nxt.y - from.y) > 220 + st.chain * 8) break;
        hitEnemy(run, nxt, carry, false, true);
        carry *= 0.7;
        from = nxt;
      }
    }
  }

  function hitEnemy(run, e, dmg, crit, noProc) {
    if (!e || e.hp <= 0) return;
    if (e.shield > 0) {
      const used = Math.min(e.shield, dmg);
      e.shield -= used; dmg -= used;
    }
    if (dmg > 0) e.hp -= dmg;
    floater(run, e.x + (run.rng() - 0.5) * 20, e.y - e.r, String(Math.round(Math.max(1, dmg))), crit ? C.white : C.yellow, "dmg");
    if (!noProc && e.hp > 0) applyOnHit(run, e, dmg, crit, playerStats(run));
    if (e.hp <= 0) killEnemy(run, e, true);
  }

  function gemsFor(run) {
    const st = playerStats(run);
    const raw = BAL.gemPerWave * run.wave + Math.floor(run.kills / BAL.gemKillDiv) + BAL.gemPerBoss * run.bossesBeaten;
    return Math.max(1, Math.round(raw * st.gemMul));
  }

  function updatePickups(run, dt) {
    const st = playerStats(run);
    const tx = 980, ty = 58;
    const wait = Math.max(0.04, 0.12 - (run.up.magnet || 0) * 0.012);
    for (let i = run.pickups.length - 1; i >= 0; i--) {
      const p = run.pickups[i];
      p.t += dt;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
      const startFly = p.t >= wait || d < 80 + st.magnet;
      if (!startFly && p.t < 1.2) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
        continue;
      }
      const spd = 1200 + p.t * 700;
      const step = spd * dt;
      if (d <= Math.max(30, step + 4) || p.t >= 1.2) {
        run.coins += p.v || 0;
        floater(run, tx, ty + 18, "+" + (p.v || 0), C.yellow, "coin");
        give("pickups", popAt(run.pickups, i));
        continue;
      }
      p.x += dx / d * step;
      p.y += dy / d * step;
    }
  }

  function retargetMissile(run, b) {
    const closest = closestEnemy(run, SHIP_X, SHIP_Y);
    let tgt = b.target && run.enemies.indexOf(b.target) >= 0 && b.target.hp > 0 ? b.target : null;
    if (!tgt) { tgt = closest; b.target = tgt; }
    else if (closest && closest !== tgt) {
      if (threatScore(closest, SHIP_X, SHIP_Y) + 8 < threatScore(tgt, SHIP_X, SHIP_Y)) {
        tgt = closest; b.target = tgt;
      }
    }
    return tgt;
  }

  function bounceBullet(run, b, e) {
    if (!b.bounces) return false;
    const nxt = closestEnemy(run, b.x, b.y, e);
    if (!nxt) return false;
    b.bounces--;
    const spd = Math.hypot(b.vx, b.vy) || BAL.bulletSpd;
    const ang = Math.atan2(nxt.y - b.y, nxt.x - b.x);
    b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    b.life = Math.max(b.life, 0.5);
    return true;
  }

  function updateRun(run, dt) {
    if (dt > 0.05) dt = 0.05;
    if (run.dead) {
      run.dyingT -= dt; run.time += dt;
      updatePickups(run, dt);
      updateFx(run, dt);
      return;
    }
    run.time += dt; run.waveTime += dt;
    if (run.invuln > 0) run.invuln -= dt;
    if (run.shake > 0) run.shake = Math.max(0, run.shake - dt * 28);
    if (run.flash > 0) run.flash = Math.max(0, run.flash - dt);
    const st = playerStats(run);

    if (st.regen > 0 && run.hp < st.maxHp) run.hp = Math.min(st.maxHp, run.hp + st.regen * dt);
    if (st.maxShield > 0) {
      if (run.shieldWait > 0) run.shieldWait -= dt;
      else if (run.shield < st.maxShield) run.shield = Math.min(st.maxShield, run.shield + st.shRegen * dt);
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
      let write = 0;
      for (let i = 0; i < run.pending.length; i++) {
        const p = run.pending[i];
        if (p.delay <= 0) spawnEnemy(run, p.type, p);
        else run.pending[write++] = p;
      }
      run.pending.length = write;
      if (run.pending.length === 0 && run.enemies.length === 0 && run.waveTime > 0.6) beginWave(run, run.wave + 1);
    }

    const want = aimAngle(run, SHIP_X, SHIP_Y - 78, st.bulletSpd);
    run.aimAng = want;
    const midA = -Math.PI / 2, maxDev = 0.5;
    let targetHull = want;
    if (targetHull < midA - maxDev) targetHull = midA - maxDev;
    if (targetHull > midA + maxDev) targetHull = midA + maxDev;
    let da = targetHull - (run.hullAng || midA);
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    run.hullAng = (run.hullAng || midA) + da * Math.min(1, 10 * dt);

    run.fireCd -= dt;
    if (run.fireCd <= 0) { fireBlaster(run, st); run.fireCd = st.interval; }
    if (run.up.missile > 0) {
      run.missileCd -= dt;
      if (run.missileCd <= 0 && run.enemies.length) { fireMissile(run, st); run.missileCd = 1.35 * Math.pow(0.9, Math.min(8, run.up.missile - 1)); }
    }
    if (run.up.laser > 0) {
      run.laserCd -= dt;
      if (run.laserCd <= 0 && run.enemies.length) { fireLaser(run, st); run.laserCd = 1.25 * Math.pow(0.9, Math.min(8, run.up.laser - 1)); }
    }
    const drones = st.drones;
    for (let i = 0; i < drones; i++) {
      run.droneFire[i] = (run.droneFire[i] || 0) - dt;
      if (run.droneFire[i] <= 0 && run.enemies.length) {
        const p = dronePos(i, run.time, drones);
        fireDrone(run, st, p.x, p.y);
        run.droneFire[i] = st.interval * 1.15;
      }
    }

    if (st.emp > 0) {
      run.empCd = (run.empCd || 0) - dt;
      if (run.empCd <= 0 && run.enemies.length) {
        run.empCd = Math.max(1.4, 3.2 - st.emp * 0.12);
        const rad = 200 + st.emp * 28;
        run.flash = Math.max(run.flash, 0.2);
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if (Math.hypot(e.x - SHIP_X, e.y - SHIP_Y) < rad) {
            hitEnemy(run, e, st.dmg * (1.1 + 0.25 * st.emp), false);
            if (e.hp > 0) e.stun = Math.max(e.stun || 0, 0.35 + st.emp * 0.05);
          }
        }
      }
    }

    if (st.orbits > 0 && run.enemies.length) {
      run.orbitT = (run.orbitT || 0) + dt;
      const n = 2 + Math.min(4, st.orbits >> 1);
      const rad = 130 + st.orbits * 6;
      for (let i = 0; i < n; i++) {
        const a = run.orbitT * 2.4 + i * (Math.PI * 2 / n);
        const ox = SHIP_X + Math.cos(a) * rad;
        const oy = SHIP_Y + Math.sin(a) * rad * 0.7;
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if ((e.hitCd || 0) > 0) continue;
          if (Math.hypot(e.x - ox, e.y - oy) < e.r + 16) {
            hitEnemy(run, e, st.dmg * (0.55 + 0.12 * st.orbits), false);
            e.hitCd = 0.18;
          }
        }
      }
    }

    for (let i = run.lasers.length - 1; i >= 0; i--) {
      const L = run.lasers[i];
      L.t -= dt; L.tick -= dt;
      if (L.tick <= 0) {
        L.tick = 0.05;
        const pad = (L.w || 12);
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if (!e || e.hp <= 0) continue;
          if (distToSegment(e.x, e.y, L.x0, L.y0, L.x1, L.y1) < e.r + pad) hitEnemy(run, e, L.dmg * 0.35, false);
        }
      }
      if (L.t <= 0) give("lasers", popAt(run.lasers, i));
    }

    for (let i = run.bullets.length - 1; i >= 0; i--) {
      const b = run.bullets[i];
      if (b.kind === "missile") {
        const tgt = retargetMissile(run, b);
        if (tgt) {
          const lp = leadPoint(b.x, b.y, tgt, Math.hypot(b.vx, b.vy) + 80);
          const wantA = lp.ang;
          let have = Math.atan2(b.vy, b.vx);
          let diff = wantA - have;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          have += Math.max(-b.turn * dt, Math.min(b.turn * dt, diff));
          const spd = Math.hypot(b.vx, b.vy) + 80 * dt;
          b.vx = Math.cos(have) * spd; b.vy = Math.sin(have) * spd;
        }
      }
      const x0 = b.x, y0 = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > RAIL_Y + 60) {
        give("bullets", popAt(run.bullets, i)); continue;
      }
      if (b.friendly) {
        let hit = false;
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if (!e || e.hp <= 0) continue;
          if (distToSegment(e.x, e.y, x0, y0, b.x, b.y) < e.r + b.r + HIT_PAD) {
            hitEnemy(run, e, b.dmg, b.crit);
            hit = true;
            if (b.pierce && b.pierce > 0) { b.pierce--; continue; }
            if (bounceBullet(run, b, e)) break;
            give("bullets", popAt(run.bullets, i));
            break;
          }
        }
        if (hit && !run.bullets[i]) continue;
      } else if (distToSegment(SHIP_X, SHIP_Y, x0, y0, b.x, b.y) < ((st.maxShield > 0 && run.shield > 0) ? 95 : 36) + b.r) {
        hurt(run, b.dmg);
        give("bullets", popAt(run.bullets, i));
      }
    }

    for (let i = run.enemies.length - 1; i >= 0; i--) {
      const e = run.enemies[i];
      if (!e) continue;
      if (e.hitCd > 0) e.hitCd -= dt;
      if (e.burn > 0) {
        e.burn -= dt;
        e.hp -= e.burnDps * dt;
        if (e.hp <= 0) { killEnemy(run, e, true); continue; }
      }
      if (e.chill > 0) e.chill -= dt;
      if (e.stun > 0) e.stun -= dt;
      if (run.enemies.indexOf(e) < 0) continue;
      stepEnemy(run, e, dt);
      if (run.dead) break;
    }

    updatePickups(run, dt);
    updateFx(run, dt);
  }

  function stepEnemy(run, e, dt) {
    const lx = e.x, ly = e.y;
    const slow = (e.stun > 0) ? 0.15 : (e.chill > 0 ? (1 - Math.min(0.55, playerStats(run).chill || 0.25)) : 1);
    const sdt = dt * slow;
    if (e.type === "boss") stepBoss(run, e, sdt);
    else {
      switch (e.type) {
        case "spark":
          e.x += Math.sin(e.phase + run.time * 3.2) * 28 * sdt; e.y += e.spd * sdt; break;
        case "drifter":
          e.x += Math.sin(run.time * 0.9 + e.phase) * 18 * sdt; e.y += e.spd * sdt; break;
        case "razor":
          e.phaseT += sdt;
          if (e.dashing) { e.y += e.spd * 1.7 * sdt; e.dashT -= sdt; if (e.dashT <= 0) e.dashing = false; }
          else {
            e.x += Math.sin(run.time * 4.2 + e.phase) * 90 * sdt; e.y += e.spd * 0.65 * sdt;
            if (e.phaseT > e.dashEvery) { e.dashing = true; e.dashT = 0.28; e.phaseT = 0; }
          }
          break;
        case "shooter":
          e.y += e.spd * sdt; e.x += Math.sin(run.time * 1.2 + e.phase) * 22 * sdt;
          e.fireCd -= sdt;
          if (e.y > 80 && e.fireCd <= 0) { shootEnemyAtPlayer(run, e); e.fireCd = e.fireEvery; }
          break;
        case "shellback":
          e.y += e.spd * sdt; e.x += Math.sin(run.time * 0.7 + e.phase) * 12 * sdt; break;
        case "splitter":
          e.y += e.spd * sdt; e.x += Math.sin(run.time * 1.6 + e.phase) * 30 * sdt; break;
        case "needle":
          e.y += e.spd * sdt; e.x += Math.sin(run.time * 5 + e.phase) * 16 * sdt; break;
        case "coil":
          e.orbit += sdt * 1.4;
          e.x = e.cx + Math.sin(e.orbit) * 70; e.y += e.spd * 0.85 * sdt; break;
        case "brood":
          e.y += e.spd * sdt;
          e.spawnCd -= sdt;
          if (e.spawnCd <= 0 && run.enemies.length < BAL.countMax + 6) {
            spawnEnemy(run, "spark", { x: e.x, y: e.y + 10 });
            e.spawnCd = ENEMY.brood.spawn;
          }
          break;
        default:
          e.y += e.spd * sdt;
      }
    }
    e.vx = (e.x - lx) / Math.max(dt, 1e-4);
    e.vy = (e.y - ly) / Math.max(dt, 1e-4);
    finishEnemyStep(run, e, dt);
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
        const b = take("bullets");
        b.x = e.x; b.y = e.y + 30; b.vx = Math.cos(a) * 260; b.vy = Math.sin(a) * 260;
        b.r = 7; b.dmg = 9 * dmgScale(run.wave); b.friendly = false; b.color = C.magenta;
        b.life = 4; b.kind = "enemy"; b.crit = false; b.pierce = 0; b.bounces = 0; b.target = null; b.turn = 0;
        run.bullets.push(b);
      }
      if (e.bossKind === "harbinger" || e.bossKind === "lattice" || e.bossKind === "eclipse") {
        for (let s = 0; s < 2; s++) {
          const sx = s === 0 ? -180 : 180;
          const b = take("bullets");
          b.x = e.x + sx * (e.r / 110); b.y = e.y + 40; b.vx = 0; b.vy = 300;
          b.r = 6; b.dmg = 10 * dmgScale(run.wave); b.friendly = false; b.color = C.pink;
          b.life = 4; b.kind = "enemy"; b.crit = false; b.pierce = 0; b.bounces = 0; b.target = null; b.turn = 0;
          run.bullets.push(b);
        }
      }
      e.fireCd = e.fireEvery;
    }
  }

  function finishEnemyStep(run, e, dt) {
    e.x = Math.max(40, Math.min(W - 40, e.x));
    const hitShip = Math.hypot(e.x - SHIP_X, e.y - SHIP_Y) < e.r + 42;
    const hitRail = e.y + e.r >= RAIL_Y;
    if (hitShip || hitRail) {
      hurt(run, e.dmg, e);
      if (e.type === "boss") e.y = Math.min(e.y, RAIL_Y - e.r - 8);
      else {
        burst(run, e.x, e.y, e.color, 8);
        const idx = run.enemies.indexOf(e);
        if (idx >= 0) run.enemies.splice(idx, 1);
      }
    }
  }

  // patch: call finishEnemyStep at end of stepEnemy (rail/ship already handled there — replace)
  // We keep a hook used from stepEnemy below via wrapping after the file concat: see stepEnemy end.

  function updateFx(run, dt) {
    for (let i = run.particles.length - 1; i >= 0; i--) {
      const p = run.particles[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98;
      if (p.t >= p.life) give("particles", popAt(run.particles, i));
    }
    for (let i = run.floaters.length - 1; i >= 0; i--) {
      const f = run.floaters[i];
      f.t += dt; f.y += f.vy * dt;
      if (f.t >= f.life) give("floaters", popAt(run.floaters, i));
    }
  }

  function tryBuy(run, id) {
    if (run.dead) return false;
    const def = UP_BY_ID[id];
    if (!def) return false;
    if (!isUnlocked(id, run.wave, run.up, run.bestWave)) return false;
    const lv = run.up[id] || 0;
    if (lv >= def.max) return false;
    const cost = midCost(id, lv);
    if (run.coins < cost) return false;
    run.coins -= cost;
    run.up[id] = lv + 1;
    run._st = null;
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
    if (hpFrac < 0.35) order.push("hp", "regen", "shield");
    if ((run.up.rate || 0) < (run.up.dmg || 0)) order.push("rate", "dmg"); else order.push("dmg", "rate");
    order.push("spread", "bspd", "magnet", "coinVal");
    if (hpFrac < 0.6) order.push("hp", "armor", "shield");
    order.push("pierce", "multi", "crit", "critDmg", "burn");
    order.push("drone", "laser", "missile", "interest");
    order.push("shRegen", "regen", "knock", "freeze", "thorns");
    order.push("dcount", "dmgDrone", "laserW", "mcount", "chain", "ricochet");
    order.push("skip", "orbit", "emp", "hp");
    for (let i = 0; i < order.length; i++) { if (tryBuy(run, order[i])) return true; }
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
    const order = ["dmg", "hp", "startCoins", "rate", "coinValue", "armor", "shield", "crit", "critDmg", "regen", "interest", "magnet", "pierce", "shRegen", "multi", "slot", "gemBonus", "thorns", "skip", "wind"];
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < order.length; i++) {
        const before = gems;
        gems = tryBuyPerma(perma, gems, order[i]);
        if (gems !== before) { changed = true; break; }
      }
    }
    return gems;
  }

  function simulateUntilDeath(run, opts) {
    opts = opts || {};
    const dt = opts.dt || 1 / 30;
    const maxT = opts.maxTime || 60 * 24;
    let t = 0;
    while (!run.dead && t < maxT && run.wave < 250) {
      if (opts.autoBuy) { for (let k = 0; k < 6; k++) if (!autoBuyMid(run)) break; }
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
    BAL, UPGRADES, PERMA, ENEMY, TABS,
    createRun, updateRun, tryBuy, tryBuyPerma, autoBuyMid, autoBuyPerma,
    playerStats, gemsFor, simulateUntilDeath, simulateRuns, beginWave, spawnEnemy,
    defaultPerma, defaultMid, defaultSave, loadSave, writeSave, migrateSave, midCost, costOf, isUnlocked,
    bossInfo, settlePickups, W, get H() { return H; }, get RAIL_Y() { return RAIL_Y; }, SHIP_X,
    get SHIP_Y() { return SHIP_Y; }, C
  };

  if (typeof document === "undefined") {
    root.LastOutpost = LO;
    if (typeof module !== "undefined") module.exports = LO;
    return;
  }


  const stage = document.getElementById("stage");
  const frame = document.getElementById("frame");
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  let dprScale = 1;
  let save = loadSave();
  let mode = "title";
  let paused = false;
  let speed = 1;
  let run = null;
  let demo = null;
  let consoleTab = "atk";
  let hudDirty = true;
  let consoleDirty = true;
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
    setMute(v) {
      this.mute = v;
      if (this.master) this.master.gain.value = v ? 0 : 0.18;
    },
    tone(freq, dur, type, vol, slide) {
      if (!this.ctx || this.mute) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      if (slide) o.frequency.linearRampToValueAtTime(slide, this.ctx.currentTime + dur);
      g.gain.value = vol || 0.08;
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master); o.start(); o.stop(this.ctx.currentTime + dur + 0.02);
    },
    coin() { this.tone(880, 0.06, "square", 0.05, 1320); },
    explode() { this.tone(180, 0.12, "sawtooth", 0.08, 60); },
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
    // Backing store tracks the *displayed* size, not 1080 * devicePixelRatio.
    const cap = 1.5;
    dprScale = Math.min((window.devicePixelRatio || 1), cap) * scale;
    dprScale = Math.max(0.5, Math.min(2, dprScale));
    canvas.width = Math.round(W * dprScale);
    canvas.height = Math.round(H * dprScale);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    bgCache = { play: null, title: null, over: null, h: -1 };
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
  const glows = {};
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
  function makeGlow(key, color, r, bloom) {
    const size = Math.ceil((r + bloom) * 2);
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(size / 2, size / 2, r * 0.15, size / 2, size / 2, r + bloom);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(0.18, color);
    grd.addColorStop(0.45, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(size / 2, size / 2, r + bloom, 0, Math.PI * 2); g.fill();
    c._ox = size / 2; c._oy = size / 2;
    glows[key] = c;
    return c;
  }
  function blitGlow(g, key, x, y, s) {
    const im = glows[key];
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
    sprite("engine", 40, 70, g => {
      g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(2, 48); g.lineTo(-2, 48); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.lineTo(1, 32); g.lineTo(-1, 32); g.closePath(); g.fill();
    });
    sprite("shield", 280, 240, g => {
      g.globalAlpha = 0.16; g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 24;
      g.beginPath(); g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      neonStroke(g, C.cyan, 2.2, () => { g.beginPath(); g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2); }, { bloom: 14 });
    });
    ["herald", "twin", "lattice", "harbinger", "eclipse"].forEach(kind => {
      sprite("boss-" + kind, 700, 420, g => { drawHarbinger(g, 0, 0, 1, kind === "eclipse" ? "harbinger" : kind); });
    });
    makeGlow("bolt", C.cyan, 5, 14);
    makeGlow("boltW", C.white, 6, 14);
    makeGlow("boltO", C.orange, 7, 16);
    makeGlow("boltL", C.lime, 4, 12);
    makeGlow("boltM", C.magenta, 6, 12);
    makeGlow("boltP", C.pink, 6, 12);
    makeGlow("coin", C.yellow, 9, 16);
    makeGlow("spark", C.cyan, 3, 10);
    makeGlow("orb", C.violet, 10, 16);
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
    for (let i = 0; i < 140; i++) {
      stars.push({ x: rnd() * W, y: rnd() * 2600, r: rnd() < 0.12 ? 1.5 + rnd() * 1.3 : 0.6 + rnd() * 0.9, a: 0.35 + rnd() * 0.65, col: rnd() < 0.12 ? C.magenta : rnd() < 0.22 ? C.cyan : "#dcefff", tw: rnd() < 0.1 });
    }
  })();

  function drawStars(g) {
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      g.globalAlpha = s.a; g.fillStyle = s.col;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      if (s.tw) {
        g.globalAlpha = s.a * 0.55; g.strokeStyle = s.col; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(s.x - s.r * 3, s.y); g.lineTo(s.x + s.r * 3, s.y);
        g.moveTo(s.x, s.y - s.r * 3); g.lineTo(s.x, s.y + s.r * 3); g.stroke();
      }
    }
    g.globalAlpha = 1;
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

  let bgCache = { play: null, title: null, over: null, h: -1 };
  function ensureBg(kind) {
    if (bgCache.h === H && bgCache[kind]) return bgCache[kind];
    if (bgCache.h !== H) { bgCache = { play: null, title: null, over: null, h: H }; }
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(W / 2, 420, 40, W / 2, 800, 1200);
    if (kind === "over") { grd.addColorStop(0, "#14000c"); grd.addColorStop(0.45, "#050008"); grd.addColorStop(1, "#000"); }
    else { grd.addColorStop(0, "#0a0014"); grd.addColorStop(0.45, "#000008"); grd.addColorStop(1, "#000"); }
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    drawStars(g);
    if (kind === "title") drawGrid(g, 860, H, 620, 0.42);
    else if (kind === "over") drawGrid(g, Math.min(1200, H - 720), H, Math.min(1036, H - 900), 0.3);
    else {
      const haze = g.createLinearGradient(0, RAIL_Y - 210, 0, RAIL_Y);
      haze.addColorStop(0, "rgba(0,246,255,0)"); haze.addColorStop(1, "rgba(0,246,255,0.07)");
      g.fillStyle = haze; g.fillRect(0, RAIL_Y - 210, W, 220);
    }
    bgCache[kind] = c;
    return c;
  }

  let titleShots = [];
  function render() {
    const g = ctx;
    g.setTransform(dprScale, 0, 0, dprScale, 0, 0);
    const kind = mode === "title" ? "title" : (mode === "over" ? "over" : "play");
    const sh = (run && run.shake) ? run.shake : 0;
    if (sh > 0) { g.save(); g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh); }
    g.drawImage(ensureBg(kind), 0, 0);

    if (mode === "title") {
      const t = performance.now() / 1000;
      blit(g, "player", SHIP_X, 1120, 1.25);
      blit(g, "engine", SHIP_X - 11, 1120 + 44, 1.1);
      blit(g, "engine", SHIP_X + 11, 1120 + 44, 1.1);
      if (titleShots.length === 0 || titleShots[titleShots.length - 1].y < 980) titleShots.push({ x: 540, y: 1040 });
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < titleShots.length; i++) {
        titleShots[i].y -= 6;
        blitGlow(g, "bolt", titleShots[i].x, titleShots[i].y, 1);
      }
      g.restore();
      if (titleShots.length && titleShots[0].y <= 580) titleShots.shift();
    } else if (mode === "over") {
      blit(g, "player", 900, Math.min(H - 200, 1310), 0.58);
    } else if (run) {
      const t = run.time;
      const st = playerStats(run);

      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (e.type === "boss") {
          const sc = e.bossKind === "harbinger" || e.bossKind === "eclipse" ? 1.05 : (e.bossKind === "lattice" ? 0.95 : 0.85);
          const key = "boss-" + (e.bossKind === "eclipse" ? "harbinger" : e.bossKind);
          blit(g, key, e.x, e.y, sc);
        } else {
          blit(g, e.type, e.x, e.y, 1);
          if (e.shield > 0) {
            g.save(); g.globalCompositeOperation = "lighter"; blitGlow(g, "orb", e.x, e.y, 0.7); g.restore();
          }
          if (e.burn > 0) { g.save(); g.globalCompositeOperation = "lighter"; blitGlow(g, "boltO", e.x, e.y, 0.8); g.restore(); }
        }
      }

      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < run.lasers.length; i++) {
        const L = run.lasers[i];
        const a = Math.max(0, L.t / 0.18);
        g.strokeStyle = C.lime; g.globalAlpha = 0.35 * a; g.lineWidth = (L.w || 12) * 0.5;
        g.beginPath(); g.moveTo(L.x0, L.y0); g.lineTo(L.x1, L.y1); g.stroke();
        g.globalAlpha = a; g.lineWidth = 2.2; g.strokeStyle = "#f5ffd8";
        g.beginPath(); g.moveTo(L.x0, L.y0); g.lineTo(L.x1, L.y1); g.stroke();
      }
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        const key = b.kind === "missile" ? "boltO" : (b.kind === "drone" ? "boltL" : (b.friendly ? (b.crit ? "boltW" : "bolt") : (b.color === C.pink ? "boltP" : "boltM")));
        if (b.kind === "missile" || !b.friendly) {
          blitGlow(g, key, b.x, b.y, 1);
        } else {
          const a = Math.atan2(b.vy, b.vx);
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          blitGlow(g, key, 0, 0, 1);
          g.restore();
        }
      }
      for (let i = 0; i < run.pickups.length; i++) blitGlow(g, "coin", run.pickups[i].x, run.pickups[i].y, 1);
      for (let i = 0; i < run.particles.length; i++) {
        const p = run.particles[i];
        g.globalAlpha = Math.max(0, 1 - p.t / p.life);
        blitGlow(g, "spark", p.x, p.y, 0.7);
      }
      g.globalAlpha = 1;
      if (st.orbits > 0) {
        const n = 2 + Math.min(4, st.orbits >> 1);
        const rad = 130 + st.orbits * 6;
        for (let i = 0; i < n; i++) {
          const a = (run.orbitT || 0) * 2.4 + i * (Math.PI * 2 / n);
          blitGlow(g, "orb", SHIP_X + Math.cos(a) * rad, SHIP_Y + Math.sin(a) * rad * 0.7, 0.85);
        }
      }
      g.restore();

      const drones = st.drones;
      for (let i = 0; i < drones; i++) {
        const p = dronePos(i, t, drones);
        blit(g, "drone", p.x, p.y, 0.85);
      }
      if (st.maxShield > 0 && run.shield > 0) {
        g.save(); g.globalAlpha = 0.55 + 0.45 * (run.shield / st.maxShield);
        blit(g, "shield", SHIP_X, SHIP_Y, 1);
        g.restore();
      }
      const blink = run.invuln > 0 && Math.sin(t * 30) > 0;
      if (!blink) {
        g.save();
        g.translate(SHIP_X, SHIP_Y);
        g.rotate((run.hullAng || -Math.PI / 2) + Math.PI / 2);
        blit(g, "player", 0, 0, 1.05);
        blit(g, "engine", -11, 44, 1);
        blit(g, "engine", 11, 44, 1);
        g.restore();
      }

      g.font = "700 22px Orbitron, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      for (let i = 0; i < run.floaters.length; i++) {
        const f = run.floaters[i];
        g.globalAlpha = 1 - f.t / f.life;
        g.fillStyle = f.color;
        g.fillText(f.text, f.x, f.y);
      }
      g.globalAlpha = 1;
      if (run.flash > 0) {
        g.fillStyle = run.phase === "intro" ? "rgba(255,43,214,0.22)" : "rgba(255,80,80,0.18)";
        g.globalAlpha = Math.min(1, run.flash * 1.4);
        g.fillRect(0, 0, W, RAIL_Y);
        g.globalAlpha = 1;
      }
    }
    if (sh > 0) g.restore();
  }


  const el = (id) => document.getElementById(id);

  function railTicks() {
    const rail = el("rail-ticks");
    if (!rail) return;
    rail.innerHTML = "";
    for (let i = 0; i < 11; i++) {
      const s = document.createElement("span");
      s.className = "tick"; s.style.left = (8 + i * 9.2) + "%";
      rail.appendChild(s);
    }
  }

  function setTab(tab) {
    consoleTab = tab;
    document.querySelectorAll(".up-tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    document.querySelectorAll("#up-grid .up-btn").forEach(b => {
      b.style.display = b.dataset.tab === tab ? "" : "none";
    });
    consoleDirty = true;
    refreshConsole(true);
  }

  function buildUpgradeGrid() {
    const grid = el("up-grid");
    grid.innerHTML = "";
    UPGRADES.forEach(def => {
      const b = document.createElement("button");
      b.className = "up-btn"; b.dataset.id = def.id; b.dataset.tab = def.tab;
      b.innerHTML = '<div class="name"></div><div class="lvl"></div><div class="cost"></div>';
      b.addEventListener("click", () => onBuyMid(def.id));
      if (def.tab !== consoleTab) b.style.display = "none";
      grid.appendChild(b);
    });
    document.querySelectorAll(".up-tab").forEach(btn => {
      btn.onclick = () => setTab(btn.dataset.tab);
    });
  }

  function onBuyMid(id) {
    if (!run || mode !== "play" || paused) return;
    audio.unlock();
    if (tryBuy(run, id)) { audio.buy(); consoleDirty = true; hudDirty = true; refreshConsole(true); refreshHud(true); }
    else audio.deny();
  }

  let lastConsoleKey = "";
  function refreshConsole(force) {
    if (!run) return;
    const st = playerStats(run);
    const key = consoleTab + "|" + (run.wave|0) + "|" + (run.coins|0) + "|" + JSON.stringify(run.up);
    if (!force && !consoleDirty && key === lastConsoleKey) return;
    lastConsoleKey = key; consoleDirty = false;
    const armed = [];
    if (run.up.spread) armed.push("SPREAD");
    if (run.up.laser) armed.push("LASER");
    if (run.up.missile) armed.push("MISSILES");
    if (run.up.drone) armed.push("DRONE");
    if (run.up.orbit) armed.push("ORBITAL");
    if (run.up.emp) armed.push("EMP");
    const sub = el("console-sub");
    if (sub) sub.textContent = armed.length ? "WEAPONS ONLINE" : "TRAINING FIRE  ·  SINGLE BLASTER";
    const buttons = document.querySelectorAll("#up-grid .up-btn");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const id = btn.dataset.id;
      const def = UP_BY_ID[id];
      const lv = run.up[id] || 0;
      const unlocked = isUnlocked(id, run.wave, run.up, Math.max(run.bestWave || 0, save.bestWave || 0));
      const maxed = lv >= def.max;
      const cost = maxed ? 0 : midCost(id, lv);
      const can = unlocked && !maxed && run.coins >= cost;
      const nameEl = btn.querySelector(".name"), lvlEl = btn.querySelector(".lvl"), costEl = btn.querySelector(".cost");
      if (nameEl.textContent !== def.name) nameEl.textContent = def.name;
      const lvlTxt = !unlocked ? (def.milestone ? "W" + def.milestone : "LOCKED") : (maxed ? "MAX" : "Lv. " + lv);
      if (lvlEl.textContent !== lvlTxt) lvlEl.textContent = lvlTxt;
      const costTxt = !unlocked ? midCost(id, 0) + " ¢" : (maxed ? "—" : cost + " ¢");
      if (costEl.textContent !== costTxt) costEl.textContent = costTxt;
      let cls = "up-btn";
      if (!unlocked) cls += " locked";
      else if (maxed || !can) cls += " dim";
      else if (id === "hp" && run.hp < st.maxHp * 0.5) cls += " hot";
      else if (id === "laser" || id === "orbit" || id === "emp") cls += " hot";
      else if (id === "shield") cls += " mag";
      if (btn.className !== cls) btn.className = cls;
    }
  }

  let lastHudKey = "";
  function refreshHud(force) {
    if (!run) return;
    const st = playerStats(run);
    const boss = findBoss(run);
    const key = (run.wave|0) + "|" + (run.coins|0) + "|" + (run.hp|0) + "|" + (run.shield|0) + "|" + (boss ? (boss.hp|0) : "x") + "|" + (run.banner ? run.banner.type + (run.banner.n || run.banner.name) : "");
    if (!force && !hudDirty && key === lastHudKey) return;
    lastHudKey = key; hudDirty = false;
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

  function findBoss(run) {
    for (let i = 0; i < run.enemies.length; i++) if (run.enemies[i].type === "boss") return run.enemies[i];
    return null;
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
      const h = document.createElement("h3"); h.textContent = gr.title; col.appendChild(h);
      PERMA[gr.key].forEach(def => {
        const lv = save.perma[def.id] || 0;
        const maxed = lv >= def.max;
        const cost = maxed ? 0 : costOf(def, lv);
        const row = document.createElement("div");
        const can = !maxed && save.gems >= cost;
        row.className = "upg" + (maxed ? " maxed" : (can ? " buyable" : " costly"));
        const pipMax = Math.min(def.max, 8);
        const pips = def.max <= 8 ? pipsHtml(lv, pipMax) : "";
        row.innerHTML = '<div class="un">' + def.name + '</div><div class="ul">Lv ' + lv + (maxed ? " MAX" : "") + pips + '</div><div class="uc">' + (maxed ? "MAX" : cost + " ◆") + '</div>';
        row.addEventListener("click", () => onBuyPerma(def.id));
        col.appendChild(row);
      });
      host.appendChild(col);
    });
  }

  function pipsHtml(n, max) {
    let h = '<span class="pips">';
    for (let i = 0; i < max; i++) h += '<span class="pip' + (i < n ? " on" : "") + '"></span>';
    return h + "</span>";
  }

  function onBuyPerma(id) {
    audio.unlock();
    const before = save.gems;
    save.gems = tryBuyPerma(save.perma, save.gems, id);
    if (save.gems !== before) {
      audio.buy();
      if (!demo) writeSave(save);
      el("over-bank").textContent = String(save.gems);
      buildTrees();
    } else audio.deny();
  }

  function showTitle() {
    mode = "title"; paused = false;
    el("title").classList.remove("hidden");
    el("over").classList.remove("show");
    el("play-ui").classList.add("hidden");
    el("pause").classList.remove("show");
    el("title-best").textContent = String(save.bestWave);
  }

  function startRun() {
    audio.unlock();
    if (run) settlePickups(run);
    run = createRun(save.perma, { bestWave: save.bestWave, persist: !demo, seed: (Date.now() ^ 0x9e3779b9) >>> 0, mid: save.mid, carryCoins: save.carryCoins });
    mode = "play"; paused = false; speed = 1;
    el("btn-speed").textContent = "1x"; el("btn-speed").classList.remove("on");
    el("title").classList.add("hidden");
    el("over").classList.remove("show");
    el("pause").classList.remove("show");
    el("play-ui").classList.remove("hidden");
    beginWave(run, run.wave || 1);
    audio.banner();
    hudDirty = true; consoleDirty = true;
    refreshHud(true); refreshConsole(true);
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
    if (ev.code === "Digit1") setTab("atk");
    if (ev.code === "Digit3") setTab("def");
    if (ev.code === "Digit4") setTab("util");
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

  let lastT = 0, acc = 0, hudAcc = 0;
  function loop(ts) {
    if (!lastT) lastT = ts;
    let dt = (ts - lastT) / 1000;
    lastT = ts;
    if (dt > 0.05) dt = 0.05;
    if (mode === "play" && run && !paused) {
      acc += dt * speed;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        const wasAlive = !run.dead;
        updateRun(run, STEP);
        if (wasAlive && run.dead) audio.death();
        acc -= STEP;
        steps++;
      }
      if (acc > STEP * 3) acc = 0;
      if (run.dead && run.dyingT <= 0) finishRun();
      tickSfx();
    }
    render();
    hudAcc += dt;
    if (hudAcc > 0.12 && mode === "play" && run) {
      hudAcc = 0;
      hudDirty = true; consoleDirty = true;
      refreshHud(); refreshConsole();
    }
    requestAnimationFrame(loop);
  }

  function applyDemo(name) {
    if (!name) return;
    save = defaultSave();
    save.bestWave = 47; save.gems = 860;
    if (name === "title") { showTitle(); return; }
    if (name === "over") {
      save.perma = { dmg: 5, rate: 3, crit: 2, critDmg: 1, pierce: 1, multi: 0, slot: 1, hp: 6, shield: 2, armor: 3, regen: 1, shRegen: 1, thorns: 0, wind: 0, startCoins: 4, coinValue: 2, gemBonus: 1, interest: 1, magnet: 2, skip: 0 };
      run = createRun(save.perma, { bestWave: 47, persist: false, seed: 23 });
      run.wave = 23; run.kills = 80; run.bossesBeaten = 2; run.dead = true;
      run.up = Object.assign(defaultMid(), { dmg: 8, rate: 6, hp: 5, shield: 2, spread: 3, laser: 2, missile: 1, drone: 1, crit: 2, magnet: 2, coinVal: 2 });
      run.coins = 48;
      mode = "over";
      el("title").classList.add("hidden");
      el("play-ui").classList.add("hidden");
      el("over").classList.add("show");
      el("over-wave").textContent = "23";
      el("over-earned").textContent = "+184";
      el("over-bank").textContent = "860";
      el("over-best").textContent = "47";
      el("over-carry").textContent = "+24 coins carried (50%)";
      buildTrees();
      return;
    }
    if (name === "aim") {
      startRun();
      run.wave = 0; beginWave(run, 5);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 3, rate: 2, hp: 1, spread: 1, missile: 1, bspd: 1 });
      run.coins = 80; run._st = null;
      const st = playerStats(run); run.hp = st.maxHp;
      run.enemies = [];
      spawnEnemy(run, "shellback", { x: 130, y: SHIP_Y - 220 });
      spawnEnemy(run, "spark", { x: 70, y: SHIP_Y - 340 });
      spawnEnemy(run, "drifter", { x: 210, y: SHIP_Y - 430 });
      spawnEnemy(run, "spark", { x: 540, y: 240 });
      spawnEnemy(run, "spark", { x: 980, y: 360 });
      spawnEnemy(run, "coil", { x: 860, y: 520 });
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      return;
    }
    if (name === "console") {
      startRun();
      run.wave = 0; beginWave(run, 16);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 6, rate: 5, hp: 4, shield: 2, spread: 3, laser: 2, missile: 1, drone: 1, crit: 2, critDmg: 1, pierce: 1, bspd: 2, magnet: 2, coinVal: 2, armor: 1 });
      run.coins = 420; run._st = null;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.8); run.shield = st.maxShield;
      run.enemies = [];
      [["spark",200,400],["drifter",700,360],["razor",400,500],["shellback",900,480]].forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
      setTab("atk");
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      return;
    }
    startRun();
    if (name === "early") {
      run.wave = 0; beginWave(run, 3);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.coins = 48; run.up.dmg = 1; run.up.rate = 1; run.up.hp = 1; run._st = null;
      run.hp = Math.min(80, playerStats(run).maxHp); run.enemies = [];
      [["spark",330,310],["spark",780,270],["spark",200,470],["spark",900,430],["drifter",540,400],["drifter",820,560],["spark",470,220]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    if (name === "late") {
      run.wave = 0; beginWave(run, 37);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 10, rate: 8, hp: 7, shield: 3, spread: 4, laser: 3, missile: 2, drone: 2, crit: 3, critDmg: 2, pierce: 2, multi: 1, bspd: 3, burn: 2, magnet: 3, coinVal: 2, dcount: 1, orbit: 2 });
      run.coins = 1240; run._st = null;
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
      run.up = Object.assign(defaultMid(), { dmg: 10, rate: 8, hp: 7, shield: 3, spread: 4, laser: 3, missile: 2, drone: 2, crit: 3, pierce: 2, bspd: 3, orbit: 1 });
      run.coins = 980; run._st = null;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.55); run.shield = st.maxShield * 0.6;
      run.enemies = [];
      const b = spawnEnemy(run, "boss", { boss: bossInfo(40), x: 540, y: 560 });
      b.hp = Math.round(b.maxHp * 0.72);
      [["spark",160,480],["spark",920,500],["coil",150,880],["coil",930,860],["needle",80,600],["needle",1000,620]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
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

  LO._getRun = function () { return run; };
  root.LastOutpost = LO;
  if (typeof module !== "undefined") module.exports = LO;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
