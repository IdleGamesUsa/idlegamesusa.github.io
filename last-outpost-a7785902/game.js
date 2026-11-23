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
    baseDmg: 9, dmgPerLv: 4.5, baseInterval: 0.38, rateDecay: 0.90, minInterval: 0.10,
    baseHp: 100, hpPerBuy: 14, hpHealFrac: 0.40, permaDmg: 4, permaHp: 22,
    permaArmor: 0.035, permaCrit: 0.035, permaStartCoins: 22, permaCoinValue: 0.12,
    permaGemBonus: 0.12, permaShield: 16, interestPerWave: 4, gemPerWave: 5,
    gemKillDiv: 8, gemPerBoss: 16, countBase: 5, countPerWave: 1.10, countMax: 22,
    bulletSpd: 980, waveBreak: 1.55, bossIntro: 2.2, maxShieldBase: 50, shieldPerLv: 24,
    shieldRegenDelay: 3.0, shieldRegenPerSec: 10, coinDrop: 0.55, shipHpPerLv: 18
  };

  const MAX_PREST = 5;
  const PRESTIGE_IDS = ["dmg", "laser", "missile", "drone", "armor", "shield", "ship"];
  const TIER = [
    { name: "Mk I",  color: "#00f6ff", core: "#f4fbff", accent: "#ff2bd6", label: "CYAN" },
    { name: "Mk II", color: "#ffe500", core: "#fff8d0", accent: "#ff7a00", label: "GOLD" },
    { name: "Mk III", color: "#ff2bd6", core: "#ffe6fb", accent: "#b14cff", label: "PLASMA" },
    { name: "Mk IV", color: "#f4fbff", core: "#ffffff", accent: "#00f6ff", label: "WHITE-HOT" },
    { name: "Mk V", color: "#c8ff00", core: "#f5ffd8", accent: "#ffe500", label: "LIME" },
    { name: "Mk VI", color: "#b14cff", core: "#f0e0ff", accent: "#ff2bd6", label: "VOID" }
  ];
  function tierOf(n) { return TIER[Math.max(0, Math.min(TIER.length - 1, n | 0))]; }
  function prestMul(tier) { return Math.pow(1.55, tier | 0); }
  function prestBank(tier) { return 10 * (tier | 0); }
  function prestigeCost(id, tier) {
    const t = tier | 0;
    const heavy = (id === "ship" || id === "laser" || id === "missile") ? 1.25 : 1;
    return {
      coins: Math.floor(650 * Math.pow(2.5, t) * heavy),
      gems: Math.floor(12 * Math.pow(1.75, t))
    };
  }


  const UPGRADES = [
    { id: "dmg",      name: "BULLETS",    tab: "atk",  base: 28,  grow: 1.42, max: 10, unlock: 0, prestige: true },
    { id: "rate",     name: "FIRE RATE",  tab: "atk",  base: 45,  grow: 1.42, max: 20, unlock: 0 },
    { id: "spread",   name: "SPREAD",     tab: "atk",  base: 60,  grow: 1.50, max: 12, unlock: 3 },
    { id: "crit",     name: "CRIT %",     tab: "atk",  base: 75,  grow: 1.45, max: 15, unlock: 4 },
    { id: "critDmg",  name: "CRIT DMG",   tab: "atk",  base: 85,  grow: 1.48, max: 15, unlock: 5 },
    { id: "pierce",   name: "PIERCE",     tab: "atk",  base: 95,  grow: 1.50, max: 12, unlock: 6 },
    { id: "multi",    name: "MULTISHOT",  tab: "atk",  base: 110, grow: 1.50, max: 10, unlock: 8 },
    { id: "bspd",     name: "BULLET SPD", tab: "atk",  base: 65,  grow: 1.42, max: 15, unlock: 2 },
    { id: "burn",     name: "BURN",       tab: "atk",  base: 120, grow: 1.50, max: 15, unlock: 10 },
    { id: "chain",    name: "CHAIN",      tab: "atk",  base: 150, grow: 1.52, max: 12, unlock: 14 },
    { id: "laser",    name: "LASER",      tab: "atk",  base: 220, grow: 1.52, max: 10, unlock: 6, prestige: true },
    { id: "missile",  name: "MISSILES",   tab: "atk",  base: 260, grow: 1.52, max: 10, unlock: 8, prestige: true },
    { id: "ship",     name: "SHIP",       tab: "def",  base: 35,  grow: 1.40, max: 10, unlock: 0, prestige: true },
    { id: "hp",       name: "HEALTH",     tab: "def",  base: 35,  grow: 1.40, max: 20, unlock: 0 },
    { id: "shield",   name: "SHIELD",     tab: "def",  base: 85,  grow: 1.48, max: 10, unlock: 4, prestige: true },
    { id: "shRegen",  name: "SH. REGEN",  tab: "def",  base: 95,  grow: 1.45, max: 15, unlock: 6 },
    { id: "armor",    name: "ARMOR",      tab: "def",  base: 75,  grow: 1.48, max: 10, unlock: 5, prestige: true },
    { id: "regen",    name: "REGEN",      tab: "def",  base: 90,  grow: 1.45, max: 15, unlock: 7 },
    { id: "thorns",   name: "THORNS",     tab: "def",  base: 100, grow: 1.48, max: 12, unlock: 9 },
    { id: "knock",    name: "KNOCKBACK",  tab: "def",  base: 80,  grow: 1.45, max: 12, unlock: 8 },
    { id: "freeze",   name: "FREEZE",     tab: "def",  base: 130, grow: 1.50, max: 12, unlock: 12 },
    { id: "pdef",     name: "POINT DEF",  tab: "def",  base: 90,  grow: 1.46, max: 15, unlock: 4 },
    { id: "drone",    name: "DRONE",      tab: "util", base: 190, grow: 1.50, max: 10, unlock: 7, prestige: true },
    { id: "dcount",   name: "DRONE #",    tab: "util", base: 230, grow: 1.52, max: 6,  unlock: 10 },
    { id: "dmgDrone", name: "DRONE DMG",  tab: "util", base: 160, grow: 1.48, max: 15, unlock: 9 },
    { id: "laserW",   name: "LASER W",    tab: "util", base: 140, grow: 1.48, max: 12, unlock: 8 },
    { id: "mcount",   name: "MISSILE #",  tab: "util", base: 210, grow: 1.52, max: 8,  unlock: 11 },
    { id: "ricochet", name: "RICOCHET",   tab: "util", base: 170, grow: 1.52, max: 8,  unlock: 13 },
    { id: "coinVal",  name: "COIN VALUE", tab: "util", base: 65,  grow: 1.42, max: 15, unlock: 3 },
    { id: "interest", name: "INTEREST",   tab: "util", base: 95,  grow: 1.45, max: 12, unlock: 5 },
    { id: "skip",     name: "WAVE SKIP",  tab: "util", base: 180, grow: 1.55, max: 8,  unlock: 14 },
    { id: "orbit",    name: "ORBITAL",    tab: "util", base: 420, grow: 1.55, max: 12, unlock: 25, milestone: 25 },
    { id: "emp",      name: "EMP PULSE",  tab: "util", base: 740, grow: 1.55, max: 10, unlock: 50, milestone: 50 }
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
      { id: "pdef", name: "Point Defense", max: 10, base: 50, grow: 1.42 },
      { id: "thorns", name: "Thorns", max: 10, base: 70, grow: 1.5 },
      { id: "wind", name: "Second Wind", max: 1, base: 200, grow: 1 }
    ],
    eco: [
      { id: "startCoins", name: "Starting Coins", max: 20, base: 28, grow: 1.42 },
      { id: "coinValue", name: "Coin Value", max: 15, base: 40, grow: 1.45 },
      { id: "gemBonus", name: "Gem Bonus", max: 12, base: 80, grow: 1.52 },
      { id: "interest", name: "Interest", max: 12, base: 90, grow: 1.48 },
      { id: "skip", name: "Wave Skip", max: 8, base: 110, grow: 1.52 }
    ]
  };

  const ENEMY = {
    spark:     { hp: 9,  spd: 80,  r: 16, dmg: 7,  coins: 3,  color: C.magenta },
    drifter:   { hp: 18, spd: 60,  r: 24, dmg: 9,  coins: 4,  color: C.orange },
    razor:     { hp: 14, spd: 98,  r: 16, dmg: 8,  coins: 5,  color: C.lime },
    shooter:   { hp: 22, spd: 54,  r: 22, dmg: 9,  coins: 5,  color: C.orange, shoot: 2.6, shotDmg: 5 },
    shellback: { hp: 40, spd: 48,  r: 26, dmg: 12, coins: 6, color: C.violet, shield: 18 },
    splitter:  { hp: 20, spd: 70,  r: 20, dmg: 9,  coins: 5,  color: C.yellow, split: 2 },
    needle:    { hp: 16, spd: 148, r: 14, dmg: 11, coins: 5,  color: C.pink },
    coil:      { hp: 30, spd: 84,  r: 22, dmg: 13, coins: 6,  color: C.cyan },
    brood:     { hp: 54, spd: 48,  r: 32, dmg: 17, coins: 8, color: C.violet, spawn: 3.4 }
  };

  const BOSS = {
    10: { name: "THE HERALD",     kind: "herald",     hp: 5200,  r: 155, coins: 70 },
    20: { name: "TWIN SPIRE",     kind: "twin",       hp: 11000, r: 170, coins: 110 },
    30: { name: "THE LATTICE",    kind: "lattice",    hp: 23000, r: 180, coins: 150 },
    40: { name: "THE HARBINGER",  kind: "harbinger",  hp: 44000, r: 200, coins: 200 },
    50: { name: "ECLIPSE ENGINE", kind: "eclipse",    hp: 74000, r: 190, coins: 260 }
  };

  function bossInfo(wave) {
    const tier = Math.floor(wave / 10) * 10;
    const table = BOSS[tier] || BOSS[50];
    const extra = Math.max(0, (tier - 50) / 10);
    const roman = ["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
    const name = tier <= 50 ? table.name : table.name + " " + (roman[Math.floor(tier / 10) - 4] || String(tier));
    const kind = tier <= 40 ? table.kind : (tier === 50 ? "eclipse" : (tier % 40 === 0 ? "harbinger" : table.kind));
    const src = BOSS[Math.min(50, tier)] || BOSS[50];
    return { name, kind, hp: Math.floor(src.hp * Math.pow(1.42, extra)), r: src.r, coins: Math.floor(src.coins * (1 + extra * 0.35)) };
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
      hp: 0, shield: 0, armor: 0, regen: 0, shRegen: 0, pdef: 0, thorns: 0, wind: 0,
      startCoins: 0, coinValue: 0, gemBonus: 0, interest: 0, skip: 0
    };
  }
  function defaultMid() {
    return {
      dmg: 0, rate: 0, spread: 0, crit: 0, critDmg: 0, pierce: 0, multi: 0, bspd: 0, burn: 0, chain: 0, laser: 0, missile: 0,
      ship: 0, hp: 0, shield: 0, shRegen: 0, armor: 0, regen: 0, thorns: 0, knock: 0, freeze: 0, pdef: 0,
      drone: 0, dcount: 0, dmgDrone: 0, laserW: 0, mcount: 0, ricochet: 0,
      coinVal: 0, interest: 0, skip: 0, orbit: 0, emp: 0
    };
  }
  function defaultPrest() {
    return { dmg: 0, laser: 0, missile: 0, drone: 0, armor: 0, shield: 0, ship: 0 };
  }
  function defaultSave() {
    return { bestWave: 0, gems: 0, perma: defaultPerma(), mid: defaultMid(), prest: defaultPrest(), carryCoins: 0, mute: false, ver: 5 };
  }

  function convertOverflowToPrestige(mid, prest) {
    for (let i = 0; i < PRESTIGE_IDS.length; i++) {
      const id = PRESTIGE_IDS[i];
      let lv = mid[id] | 0;
      if (lv > 10) {
        prest[id] = (prest[id] | 0) + Math.floor((lv - 1) / 10);
        if (prest[id] > MAX_PREST) prest[id] = MAX_PREST;
        mid[id] = ((lv - 1) % 10) + 1;
      }
    }
  }

  function refundSpent(base, grow, lv) {
    let s = 0;
    const n = lv | 0;
    for (let i = 0; i < n; i++) s += Math.floor(base * Math.pow(grow, i));
    return s;
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
    d.prest = Object.assign(defaultPrest(), s.prest || {});
    if (!s.prest) convertOverflowToPrestige(d.mid, d.prest);
    const prevVer = s.ver | 0;
    if (prevVer < 5) {
      const midMag = (s.mid && s.mid.magnet) | 0;
      const perMag = (s.perma && s.perma.magnet) | 0;
      if (midMag > 0) d.carryCoins += refundSpent(55, 1.40, midMag);
      if (perMag > 0) d.gems += refundSpent(40, 1.42, perMag);
      d.mid.magnet = 0;
      d.perma.magnet = 0;
      if (!d.mid.pdef) d.mid.pdef = 0;
      if (!d.perma.pdef) d.perma.pdef = 0;
    }
    delete d.mid.magnet;
    delete d.perma.magnet;
    d.ver = 5;
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
    if (id === "ship") return true;
    return false;
  }

  function accountPower(run) {
    if (!run) return 0;
    let s = 0;
    const u = run.up || {};
    for (const k in u) s += u[k] || 0;
    const pr = run.prest || {};
    for (const k in pr) s += (pr[k] || 0) * 8;
    return s;
  }

  function adaptMul(run) {
    return 1 + 0.085 * accountPower(run);
  }

  function hpScale(wave, run) {
    const n = Math.max(0, wave - 1);
    const waveSc = Math.pow(1.23, Math.min(n, 8))
      * Math.pow(1.20, Math.max(0, Math.min(n, 12) - 8))
      * Math.pow(1.155, Math.max(0, Math.min(n, 24) - 12))
      * Math.pow(1.125, Math.max(0, Math.min(n, 40) - 24))
      * Math.pow(1.095, Math.max(0, n - 40));
    return waveSc * adaptMul(run);
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
    if (run._st) return run._st;
    const p = run.perma, u = run.up, pr = run.prest || defaultPrest();
    const st = run._st = {};
    const bLv = (u.dmg || 0) + prestBank(pr.dmg);
    st.dmg = (BAL.baseDmg + BAL.dmgPerLv * (bLv + p.dmg)) * prestMul(pr.dmg);
    st.interval = Math.max(BAL.minInterval, BAL.baseInterval * Math.pow(BAL.rateDecay, u.rate + p.rate));
    const shipLv = (u.ship || 0) + prestBank(pr.ship);
    st.maxHp = Math.round((BAL.baseHp + BAL.hpPerBuy * u.hp + BAL.permaHp * p.hp + BAL.shipHpPerLv * shipLv) * prestMul(pr.ship));
    st.armor = Math.min(0.62, (p.armor * BAL.permaArmor + u.armor * 0.035 + pr.armor * 0.06) * (pr.armor ? prestMul(pr.armor) * 0.65 + 0.35 : 1));
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
    st.magnet = 80;
    const pdefLv = (u.pdef || 0) + (p.pdef || 0) * 0.8;
    st.pdefLv = pdefLv;
    st.pdefRange = pdefLv > 0 ? 130 + pdefLv * 16 : 0;
    st.pdefInterval = pdefLv > 0 ? Math.max(0.22, 0.85 * Math.pow(0.92, Math.max(0, pdefLv - 1))) : 1;
    st.pdefTurrets = pdefLv >= 10 ? 2 : 1;
    st.pdefDeflect = pdefLv >= 6 ? Math.min(0.35, 0.06 + (pdefLv - 6) * 0.035) : 0;
    st.laserW = 12 + (u.laserW || 0) * 5 + (pr.laser || 0) * 3;
    st.mcount = 1 + (u.mcount || 0);
    st.drones = Math.min(6, (u.drone > 0 ? 1 : 0) + (u.dcount || 0));
    st.droneDmg = (0.55 + (u.dmgDrone || 0) * 0.18) * prestMul(pr.drone);
    st.laserDmgMul = prestMul(pr.laser);
    st.missileDmgMul = prestMul(pr.missile);
    st.shRegen = BAL.shieldRegenPerSec + (u.shRegen || 0) * 6 + (p.shRegen || 0) * 5;
    let maxShield = 0;
    if (u.shield > 0) maxShield += BAL.maxShieldBase + BAL.shieldPerLv * ((u.shield - 1) + prestBank(pr.shield));
    if (p.shield > 0) maxShield += BAL.permaShield * p.shield;
    st.maxShield = Math.round(maxShield * prestMul(pr.shield));
    st.tierBlaster = pr.dmg || 0;
    st.tierLaser = pr.laser || 0;
    st.tierMissile = pr.missile || 0;
    st.tierDrone = pr.drone || 0;
    st.tierShield = pr.shield || 0;
    st.tierShip = pr.ship || 0;
    st.tierArmor = pr.armor || 0;
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


  const INFO = {
    dmg: "Your main blaster. Each level raises bullet damage. This is a core item: at level 10 you can Prestige it for a new shape, a new color, and a big power bonus.",
    rate: "Shortens the time between blaster volleys. Higher fire rate means more shots per second. Caps high and does not prestige.",
    spread: "Adds extra bullets that fan around your aim. Level 1 gives a 3-shot fan; higher levels add more shots in a wider cone.",
    crit: "Chance for a shot to crit and use your Crit Damage multiplier. Shown as a white, heavier bolt when it procs.",
    critDmg: "How hard a critical hit hurts. Starts at 2× and climbs with each level.",
    pierce: "Bullets keep going after a hit. Each level lets a shot pass through one more enemy.",
    multi: "Adds extra projectiles on top of your spread fan, for a thicker volley.",
    bspd: "Makes your shots fly faster so lead aiming lands more cleanly and they cross the screen sooner.",
    burn: "Hits set enemies on fire, dealing damage over time after the shot.",
    chain: "On hit, lightning jumps to a nearby enemy for a fraction of the damage. Higher levels jump farther and more times.",
    laser: "Fires a piercing beam at the closest threats. Core item: Prestige at level 10 for a thicker, cooler beam (split and spiral at the top tiers) and more power.",
    missile: "Launches homing missiles at the closest threats. Core item: Prestige at level 10 for bigger frames, brighter exhaust, heavier blasts, and a new look.",
    ship: "The hull itself. Raises max health and slightly toughens the outpost. Core item: Prestige at level 10 to grow the ship — extra wings, engines, armor and glow — and multiply its hull.",
    hp: "Buys more max health and instantly repairs a chunk of hull. A mid-run survival purchase; the Ship is the prestige path for the hull look.",
    shield: "A rechargeable energy bubble in front of the hull. Core item: Prestige at level 10 for a new shield shape (ring, hex lattice, then a double dome) and more strength.",
    shRegen: "The shield refills faster after you stop taking hits.",
    armor: "Cuts incoming damage by a percent (capped). Core item: Prestige at level 10 for a larger cut and heavier visible hull plating.",
    regen: "Slowly repairs hull over time, even between hits.",
    thorns: "When something rams the rail or the ship, a portion of that damage is reflected back.",
    knock: "Hits shove enemies back up the screen, buying you a little space. Bosses barely flinch.",
    freeze: "Hits slow enemies for a short time. Stacks a little with more levels, and is capped so they never freeze solid.",
    drone: "A wingman that hovers near the ship and fires on the closest threat. Core item: Prestige at level 10 for a new, spikier drone shape, orbit trails, and more punch.",
    dcount: "Adds extra drones, up to a small squad.",
    dmgDrone: "Raises the damage of every drone shot.",
    laserW: "Widens the laser beam so it is easier to clip enemies.",
    mcount: "Adds extra missiles to each volley.",
    ricochet: "After a hit, a bullet can bounce toward another nearby target. Each level is another bounce.",
    pdef: "Point Defense. Small turret pods near the hull that shoot down incoming enemy bullets and missiles. Higher levels fire faster, reach farther, and add a second turret at level 10. From level 6 some shots are deflected back at enemies instead of destroyed. Boss volleys can be thinned, not erased.",
    coinVal: "Increases coins dropped by every kill. Stacks with the permanent Coin Value node.",
    interest: "At the start of each new wave, grants bonus coins based on this level (plus any permanent Interest).",
    skip: "When a non-boss wave is built, automatically cashes out and removes a few of the weakest upcoming spawns.",
    orbit: "Unlocks at wave 25. Spinning orbs circle the ship and damage anything they touch. Milestone weapon.",
    emp: "Unlocks at wave 50. A periodic pulse damages and briefly stuns enemies near the rail. Milestone weapon."
  };
  const PERMA_INFO = {
    dmg: "You start every run with extra bullet damage. Stacks on top of mid-run Bullets and any prestige bonus.",
    rate: "You start every run with a faster blaster.",
    crit: "Adds a permanent bonus to critical-hit chance.",
    critDmg: "Adds a permanent bonus to critical-hit damage.",
    pierce: "Your bullets start with extra pierce charges.",
    multi: "Your volley starts with extra shots.",
    slot: "Starts the run with a weapon already online (Spread, then Laser, Missiles, and Drones as you buy more slots).",
    hp: "Raises the hull's base max health on every run.",
    shield: "Adds permanent shield strength, even before you buy mid-run Shield.",
    armor: "A permanent cut to incoming damage.",
    regen: "The hull slowly repairs itself from the first wave.",
    shRegen: "Your shield refills faster on every run.",
    thorns: "A permanent share of ram damage is reflected.",
    wind: "Once per run, cheating death restores a sliver of hull instead of ending the run.",
    startCoins: "You begin each run with extra coins, on top of the half you carried over from the last death.",
    coinValue: "A permanent bonus to coins from kills.",
    gemBonus: "A permanent bonus to gems earned at the end of a run. Gems are never cut when you die.",
    interest: "Permanent bonus coins at the start of each wave.",
    pdef: "Permanent Point Defense ranks. Your intercept turrets start online every run and scale with mid-run Point Def.",
    skip: "Permanent wave-skip charges, stacking with the mid-run upgrade."
  };

  function effectLine(id, level, prest) {
    const t = prest || 0;
    const lv = level || 0;
    if (id === "dmg") {
      const d = Math.round((BAL.baseDmg + BAL.dmgPerLv * (lv + prestBank(t))) * prestMul(t));
      return "Bullet damage " + d + (t ? "  ·  " + tierOf(t).name : "");
    }
    if (id === "rate") {
      const iv = Math.max(BAL.minInterval, BAL.baseInterval * Math.pow(BAL.rateDecay, lv));
      return (1 / iv).toFixed(2) + " shots/sec";
    }
    if (id === "spread") return lv <= 0 ? "Single bolt" : ((lv === 1 ? 3 : (lv < 4 ? 5 : 7)) + "-shot fan");
    if (id === "crit") return "Crit chance " + Math.round(Math.min(0.7, lv * 0.035) * 100) + "%";
    if (id === "critDmg") return "Crits deal " + (2 + lv * 0.22).toFixed(2) + "×";
    if (id === "pierce") return lv ? ("Pierce " + lv + " target" + (lv > 1 ? "s" : "")) : "No pierce";
    if (id === "multi") return lv ? ("+" + lv + " extra shot" + (lv > 1 ? "s" : "")) : "No extra shots";
    if (id === "bspd") return "Shot speed " + Math.round(BAL.bulletSpd * (1 + 0.10 * lv));
    if (id === "burn") return lv ? ("Burn " + Math.round(lv * 22) + "% of damage over time") : "No burn";
    if (id === "chain") return lv ? (Math.min(4, 1 + (lv / 3 | 0)) + " jump" + (lv > 2 ? "s" : "") + ", " + Math.round(40 + 4 * lv) + "% carry") : "No chain";
    if (id === "laser") return lv ? ("Laser online  ·  " + (lv >= 2 ? "dual beam" : "single beam") + (t ? "  ·  " + tierOf(t).name : "") + "  ·  " + prestMul(t).toFixed(2) + "×") : "Locked";
    if (id === "missile") return lv ? ("Missiles online  ·  " + prestMul(t).toFixed(2) + "×" + (t ? "  ·  " + tierOf(t).name : "")) : "Locked";
    if (id === "ship") {
      const hp = Math.round((BAL.baseHp + BAL.shipHpPerLv * (lv + prestBank(t))) * prestMul(t));
      return "Hull base " + hp + " HP" + (t ? "  ·  " + tierOf(t).name : "");
    }
    if (id === "hp") return "+" + (BAL.hpPerBuy * lv) + " max HP, repairs on buy";
    if (id === "shield") return lv ? ("Shield " + Math.round((BAL.maxShieldBase + BAL.shieldPerLv * (lv - 1 + prestBank(t))) * prestMul(t)) + (t ? "  ·  " + tierOf(t).name : "")) : "No shield";
    if (id === "shRegen") return lv ? ("+" + (lv * 6) + " shield/sec") : "Base regen only";
    if (id === "armor") return "Damage cut " + Math.round(Math.min(0.62, lv * 0.035 + t * 0.06) * 100) + "%";
    if (id === "regen") return lv ? ( (lv * 2.2).toFixed(1) + " HP/sec") : "No hull regen";
    if (id === "thorns") return lv ? (Math.round(lv * 14) + "% reflect") : "No thorns";
    if (id === "knock") return lv ? ("Knockback " + (lv * 18)) : "No knockback";
    if (id === "freeze") return lv ? ("Slow " + Math.round(Math.min(0.55, lv * 0.06) * 100) + "%") : "No freeze";
    if (id === "drone") return lv ? ("Drone online  ·  " + prestMul(t).toFixed(2) + "×" + (t ? "  ·  " + tierOf(t).name : "")) : "No drone";
    if (id === "dcount") return lv ? ("+" + lv + " extra drone" + (lv > 1 ? "s" : "")) : "Single drone when owned";
    if (id === "dmgDrone") return "Drone damage " + Math.round((0.55 + lv * 0.18) * 100) + "% of bullets";
    if (id === "laserW") return "Beam width " + (12 + lv * 5);
    if (id === "mcount") return (1 + lv) + " missile" + (lv ? "s" : "") + " per volley";
    if (id === "ricochet") return lv ? (lv + " bounce" + (lv > 1 ? "s" : "")) : "No bounce";
    if (id === "pdef") {
      if (!lv) return "No interceptors";
      const range = Math.round(130 + lv * 16);
      const iv = Math.max(0.22, 0.85 * Math.pow(0.92, Math.max(0, lv - 1)));
      const defl = lv >= 6 ? Math.round(Math.min(0.35, 0.06 + (lv - 6) * 0.035) * 100) : 0;
      return "Range " + range + "  ·  " + (1 / iv).toFixed(1) + " intercepts/sec" + (defl ? ("  ·  " + defl + "% deflect") : "") + (lv >= 10 ? "  ·  dual turrets" : "");
    }
    if (id === "coinVal") return "Kill coins +" + Math.round(lv * 10) + "%";
    if (id === "interest") return lv ? (BAL.interestPerWave * lv) + " coins each wave" : "No interest";
    if (id === "skip") return lv ? ("Cash out " + lv + " spawn" + (lv > 1 ? "s" : "") + " per trash wave") : "No skip";
    if (id === "orbit") return lv ? ( (2 + Math.min(4, lv >> 1)) + " orbs") : "Locked until wave 25";
    if (id === "emp") return lv ? ("Pulse every " + (Math.max(1.4, 3.2 - lv * 0.12)).toFixed(1) + "s") : "Locked until wave 50";
    return "Level " + lv;
  }

  function createRun(perma, opts) {
    opts = opts || {};
    const run = {
      perma: Object.assign(defaultPerma(), perma || {}),
      up: Object.assign(defaultMid(), opts.mid || {}),
      prest: Object.assign(defaultPrest(), opts.prest || {}),
      gemWallet: opts.gemWallet || null,
      wave: 0, coins: 0, kills: 0, bossesBeaten: 0,
      hp: 0, shield: 0, shieldWait: 0, invuln: 0, usedWind: false,
      dead: false, dyingT: 0, time: 0, waveTime: 0,
      phase: "break", phaseT: 0, pending: [], spawnCd: 0,
      enemies: [], bullets: [], pickups: [], floaters: [], particles: [], lasers: [],
      fireCd: 0, missileCd: 0, laserCd: 0, droneFire: [0, 0, 0, 0, 0, 0],
      empCd: 0, pdefCd: 0, pdefBeams: [], orbitT: 0, hullAng: -Math.PI / 2, aimAng: -Math.PI / 2, prestFx: null, bossBeams: [],
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
      const adapt = adaptMul(run);
      const hp = Math.floor(b.hp * adapt);
      const e = {
        type: "boss", bossKind: b.kind, name: b.name,
        x: extra.x != null ? extra.x : 540, y: extra.y != null ? extra.y : -40,
        hp: hp, maxHp: hp, r: b.r, dmg: 26 * dmgScale(run.wave),
        coins: b.coins, color: C.magenta, t: 0, fireCd: 1.4, fireEvery: 1.55,
        weave: b.kind === "twin" ? 1.25 : 0.65, weaveAmp: b.kind === "harbinger" ? 90 : 150,
        vx: 0, vy: 0, shield: 0, phase: rnd() * 6, burn: 0, burnDps: 0, chill: 0, stun: 0,
        hitCd: 0, usedShield: false, enraged: false, patT: 0, pattern: 0,
        tele: 0, sweepAng: 0, sweepHot: 0, spawnCd: 1.8
      };
      run.enemies.push(e);
      return e;
    }
    const def = ENEMY[type] || ENEMY.spark;
    const scH = hpScale(run.wave, run), scS = spdScale(run.wave), scD = dmgScale(run.wave);
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
      const ti = tierOf(st.tierBlaster || 0);
      b.r = crit ? 7 : 5; b.dmg = dmg; b.friendly = true; b.color = crit ? ti.core : ti.color;
      b.life = 1.85; b.crit = crit; b.kind = "blast"; b.target = null; b.turn = 0;
      b.tier = st.tierBlaster || 0;
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
      const ti = tierOf(st.tierMissile || 0);
      b.r = 8; b.dmg = st.dmg * (2.4 + 0.5 * run.up.missile) * (st.missileDmgMul || 1); b.friendly = true;
      b.color = ti.color; b.life = 2.6; b.kind = "missile"; b.crit = false; b.tier = st.tierMissile || 0;
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
      L.t = 0.18; L.dmg = st.dmg * (1.1 + 0.35 * run.up.laser) * (st.laserDmgMul || 1); L.tick = 0; L.w = st.laserW;
      L.tier = st.tierLaser || 0; L.color = tierOf(st.tierLaser || 0).color;
      run.lasers.push(L);
    }
  }

  function fireDrone(run, st, x, y) {
    const e = closestEnemy(run, SHIP_X, SHIP_Y);
    const spd = st.bulletSpd * 0.88;
    const ang = e ? leadPoint(x, y, e, spd).ang : -Math.PI / 2;
    const b = take("bullets");
    b.x = x; b.y = y; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    const ti = tierOf(st.tierDrone || 0);
    b.r = 4; b.dmg = st.dmg * st.droneDmg; b.friendly = true; b.color = ti.color;
    b.life = 1.3; b.kind = "drone"; b.crit = false; b.target = e; b.turn = 0; b.tier = st.tierDrone || 0;
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
    kind = kind || "dmg";
    if (kind === "dmg") {
      const add = parseInt(text, 10) || 0;
      for (let i = 0; i < run.floaters.length; i++) {
        const f = run.floaters[i];
        if (f.kind === "dmg" && f.t < 0.28 && Math.abs(f.x - x) < 50 && Math.abs(f.y - y) < 44) {
          f.amt = (f.amt || parseInt(f.text, 10) || 0) + add;
          f.text = String(f.amt);
          f.t = Math.min(f.t, 0.06);
          f.life = 0.72;
          f.color = color;
          return;
        }
      }
      let dmgCount = 0, oldest = -1, oldestT = -1;
      for (let i = 0; i < run.floaters.length; i++) {
        if (run.floaters[i].kind === "dmg") {
          dmgCount++;
          if (run.floaters[i].t > oldestT) { oldestT = run.floaters[i].t; oldest = i; }
        }
      }
      if (dmgCount >= 8 && oldest >= 0) give("floaters", popAt(run.floaters, oldest));
    } else if (run.floaters.length >= MAX_FLOATERS) {
      give("floaters", popAt(run.floaters, 0));
    }
    let ox = 0, oy = 0;
    for (let i = 0; i < run.floaters.length; i++) {
      const f = run.floaters[i];
      if (Math.abs(f.x - (x + ox)) < 36 && Math.abs(f.y - (y + oy)) < 26) { oy -= 28; ox += (oy % 56 === 0 ? 20 : -10); }
    }
    const f = take("floaters");
    f.x = Math.round(x + ox); f.y = Math.round(y + oy);
    f.text = text; f.color = color; f.kind = kind; f.t = 0; f.life = kind === "dmg" ? 0.72 : 0.62; f.vy = -64;
    f.amt = kind === "dmg" ? (parseInt(text, 10) || 0) : 0;
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


  function pdefTurretPos(i, n) {
    if (n <= 1) return { x: SHIP_X + 78, y: SHIP_Y - 28 };
    return i === 0 ? { x: SHIP_X - 86, y: SHIP_Y - 24 } : { x: SHIP_X + 86, y: SHIP_Y - 24 };
  }

  function updatePointDef(run, dt, st) {
    if (!run.pdefBeams) run.pdefBeams = [];
    for (let i = run.pdefBeams.length - 1; i >= 0; i--) {
      run.pdefBeams[i].t -= dt;
      if (run.pdefBeams[i].t <= 0) run.pdefBeams.splice(i, 1);
    }
    if (!st.pdefLv || st.pdefLv <= 0) return;
    run.pdefCd = (run.pdefCd || 0) - dt;
    if (run.pdefCd > 0) return;
    const range = st.pdefRange;
    const turrets = st.pdefTurrets || 1;
    let shots = 0;
    for (let t = 0; t < turrets; t++) {
      let best = -1, bestScore = 1e9;
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        if (!b || b.friendly) continue;
        const d = Math.hypot(b.x - SHIP_X, b.y - SHIP_Y);
        if (d > range) continue;
        const score = d + (b.y < SHIP_Y - 400 ? 80 : 0) - (b.vy > 0 ? 50 : 0);
        if (score < bestScore) { bestScore = score; best = i; }
      }
      if (best < 0) break;
      const b = run.bullets[best];
      const tp = pdefTurretPos(t, turrets);
      if (run.pdefBeams.length < 10) {
        run.pdefBeams.push({ x0: tp.x, y0: tp.y, x1: b.x, y1: b.y, t: 0.16, deflect: false });
      }
      if (st.pdefDeflect > 0 && run.rng() < st.pdefDeflect) {
        b.friendly = true;
        b.kind = "deflect";
        b.color = C.lime;
        b.life = Math.max(b.life, 1.2);
        const tgt = closestEnemy(run, b.x, b.y);
        const ang = tgt ? Math.atan2(tgt.y - b.y, tgt.x - b.x) : -Math.PI / 2;
        const spd = Math.max(420, Math.hypot(b.vx, b.vy));
        b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
        b.dmg = (b.dmg || 8) * 0.9;
        if (run.pdefBeams.length) run.pdefBeams[run.pdefBeams.length - 1].deflect = true;
      } else {
        burst(run, b.x, b.y, C.lime, 5);
        give("bullets", popAt(run.bullets, best));
      }
      shots++;
    }
    if (shots > 0) run.pdefCd = st.pdefInterval;
  }

  function updatePickups(run, dt) {
    const st = playerStats(run);
    const tx = 980, ty = 58;
    const wait = 0.10;
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
    if (run.prestFx) { run.prestFx.t -= dt; if (run.prestFx.t <= 0) run.prestFx = null; }
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



  function bossShot(run, x, y, ang, spd, dmg, color, r) {
    const b = take("bullets");
    b.x = x; b.y = y; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
    b.r = r || 7; b.dmg = dmg; b.friendly = false; b.color = color || C.magenta;
    b.life = 4.2; b.kind = "enemy"; b.crit = false; b.pierce = 0; b.bounces = 0; b.target = null; b.turn = 0;
    run.bullets.push(b);
  }

  function bossAim(e) { return Math.atan2(SHIP_Y - e.y, SHIP_X - e.x); }

  function addBossBeam(run, x0, y0, x1, y1, hot, life, w) {
    if (!run.bossBeams) run.bossBeams = [];
    run.bossBeams.push({ x0: x0, y0: y0, x1: x1, y1: y1, hot: !!hot, t: life, life: life, w: w || 10 });
  }

  function stepBoss(run, e, dt) {
    e.t += dt;
    const frac = e.hp / e.maxHp;
    if (!e.usedShield && frac <= 0.55) {
      e.usedShield = true;
      e.shield = Math.round(e.maxHp * 0.28);
    }
    if (!e.enraged && frac <= 0.30) {
      e.enraged = true;
      e.fireEvery = Math.max(0.55, (e.fireEvery || 1.5) * 0.62);
      e.flash = 0.4;
      run.flash = Math.max(run.flash, 0.25);
    }
    const targetY = e.bossKind === "harbinger" ? 430 : (e.bossKind === "lattice" ? 400 : (e.bossKind === "eclipse" ? 420 : (e.bossKind === "twin" ? 420 : 420)));
    const spdN = e.enraged ? 1.7 : 1.25;
    e.y += (targetY - e.y) * Math.min(1, 1.15 * dt);
    if (e.y < 80) e.y += 200 * dt;
    const weave = (e.weave || 0.7) * (e.enraged ? 1.25 : 1);
    e.x = 540 + Math.sin(e.t * weave) * (e.weaveAmp || 140);
    e.x = Math.max(120, Math.min(W - 120, e.x));

    const scD = dmgScale(run.wave);
    const shotDmg = (e.enraged ? 12 : 9) * scD;
    const kind = e.bossKind;
    e.fireCd -= dt;
    e.spawnCd = (e.spawnCd || 0) - dt;
    e.tele = Math.max(0, (e.tele || 0) - dt);
    e.sweepHot = Math.max(0, (e.sweepHot || 0) - dt);

    // telegraph / active sweep beam
    if (e.sweepHot > 0 || e.tele > 0) {
      const ang = e.sweepAng || 0;
      const x1 = e.x + Math.cos(ang) * 1800;
      const y1 = e.y + Math.sin(ang) * 1800;
      e.beamX1 = x1; e.beamY1 = y1;
      if (e.sweepHot > 0) {
        if (distToSegment(SHIP_X, SHIP_Y, e.x, e.y + 80, x1, y1) < 28 + (e.enraged ? 8 : 0)) {
          hurt(run, 16 * scD);
        }
      }
    } else { e.beamX1 = 0; e.beamY1 = 0; }

    if (e.fireCd <= 0) {
      e.pattern = (e.pattern || 0) + 1;
      const aim = bossAim(e);
      if (kind === "herald") {
        const n = e.enraged ? 7 : 5;
        const spread = e.enraged ? 0.22 : 0.26;
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * spread;
          bossShot(run, e.x, e.y + 90, a, 240, shotDmg, C.orange, 7);
        }
        if (e.pattern % 3 === 0) {
          e.sweepAng = aim;
          e.tele = 0.5; e.pendingSweep = true;
        }
        e.fireCd = e.fireEvery;
      } else if (kind === "twin") {
        for (const sx of [-70, 70]) {
          const ax = Math.atan2(SHIP_Y - e.y, SHIP_X - (e.x + sx));
          const n = e.enraged ? 4 : 3;
          for (let i = 0; i < n; i++) {
            bossShot(run, e.x + sx, e.y + 80, ax + (i - (n - 1) / 2) * 0.18, 250, shotDmg, C.violet, 7);
          }
        }
        if (e.spawnCd <= 0 && run.enemies.length < BAL.countMax + 4) {
          spawnEnemy(run, "spark", { x: e.x - 80, y: e.y + 40 });
          spawnEnemy(run, "spark", { x: e.x + 80, y: e.y + 40 });
          e.spawnCd = e.enraged ? 2.2 : 3.4;
        }
        e.fireCd = e.fireEvery;
      } else if (kind === "lattice") {
        // aimed volley plus a sweeping laser
        for (let i = 0; i < (e.enraged ? 9 : 6); i++) {
          const a = Math.PI * 0.5 + (i - 3) * 0.16;
          bossShot(run, e.x, e.y + 100, a, 220, shotDmg, C.cyan, 6);
        }
        e.sweepAng = aim;
        e.tele = 0.45; e.pendingSweep = true;
        e.fireCd = e.fireEvery;
      } else if (kind === "harbinger") {
        const n = e.enraged ? 8 : 6;
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * 0.2;
          bossShot(run, e.x, e.y + 110, a, 230, shotDmg * 1.1, C.magenta, 8);
        }
        for (const sx of [-180, 180]) {
          bossShot(run, e.x + sx * (e.r / 160), e.y + 100, Math.PI / 2, 280, shotDmg, C.pink, 6);
        }
        if (e.spawnCd <= 0 && run.enemies.length < BAL.countMax + 5) {
          spawnEnemy(run, "coil", { x: e.x, y: e.y + 50 });
          e.spawnCd = e.enraged ? 2.4 : 3.8;
        }
        e.sweepAng = aim;
        e.tele = 0.4; e.pendingSweep = true;
        e.fireCd = e.fireEvery;
      } else {
        // eclipse / later: mix
        const n = e.enraged ? 9 : 7;
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * 0.18;
          bossShot(run, e.x, e.y + 110, a, 250, shotDmg * 1.15, C.magenta, 8);
        }
        for (const sx of [-160, 0, 160]) {
          bossShot(run, e.x + sx, e.y + 100, Math.PI / 2, 300, shotDmg, C.pink, 6);
        }
        if (e.spawnCd <= 0 && run.enemies.length < BAL.countMax + 6) {
          spawnEnemy(run, e.enraged ? "coil" : "spark", { x: e.x - 60, y: e.y + 40 });
          spawnEnemy(run, "needle", { x: e.x + 60, y: e.y + 40 });
          e.spawnCd = e.enraged ? 2.0 : 3.2;
        }
        e.sweepAng = aim;
        e.tele = 0.38; e.pendingSweep = true;
        e.fireCd = e.fireEvery * 0.9;
      }
    }
    if (e.pendingSweep && (e.tele || 0) <= 0) {
      e.pendingSweep = false;
      e.sweepHot = e.enraged ? 0.42 : 0.32;
    }
  }

  function updateBossBeams(run, dt) {
    if (!run.bossBeams) return;
    for (let i = run.bossBeams.length - 1; i >= 0; i--) {
      run.bossBeams[i].t -= dt;
      if (run.bossBeams[i].t <= 0) run.bossBeams.splice(i, 1);
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
    if (def.prestige && lv >= 10) return false;
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


  function tryPrestige(run, id) {
    const def = UP_BY_ID[id];
    if (!def || !def.prestige || run.dead) return false;
    const t = (run.prest && run.prest[id]) || 0;
    if (t >= MAX_PREST) return false;
    if ((run.up[id] || 0) < 10) return false;
    const cost = prestigeCost(id, t);
    if (run.coins < cost.coins) return false;
    const wallet = run.gemWallet;
    if (cost.gems > 0 && (!wallet || (wallet.gems | 0) < cost.gems)) return false;
    run.coins -= cost.coins;
    if (wallet && cost.gems) wallet.gems -= cost.gems;
    if (!run.prest) run.prest = defaultPrest();
    run.prest[id] = t + 1;
    run.up[id] = 1;
    run._st = null;
    const st = playerStats(run);
    if (id === "ship" || id === "hp") run.hp = Math.min(st.maxHp, Math.max(run.hp, Math.round(st.maxHp * 0.5)));
    if (id === "shield") { run.shield = st.maxShield; run.shieldWait = 0; }
    run.prestFx = { t: 1.05, id: id, tier: t + 1, name: def.name, color: tierOf(t + 1).color };
    run.flash = 0.55;
    burst(run, SHIP_X, SHIP_Y, tierOf(t + 1).color, 18);
    const nt = t + 1;
    const col = tierOf(nt).color;
    if (id === "dmg") {
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        if (b && b.friendly && b.kind === "blast") { b.tier = nt; b.color = b.crit ? tierOf(nt).core : col; }
      }
    }
    if (id === "missile") {
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        if (b && b.friendly && b.kind === "missile") { b.tier = nt; b.color = col; }
      }
    }
    if (id === "laser") {
      for (let i = 0; i < (run.lasers || []).length; i++) {
        const L = run.lasers[i];
        if (L) L.color = col;
      }
    }
    return true;
  }

  function autoBuyMid(run) {

    const st = playerStats(run);
    const hpFrac = run.hp / st.maxHp;
    const order = [];
    if (hpFrac < 0.35) order.push("hp", "ship", "regen", "shield");
    if ((run.up.rate || 0) < (run.up.dmg || 0)) order.push("rate", "dmg"); else order.push("dmg", "rate");
    order.push("ship");
    order.push("spread", "bspd", "coinVal");
    if (hpFrac < 0.6) order.push("hp", "armor", "shield", "pdef");
    order.push("pierce", "multi", "crit", "critDmg", "burn");
    order.push("drone", "laser", "missile", "interest");
    order.push("shRegen", "regen", "knock", "pdef", "freeze", "thorns");
    order.push("dcount", "dmgDrone", "laserW", "mcount", "chain", "ricochet");
    order.push("skip", "orbit", "emp", "hp");
    for (let i = 0; i < order.length; i++) { if (tryBuy(run, order[i])) return true; }
    if (run.coins > 400) {
      for (let i = 0; i < PRESTIGE_IDS.length; i++) {
        if (tryPrestige(run, PRESTIGE_IDS[i])) return true;
      }
    }
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
    const order = ["dmg", "hp", "startCoins", "rate", "coinValue", "armor", "shield", "crit", "critDmg", "regen", "interest", "pdef", "pierce", "shRegen", "multi", "slot", "gemBonus", "thorns", "skip", "wind"];
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
    let perma = defaultPerma(), gems = 0, best = 0, mid = defaultMid(), prest = defaultPrest(), carryCoins = 0;
    const rows = [];
    for (let i = 0; i < n; i++) {
      gems = autoBuyPerma(perma, gems);
      const wallet = { gems: gems };
      const run = createRun(perma, { seed: (opts.seed || 77001) + i * 997, bestWave: best, persist: false, mid: mid, prest: prest, carryCoins: carryCoins, gemWallet: wallet });
      const end = simulateUntilDeath(run, { autoBuy: true });
      settlePickups(run);
      mid = Object.assign(defaultMid(), end.up);
      prest = Object.assign(defaultPrest(), run.prest || prest);
      carryCoins = Math.floor(run.coins / 2);
      gems = wallet.gems + end.gemsEarned;
      best = Math.max(best, end.waveReached);
      rows.push({
        run: i + 1, wave: end.waveReached, kills: end.kills, gemsEarned: end.gemsEarned,
        gemsBank: gems, carryCoins: carryCoins, bosses: end.bossesBeaten,
        time: Math.round(end.time * 10) / 10,
        perma: Object.assign({}, perma), mid: Object.assign({}, mid), prest: Object.assign({}, prest)
      });
    }
    return rows;
  }

  const LO = {
    BAL, UPGRADES, PERMA, ENEMY, TABS,
    createRun, updateRun, tryBuy, tryBuyPerma, autoBuyMid, autoBuyPerma,
    playerStats, gemsFor, simulateUntilDeath, simulateRuns, beginWave, spawnEnemy,
    defaultPerma, defaultMid, defaultPrest, defaultSave, loadSave, writeSave, migrateSave, midCost, costOf, isUnlocked,
    bossInfo, settlePickups, tryPrestige, prestigeCost, prestMul, tierOf, PRESTIGE_IDS, TIER, MAX_PREST, INFO, PERMA_INFO, effectLine,
    W, get H() { return H; }, get RAIL_Y() { return RAIL_Y; }, SHIP_X,
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

  function wingPair(g, span, y, drop, tip) {
    g.beginPath();
    g.moveTo(-12, y); g.lineTo(-span, y + drop); g.lineTo(-span - 14, y + drop + tip); g.lineTo(-span + 10, y + drop + tip + 8); g.lineTo(-16, y + 18); g.closePath();
  }
  function wingPairR(g, span, y, drop, tip) {
    g.beginPath();
    g.moveTo(12, y); g.lineTo(span, y + drop); g.lineTo(span + 14, y + drop + tip); g.lineTo(span - 10, y + drop + tip + 8); g.lineTo(16, y + 18); g.closePath();
  }
  function flame(g, x, y, h, col) {
    g.save(); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14;
    g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.lineTo(x + 2, y + h); g.lineTo(x - 2, y + h); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.shadowBlur = 6;
    g.beginPath(); g.moveTo(x - 2.5, y); g.lineTo(x + 2.5, y); g.lineTo(x + 1, y + h * 0.65); g.lineTo(x - 1, y + h * 0.65); g.closePath(); g.fill();
    g.restore();
  }
  function plate(g, col, x, y, w, h) {
    neonFill(g, col, () => { g.beginPath(); g.rect(x, y, w, h); }, 0.22);
    neonStroke(g, col, 1.4, () => { g.beginPath(); g.rect(x, y, w, h); }, { bloom: 8 });
  }

  function drawPlayerTo(g, col, accent, tier) {
    col = col || C.cyan; accent = accent || C.magenta;
    tier = tier | 0;
    // hull grows and gains parts with each prestige
    if (tier <= 0) {
      neonFill(g, col, () => pathLWing(g), 0.1);
      neonFill(g, col, () => pathRWing(g), 0.1);
      neonFill(g, col, () => pathPlayer(g), 0.14);
      neonStroke(g, col, 2.2, () => pathLWing(g), { bloom: 16 });
      neonStroke(g, col, 2.2, () => pathRWing(g), { bloom: 16 });
      neonStroke(g, col, 2.4, () => pathPlayer(g), { bloom: 16 });
      neonFill(g, accent, () => pathCanopy(g), 0.35);
      neonStroke(g, accent, 1.8, () => pathCanopy(g), { bloom: 12 });
      neonStroke(g, col, 2, () => { g.beginPath(); g.moveTo(0, -86); g.lineTo(0, -60); }, { bloom: 10 });
      flame(g, -11, 36, 40, col); flame(g, 11, 36, 40, col);
      return;
    }
    const span = 94 + tier * 22;
    const nose = -78 - tier * 10;
    // extra upper fins / canards from Mk II
    if (tier >= 1) {
      neonFill(g, col, () => { g.beginPath(); g.moveTo(-10, -20); g.lineTo(-58 - tier * 8, -48); g.lineTo(-48, -18); g.closePath(); }, 0.12);
      neonFill(g, col, () => { g.beginPath(); g.moveTo(10, -20); g.lineTo(58 + tier * 8, -48); g.lineTo(48, -18); g.closePath(); }, 0.12);
      neonStroke(g, col, 1.8, () => { g.beginPath(); g.moveTo(-10, -20); g.lineTo(-58 - tier * 8, -48); g.lineTo(-48, -18); g.closePath(); }, { bloom: 10 });
      neonStroke(g, col, 1.8, () => { g.beginPath(); g.moveTo(10, -20); g.lineTo(58 + tier * 8, -48); g.lineTo(48, -18); g.closePath(); }, { bloom: 10 });
    }
    // main wings
    neonFill(g, col, () => wingPair(g, span, -8, 40, 16), 0.1);
    neonFill(g, col, () => wingPairR(g, span, -8, 40, 16), 0.1);
    neonStroke(g, col, 2.2 + tier * 0.15, () => wingPair(g, span, -8, 40, 16), { bloom: 16 });
    neonStroke(g, col, 2.2 + tier * 0.15, () => wingPairR(g, span, -8, 40, 16), { bloom: 16 });
    // second wing pair Mk III+
    if (tier >= 2) {
      neonFill(g, col, () => wingPair(g, span * 0.72, 18, 28, 12), 0.1);
      neonFill(g, col, () => wingPairR(g, span * 0.72, 18, 28, 12), 0.1);
      neonStroke(g, col, 2, () => wingPair(g, span * 0.72, 18, 28, 12), { bloom: 12 });
      neonStroke(g, col, 2, () => wingPairR(g, span * 0.72, 18, 28, 12), { bloom: 12 });
    }
    // body
    const body = () => {
      g.beginPath();
      g.moveTo(0, nose);
      g.lineTo(8 + tier, nose + 30);
      g.lineTo(12 + tier, 8);
      g.lineTo(20 + tier * 2, 36);
      g.lineTo(8, 44);
      g.lineTo(0, 48);
      g.lineTo(-8, 44);
      g.lineTo(-20 - tier * 2, 36);
      g.lineTo(-12 - tier, 8);
      g.lineTo(-8 - tier, nose + 30);
      g.closePath();
    };
    neonFill(g, col, body, 0.16);
    neonStroke(g, col, 2.5, body, { bloom: 16 });
    // armor plates Mk II+
    if (tier >= 1) {
      plate(g, col, -18 - tier, -8, 8, 28 + tier * 2);
      plate(g, col, 10 + tier, -8, 8, 28 + tier * 2);
    }
    if (tier >= 3) {
      plate(g, accent, -28, 8, 10, 22);
      plate(g, accent, 18, 8, 10, 22);
    }
    // canopy / glowing core
    const coreR = 8 + tier * 2;
    neonFill(g, accent, () => { g.beginPath(); g.moveTo(0, nose + 30); g.lineTo(coreR, -4); g.lineTo(0, 16); g.lineTo(-coreR, -4); g.closePath(); }, 0.4);
    neonStroke(g, accent, 1.8, () => { g.beginPath(); g.moveTo(0, nose + 30); g.lineTo(coreR, -4); g.lineTo(0, 16); g.lineTo(-coreR, -4); g.closePath(); }, { bloom: 12 });
    if (tier >= 3) {
      g.save(); g.globalAlpha = 0.55; g.fillStyle = "#fff"; g.shadowColor = col; g.shadowBlur = 18;
      g.beginPath(); g.arc(0, -6, 5 + tier, 0, Math.PI * 2); g.fill(); g.restore();
    }
    // nose spike
    neonStroke(g, col, 2, () => { g.beginPath(); g.moveTo(0, nose - 12); g.lineTo(0, nose + 8); }, { bloom: 10 });
    // engine pods
    const pods = tier >= 5 ? [-48, -22, 0, 22, 48] : (tier >= 3 ? [-36, -14, 14, 36] : (tier >= 1 ? [-22, 0, 22] : [-11, 11]));
    const fh = 36 + tier * 8;
    pods.forEach((px) => flame(g, px, 40, px === 0 && tier >= 3 ? fh + 12 : fh, px === 0 ? "#fff" : col));
    // energy halo Mk V+
    if (tier >= 4) {
      neonStroke(g, col, 2, () => { g.beginPath(); g.ellipse(0, -10, 70 + tier * 8, 40 + tier * 4, 0, 0, Math.PI * 2); }, { bloom: 14 });
    }
    if (tier >= 5) {
      neonStroke(g, accent, 1.6, () => { g.beginPath(); g.ellipse(0, -10, 88, 52, 0, 0, Math.PI * 2); }, { bloom: 12 });
      // crown spikes
      neonStroke(g, col, 2, () => {
        g.beginPath();
        for (const sx of [-30, -12, 0, 12, 30]) { g.moveTo(sx - 5, nose + 8); g.lineTo(sx, nose - 22); g.lineTo(sx + 5, nose + 8); }
      }, { bloom: 10 });
    }
    // wingtip lights
    const tips = [[-span, 48], [span, 48]];
    if (tier >= 2) { tips.push([-span * 0.72, 70]); tips.push([span * 0.72, 70]); }
    for (const pt of tips) {
      g.save(); g.fillStyle = accent; g.shadowColor = accent; g.shadowBlur = 12;
      g.beginPath(); g.arc(pt[0], pt[1], 3.4 + tier * 0.3, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }


  function buildBossSprites() {
    // Herald — one-eyed cephalopod bell
    sprite("boss-herald-body", 720, 520, g => {
      const col = C.orange;
      neonFill(g, col, () => { g.beginPath(); g.ellipse(0, -40, 260, 180, 0, 0, Math.PI * 2); }, 0.18);
      neonStroke(g, col, 4, () => { g.beginPath(); g.ellipse(0, -40, 260, 180, 0, 0, Math.PI * 2); }, { bloom: 18 });
      neonStroke(g, C.yellow, 2.4, () => { g.beginPath(); g.ellipse(0, -50, 180, 120, 0, 0, Math.PI * 2); }, { bloom: 12 });
      // ridges
      neonStroke(g, col, 2, () => {
        g.beginPath();
        for (const a of [-0.7, -0.35, 0, 0.35, 0.7]) { g.moveTo(Math.sin(a) * 40, -180); g.quadraticCurveTo(Math.sin(a) * 200, -20, Math.sin(a) * 220, 80); }
      }, { bloom: 8 });
    });
    sprite("boss-herald-eye", 160, 160, g => {
      g.save(); g.fillStyle = C.yellow; g.shadowColor = C.yellow; g.shadowBlur = 20;
      g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange; g.beginPath(); g.arc(0, 4, 28, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a0008"; g.beginPath(); g.arc(0, 6, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-8, -8, 6, 0, Math.PI * 2); g.fill();
      g.restore();
      neonStroke(g, C.yellow, 2.4, () => { g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); }, { bloom: 12 });
    });
    sprite("boss-herald-eyeShut", 160, 160, g => {
      neonStroke(g, C.yellow, 4, () => { g.beginPath(); g.ellipse(0, 0, 54, 8, 0, 0, Math.PI * 2); }, { bloom: 10 });
    });
    sprite("boss-herald-jaw", 280, 160, g => {
      neonFill(g, C.orange, () => { g.beginPath(); g.moveTo(-90, -10); g.lineTo(-70, 40); g.lineTo(0, 58); g.lineTo(70, 40); g.lineTo(90, -10); g.lineTo(40, 8); g.lineTo(0, 4); g.lineTo(-40, 8); g.closePath(); }, 0.2);
      neonStroke(g, C.orange, 2.6, () => { g.beginPath(); g.moveTo(-90, -10); g.lineTo(-70, 40); g.lineTo(0, 58); g.lineTo(70, 40); g.lineTo(90, -10); }, { bloom: 10 });
      neonStroke(g, C.yellow, 2, () => {
        g.beginPath();
        for (const x of [-50, -25, 0, 25, 50]) { g.moveTo(x, 8); g.lineTo(x - 4, 36); g.lineTo(x + 4, 36); g.closePath(); }
      }, { bloom: 8 });
    });
    sprite("boss-herald-jawOpen", 280, 200, g => {
      neonFill(g, C.red, () => { g.beginPath(); g.moveTo(-100, -10); g.lineTo(-80, 70); g.lineTo(0, 96); g.lineTo(80, 70); g.lineTo(100, -10); g.lineTo(0, 20); g.closePath(); }, 0.25);
      neonStroke(g, C.orange, 2.8, () => { g.beginPath(); g.moveTo(-100, -10); g.lineTo(-80, 70); g.lineTo(0, 96); g.lineTo(80, 70); g.lineTo(100, -10); }, { bloom: 10 });
      neonStroke(g, C.yellow, 2.2, () => {
        g.beginPath();
        for (const x of [-60, -30, 0, 30, 60]) { g.moveTo(x, 16); g.lineTo(x - 6, 70); g.lineTo(x + 6, 70); g.closePath(); }
      }, { bloom: 8 });
    });

    // Twin Spire — two-headed serpent
    sprite("boss-twin-body", 820, 520, g => {
      neonFill(g, C.violet, () => { g.beginPath(); g.ellipse(0, 30, 160, 110, 0, 0, Math.PI * 2); }, 0.16);
      neonStroke(g, C.violet, 3.4, () => { g.beginPath(); g.ellipse(0, 30, 160, 110, 0, 0, Math.PI * 2); }, { bloom: 14 });
      // two necks
      for (const sx of [-1, 1]) {
        neonFill(g, C.violet, () => { g.beginPath(); g.moveTo(sx * 40, 0); g.lineTo(sx * 200, -140); g.lineTo(sx * 160, -40); g.lineTo(sx * 80, 40); g.closePath(); }, 0.16);
        neonStroke(g, C.violet, 3, () => { g.beginPath(); g.moveTo(sx * 40, 20); g.lineTo(sx * 190, -150); g.lineTo(sx * 230, -110); g.lineTo(sx * 90, 50); }, { bloom: 12 });
      }
    });
    sprite("boss-twin-head", 240, 240, g => {
      neonFill(g, C.violet, () => { g.beginPath(); g.ellipse(0, 0, 80, 70, 0, 0, Math.PI * 2); }, 0.2);
      neonStroke(g, C.violet, 3, () => { g.beginPath(); g.ellipse(0, 0, 80, 70, 0, 0, Math.PI * 2); }, { bloom: 12 });
      // horn
      neonStroke(g, C.magenta, 2.4, () => { g.beginPath(); g.moveTo(-16, -60); g.lineTo(0, -110); g.lineTo(16, -60); }, { bloom: 10 });
    });
    sprite("boss-twin-eye", 70, 70, g => {
      g.save(); g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 14;
      g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#041018"; g.beginPath(); g.arc(2, 2, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-4, -4, 3, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-twin-eyeShut", 70, 70, g => {
      neonStroke(g, C.cyan, 3, () => { g.beginPath(); g.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2); }, { bloom: 8 });
    });
    sprite("boss-twin-jaw", 180, 120, g => {
      neonStroke(g, C.magenta, 2.6, () => { g.beginPath(); g.moveTo(-50, 0); g.lineTo(-30, 36); g.lineTo(0, 44); g.lineTo(30, 36); g.lineTo(50, 0); }, { bloom: 8 });
    });
    sprite("boss-twin-jawOpen", 180, 160, g => {
      neonFill(g, C.red, () => { g.beginPath(); g.moveTo(-60, -4); g.lineTo(-40, 58); g.lineTo(0, 72); g.lineTo(40, 58); g.lineTo(60, -4); g.closePath(); }, 0.3);
      neonStroke(g, C.magenta, 2.8, () => { g.beginPath(); g.moveTo(-60, -4); g.lineTo(-40, 58); g.lineTo(0, 72); g.lineTo(40, 58); g.lineTo(60, -4); }, { bloom: 10 });
      neonStroke(g, C.cyan, 2, () => { g.beginPath(); g.moveTo(-28, 8); g.lineTo(-22, 48); g.moveTo(0, 10); g.lineTo(0, 56); g.moveTo(28, 8); g.lineTo(22, 48); }, { bloom: 8 });
    });

    // Lattice — insect / coral hydra
    sprite("boss-lattice-body", 800, 560, g => {
      const col = C.cyan;
      neonFill(g, col, () => {
        g.beginPath();
        g.moveTo(0, -200); g.lineTo(220, -80); g.lineTo(260, 80); g.lineTo(120, 180); g.lineTo(0, 140); g.lineTo(-120, 180); g.lineTo(-260, 80); g.lineTo(-220, -80); g.closePath();
      }, 0.14);
      neonStroke(g, col, 3.4, () => {
        g.beginPath();
        g.moveTo(0, -200); g.lineTo(220, -80); g.lineTo(260, 80); g.lineTo(120, 180); g.lineTo(0, 140); g.lineTo(-120, 180); g.lineTo(-260, 80); g.lineTo(-220, -80); g.closePath();
      }, { bloom: 16 });
      neonStroke(g, col, 1.8, () => {
        g.beginPath();
        g.moveTo(-200, -60); g.lineTo(200, -60); g.moveTo(-230, 20); g.lineTo(230, 20); g.moveTo(-180, 100); g.lineTo(180, 100);
        g.moveTo(-120, -140); g.lineTo(-140, 160); g.moveTo(0, -200); g.lineTo(0, 140); g.moveTo(120, -140); g.lineTo(140, 160);
      }, { bloom: 8 });
    });
    sprite("boss-lattice-eye", 56, 56, g => {
      g.save(); g.fillStyle = C.lime; g.shadowColor = C.lime; g.shadowBlur = 12;
      g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#02100a"; g.beginPath(); g.arc(2, 2, 5, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-lattice-eyeShut", 56, 56, g => {
      neonStroke(g, C.lime, 2.4, () => { g.beginPath(); g.ellipse(0, 0, 12, 2.5, 0, 0, Math.PI * 2); }, { bloom: 6 });
    });
    sprite("boss-lattice-pincer", 200, 200, g => {
      neonStroke(g, C.cyan, 3, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(70, 90); g.lineTo(20, 70); g.moveTo(0, 0); g.lineTo(80, 40); g.lineTo(40, 80); }, { bloom: 10 });
    });

    // Harbinger — kaiju
    sprite("boss-harbinger-body", 900, 640, g => {
      const col = C.magenta;
      const leftArm = () => { g.beginPath(); g.moveTo(-80, 20); g.lineTo(-280, 80); g.lineTo(-340, 160); g.lineTo(-280, 200); g.lineTo(-200, 140); g.lineTo(-90, 80); g.closePath(); };
      const rightArm = () => { g.beginPath(); g.moveTo(80, 20); g.lineTo(280, 80); g.lineTo(340, 160); g.lineTo(280, 200); g.lineTo(200, 140); g.lineTo(90, 80); g.closePath(); };
      neonFill(g, col, leftArm, 0.12); neonFill(g, col, rightArm, 0.12);
      neonStroke(g, col, 3, leftArm, { bloom: 14 }); neonStroke(g, col, 3, rightArm, { bloom: 14 });
      neonFill(g, col, () => { g.beginPath(); g.moveTo(0, -160); g.lineTo(120, -40); g.lineTo(140, 80); g.lineTo(60, 200); g.lineTo(0, 160); g.lineTo(-60, 200); g.lineTo(-140, 80); g.lineTo(-120, -40); g.closePath(); }, 0.16);
      neonStroke(g, col, 3.4, () => { g.beginPath(); g.moveTo(0, -160); g.lineTo(120, -40); g.lineTo(140, 80); g.lineTo(60, 200); g.lineTo(0, 160); g.lineTo(-60, 200); g.lineTo(-140, 80); g.lineTo(-120, -40); g.closePath(); }, { bloom: 16 });
      // horns
      neonStroke(g, C.cyan, 3, () => { g.beginPath(); g.moveTo(-70, -120); g.lineTo(-130, -260); g.lineTo(-40, -140); g.moveTo(70, -120); g.lineTo(130, -260); g.lineTo(40, -140); }, { bloom: 12 });
    });
    sprite("boss-harbinger-eye", 80, 80, g => {
      g.save(); g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 16;
      g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#080010"; g.beginPath(); g.arc(4, 0, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-6, -4, 3, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-harbinger-eyeShut", 80, 80, g => {
      neonStroke(g, C.cyan, 3, () => { g.beginPath(); g.ellipse(0, 0, 22, 3, 0, 0, Math.PI * 2); }, { bloom: 8 });
    });
    sprite("boss-harbinger-jaw", 320, 180, g => {
      neonStroke(g, C.magenta, 3, () => { g.beginPath(); g.moveTo(-110, 0); g.lineTo(-80, 50); g.lineTo(0, 70); g.lineTo(80, 50); g.lineTo(110, 0); }, { bloom: 10 });
    });
    sprite("boss-harbinger-jawOpen", 360, 240, g => {
      neonFill(g, C.red, () => { g.beginPath(); g.moveTo(-130, -10); g.lineTo(-90, 90); g.lineTo(0, 120); g.lineTo(90, 90); g.lineTo(130, -10); g.closePath(); }, 0.28);
      neonStroke(g, C.magenta, 3.2, () => { g.beginPath(); g.moveTo(-130, -10); g.lineTo(-90, 90); g.lineTo(0, 120); g.lineTo(90, 90); g.lineTo(130, -10); }, { bloom: 12 });
      neonStroke(g, C.white, 2, () => {
        g.beginPath();
        for (const x of [-80, -40, 0, 40, 80]) { g.moveTo(x, 10); g.lineTo(x - 8, 80); g.lineTo(x + 8, 80); g.closePath(); }
      }, { bloom: 8 });
    });

    // Eclipse — void leviathan ring-maw
    sprite("boss-eclipse-body", 860, 620, g => {
      neonStroke(g, C.magenta, 8, () => { g.beginPath(); g.arc(0, 0, 230, 0, Math.PI * 2); }, { bloom: 18 });
      neonStroke(g, C.violet, 4, () => { g.beginPath(); g.arc(0, 0, 180, 0, Math.PI * 2); }, { bloom: 14 });
      neonFill(g, "#090014", () => { g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); }, 0.85);
      neonStroke(g, C.pink, 2.4, () => {
        g.beginPath();
        for (let k = 0; k < 16; k++) {
          const a = k * Math.PI / 8;
          g.moveTo(Math.cos(a) * 150, Math.sin(a) * 150);
          g.lineTo(Math.cos(a) * 125, Math.sin(a) * 125);
        }
      }, { bloom: 10 });
      neonStroke(g, C.magenta, 3, () => { g.beginPath(); g.arc(0, 0, 260, 0, Math.PI * 2); }, { bloom: 12 });
    });
    sprite("boss-eclipse-eye", 64, 64, g => {
      g.save(); g.fillStyle = C.pink; g.shadowColor = C.pink; g.shadowBlur = 14;
      g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1a0010"; g.beginPath(); g.arc(3, 2, 6, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-eclipse-eyeShut", 64, 64, g => {
      neonStroke(g, C.pink, 2.6, () => { g.beginPath(); g.ellipse(0, 0, 14, 3, 0, 0, Math.PI * 2); }, { bloom: 6 });
    });

    sprite("boss-membrane", 700, 560, g => {
      g.globalAlpha = 0.18; g.fillStyle = C.violet; g.shadowColor = C.violet; g.shadowBlur = 28;
      g.beginPath(); g.ellipse(0, 0, 280, 230, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      neonStroke(g, C.violet, 3, () => { g.beginPath(); g.ellipse(0, 0, 280, 230, 0, 0, Math.PI * 2); }, { bloom: 16 });
      neonStroke(g, C.cyan, 1.6, () => { g.beginPath(); g.ellipse(0, 0, 240, 196, 0, 0, Math.PI * 2); }, { bloom: 8 });
    });
  }

  function buildSprites() {
    sprite("player", 360, 320, g => drawPlayerTo(g, C.cyan, C.magenta, 0));
    TIER.forEach((ti, i) => sprite("player-t" + i, 360, 320, g => drawPlayerTo(g, ti.color, ti.accent, i)));
    sprite("pdef-turret", 48, 48, g => {
      neonFill(g, C.lime, () => { g.beginPath(); g.moveTo(0, -16); g.lineTo(12, 8); g.lineTo(0, 14); g.lineTo(-12, 8); g.closePath(); }, 0.2);
      neonStroke(g, C.lime, 1.8, () => { g.beginPath(); g.moveTo(0, -16); g.lineTo(12, 8); g.lineTo(0, 14); g.lineTo(-12, 8); g.closePath(); }, { bloom: 10 });
      g.save(); g.fillStyle = "#fff"; g.shadowColor = C.lime; g.shadowBlur = 8;
      g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("engine", 40, 70, g => {
      g.fillStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(-7, 0); g.lineTo(7, 0); g.lineTo(2, 48); g.lineTo(-2, 48); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(-3, 0); g.lineTo(3, 0); g.lineTo(1, 32); g.lineTo(-1, 32); g.closePath(); g.fill();
    });
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
    TIER.forEach((ti, i) => {
      sprite("drone-t" + i, 72, 72, g => {
        const body = () => {
          g.beginPath();
          if (i <= 0) { g.moveTo(0, -28); g.lineTo(18, 0); g.lineTo(0, 18); g.lineTo(-18, 0); g.closePath(); }
          else if (i === 1) { g.moveTo(0, -30); g.lineTo(16, -4); g.lineTo(10, 18); g.lineTo(0, 10); g.lineTo(-10, 18); g.lineTo(-16, -4); g.closePath(); }
          else if (i === 2) { for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 24, Math.sin(a) * 24); } g.closePath(); }
          else if (i === 3) { for (let k = 0; k < 8; k++) { const r = k % 2 ? 28 : 16; const a = -Math.PI / 2 + k * Math.PI / 4; g[k ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
          else if (i === 4) { g.moveTo(0, -32); g.lineTo(10, -8); g.lineTo(26, -4); g.lineTo(8, 6); g.lineTo(12, 24); g.lineTo(0, 12); g.lineTo(-12, 24); g.lineTo(-8, 6); g.lineTo(-26, -4); g.lineTo(-10, -8); g.closePath(); }
          else { for (let k = 0; k < 8; k++) { const r = k % 2 ? 30 : 14; const a = -Math.PI / 2 + k * Math.PI / 4; g[k ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
        };
        neonFill(g, ti.color, body, 0.16); neonStroke(g, ti.color, 2, body, { bloom: 12 });
        if (i >= 2) {
          g.save(); g.fillStyle = ti.core; g.shadowColor = ti.color; g.shadowBlur = 10;
          g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill(); g.restore();
        }
      });
      sprite("shield-t" + i, 320, 280, g => {
        g.globalAlpha = 0.14; g.fillStyle = ti.color; g.shadowColor = ti.color; g.shadowBlur = 24;
        if (i <= 1) { g.beginPath(); g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2); g.fill(); }
        else if (i === 2 || i === 3) {
          g.beginPath();
          for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 130, Math.sin(a) * 112); }
          g.closePath(); g.fill();
        } else { g.beginPath(); g.ellipse(0, 0, 136, 118, 0, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;
        neonStroke(g, ti.color, i >= 4 ? 2.8 : 2.2, () => {
          g.beginPath();
          if (i <= 1) g.ellipse(0, 0, 128, 110, 0, 0, Math.PI * 2);
          else if (i === 2 || i === 3) {
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 130, Math.sin(a) * 112); }
            g.closePath();
          } else g.ellipse(0, 0, 136, 118, 0, 0, Math.PI * 2);
        }, { bloom: 14 });
        if (i === 1 || i >= 4) {
          neonStroke(g, ti.core, 1.6, () => { g.beginPath(); g.ellipse(0, 0, 96, 80, 0, 0, Math.PI * 2); }, { bloom: 8 });
        }
        if (i === 3) {
          neonStroke(g, ti.core, 1.5, () => {
            g.beginPath();
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 80, Math.sin(a) * 68); }
            g.closePath();
          }, { bloom: 8 });
        }
        if (i >= 2 && i <= 3) {
          neonStroke(g, ti.color, 1.2, () => {
            g.beginPath();
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.moveTo(0, 0); g.lineTo(Math.cos(a) * 130, Math.sin(a) * 112); }
          }, { bloom: 6 });
        }
        if (i >= 5) {
          neonStroke(g, ti.accent, 1.6, () => { g.beginPath(); g.ellipse(0, 0, 150, 130, 0, 0, Math.PI * 2); }, { bloom: 10 });
          neonStroke(g, ti.color, 1.4, () => {
            g.beginPath();
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(Math.cos(a) * 136, Math.sin(a) * 118); g.lineTo(Math.cos(a) * 156, Math.sin(a) * 136); }
          }, { bloom: 8 });
        }
      });
      sprite("armor-t" + i, 200, 180, g => {
        const col = ti.color;
        plate(g, col, -40, -18, 14, 40 + i * 3);
        plate(g, col, 26, -18, 14, 40 + i * 3);
        if (i >= 2) { plate(g, ti.accent, -54, 6, 12, 24); plate(g, ti.accent, 42, 6, 12, 24); }
        if (i >= 4) { plate(g, col, -20, 22, 40, 10); }
      });
      sprite("streak-t" + i, 140, 48, g => {
        g.lineCap = "round";
        const drawBolt = (oy, len, w) => {
          g.shadowColor = ti.color; g.shadowBlur = 12; g.strokeStyle = ti.color; g.lineWidth = w;
          g.beginPath(); g.moveTo(-len, oy); g.lineTo(len, oy); g.stroke();
          g.shadowBlur = 4; g.strokeStyle = ti.core; g.lineWidth = Math.max(1.2, w * 0.4);
          g.beginPath(); g.moveTo(-len + 6, oy); g.lineTo(len - 2, oy); g.stroke();
        };
        if (i <= 0) drawBolt(0, 16, 4);
        else if (i === 1) drawBolt(0, 20, 5.5);
        else if (i === 2) { drawBolt(-5, 20, 3.6); drawBolt(5, 20, 3.6); }
        else if (i === 3) { drawBolt(-8, 22, 3.4); drawBolt(0, 24, 5); drawBolt(8, 22, 3.4); }
        else if (i === 4) {
          g.shadowColor = ti.color; g.shadowBlur = 16; g.fillStyle = ti.color;
          g.beginPath(); g.moveTo(-40, 0); g.lineTo(36, -7); g.lineTo(44, 0); g.lineTo(36, 7); g.closePath(); g.fill();
          g.shadowBlur = 6; g.fillStyle = ti.core;
          g.beginPath(); g.moveTo(-28, 0); g.lineTo(30, -3); g.lineTo(36, 0); g.lineTo(30, 3); g.closePath(); g.fill();
        } else {
          g.shadowColor = ti.color; g.shadowBlur = 18; g.fillStyle = ti.color;
          g.beginPath(); g.moveTo(-48, 0); g.lineTo(30, -10); g.lineTo(50, 0); g.lineTo(30, 10); g.closePath(); g.fill();
          g.fillStyle = ti.accent; g.beginPath(); g.moveTo(-20, 0); g.lineTo(24, -5); g.lineTo(40, 0); g.lineTo(24, 5); g.closePath(); g.fill();
          g.shadowBlur = 6; g.fillStyle = "#fff";
          g.beginPath(); g.moveTo(-16, 0); g.lineTo(28, -2); g.lineTo(36, 0); g.lineTo(28, 2); g.closePath(); g.fill();
        }
      });
      sprite("missile-t" + i, 64, 28, g => {
        const L = 16 + i * 3, h = 6 + i * 1.2;
        g.shadowColor = ti.color; g.shadowBlur = 12 + i;
        g.fillStyle = ti.color;
        g.beginPath(); g.moveTo(L, 0); g.lineTo(-L + 4, -h); g.lineTo(-L + 8, 0); g.lineTo(-L + 4, h); g.closePath(); g.fill();
        g.fillStyle = ti.core; g.beginPath(); g.moveTo(L - 4, 0); g.lineTo(-6, -h * 0.45); g.lineTo(-6, h * 0.45); g.closePath(); g.fill();
        if (i >= 2) {
          g.fillStyle = ti.accent;
          g.beginPath(); g.moveTo(-4, -h); g.lineTo(-L + 2, -h - 4); g.lineTo(-2, 0); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(-4, h); g.lineTo(-L + 2, h + 4); g.lineTo(-2, 0); g.closePath(); g.fill();
        }
        // exhaust
        g.shadowColor = ti.color; g.shadowBlur = 14;
        g.fillStyle = i >= 4 ? "#fff" : ti.core;
        g.beginPath(); g.moveTo(-L + 8, 0); g.lineTo(-L - 6 - i * 2, -3); g.lineTo(-L - 10 - i * 3, 0); g.lineTo(-L - 6 - i * 2, 3); g.closePath(); g.fill();
      });
    });
    buildBossSprites();
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


  function strokeTentacle(g, x0, y0, ang, len, wobble, color, width) {
    const x1 = x0 + Math.cos(ang) * len * 0.45 + Math.cos(ang + 1.2) * wobble;
    const y1 = y0 + Math.sin(ang) * len * 0.45 + Math.sin(ang + 1.2) * wobble;
    const x2 = x0 + Math.cos(ang) * len;
    const y2 = y0 + Math.sin(ang) * len;
    g.strokeStyle = color; g.lineWidth = width; g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = Math.max(1, width * 0.3);
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
  }

  function drawBossMonster(g, e, t) {
    const kind = e.bossKind || "herald";
    const rage = !!e.enraged;
    const shielded = (e.shield || 0) > 0;
    const firing = (e.sweepHot > 0) || ((e.tele || 0) > 0) || ((e.fireCd || 1) < 0.22);
    const blink = ((t * 0.65 + (e.phase || 0)) % 3.6) > 3.32;
    g.save();
    g.translate(e.x, e.y);
    if (rage) {
      g.save();
      g.globalAlpha = 0.22 + 0.08 * Math.sin(t * 8);
      g.fillStyle = C.red;
      g.beginPath(); g.ellipse(0, 0, e.r * 1.8, e.r * 1.45, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    if (shielded) {
      g.save();
      g.globalAlpha = 0.35 + 0.1 * Math.sin(t * 4);
      blit(g, "boss-membrane", 0, 0, kind === "eclipse" ? 1.15 : 1.05);
      g.restore();
    }
    const tentCol = rage ? C.red : (kind === "herald" ? C.orange : (kind === "lattice" ? C.cyan : C.magenta));
    if (kind === "herald") {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const base = Math.PI * 0.25 + i * (Math.PI * 0.65 / (n - 1));
        const wob = Math.sin(t * (rage ? 5 : 2.4) + i * 0.9) * (rage ? 38 : 24);
        strokeTentacle(g, Math.sin(base - Math.PI / 2) * 90, 40, base, 210 + (i % 3) * 30, wob, tentCol, 7 - (i % 3));
      }
      blit(g, "boss-herald-body", 0, 0, 1);
      blit(g, blink ? "boss-herald-eyeShut" : "boss-herald-eye", 0, -30, rage ? 1.15 : 1);
      blit(g, firing ? "boss-herald-jawOpen" : "boss-herald-jaw", 0, 70, 1);
    } else if (kind === "twin") {
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ang = Math.PI * 0.45 + sx * (0.4 + i * 0.15);
          const wob = Math.sin(t * 3 + i + sx) * 22;
          strokeTentacle(g, sx * 70, 60, ang, 180 + i * 20, wob, tentCol, 6);
        }
      }
      blit(g, "boss-twin-body", 0, 40, 1.1);
      for (const sx of [-1, 1]) {
        const hx = sx * 210, hy = -80 + Math.sin(t * 2.2 + sx) * 8;
        g.save(); g.translate(hx, hy); g.rotate(sx * 0.2 + Math.sin(t * 1.4) * 0.06 * sx);
        blit(g, "boss-twin-head", 0, 0, 1.35);
        blit(g, blink ? "boss-twin-eyeShut" : "boss-twin-eye", sx * -18, -14, 1.3);
        blit(g, firing ? "boss-twin-jawOpen" : "boss-twin-jaw", 0, 50, 1.25);
        g.restore();
        // claw
        g.save(); g.translate(sx * 150, 90); g.rotate(sx * 0.6 + Math.sin(t * 2 + sx) * 0.2);
        g.strokeStyle = tentCol; g.lineWidth = 5; g.lineCap = "round";
        g.beginPath(); g.moveTo(0, 0); g.lineTo(sx * 40, 70); g.lineTo(sx * 10, 80); g.moveTo(0, 0); g.lineTo(sx * 70, 50); g.stroke();
        g.restore();
      }
    } else if (kind === "lattice") {
      blit(g, "boss-lattice-body", 0, 0, 1);
      const eyes = [[-90, -40], [0, -70], [90, -40], [-140, 30], [140, 30], [-60, 70], [60, 70], [0, 10]];
      for (let i = 0; i < eyes.length; i++) {
        const shut = blink && (i % 3 === (t * 2 | 0) % 3);
        blit(g, shut ? "boss-lattice-eyeShut" : "boss-lattice-eye", eyes[i][0], eyes[i][1], 1);
      }
      for (const sx of [-1, 1]) {
        g.save(); g.translate(sx * 200, 80); g.rotate(sx * (0.4 + Math.sin(t * (firing ? 6 : 2.2)) * 0.25));
        g.scale(sx, 1);
        blit(g, "boss-lattice-pincer", 0, 0, 1);
        g.restore();
      }
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI * 0.35 + i * 0.2;
        strokeTentacle(g, (i - 2) * 50, 140, ang, 150, Math.sin(t * 2.8 + i) * 20, tentCol, 5);
      }
    } else if (kind === "harbinger") {
      for (let i = 0; i < 6; i++) {
        const ang = Math.PI * 0.3 + i * 0.18;
        strokeTentacle(g, (i - 2.5) * 40, 140, ang, 200 + i * 8, Math.sin(t * (rage ? 5 : 2.2) + i) * 28, tentCol, 8);
      }
      blit(g, "boss-harbinger-body", 0, 0, 1);
      blit(g, blink ? "boss-harbinger-eyeShut" : "boss-harbinger-eye", -48, -40, rage ? 1.2 : 1);
      blit(g, blink ? "boss-harbinger-eyeShut" : "boss-harbinger-eye", 48, -40, rage ? 1.2 : 1);
      blit(g, firing ? "boss-harbinger-jawOpen" : "boss-harbinger-jaw", 0, 70, 1);
    } else {
      // eclipse leviathan
      for (let i = 0; i < 10; i++) {
        const ang = i * Math.PI / 5 + 0.2;
        const wob = Math.sin(t * (rage ? 4.5 : 2) + i) * 30;
        strokeTentacle(g, Math.cos(ang) * 230, Math.sin(ang) * 230, ang, 170, wob, tentCol, 6);
      }
      blit(g, "boss-eclipse-body", 0, 0, 1);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + t * 0.15;
        const shut = blink && (i % 2 === 0);
        blit(g, shut ? "boss-eclipse-eyeShut" : "boss-eclipse-eye", Math.cos(a) * 205, Math.sin(a) * 205, 1);
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


  function drawTierShowcase(g, t) {
    const ids = [0, 2, 5];
    const labels = ["Mk I  CYAN", "Mk III  PLASMA", "Mk VI  VOID"];
    const xs = [200, 540, 880];
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, 0, W, H);
    g.textAlign = "center";
    g.font = "700 26px Tomorrow, sans-serif";
    g.fillStyle = "#eaffff";
    g.fillText("PRESTIGE LOOKS", W / 2, 100);
    g.font = "600 18px Tomorrow, sans-serif";
    g.fillText("Ship  ·  Bullets  ·  Laser  ·  Missiles  ·  Drones  ·  Shield", W / 2, 136);
    for (let n = 0; n < 3; n++) {
      const i = ids[n], x = xs[n], y = SHIP_Y, ti = TIER[i];
      g.fillStyle = ti.color;
      g.font = "700 24px Orbitron, sans-serif";
      g.fillText(labels[n], x, 180);
      g.globalAlpha = 0.85;
      blit(g, "shield-t" + i, x, y, 0.95 + i * 0.04);
      g.globalAlpha = 1;
      blit(g, "player-t" + i, x, y, 0.92 + i * 0.05);
      if (i >= 1) blit(g, "armor-t" + i, x, y, 0.95);
      blit(g, "drone-t" + i, x - 160 - i * 8, y - 24, 0.85 + i * 0.05);
      blit(g, "drone-t" + i, x + 160 + i * 8, y - 24, 0.85 + i * 0.05);
      const boltScale = i >= 5 ? 1.35 : (i >= 3 ? 1.2 : 1.05);
      for (let k = 0; k < 7; k++) {
        const yy = y - 140 - k * 120 - ((t * 280 + n * 30) % 120);
        g.save(); g.translate(x, yy); g.rotate(-Math.PI / 2);
        blit(g, "streak-t" + i, 0, 0, boltScale);
        g.restore();
      }
      g.save(); g.translate(x + 54, y - 250); g.rotate(-Math.PI / 2 + 0.12);
      blit(g, "missile-t" + i, 0, 0, 1.15 + i * 0.12);
      g.restore();
      // laser: thickness and style follow the tier
      drawLaserLook(g, x - 30, y - 80, x - 90, 220, i, 1);
    }
  }

  function drawLaserLook(g, x0, y0, x1, y1, tier, alpha) {
    const ti = TIER[Math.max(0, Math.min(5, tier | 0))];
    const a = alpha == null ? 1 : alpha;
    const w = 5 + tier * 2.4;
    g.save();
    if (tier >= 5) {
      // spiral / helix around a fat core
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      g.strokeStyle = ti.color; g.globalAlpha = 0.35 * a; g.lineWidth = w * 2.2;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.globalAlpha = 0.8 * a; g.lineWidth = 2; g.strokeStyle = ti.accent;
      g.beginPath();
      for (let s = 0; s <= 18; s++) {
        const u = s / 18, ang = u * 8, r = 10 + 6 * Math.sin(u * 12);
        const x = x0 + ux * len * u + px * Math.sin(ang) * r;
        const y = y0 + uy * len * u + py * Math.sin(ang) * r;
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = "#fff";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    } else if (tier >= 4) {
      // split beam
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const px = -dy / len * 10, py = dx / len * 10;
      g.strokeStyle = ti.color; g.globalAlpha = 0.4 * a; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 + px, y1 + py); g.stroke();
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - px, y1 - py); g.stroke();
      g.globalAlpha = a; g.lineWidth = 2.4; g.strokeStyle = ti.core;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    } else if (tier >= 2) {
      g.strokeStyle = ti.color; g.globalAlpha = 0.4 * a; g.lineWidth = w + 6;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      // crackle
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, px = -uy, py = ux;
      g.globalAlpha = 0.7 * a; g.lineWidth = 1.6; g.strokeStyle = ti.accent;
      g.beginPath();
      for (let s = 0; s <= 10; s++) {
        const u = s / 10, jag = ((s % 2) ? 1 : -1) * 7;
        const x = x0 + ux * len * u + px * jag, y = y0 + uy * len * u + py * jag;
        if (s === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      g.globalAlpha = a; g.lineWidth = 2.4; g.strokeStyle = "#fff";
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    } else {
      g.strokeStyle = ti.color; g.globalAlpha = 0.35 * a; g.lineWidth = w + 4;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.globalAlpha = a; g.lineWidth = 2.2; g.strokeStyle = ti.core;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.restore();
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
      blit(g, "player-t0", SHIP_X, 1120, 1.25);
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
      const overTier = (save && save.prest && save.prest.ship) || 0;
      blit(g, "player-t" + overTier, 900, Math.min(H - 200, 1310), 0.58);
    } else if (run) {
      const t = run.time;
      const st = playerStats(run);
      if (run._tierShow) {
        drawTierShowcase(g, t);
        if (sh > 0) g.restore();
        return;
      }

      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (e.type === "boss") {
          drawBossMonster(g, e, t);
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
        drawLaserLook(g, L.x0, L.y0, L.x1, L.y1, L.tier || 0, a);
      }
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        const a = Math.atan2(b.vy, b.vx);
        if (b.kind === "missile") {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          blit(g, "missile-t" + (b.tier || 0), 0, 0, 1.1 + (b.tier || 0) * 0.18);
          g.restore();
        } else if (b.friendly) {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          blit(g, "streak-t" + (b.tier || 0), 0, 0, (b.crit ? 1.2 : 1) * (1 + (b.tier || 0) * 0.06));
          g.restore();
        } else {
          const key = b.color === C.pink ? "boltP" : (b.color === C.orange ? "boltO" : "boltM");
          blitGlow(g, key, b.x, b.y, 1);
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
      const dkey = "drone-t" + (st.tierDrone || 0);
      const dTier = st.tierDrone || 0;
      for (let i = 0; i < drones; i++) {
        const p = dronePos(i, t, drones);
        if (dTier >= 2) {
          g.save(); g.globalAlpha = 0.28; g.strokeStyle = TIER[dTier].color; g.lineWidth = 2;
          g.beginPath(); g.arc(p.x, p.y, 22 + dTier * 3, t * 3 + i, t * 3 + i + 1.8); g.stroke(); g.restore();
        }
        blit(g, dkey, p.x, p.y, 0.8 + dTier * 0.06);
      }
      if (st.maxShield > 0 && run.shield > 0) {
        g.save(); g.globalAlpha = 0.55 + 0.45 * (run.shield / st.maxShield);
        blit(g, "shield-t" + (st.tierShield || 0), SHIP_X, SHIP_Y, 1);
        g.restore();
      }
      const blink = run.invuln > 0 && Math.sin(t * 30) > 0;
      if (!blink) {
        const shipT = st.tierShip || 0;
        g.save();
        g.translate(SHIP_X, SHIP_Y);
        g.rotate((run.hullAng || -Math.PI / 2) + Math.PI / 2);
        blit(g, "player-t" + shipT, 0, 0, 0.95 + shipT * 0.05);
        if ((run.up.armor || 0) > 0 || (st.tierArmor || 0) > 0) {
          blit(g, "armor-t" + Math.max(st.tierArmor || 0, Math.min(5, run.up.armor || 0)), 0, 0, 0.95 + shipT * 0.04);
        }
        g.restore();
      }
      if (st.pdefLv > 0) {
        const n = st.pdefTurrets || 1;
        for (let i = 0; i < n; i++) {
          const tp = pdefTurretPos(i, n);
          blit(g, "pdef-turret", tp.x, tp.y, 1.45);
        }
      }
      if (run.pdefBeams && run.pdefBeams.length) {
        g.save();
        for (let i = 0; i < run.pdefBeams.length; i++) {
          const z = run.pdefBeams[i];
          const a = Math.max(0, z.t / 0.16);
          g.globalAlpha = a;
          g.strokeStyle = z.deflect ? C.yellow : C.lime;
          g.lineWidth = z.deflect ? 5 : 4;
          g.beginPath(); g.moveTo(z.x0, z.y0); g.lineTo(z.x1, z.y1); g.stroke();
          g.strokeStyle = "#fff"; g.lineWidth = 1;
          g.beginPath(); g.moveTo(z.x0, z.y0); g.lineTo(z.x1, z.y1); g.stroke();
        }
        g.restore();
        g.globalAlpha = 1;
      }

      // boss telegraph / sweep
      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (e.type !== "boss" || !e.beamX1) continue;
        const hot = e.sweepHot > 0;
        g.save();
        g.globalAlpha = hot ? 0.85 : 0.35;
        g.strokeStyle = hot ? C.magenta : C.cyan;
        g.lineWidth = hot ? 7 : 3;
        g.beginPath(); g.moveTo(e.x, e.y + 80); g.lineTo(e.beamX1, e.beamY1); g.stroke();
        if (hot) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(e.x, e.y + 80); g.lineTo(e.beamX1, e.beamY1); g.stroke(); }
        g.restore();
      }

      g.font = "800 28px Tomorrow, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineJoin = "round"; g.lineCap = "round";
      g.imageSmoothingEnabled = false;
      for (let i = 0; i < run.floaters.length; i++) {
        const f = run.floaters[i];
        const a = 1 - f.t / f.life;
        const fx = Math.round(f.x), fy = Math.round(f.y);
        g.globalAlpha = Math.max(0, a);
        g.lineWidth = 3; g.strokeStyle = "rgba(0,0,0,0.92)";
        g.strokeText(f.text, fx, fy);
        g.fillStyle = f.color;
        g.fillText(f.text, fx, fy);
      }
      g.imageSmoothingEnabled = true;
      g.globalAlpha = 1;
      if (run.prestFx) {
        const fx = run.prestFx;
        const a = Math.min(1, fx.t / 0.35, (fx.t || 0));
        g.save();
        g.fillStyle = fx.color || C.yellow;
        g.globalAlpha = 0.18 * a;
        g.fillRect(0, 0, W, H);
        g.restore();
      }
      if (run.flash > 0) {
        g.fillStyle = run.phase === "intro" ? "rgba(255,43,214,0.22)" : (run.prestFx ? "rgba(255,229,0,0.16)" : "rgba(255,80,80,0.18)");
        g.globalAlpha = Math.min(1, run.flash * 1.4);
        g.fillRect(0, 0, W, H);
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
      let holdT = 0, holdTimer = null;
      const startHold = ev => { holdT = Date.now(); holdTimer = setTimeout(() => { holdTimer = null; openInfo("mid", def.id); }, 450); };
      const endHold = ev => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
      b.addEventListener("pointerdown", startHold);
      b.addEventListener("pointerup", endHold);
      b.addEventListener("pointerleave", endHold);
      b.addEventListener("contextmenu", ev => { ev.preventDefault(); openInfo("mid", def.id); });
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
    const def = UP_BY_ID[id];
    let ok = false;
    if (def && def.prestige && (run.up[id] || 0) >= 10) ok = tryPrestige(run, id);
    else ok = tryBuy(run, id);
    if (ok) {
      audio.buy();
      if (!demo) writeSave(save);
      consoleDirty = true; hudDirty = true;
      refreshConsole(true); refreshHud(true);
      if (run.prestFx) showPrestigeToast(run.prestFx);
    } else audio.deny();
  }

  let lastConsoleKey = "";
  function refreshConsole(force) {
    if (!run) return;
    const st = playerStats(run);
    const key = consoleTab + "|" + (run.wave|0) + "|" + (run.coins|0) + "|" + (save.gems|0) + "|" + JSON.stringify(run.up) + "|" + JSON.stringify(run.prest || {});
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
      const tier = (run.prest && run.prest[id]) || 0;
      const atPrest = !!(def.prestige && lv >= 10 && tier < MAX_PREST);
      const maxed = def.prestige ? (tier >= MAX_PREST && lv >= 10) : lv >= def.max;
      const pcost = atPrest ? prestigeCost(id, tier) : null;
      const cost = maxed ? 0 : (atPrest ? pcost.coins : midCost(id, lv));
      const can = unlocked && !maxed && (atPrest ? (run.coins >= pcost.coins && save.gems >= pcost.gems) : run.coins >= cost);
      const nameEl = btn.querySelector(".name"), lvlEl = btn.querySelector(".lvl"), costEl = btn.querySelector(".cost");
      const star = tier > 0 ? " " + "★".repeat(Math.min(5, tier)) : "";
      if (nameEl.textContent !== def.name + star) nameEl.textContent = def.name + star;
      let lvlTxt;
      if (!unlocked) lvlTxt = def.milestone ? "W" + def.milestone : "LOCKED";
      else if (atPrest) lvlTxt = "Lv. 10  ·  " + tierOf(tier).name;
      else if (maxed) lvlTxt = "MAX" + (tier ? "  " + tierOf(tier).name : "");
      else lvlTxt = "Lv. " + lv + (tier ? "  " + tierOf(tier).name : "");
      if (lvlEl.textContent !== lvlTxt) lvlEl.textContent = lvlTxt;
      let costTxt;
      if (!unlocked) costTxt = midCost(id, 0) + " ¢";
      else if (maxed) costTxt = "—";
      else if (atPrest) costTxt = "PRESTIGE  " + pcost.coins + "¢ + " + pcost.gems + "◆";
      else costTxt = cost + " ¢";
      if (costEl.textContent !== costTxt) costEl.textContent = costTxt;
      let cls = "up-btn";
      if (!unlocked) cls += " locked";
      else if (atPrest && can) cls += " prestige";
      else if (atPrest) cls += " prestige dim";
      else if (maxed || !can) cls += " dim";
      else if (id === "hp" && run.hp < st.maxHp * 0.5) cls += " hot";
      else if (id === "laser" || id === "orbit" || id === "emp" || id === "ship") cls += " hot";
      else if (id === "shield") cls += " mag";
      if (tier > 0) cls += " t" + Math.min(5, tier);
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
    run = createRun(save.perma, { bestWave: save.bestWave, persist: !demo, seed: (Date.now() ^ 0x9e3779b9) >>> 0, mid: save.mid, prest: save.prest, carryCoins: save.carryCoins, gemWallet: save });
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
    if (root.LastOutpost) root.LastOutpost._run = run;
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
      save.prest = Object.assign(defaultPrest(), run.prest || save.prest);
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
  const infoBtn = el("btn-info");
  if (infoBtn) infoBtn.addEventListener("click", () => openInfo(consoleTab));
  const infoClose = el("info-close");
  if (infoClose) infoClose.addEventListener("click", closeInfo);
  const infoScrim = el("info");
  if (infoScrim) infoScrim.addEventListener("click", ev => { if (ev.target.id === "info") closeInfo(); });
  document.querySelectorAll(".info-tab").forEach(b => b.addEventListener("click", () => buildInfo(b.dataset.tab)));

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
    if (ev.code === "KeyI") { ev.preventDefault(); const box = el("info"); if (box && box.classList.contains("show")) closeInfo(); else openInfo(consoleTab); }
    if (ev.code === "Escape") {
      const box = el("info");
      if (box && box.classList.contains("show")) { ev.preventDefault(); closeInfo(); }
    }
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


  function starsHtml(n) {
    let h = "";
    for (let i = 0; i < n; i++) h += "★";
    return h;
  }

  function showPrestigeToast(fx) {
    const elT = document.getElementById("prest-toast");
    if (!elT) return;
    elT.querySelector(".pt-k").textContent = "PRESTIGE";
    elT.querySelector(".pt-v").textContent = (fx.name || "") + "  " + tierOf(fx.tier).name;
    elT.querySelector(".pt-s").textContent = tierOf(fx.tier).label + "  " + starsHtml(fx.tier);
    elT.style.color = fx.color;
    elT.classList.add("show");
    setTimeout(() => elT.classList.remove("show"), 1100);
  }

  function openInfo(tab, focusId) {
    const root = el("info");
    if (!root) return;
    root.classList.add("show");
    const ui = el("play-ui");
    if (ui) ui.classList.add("hidden");
    buildInfo(tab || "atk", focusId);
  }
  function closeInfo() {
    const root = el("info");
    if (root) root.classList.remove("show");
    const ui = el("play-ui");
    if (ui && run && !run._tierShow) ui.classList.remove("hidden");
  }

  function buildInfo(tab, focusId) {
    const body = el("info-body");
    if (!body) return;
    document.querySelectorAll(".info-tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const how = "<div class=\"info-how\"><h3>HOW PRESTIGE WORKS</h3><p>Bullets, Laser, Missiles, Drones, Armor, Shield and the Ship cap at level 10. The button then becomes <b>PRESTIGE</b>. Paying the coin + gem cost resets that item to level 1 at the next tier: it keeps a bank of the previous 10 levels, gains a <b>1.55x power multiplier per tier</b>, and changes its shape and color (Mk I cyan, Mk II gold, Mk III plasma, Mk IV white-hot, Mk V lime, Mk VI void). Tiers stay with you when you die, just like other console upgrades. Gems spent are gone; gems you earn on a run are never cut by death.</p><p>First prestige costs <b>" + prestigeCost("dmg", 0).coins + "c + " + prestigeCost("dmg", 0).gems + " gems</b>. Each further tier costs more. Secondaries such as Fire Rate, Crit, Pierce and Magnet keep high caps and do not prestige.</p></div>";
    let html = "";
    if (tab === "prestige") html = how;
    else if (tab === "perma") {
      html = '<div class="info-sec">Permanent gem trees. These persist and stack on top of mid-run upgrades and prestige.</div>';
      ["atk","def","eco"].forEach(k => {
        html += '<h3 class="info-h">' + (k === "atk" ? "ATTACK" : k === "def" ? "DEFENSE" : "ECONOMY") + "</h3>";
        PERMA[k].forEach(def => {
          const lv = (save.perma && save.perma[def.id]) || 0;
          html += infoCard(def.name, PERMA_INFO[def.id] || "", "Lv " + lv, lv >= def.max ? "MAX" : ("Next costs " + costOf(def, lv) + " ◆"), "perma-" + k);
        });
      });
    } else {
      const label = tab === "atk" ? "ATTACK" : tab === "def" ? "DEFENSE" : "UTILITY";
      html = '<div class="info-sec">Mid-run ' + label.toLowerCase() + " upgrades. Long-press any console button to jump here. Tiers and levels persist on death.</div>";
      UPGRADES.filter(d => d.tab === tab).forEach(def => {
        const lv = (run && run.up[def.id]) || (save.mid && save.mid[def.id]) || 0;
        const t = (run && run.prest && run.prest[def.id]) || (save.prest && save.prest[def.id]) || 0;
        const cur = effectLine(def.id, lv, t);
        const nxt = (def.prestige && lv >= 10 && t < MAX_PREST)
          ? ("Prestige to " + tierOf(t + 1).name + " — " + prestigeCost(def.id, t).coins + "¢ + " + prestigeCost(def.id, t).gems + "◆. " + effectLine(def.id, 1, t + 1))
          : (lv >= def.max ? "Maxed" : effectLine(def.id, lv + 1, t));
        html += infoCard(def.name + (t ? "  " + "★".repeat(t) : ""), INFO[def.id] || "", "Now: " + cur, "Next: " + nxt, def.prestige ? "core" : "", def.id);
      });
    }
    body.innerHTML = html;
    if (focusId) {
      const node = body.querySelector('[data-fid="' + focusId + '"]');
      if (node) node.scrollIntoView({ block: "center" });
    }
  }

  function infoCard(name, desc, now, next, cls, fid) {
    return '<div class="info-card ' + (cls || "") + '" data-fid="' + (fid || "") + '"><div class="ic-ico"></div><div class="ic-body"><div class="ic-name">' + name + '</div><p>' + desc + '</p><div class="ic-now">' + now + '</div><div class="ic-next">' + next + '</div></div></div>';
  }

  function applyDemo(name) {
    if (!name) return;
    save = defaultSave();
    save.bestWave = 47; save.gems = 860;
    if (name === "title") { showTitle(); return; }
    if (name === "over") {
      save.perma = { dmg: 5, rate: 3, crit: 2, critDmg: 1, pierce: 1, multi: 0, slot: 1, hp: 6, shield: 2, armor: 3, regen: 1, shRegen: 1, thorns: 0, wind: 0, startCoins: 4, coinValue: 2, gemBonus: 1, interest: 1, pdef: 2, skip: 0 };
      run = createRun(save.perma, { bestWave: 47, persist: false, seed: 23 });
      run.wave = 23; run.kills = 80; run.bossesBeaten = 2; run.dead = true;
      run.up = Object.assign(defaultMid(), { dmg: 8, rate: 6, hp: 5, shield: 2, spread: 3, laser: 2, missile: 1, drone: 1, crit: 2, pdef: 2, coinVal: 2 });
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

    if (name === "info") {
      startRun();
      run.wave = 0; beginWave(run, 6);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 4, rate: 3, hp: 2, ship: 2, spread: 1, shield: 1, armor: 1 });
      run.coins = 120; run._st = null;
      run.enemies = [];
      spawnEnemy(run, "spark", { x: 400, y: 500 });
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      openInfo("atk");
      return;
    }
    if (name === "prestige") {
      startRun();
      run.wave = 0; beginWave(run, 8);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 10, rate: 6, hp: 4, ship: 5, spread: 2, shield: 3, armor: 4, laser: 7, missile: 3, drone: 2 });
      save.gems = 80; run.coins = 900; run._st = null;
      const st = playerStats(run); run.hp = st.maxHp; run.shield = st.maxShield;
      run.enemies = [];
      spawnEnemy(run, "drifter", { x: 500, y: 420 });
      spawnEnemy(run, "spark", { x: 300, y: 360 });
      setTab("atk");
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      return;
    }
    if (name === "tiers") {
      startRun();
      run.wave = 0; beginWave(run, 5);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 6, rate: 4, laser: 3, missile: 2, drone: 2, shield: 3, ship: 4, dcount: 1 });
      run.prest = { dmg: 0, laser: 0, missile: 0, drone: 0, armor: 0, shield: 0, ship: 0 };
      run.coins = 0; run._st = null;
      run.hp = playerStats(run).maxHp; run.shield = playerStats(run).maxShield;
      run.enemies = [];
      run._tierShow = true;
      mode = "play";
      el("play-ui").classList.add("hidden");
      // hide console chrome a bit — we'll custom render after a tick via a flag
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
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
      run.up = Object.assign(defaultMid(), { dmg: 6, rate: 5, hp: 4, shield: 2, spread: 3, laser: 2, missile: 1, drone: 1, crit: 2, critDmg: 1, pierce: 1, bspd: 2, pdef: 3, coinVal: 2, armor: 1 });
      run.coins = 420; run._st = null;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.8); run.shield = st.maxShield;
      run.enemies = [];
      [["spark",200,400],["drifter",700,360],["razor",400,500],["shellback",900,480]].forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
      setTab("atk");
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      return;
    }
    if (name === "pdef") {
      startRun();
      run.wave = 0; beginWave(run, 8);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 4, rate: 4, hp: 3, ship: 3, shield: 2, armor: 2, pdef: 8, spread: 1 });
      run.coins = 200; run._st = null;
      const st = playerStats(run); run.hp = st.maxHp; run.shield = st.maxShield;
      run.enemies = [];
      [["shooter",200,360],["shooter",540,280],["shooter",860,360],["shooter",360,480],["shooter",720,500]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
      for (let i = 0; i < 8; i++) {
        const e = run.enemies[i % run.enemies.length];
        if (e) { e.fireCd = 0; shootEnemyAtPlayer(run, e); }
      }
      for (let i = 0; i < 9; i++) {
        bossShot(run, 180 + i * 90, 980 + (i % 3) * 30, Math.PI / 2 + (i - 4) * 0.04, 260, 8, C.magenta, 8);
      }
      run.pdefCd = 0;
      setTab("def");
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      if (root.LastOutpost) root.LastOutpost._run = run;
      return;
    }
    if (name === "boss2") {
      startRun();
      run.wave = 0; beginWave(run, 20);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 8, rate: 6, hp: 5, ship: 4, shield: 3, spread: 3, laser: 2, missile: 2, drone: 1, armor: 3, pdef: 5, crit: 2, bspd: 2 });
      run.prest = Object.assign(defaultPrest(), { dmg: 1, ship: 1 });
      run.coins = 400; run._st = null;
      const st2 = playerStats(run); run.hp = Math.round(st2.maxHp * 0.7); run.shield = st2.maxShield * 0.8;
      run.enemies = [];
      const b2 = spawnEnemy(run, "boss", { boss: bossInfo(20), x: 540, y: 410 });
      b2.hp = Math.round(b2.maxHp * 0.50);
      b2.usedShield = true;
      b2.shield = Math.round(b2.maxHp * 0.28);
      b2.sweepAng = Math.PI / 2 - 0.2;
      b2.tele = 0.9;
      b2.pendingSweep = true;
      [["spark",150,700],["spark",930,720],["coil",200,900],["coil",880,880]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      if (root.LastOutpost) root.LastOutpost._run = run;
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
      run.up = Object.assign(defaultMid(), { dmg: 10, rate: 8, hp: 7, shield: 3, spread: 4, laser: 3, missile: 2, drone: 2, crit: 3, critDmg: 2, pierce: 2, multi: 1, bspd: 3, burn: 2, pdef: 6, coinVal: 2, dcount: 1, orbit: 2 });
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
      run.up = Object.assign(defaultMid(), { dmg: 8, rate: 6, hp: 5, ship: 4, shield: 3, spread: 3, laser: 2, missile: 2, drone: 1, armor: 3, crit: 2, pierce: 1, bspd: 2 });
      run.prest = Object.assign(defaultPrest(), { dmg: 1, ship: 1 });
      run.coins = 400; run._st = null;
      const st = playerStats(run); run.hp = Math.round(st.maxHp * 0.7); run.shield = st.maxShield * 0.8;
      run.enemies = [];
      const b = spawnEnemy(run, "boss", { boss: bossInfo(10), x: 540, y: 400 });
      b.hp = Math.round(b.maxHp * 0.62);
      b.sweepAng = Math.PI / 2 + 0.28;
      b.tele = 0.95;
      b.pendingSweep = true;
      [["spark",120,820],["spark",960,840]]
        .forEach(p => spawnEnemy(run, p[0], { x: p[1], y: p[2] }));
    }
    hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
    if (root.LastOutpost) root.LastOutpost._run = run;
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
