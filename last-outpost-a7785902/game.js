/* Last Outpost — playable prototype
   Idle Games USA. Hidden test page, not a store build.
   Works in the browser and in Node (for sim.js). */
(function (root) {
  "use strict";

  const W = 1080;
  let H = 2000;
  let RAIL_Y = 1900;
  const SHIP_X = 540;
  let SHIP_Y = 1812;
  const CONSOLE_H = 100; // ground gutter under the wall; the console now lives in a CSS overlay
  const STORAGE_KEY = "idleusa.lastOutpost.v2";
  const BUILD = "v10.1-steady-base";
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
    permaGemBonus: 0, permaShield: 16, interestPerWave: 4, gemPerWave: 0,
    gemKillDiv: 99999, gemPerBoss: 10, gemBestWave: 1, gemDaily: 5, coinPayout: 1.38, countBase: 5, countPerWave: 1.10, countMax: 22,
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
      gems: 0
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
    { id: "ship",     name: "BASE",       tab: "def",  base: 35,  grow: 1.40, max: 10, unlock: 0, prestige: true },
    { id: "hp",       name: "HEALTH",     tab: "def",  base: 35,  grow: 1.40, max: 20, unlock: 0 },
    { id: "shield",   name: "SHIELD",     tab: "def",  base: 85,  grow: 1.48, max: 10, unlock: 4, prestige: true },
    { id: "shRegen",  name: "SH. REGEN",  tab: "def",  base: 95,  grow: 1.45, max: 15, unlock: 6 },
    { id: "armor",    name: "ARMOR",      tab: "def",  base: 75,  grow: 1.48, max: 10, unlock: 5, prestige: true },
    { id: "regen",    name: "REGEN",      tab: "def",  base: 90,  grow: 1.45, max: 15, unlock: 7 },
    { id: "thorns",   name: "THORNS",     tab: "def",  base: 100, grow: 1.48, max: 12, unlock: 9 },
    { id: "knock",    name: "KNOCKBACK",  tab: "def",  base: 80,  grow: 1.45, max: 12, unlock: 8 },
    { id: "freeze",   name: "FREEZE",     tab: "def",  base: 130, grow: 1.50, max: 12, unlock: 12 },
    { id: "pdef",     name: "POINT DEF",  tab: "def",  base: 55,  grow: 1.42, max: 15, unlock: 2 },
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
    { id: "emp",      name: "EMP PULSE",  tab: "util", base: 740, grow: 1.55, max: 10, unlock: 50, milestone: 50 },
    { id: "rail",     name: "RAILGUN",    tab: "atk",  base: 200, grow: 1.50, max: 10, unlock: 0, shop: "rail", slot: "weapon" },
    { id: "tesla",    name: "TESLA ARC",  tab: "atk",  base: 210, grow: 1.50, max: 10, unlock: 0, shop: "tesla", slot: "weapon" },
    { id: "flak",     name: "FLAK",       tab: "atk",  base: 190, grow: 1.50, max: 10, unlock: 0, shop: "flak", slot: "weapon" },
    { id: "nuke",     name: "NUKE",       tab: "atk",  base: 200, grow: 1.50, max: 10, unlock: 0, shop: "nuke", slot: "weapon" },
    { id: "pylon",    name: "ARC PYLON",  tab: "util", base: 180, grow: 1.48, max: 10, unlock: 0, shop: "pylon", slot: "addon" },
    { id: "mines",    name: "MINES",      tab: "util", base: 170, grow: 1.48, max: 10, unlock: 0, shop: "mines", slot: "addon" }
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
      { id: "dmg", name: "Starting Damage", max: 20, base: 80, grow: 1.40 },
      { id: "rate", name: "Starting Fire Rate", max: 20, base: 80, grow: 1.40 },
      { id: "crit", name: "Crit Chance", max: 15, base: 130, grow: 1.45 },
      { id: "critDmg", name: "Crit Damage", max: 15, base: 150, grow: 1.45 },
      { id: "pierce", name: "Starting Pierce", max: 8, base: 200, grow: 1.50 },
      { id: "multi", name: "Starting Multishot", max: 6, base: 240, grow: 1.52 },
      { id: "slot", name: "Weapon Slot", max: 4, base: 320, grow: 1.60 }
    ],
    def: [
      { id: "hp", name: "Max Health", max: 20, base: 90, grow: 1.40 },
      { id: "shield", name: "Shield Strength", max: 15, base: 150, grow: 1.45 },
      { id: "armor", name: "Armor", max: 12, base: 110, grow: 1.45 },
      { id: "regen", name: "Hull Regen", max: 12, base: 140, grow: 1.45 },
      { id: "shRegen", name: "Shield Regen", max: 12, base: 150, grow: 1.45 },
      { id: "pdef", name: "Point Defense", max: 10, base: 120, grow: 1.40 },
      { id: "thorns", name: "Thorns", max: 10, base: 180, grow: 1.48 },
      { id: "wind", name: "Second Wind", max: 1, base: 500, grow: 1 }
    ],
    eco: [
      { id: "startCoins", name: "Starting Coins", max: 20, base: 70, grow: 1.40 },
      { id: "coinValue", name: "Coin Value", max: 15, base: 90, grow: 1.42 },
      { id: "salvage", name: "Salvage", max: 12, base: 110, grow: 1.45 },
      { id: "interest", name: "Interest", max: 12, base: 200, grow: 1.45 },
      { id: "skip", name: "Wave Skip", max: 8, base: 260, grow: 1.50 }
    ]
  };

  const SHOP = {
    weapons: [
      { id: "rail", name: "RAILGUN", cost: 80, blurb: "A piercing beam that punches through a line of foes. Upgraded with gems." },
      { id: "tesla", name: "TESLA ARC", cost: 100, blurb: "Chain lightning that leaps from target to target. Upgraded with gems." },
      { id: "flak", name: "FLAK CANNON", cost: 90, blurb: "Bursting shells that explode among tight formations. Upgraded with gems." },
      { id: "nuke", name: "NUKE MISSILE", cost: 95, blurb: "A slow, heavy warhead. A lone target dies; groups take a large neon blast. Upgraded with gems." }
    ],
    addons: [
      { id: "pylon", name: "ARC PYLON", cost: 120, blurb: "A tesla tower on the wall that zaps nearby enemies. Upgraded with gems." },
      { id: "mines", name: "MINES", cost: 90, blurb: "Each wave, mines are planted across the field and detonate on contact. Upgraded with gems." }
    ],
    cosmo: [
      { id: "skin_stealth", name: "STEALTH", cost: 55, kind: "skin", value: "stealth", blurb: "Faceted matte bunker and sawtooth battlements. A real redesign, not a tint." },
      { id: "skin_racer", name: "RACER", cost: 55, kind: "skin", value: "racer", blurb: "Racing stripes and spoiler fins on the outpost wall." },
      { id: "skin_chrome", name: "CHROME", cost: 60, kind: "skin", value: "chrome", blurb: "Mirror-steel citadel with a cool glass core." },
      { id: "skin_alien", name: "ALIEN BIO-BASE", cost: 70, kind: "skin", value: "alien", blurb: "Organic veins, an eye-core, and stalk-mounted turrets." },
      { id: "trail_spark", name: "SPARK TRAILS", cost: 40, kind: "trail", value: "spark", blurb: "Bullets leave a sparking trail." },
      { id: "trail_prism", name: "PRISM ROUNDS", cost: 40, kind: "trail", value: "prism", blurb: "Shots shimmer with prism color." }
    ],
    extras: [
      { id: "speed3", name: "3× SPEED", cost: 150, blurb: "Unlocks a 3× combat speed toggle." }
    ],
    packs: [
      { id: "pack100", name: "SCOUT PACK", gems: 100, price: "$0.99" },
      { id: "pack550", name: "OUTPOST PACK", gems: 550, price: "$4.99" },
      { id: "pack1200", name: "FORTRESS PACK", gems: 1200, price: "$9.99" },
      { id: "pack2500", name: "ARMADA PACK", gems: 2500, price: "$19.99" }
    ]
  };
  const PDEF_MILESTONES = [1, 4, 8, 12];
  function pdefTurretCount(lv) {
    if (lv < 1) return 0;
    if (lv >= 12) return 4;
    if (lv >= 8) return 3;
    if (lv >= 4) return 2;
    return 1;
  }
  function pdefNextAt(lv) {
    if (lv < 4) return 4;
    if (lv < 8) return 8;
    if (lv < 12) return 12;
    return 0;
  }
  function defaultShop() {
    return {
      unlocked: {},
      weapons: [],
      addons: [],
      levels: {},
      skin: "default",
      trail: "default",
      autoPrestige: false,
      speed3: false
    };
  }

  const SHOP_IDS = ["rail", "tesla", "flak", "nuke", "pylon", "mines"];
  const OLD_SKINS = { skin_crimson: 45, skin_gold: 50, skin_ice: 45 };
  function shopUpgradeCost(id, lv) {
    // Cost in gems to go from level lv to lv+1. Unlock is already paid; lv is current (min 1).
    const n = Math.max(1, lv | 0);
    return Math.floor(18 * Math.pow(1.42, n - 1));
  }

  function carryRate(perma) {
    const lv = (perma && perma.salvage) || 0;
    return Math.min(0.70, 0.50 + lv * 0.015);
  }

  const ENEMY = {
    spark:     { hp: 9,  spd: 80,  r: 16, dmg: 7,  coins: 3,  color: C.magenta },
    drifter:   { hp: 18, spd: 60,  r: 24, dmg: 9,  coins: 4,  color: C.orange },
    razor:     { hp: 14, spd: 98,  r: 16, dmg: 8,  coins: 5,  color: C.lime },
    shooter:   { hp: 22, spd: 54,  r: 22, dmg: 9,  coins: 5,  color: C.orange, shoot: 2.4, shotDmg: 7 },
    shellback: { hp: 40, spd: 48,  r: 26, dmg: 12, coins: 6, color: C.violet, shield: 18 },
    splitter:  { hp: 20, spd: 70,  r: 20, dmg: 9,  coins: 5,  color: C.yellow, split: 2 },
    needle:    { hp: 16, spd: 148, r: 14, dmg: 11, coins: 5,  color: C.pink },
    coil:      { hp: 30, spd: 84,  r: 22, dmg: 13, coins: 6,  color: C.cyan },
    brood:     { hp: 54, spd: 48,  r: 32, dmg: 17, coins: 8, color: C.violet, spawn: 3.4 }
  };

  const BOSS = {
    10: { name: "THE HERALD",     kind: "herald",     hp: 12400, r: 155, coins: 70 },
    20: { name: "TWIN SPIRE",     kind: "twin",       hp: 18500, r: 170, coins: 110 },
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
      startCoins: 0, coinValue: 0, salvage: 0, gemBonus: 0, interest: 0, skip: 0
    };
  }
  function defaultMid() {
    return {
      dmg: 0, rate: 0, spread: 0, crit: 0, critDmg: 0, pierce: 0, multi: 0, bspd: 0, burn: 0, chain: 0, laser: 0, missile: 0,
      ship: 0, hp: 0, shield: 0, shRegen: 0, armor: 0, regen: 0, thorns: 0, knock: 0, freeze: 0, pdef: 0,
      drone: 0, dcount: 0, dmgDrone: 0, laserW: 0, mcount: 0, ricochet: 0,
      coinVal: 0, interest: 0, skip: 0, orbit: 0, emp: 0, rail: 0, tesla: 0, flak: 0, flame: 0, nuke: 0, pylon: 0, mines: 0
    };
  }
  function defaultPrest() {
    return { dmg: 0, laser: 0, missile: 0, drone: 0, armor: 0, shield: 0, ship: 0 };
  }
  function defaultSave() {
    return { bestWave: 0, gems: 0, perma: defaultPerma(), mid: defaultMid(), prest: defaultPrest(), carryCoins: 0, bankCoins: 0, shop: defaultShop(), lastDaily: "", mute: false, ver: 11 };
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
    if (d.perma.gemBonus && !d.perma.salvage) d.perma.salvage = d.perma.gemBonus;
    d.shop = defaultShop();
    if (s.shop && typeof s.shop === "object") {
      d.shop = Object.assign(defaultShop(), s.shop);
      d.shop.unlocked = Object.assign({}, (s.shop.unlocked || {}));
      d.shop.weapons = Array.isArray(s.shop.weapons) ? s.shop.weapons.slice() : [];
      d.shop.addons = Array.isArray(s.shop.addons) ? s.shop.addons.slice() : [];
      d.shop.levels = Object.assign({}, (s.shop.levels || {}));
    }
    d.lastDaily = s.lastDaily || "";
    d.bankCoins = Math.max(0, (s.bankCoins | 0));
    if (prevVer < 8) {
      d.bankCoins += Math.max(0, d.carryCoins | 0);
      const keep = Math.min(d.gems | 0, 100);
      const conv = Math.max(0, (d.gems | 0) - keep);
      d.bankCoins += conv * 4;
      d.gems = keep;
    }
    if (prevVer < 9) {
      const sh = d.shop || defaultShop();
      const ownedWing = !!(sh.unlocked && sh.unlocked.wing);
      if (ownedWing) d.gems = (d.gems | 0) + 120;
      if (sh.unlocked) delete sh.unlocked.wing;
      if (Array.isArray(sh.addons)) sh.addons = sh.addons.filter(id => id !== "wing");
      if (Array.isArray(sh.weapons)) sh.weapons = sh.weapons.filter(id => id !== "wing");
      d.shop = sh;
      if (d.mid) d.mid.wing = 0;
    }
    if (prevVer < 10) {
      const sh = d.shop || defaultShop();
      if (!sh.levels || typeof sh.levels !== "object") sh.levels = {};
      // Auto-Prestige removed: refund the 200 gem cost if owned.
      if ((sh.unlocked && sh.unlocked.autoPrest) || sh.autoPrestige) {
        d.gems = (d.gems | 0) + 200;
      }
      if (sh.unlocked) delete sh.unlocked.autoPrest;
      sh.autoPrestige = false;
      // Flamethrower replaced by Nuke Missile: refund unlock, convert loadout and levels.
      const ownedFlame = !!(sh.unlocked && sh.unlocked.flame);
      if (ownedFlame) {
        d.gems = (d.gems | 0) + 95;
        sh.unlocked.nuke = 1;
        delete sh.unlocked.flame;
      }
      if (Array.isArray(sh.weapons)) {
        sh.weapons = sh.weapons.map(id => id === "flame" ? "nuke" : id).filter((id, i, a) => id && a.indexOf(id) === i);
      }
      const flameLv = Math.max(d.mid && d.mid.flame || 0, sh.levels.flame || 0);
      if (ownedFlame || flameLv > 0) sh.levels.nuke = Math.max(sh.levels.nuke || 0, flameLv || 1);
      delete sh.levels.flame;
      if (d.mid) d.mid.flame = 0;
      // Keep existing coin levels on gem-shop items; further upgrades cost gems.
      SHOP_IDS.forEach((id) => {
        if (id === "nuke" && sh.levels.nuke) return;
        const midLv = (d.mid && d.mid[id]) | 0;
        const have = !!(sh.unlocked && sh.unlocked[id]);
        if (have) sh.levels[id] = Math.max(sh.levels[id] | 0, midLv, 1);
      });
      // Old color-only skins: refund and clear.
      Object.keys(OLD_SKINS).forEach((id) => {
        if (sh.unlocked && sh.unlocked[id]) {
          d.gems = (d.gems | 0) + OLD_SKINS[id];
          delete sh.unlocked[id];
        }
      });
      if (sh.skin === "crimson" || sh.skin === "gold" || sh.skin === "ice") sh.skin = "default";
      d.shop = sh;
    }
    d.ver = 11;
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

  function isUnlocked(id, wave, up, bestWave, shop) {
    const def = UP_BY_ID[id];
    if (!def) return false;
    if (def.shop) {
      shop = shop || {};
      if (!(shop.unlocked && shop.unlocked[def.shop])) return false;
      const list = def.slot === "addon" ? (shop.addons || []) : (shop.weapons || []);
      return list.indexOf(def.shop) >= 0;
    }
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
  function approachMul() {
    // Keep crossing time close to the original 1410-rail field as the playfield grew.
    return Math.max(1, 1 + 0.42 * (RAIL_Y / 1410 - 1));
  }
  function spdScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.min(2.35, Math.pow(1.032, Math.min(n, 6)) * Math.pow(1.03, Math.max(0, n - 6))) * approachMul();
  }
  function bossTargetY(kind) {
    const standoff = kind === "twin" ? 920 : (kind === "lattice" ? 960 : 940);
    return Math.max(220, SHIP_Y - standoff);
  }
  function dmgScale(wave) {
    const n = Math.max(0, wave - 1);
    return Math.pow(1.10, Math.min(n, 8)) * Math.pow(1.08, Math.max(0, Math.min(n, 40) - 8)) * Math.pow(1.10, Math.max(0, n - 40));
  }

  const TURRET_MAX_DEV = 70 * Math.PI / 180;
  const TURRET_LAYOUT = [
    { halfW: 210, xs: [0] },
    { halfW: 290, xs: [-130, 130] },
    { halfW: 350, xs: [-210, 0, 210] },
    { halfW: 410, xs: [-280, -95, 95, 280] },
    { halfW: 470, xs: [-360, -180, 0, 180, 360] },
    { halfW: 510, xs: [-390, -195, 0, 195, 390] }
  ];
  function turretTierOf(run) { return Math.max(0, Math.min(5, (run && run.prest && run.prest.ship) | 0)); }
  function turretCount(tier) { return TURRET_LAYOUT[Math.max(0, Math.min(5, tier | 0))].xs.length; }
  function turretShare(tier) {
    const t = Math.max(0, Math.min(5, tier | 0));
    return (1 + 0.12 * t) / turretCount(t);
  }
  function turretPivotY() { return RAIL_Y - 72; }
  function baseHalfW(tier) { return TURRET_LAYOUT[Math.max(0, Math.min(5, tier | 0))].halfW; }
  function wallFace() { return RAIL_Y - 6; }
  function turretHardpoints(run) {
    const t = turretTierOf(run);
    const xs = TURRET_LAYOUT[t].xs;
    const y = turretPivotY();
    const out = [];
    for (let i = 0; i < xs.length; i++) out.push({ x: SHIP_X + xs[i], y: y, i: i });
    return out;
  }
  function turretMuzzle(hp, ang, len) {
    const L = len == null ? 38 : len;
    return { x: hp.x + Math.cos(ang) * L, y: hp.y + Math.sin(ang) * L };
  }
  function clampTurretAng(ang) {
    const mid = -Math.PI / 2;
    let d = ang - mid;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (d > TURRET_MAX_DEV) d = TURRET_MAX_DEV;
    if (d < -TURRET_MAX_DEV) d = -TURRET_MAX_DEV;
    return mid + d;
  }
  function angInTurretArc(ang) {
    const mid = -Math.PI / 2;
    let d = ang - mid;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d) <= TURRET_MAX_DEV + 0.02;
  }
  function shipGunCount(tier) { return turretCount(tier); }
  function shipGunShare(tier) { return turretShare(tier); }
  function shipMuzzles(run) {
    const hps = turretHardpoints(run);
    const angs = (run && run.turretAng) || [];
    return hps.map((p, i) => turretMuzzle(p, angs[i] != null ? angs[i] : -Math.PI / 2, 38));
  }
  function fieldTop() { return 56; }
  function fieldBottom() { return RAIL_Y - 8; }
  function knockResist(wave) {
    const n = wave | 0;
    if (n < 16) return 0;
    return Math.min(0.88, (n - 15) * 0.042);
  }
  function clampEnemyPos(e) {
    if (!e) return;
    const top = fieldTop() + (e.r || 16);
    e.x = Math.max(40, Math.min(W - 40, e.x));
    // Do not clamp downward: enemies must be free to reach the wall and explode.
    if (e._onField) e.y = Math.max(top, e.y);
  }
  function waveEnemyCount(n) {
    let count = Math.min(BAL.countMax, Math.floor(BAL.countBase + n * BAL.countPerWave));
    if (n >= 20) count += Math.floor((n - 19) * 0.85);
    if (n >= 28) count += Math.floor((n - 27) * 1.5);
    const cap = n >= 30 ? 56 : (n >= 20 ? 38 : BAL.countMax);
    return Math.min(cap, count);
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
    st.knockLv = u.knock || 0;
    st.knock = st.knockLv * 18;
    st.chill = Math.min(0.55, (u.freeze || 0) * 0.06);
    st.burn = (u.burn || 0) * 0.22;
    st.chain = u.chain || 0;
    st.ricochet = u.ricochet || 0;
    st.magnet = 80;
    const pdefLv = (u.pdef || 0) + (p.pdef || 0) * 0.8;
    st.pdefLv = pdefLv;
    st.pdefRange = pdefLv > 0 ? 260 + pdefLv * 20 : 0;
    st.pdefInterval = pdefLv > 0 ? Math.max(0.40, 1.15 * Math.pow(0.95, Math.max(0, pdefLv - 1))) : 1;
    st.pdefTurrets = pdefTurretCount(pdefLv);
    st.pdefDeflect = pdefLv >= 6 ? Math.min(0.35, 0.06 + (pdefLv - 6) * 0.035) : 0;
    st.shop = (run.shop || (run._shop) || null);
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
    st.gunCount = shipGunCount(st.tierShip);
    st.gunDmg = st.dmg * shipGunShare(st.tierShip);
    st.skin = (run.shop && run.shop.skin) || "default";
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
    spread: "Adds extra bullets that fan around your aim — from EVERY turret. Level 1 gives a 3-shot fan per turret; higher levels add more shots in a wider cone.",
    crit: "Chance for a shot to crit and use your Crit Damage multiplier. Shown as a white, heavier bolt when it procs.",
    critDmg: "How hard a critical hit hurts. Starts at 2× and climbs with each level.",
    pierce: "Bullets keep going after a hit. Each level lets a shot pass through one more enemy.",
    multi: "Adds extra projectiles on top of the spread fan on EVERY turret, for a thicker volley from each hardpoint.",
    bspd: "Makes your shots fly faster so lead aiming lands more cleanly and they cross the screen sooner.",
    burn: "Hits set enemies on fire, dealing damage over time after the shot.",
    chain: "On hit, lightning jumps to a nearby enemy for a fraction of the damage. Higher levels jump farther and more times.",
    laser: "Fires a piercing beam from a turret or the core at the closest threats. Core item: Prestige at level 10 for a thicker, cooler beam (split and spiral at the top tiers) and more power.",
    missile: "Launches homing missiles from the turrets or the core at the closest threats. Core item: Prestige at level 10 for bigger frames, brighter exhaust, heavier blasts, and a new look.",
    ship: "The outpost itself. Raises base max health. Prestige at level 10 to a new fortress class: Mk I bunker (1 center turret), Mk II (2 turrets), Mk III (3), Mk IV (4), Mk V (5), Mk VI citadel (5 turrets plus a sweeping S-curve void beam from the core). Each turret rotates independently up to 70° left or right to lead its own target. Damage is split across turrets with a modest per-tier gain. Spread and Multishot apply per turret. The base never moves or flips.",
    hp: "Buys more max health and instantly repairs a chunk of the base. A mid-run survival purchase; Base is the prestige path for the outpost look and turret count.",
    shield: "A rechargeable energy ARC or dome wall projected over the front of the base, not a bubble. It blocks frontal shots that pass through the arc. When shield HP hits 0 the arc cracks and fades; when it regenerates, it visibly powers back up. Prestige adds strength.",
    shRegen: "The shield refills faster after you stop taking hits.",
    armor: "Cuts incoming damage by a percent (capped). Core item: Prestige at level 10 for a larger cut and heavier visible hull plating.",
    regen: "Slowly repairs hull over time, even between hits.",
    thorns: "When something rams the wall, a portion of that damage is reflected back.",
    knock: "Shoves enemies back up the field. Low levels only push foes very close to the base a short distance. Each level extends the trigger range and the push. Max level can drive enemies to the top edge of the visible field, never off-screen or into a rail pile. At high waves, knockback resistance keeps swarms visible and pressing mid-field. Bosses barely flinch and never reach the wall. Enemies that do reach the wall deal contact damage, explode, and vanish.",
    freeze: "Hits slow enemies for a short time. Stacks a little with more levels, and is capped so they never freeze solid.",
    drone: "A wingman that hovers near the base and fires on the closest threat. Core item: Prestige at level 10 for a new, spikier drone shape, orbit trails, and more punch.",
    dcount: "Adds extra drones, up to a small squad.",
    dmgDrone: "Raises the damage of every drone shot.",
    laserW: "Widens the laser beam so it is easier to clip enemies.",
    mcount: "Adds extra missiles to each volley.",
    ricochet: "After a hit, a bullet can bounce toward another nearby target. Each level is another bounce.",
    rail: "Shop weapon. A focused piercing beam that cuts through a line of enemies. Unlock and upgrade it with gems in the Gem Shop, then equip it.",
    tesla: "Shop weapon. Chain lightning leaps between nearby enemies. Unlock and upgrade it with gems in the Gem Shop, then equip it.",
    flak: "Shop weapon. Shells burst in a radius, shredding tight packs. Unlock and upgrade it with gems in the Gem Shop, then equip it.",
    nuke: "Shop weapon. A nuke-style missile that fires about every 5 seconds. A lone target dies; groups take a large neon mushroom blast and shockwave. Unlock and upgrade it with gems in the Gem Shop, then equip it.",
    pylon: "Shop add-on. A tesla tower mounted on the base wall zaps the nearest threat. Unlock and upgrade it with gems in the Gem Shop, then equip it.",
    mines: "Shop add-on. If equipped, each wave plants several mines at random spots on the field. They stay until an enemy hits them, then blast. Upgrades add mine count and damage. Unlock and upgrade with gems in the Gem Shop.",
    pdef: "Point Defense. Sentry guns mounted on the outpost wall intercept incoming bullets and missiles. The first sentry comes online at level 1. Additional sentries unlock at levels 4, 8 and 12, up to four. They track and fire at projectiles in their reach with a modest intercept rate, thinning volleys without erasing them. Laser sweeps cannot be intercepted. From level 6 some shots are deflected back at enemies.",
    coinVal: "Increases coins dropped by every kill. Stacks with the permanent Coin Value node.",
    interest: "At the start of each new wave, grants bonus coins based on this level (plus any permanent Interest).",
    skip: "When a non-boss wave is built, automatically cashes out and removes a few of the weakest upcoming spawns.",
    orbit: "Unlocks at wave 25. Spinning orbs circle the core and damage anything they touch. Milestone weapon.",
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
    hp: "Raises the outpost's base max health on every run.",
    shield: "Adds permanent shield strength, even before you buy mid-run Shield.",
    armor: "A permanent cut to incoming damage.",
    regen: "The base slowly repairs itself from the first wave.",
    shRegen: "Your shield refills faster on every run.",
    thorns: "A permanent share of ram damage is reflected.",
    wind: "Once per run, cheating death restores a sliver of the base instead of ending the run.",
    startCoins: "You begin each run with extra coins, on top of the half you carried over from the last death.",
    coinValue: "A permanent bonus to coins from kills.",
    salvage: "A larger share of leftover mid-run coins is banked on death (starts at 50%, up to 70%). Banked coins buy permanent upgrades and start your next run.",
    interest: "Permanent bonus coins at the start of each wave.",
    pdef: "Permanent Point Defense ranks. Wall sentries start online every run and scale with mid-run Point Def.",
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
    if (id === "spread") return lv <= 0 ? "Single bolt per turret" : ((lv === 1 ? 3 : (lv < 4 ? 5 : 7)) + "-shot fan per turret");
    if (id === "crit") return "Crit chance " + Math.round(Math.min(0.7, lv * 0.035) * 100) + "%";
    if (id === "critDmg") return "Crits deal " + (2 + lv * 0.22).toFixed(2) + "×";
    if (id === "pierce") return lv ? ("Pierce " + lv + " target" + (lv > 1 ? "s" : "")) : "No pierce";
    if (id === "multi") return lv ? ("+" + lv + " extra shot" + (lv > 1 ? "s" : "") + " per turret") : "No extra shots";
    if (id === "bspd") return "Shot speed " + Math.round(BAL.bulletSpd * (1 + 0.10 * lv));
    if (id === "burn") return lv ? ("Burn " + Math.round(lv * 22) + "% of damage over time") : "No burn";
    if (id === "chain") return lv ? (Math.min(4, 1 + (lv / 3 | 0)) + " jump" + (lv > 2 ? "s" : "") + ", " + Math.round(40 + 4 * lv) + "% carry") : "No chain";
    if (id === "laser") return lv ? ("Laser online  ·  " + (lv >= 2 ? "dual beam" : "single beam") + (t ? "  ·  " + tierOf(t).name : "") + "  ·  " + prestMul(t).toFixed(2) + "×") : "Locked";
    if (id === "missile") return lv ? ("Missiles online  ·  " + prestMul(t).toFixed(2) + "×" + (t ? "  ·  " + tierOf(t).name : "")) : "Locked";
    if (id === "ship") {
      const hp = Math.round((BAL.baseHp + BAL.shipHpPerLv * (lv + prestBank(t))) * prestMul(t));
      const guns = turretCount(t);
      const extra = t >= 5 ? "  ·  void beam" : "";
      return "Base " + hp + " HP  ·  " + guns + " turret" + (guns > 1 ? "s" : "") + extra + (t ? "  ·  " + tierOf(t).name : "  ·  Mk I");
    }
    if (id === "hp") return "+" + (BAL.hpPerBuy * lv) + " max HP, repairs on buy";
    if (id === "shield") return lv ? ("Shield " + Math.round((BAL.maxShieldBase + BAL.shieldPerLv * (lv - 1 + prestBank(t))) * prestMul(t)) + (t ? "  ·  " + tierOf(t).name : "")) : "No shield";
    if (id === "shRegen") return lv ? ("+" + (lv * 6) + " shield/sec") : "Base regen only";
    if (id === "armor") return "Damage cut " + Math.round(Math.min(0.62, lv * 0.035 + t * 0.06) * 100) + "%";
    if (id === "regen") return lv ? ( (lv * 2.2).toFixed(1) + " HP/sec") : "No base regen";
    if (id === "thorns") return lv ? (Math.round(lv * 14) + "% reflect") : "No thorns";
    if (id === "knock") return lv ? ("Range and push Lv " + lv + "/12  ·  never off-screen") : "No knockback";
    if (id === "freeze") return lv ? ("Slow " + Math.round(Math.min(0.55, lv * 0.06) * 100) + "%") : "No freeze";
    if (id === "drone") return lv ? ("Drone online  ·  " + prestMul(t).toFixed(2) + "×" + (t ? "  ·  " + tierOf(t).name : "")) : "No drone";
    if (id === "dcount") return lv ? ("+" + lv + " extra drone" + (lv > 1 ? "s" : "")) : "Single drone when owned";
    if (id === "dmgDrone") return "Drone damage " + Math.round((0.55 + lv * 0.18) * 100) + "% of bullets";
    if (id === "laserW") return "Beam width " + (12 + lv * 5);
    if (id === "mcount") return (1 + lv) + " missile" + (lv ? "s" : "") + " per volley";
    if (id === "ricochet") return lv ? (lv + " bounce" + (lv > 1 ? "s" : "")) : "No bounce";
    if (id === "pdef") {
      if (!lv) return "No sentries";
      const n = pdefTurretCount(lv);
      const next = pdefNextAt(lv);
      const range = Math.round(260 + lv * 20);
      const defl = lv >= 6 ? Math.round(Math.min(0.35, 0.06 + (lv - 6) * 0.035) * 100) : 0;
      return n + " sentr" + (n === 1 ? "y" : "ies") + "  ·  range " + range + (defl ? ("  ·  " + defl + "% deflect") : "") + (next ? ("  ·  next turret at Lv " + next) : "  ·  all 4 online");
    }
    if (id === "rail") return lv ? ("Rail every " + (Math.max(0.35, 0.85 * Math.pow(0.92, lv - 1))).toFixed(2) + "s") : "Locked in the Gem Shop";
    if (id === "tesla") return lv ? ("Arc hops " + (2 + (lv / 3 | 0)) + "  ·  " + (Math.max(0.40, 1.0 * Math.pow(0.93, lv - 1))).toFixed(2) + "s") : "Locked in the Gem Shop";
    if (id === "flak") return lv ? ("Flak burst " + (70 + lv * 6) + "r") : "Locked in the Gem Shop";
    if (id === "nuke") return lv ? ("Nuke every " + (Math.max(3.4, 5.2 - lv * 0.14)).toFixed(1) + "s  ·  blast " + (200 + lv * 16) + "r") : "Locked in the Gem Shop";
    if (id === "pylon") return lv ? ("Pylon zap  " + (340 + lv * 18) + "r") : "Locked in the Gem Shop";
    if (id === "mines") return lv ? ((3 + ((lv - 1) * 0.7 | 0)) + " mines each wave  ·  blast " + (80 + lv * 6) + "r") : "Locked in the Gem Shop";

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
      empCd: 0, pdefCd: 0, pdefBeams: [], orbitT: 0, hullAng: -Math.PI / 2, aimAng: -Math.PI / 2, turretAng: [-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2], turretTgt: [null,null,null,null,null], wallFx: [], wallHits: 0, prestFx: null, bossBeams: [],
      shake: 0, flash: 0, banner: null,
      rng: makeRng(opts.seed || (Date.now() & 0x7fffffff)),
      bestWave: opts.bestWave || 0,
      persist: opts.persist !== false,
      shop: opts.shop ? Object.assign(defaultShop(), opts.shop) : defaultShop(),
      railCd: 0, teslaCd: 0, flakCd: 0, nukeCd: 0.8, nukeFx: [], voidBeam: null, pylonCd: 0, pylonAim: -Math.PI/2, mineCd: 0, mines: [], teslaArcs: [], pdefAim: [-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2], pdefCds: [0,0,0,0], shieldBreakT: 0
    };
    if (run.perma.slot >= 1) run.up.spread = Math.max(run.up.spread, 1);
    if (run.perma.slot >= 2) run.up.laser = Math.max(run.up.laser, 1);
    if (run.perma.slot >= 3) run.up.missile = Math.max(run.up.missile, 1);
    if (run.perma.slot >= 4) run.up.drone = Math.max(run.up.drone, 1);
    const st = playerStats(run);
    run.hp = st.maxHp;
    run.shield = st.maxShield;
    run.coins = (opts.carryCoins || 0) + run.perma.startCoins * BAL.permaStartCoins;
    run.coinsEarned = 0;
    return run;
  }
  function grantCoins(run, n) {
    n = Math.floor(n || 0);
    if (n <= 0) return;
    run.coins += n;
    run.coinsEarned = (run.coinsEarned || 0) + n;
  }

  function settlePickups(run) {
    if (!run || !run.pickups) return;
    for (let i = 0; i < run.pickups.length; i++) grantCoins(run, run.pickups[i].v || 0);
    while (run.pickups.length) give("pickups", run.pickups.pop());
  }

  function beginWave(run, n) {
    run.wave = n; run.waveTime = 0; run.pending = []; run.spawnCd = 0;
    const st = playerStats(run);
    if (n > 1) {
      const interestLv = (run.perma.interest || 0) + (run.up.interest || 0);
      if (interestLv > 0) grantCoins(run, BAL.interestPerWave * interestLv);
    }
    if (n % 10 === 0) {
      run.phase = "intro"; run.phaseT = BAL.bossIntro;
      run.banner = { type: "boss", name: bossInfo(n).name, t: BAL.bossIntro };
      run.flash = 0.8;
    } else {
      run.phase = "break"; run.phaseT = n === 1 ? 1.2 : BAL.waveBreak;
      run.banner = { type: "wave", n: n, t: run.phaseT };
    }
    placeWaveMines(run);
  }

  function placeWaveMines(run) {
    const lv = shopLv(run, "mines");
    if (lv <= 0) { run.mines = []; return; }
    const st = playerStats(run);
    const n = 3 + ((lv - 1) * 0.7 | 0); // 3 at lv1, up to 9 at lv10
    const dmg = st.dmg * (2.4 + 0.38 * lv);
    const top = 180, bot = RAIL_Y - 200, pad = 70;
    run.mines = [];
    for (let i = 0; i < n; i++) {
      let x = pad + run.rng() * (W - pad * 2);
      let y = top + run.rng() * Math.max(80, bot - top);
      // keep off the base face
      if (y > RAIL_Y - 160) y = top + run.rng() * 240;
      run.mines.push({ x: x, y: y, r: 18, t: 9999, dmg: dmg, planted: true });
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
    const count = waveEnemyCount(n);
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
      run.pending.push({ type: pick, delay: 0.10 + i * (n < 5 ? 0.32 : n < 20 ? 0.22 : n < 30 ? 0.12 : 0.07) });
    }
    const skipN = Math.min(run.pending.length - 1, playerStats(run).skip | 0);
    if (skipN > 0 && n % 10 !== 0) {
      let granted = 0;
      for (let s = 0; s < skipN; s++) {
        const p = run.pending.shift();
        if (!p) break;
        const def = ENEMY[p.type];
        if (def) granted += Math.max(1, Math.round(def.coins * playerStats(run).coinMul * (BAL.coinPayout || 1)));
      }
      grantCoins(run, granted);
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
    const spd = (280 + 20 * Math.min(run.wave, 20)) * Math.min(1.4, approachMul());
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
    // Core muzzle, used as a fallback origin (railgun, tesla, etc.).
    return { x: SHIP_X, y: turretPivotY() - 8 };
  }

  function aimAngle(run, fromX, fromY, spd) {
    const best = closestEnemy(run, fromX, fromY);
    if (!best) return -Math.PI / 2;
    return leadPoint(fromX, fromY, best, spd).ang;
  }

  function assignTurretTargets(run, st) {
    const hps = turretHardpoints(run);
    const used = [];
    const out = [];
    const spd = (st && st.bulletSpd) || BAL.bulletSpd;
    function pick(hp, allowUsed) {
      let best = null, bestS = 1e15;
      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (!e || e.hp <= 0 || e.y < -40) continue;
        if (!allowUsed && used.indexOf(e) >= 0) continue;
        const lp = leadPoint(hp.x, hp.y, e, spd);
        if (!angInTurretArc(lp.ang)) continue;
        const s = threatScore(e, hp.x, hp.y);
        if (s < bestS) { bestS = s; best = e; }
      }
      return best;
    }
    for (let i = 0; i < hps.length; i++) {
      let e = pick(hps[i], false);
      if (!e) e = pick(hps[i], true);
      if (e) used.push(e);
      out.push({ hp: hps[i], target: e });
    }
    return out;
  }

  function fireBlaster(run, st) {
    const assigned = assignTurretTargets(run, st);
    const gunDmg = st.gunDmg || st.dmg;
    const spreadWays = run.up.spread <= 0 ? 1 : (run.up.spread === 1 ? 3 : (run.up.spread < 4 ? 5 : 7));
    const extra = st.multi || 0;
    const ways = Math.min(9, spreadWays + extra);
    const spreadW = ways === 1 ? 0 : (ways <= 3 ? 0.18 : (ways <= 5 ? 0.14 : 0.11));
    const start = -((ways - 1) / 2);
    const mid = (ways - 1) / 2;
    const dense = ways >= 5;
    let aim = -Math.PI / 2;
    if (!run.turretAng) run.turretAng = [-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2];
    if (!run.turretTgt) run.turretTgt = [null,null,null,null,null];
    for (let g = 0; g < assigned.length; g++) {
      const a0 = assigned[g];
      const hp = a0.hp;
      const vis = (run.turretAng[g] != null) ? run.turretAng[g] : -Math.PI / 2;
      run.turretTgt[g] = a0.target || null;
      let ang = vis;
      if (a0.target) {
        const lead = leadPoint(hp.x, hp.y, a0.target, st.bulletSpd).ang;
        if (angInTurretArc(lead)) ang = clampTurretAng(lead);
      }
      const m = turretMuzzle(hp, vis, 38);
      if (g === 0) aim = ang;
      for (let i = 0; i < ways; i++) {
        const a = ang + (start + i) * spreadW;
        const crit = run.rng() < st.crit;
        const dmg = gunDmg * (crit ? st.critMul : 1) * (ways > 1 && i !== mid ? 0.85 : 1);
        const b = take("bullets");
        b.x = m.x + Math.cos(a) * 8; b.y = m.y + Math.sin(a) * 8;
        b.vx = Math.cos(a) * st.bulletSpd; b.vy = Math.sin(a) * st.bulletSpd;
        const ti = tierOf(st.tierBlaster || 0);
        b.r = crit ? 6 : 4.5; b.dmg = dmg; b.friendly = true; b.color = crit ? ti.core : ti.color;
        b.life = 1.85; b.crit = crit; b.kind = "blast"; b.target = null; b.turn = 0;
        b.tier = st.tierBlaster || 0;
        b.pierce = st.pierce; b.bounces = st.ricochet; b.hitSet = 0;
        b.thin = dense && i !== mid;
        run.bullets.push(b);
      }
    }
    run.aimAng = aim;
  }

  function fireMissile(run, st) {
    const n = Math.max(1, st.mcount | 0);
    const hps = turretHardpoints(run);
    const targets = closestEnemies(run, SHIP_X, turretPivotY(), n);
    for (let i = 0; i < n; i++) {
      const target = targets[i] || targets[0];
      const hp = hps[i % hps.length];
      const ang0 = (run.turretAng && run.turretAng[hp.i] != null) ? run.turretAng[hp.i] : -Math.PI / 2;
      const m = turretMuzzle(hp, ang0, 28);
      const ang = target ? leadPoint(m.x, m.y, target, 420).ang : -Math.PI / 2;
      const b = take("bullets");
      const off = (i - (n - 1) / 2) * 10;
      b.x = m.x + Math.cos(ang + Math.PI / 2) * off;
      b.y = m.y + Math.sin(ang + Math.PI / 2) * off;
      b.vx = Math.cos(ang) * 340; b.vy = Math.sin(ang) * 340;
      const ti = tierOf(st.tierMissile || 0);
      b.r = 8; b.dmg = st.dmg * (2.4 + 0.5 * run.up.missile) * (st.missileDmgMul || 1); b.friendly = true;
      b.color = ti.color; b.life = 3.0; b.kind = "missile"; b.crit = false; b.tier = st.tierMissile || 0;
      b.target = target; b.turn = 14; b.pierce = 0; b.bounces = 0;
      b.lockSwaps = 0; b.fuse = 0; b.closestD = 1e9; b.steerAcc = 0; b.boom = false;
      if (run.missileStats) run.missileStats.fired++;
      run.bullets.push(b);
    }
  }

  function fireLaser(run, st) {
    const beams = run.up.laser >= 2 ? 2 : 1;
    const hps = turretHardpoints(run);
    const targets = closestEnemies(run, SHIP_X, turretPivotY(), beams);
    for (let i = 0; i < beams; i++) {
      const e = targets[i] || targets[0];
      const hp = hps.length >= 3 && beams === 2 ? hps[i === 0 ? 0 : hps.length - 1] : hps[Math.min(i, hps.length - 1)];
      const ang0 = (run.turretAng && run.turretAng[hp.i] != null) ? run.turretAng[hp.i] : -Math.PI / 2;
      const m = turretMuzzle(hp, ang0, 38);
      const x0 = m.x, y0 = m.y;
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

  function hurt(run, dmg, src, wall) {
    if (run.dead) return;
    if (!wall && run.invuln > 0) return;
    const st = playerStats(run);
    dmg = dmg * (1 - st.armor);
    if (run.shield > 0) {
      const used = Math.min(run.shield, dmg);
      run.shield -= used; dmg -= used; run.shieldWait = BAL.shieldRegenDelay;
      if (run.shield <= 0) { run.shield = 0; run.shieldBreakT = 0.85; }
    }
    if (dmg <= 0) { run.shake = Math.max(run.shake, wall ? 10 : 6); return; }
    run.hp -= dmg;
    run.invuln = wall ? Math.max(run.invuln, 0.12) : 0.55;
    run.shake = wall ? 16 : 14; run.flash = wall ? 0.22 : 0.18;
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
      spawnCoin(run, e.x, e.y, Math.max(1, Math.round(e.coins * st.coinMul * (BAL.coinPayout || 1))));
    }
    if (e.split && e.type === "splitter") {
      spawnEnemy(run, "spark", { x: e.x - 18, y: e.y });
      spawnEnemy(run, "spark", { x: e.x + 18, y: e.y });
    }
  }

  function spawnCoin(run, x, y, v) {
    if (run.pickups.length >= MAX_PICKUPS) {
      const old = popAt(run.pickups, 0);
      grantCoins(run, old.v || 0);
      give("pickups", old);
    }
    const p = take("pickups");
    p.x = x; p.y = y; p.v = v; p.t = 0; p.wait = 0.12; p.vx = (run.rng() - 0.5) * 80; p.vy = -80;
    run.pickups.push(p);
  }

  function applyKnockback(run, e, st) {
    const lv = st.knockLv || 0;
    if (lv <= 0 || !e || e.type === "boss") return;
    const t = Math.min(1, lv / 12);
    const reach = 140 + t * Math.max(80, SHIP_Y - fieldTop() - 140);
    const dist = Math.hypot(e.x - SHIP_X, e.y - SHIP_Y);
    if (dist > reach) return;
    const resist = knockResist(run.wave);
    // At high waves some hits fail to shove, so a dense swarm can leak to the wall.
    if (resist > 0 && run.rng() < resist * 0.55) return;
    const top = fieldTop() + (e.r || 16);
    // Max level can drive enemies to the top edge. Wave resistance raises the ceiling so
    // late swarms hold around mid-field instead of being pinned off the top.
    const unresisted = SHIP_Y - 90 - t * (SHIP_Y - 90 - top);
    const hold = resist * (SHIP_Y - top) * 0.95;
    const ceil = Math.max(top, unresisted + hold);
    const step = 18 + t * 70;
    e.y = Math.max(ceil, e.y - step);
    e.x = Math.max(40, Math.min(W - 40, e.x));
  }

  function applyOnHit(run, e, dmg, crit, st) {
    if (st.burn > 0) { e.burn = Math.max(e.burn, 1.6 + run.up.burn * 0.15); e.burnDps = st.dmg * st.burn; }
    if (st.chill > 0) e.chill = Math.max(e.chill, 0.7);
    if ((st.knockLv || st.knock) > 0 && e.type !== "boss") applyKnockback(run, e, st);
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

  function gemsFor(run, prevBest) {
    const bosses = run.bossesBeaten || 0;
    let g = (BAL.gemPerBoss || 10) * bosses;
    const best = prevBest == null ? (run.bestWave || 0) : prevBest;
    if ((run.wave || 0) > best) g += (BAL.gemBestWave || 1) * (run.wave - best);
    return Math.max(0, g | 0);
  }


  // Unlock order: inner-right, inner-left, outer-right, outer-left (up to 4 wall sentries).
  const PDEF_SLOTS = [
    { x: 760, oy: 18 },
    { x: 320, oy: 18 },
    { x: 950, oy: 28 },
    { x: 130, oy: 28 }
  ];
  function pdefTurretPos(i, n) {
    const slot = PDEF_SLOTS[Math.max(0, Math.min(PDEF_SLOTS.length - 1, i | 0))];
    return { x: slot.x, y: RAIL_Y - slot.oy };
  }

  function updatePointDef(run, dt, st) {
    if (!run.pdefBeams) run.pdefBeams = [];
    if (!run.pdefAim) run.pdefAim = [-Math.PI / 2, -Math.PI / 2, -Math.PI / 2, -Math.PI / 2];
    if (!run.pdefCds) run.pdefCds = [0, 0, 0, 0];
    for (let i = run.pdefBeams.length - 1; i >= 0; i--) {
      run.pdefBeams[i].t -= dt;
      if (run.pdefBeams[i].t <= 0) run.pdefBeams.splice(i, 1);
    }
    const turrets = st.pdefTurrets || 0;
    const range = st.pdefRange || 0;
    // idle track: each barrel looks at the nearest incoming shot
    for (let t = 0; t < 4; t++) {
      const tp = pdefTurretPos(t, 4);
      let best = null, bestD = 1e9;
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        if (!b || b.friendly) continue;
        const d = Math.hypot(b.x - tp.x, b.y - tp.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      const want = best ? Math.atan2(best.y - tp.y, best.x - tp.x) : -Math.PI / 2;
      let have = run.pdefAim[t] || -Math.PI / 2;
      let diff = want - have;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      run.pdefAim[t] = have + Math.max(-10 * dt, Math.min(10 * dt, diff));
    }
    if (!st.pdefLv || st.pdefLv <= 0 || turrets <= 0) return;
    // Combined intercept rate stays modest; extra sentries mainly add coverage.
    const rateMul = 0.70 + 0.30 * turrets;
    const interval = Math.max(0.50, (st.pdefInterval || 1.15) * rateMul);
    for (let t = 0; t < turrets; t++) {
      run.pdefCds[t] = (run.pdefCds[t] || 0) - dt;
    }
    const claimed = {};
    for (let t = 0; t < turrets; t++) {
      if (run.pdefCds[t] > 0) continue;
      const tp = pdefTurretPos(t, turrets);
      let best = -1, bestScore = 1e9;
      for (let i = 0; i < run.bullets.length; i++) {
        if (claimed[i]) continue;
        const b = run.bullets[i];
        if (!b || b.friendly) continue;
        const d = Math.hypot(b.x - tp.x, b.y - tp.y);
        if (d > range) continue;
        const score = d + (b.y < tp.y - 400 ? 80 : 0) - (b.vy > 0 ? 50 : 0);
        if (score < bestScore) { bestScore = score; best = i; }
      }
      if (best < 0) continue;
      const b = run.bullets[best];
      claimed[best] = true;
      run.pdefAim[t] = Math.atan2(b.y - tp.y, b.x - tp.x);
      if (run.pdefBeams.length < 12) {
        run.pdefBeams.push({ x0: tp.x, y0: tp.y, x1: b.x, y1: b.y, t: 0.40, life: 0.40, deflect: false });
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
        burst(run, b.x, b.y, C.lime, 12);
        give("bullets", popAt(run.bullets, best));
        // claimed indices after splice: mark so we don't use this slot; remaining loop uses original indices carefully
        // popAt shifts later bullets; rebuild claimed by skipping this object (already removed)
        const shifted = {};
        Object.keys(claimed).forEach(k => {
          const ki = k | 0;
          if (ki === best) return;
          shifted[ki > best ? ki - 1 : ki] = true;
        });
        // copy back
        for (const k of Object.keys(claimed)) delete claimed[k];
        Object.keys(shifted).forEach(k => { claimed[k] = true; });
      }
      run.pdefCds[t] = interval;
    }
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
        grantCoins(run, p.v || 0);
        floater(run, tx, ty + 18, "+" + (p.v || 0), C.yellow, "coin");
        give("pickups", popAt(run.pickups, i));
        continue;
      }
      p.x += dx / d * step;
      p.y += dy / d * step;
    }
  }

  function missileLock(run, b) {
    const alive = b.target && run.enemies.indexOf(b.target) >= 0 && b.target.hp > 0;
    if (alive) return b.target;
    b.target = null;
    if ((b.lockSwaps || 0) >= 1) return null;
    const nxt = closestEnemy(run, b.x, b.y);
    if (nxt && nxt.hp > 0) {
      b.target = nxt;
      b.lockSwaps = 1;
      return nxt;
    }
    return null;
  }

  function detonateMissile(run, b, i) {
    burst(run, b.x, b.y, b.color || C.orange, 10);
    let hit = false;
    for (let k = run.enemies.length - 1; k >= 0; k--) {
      const e = run.enemies[k];
      if (!e || e.hp <= 0) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 52) {
        hitEnemy(run, e, b.dmg, false);
        hit = true;
      }
    }
    if (run.missileStats) {
      if (hit) run.missileStats.hits++;
      else run.missileStats.expired++;
      if ((b.steerAcc || 0) > Math.PI * 2 * 1.05) run.missileStats.orbits++;
    }
    give("bullets", popAt(run.bullets, i));
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


  function shopLv(run, id) {
    const sh = run.shop || {};
    const unlocked = sh.unlocked && sh.unlocked[id];
    if (!unlocked) return 0;
    const list = (id === "pylon" || id === "mines") ? (sh.addons || []) : (sh.weapons || []);
    if (list.indexOf(id) < 0) return 0;
    const lv = (sh.levels && (sh.levels[id] | 0)) || 0;
    return Math.max(1, lv);
  }


  function shieldArcGeom(run) {
    const t = turretTierOf(run || { prest: {} });
    const halfW = baseHalfW(t);
    // Shallow dome over the bunker: peak sits a short way above the turrets, covering the wall.
    const peak = 200 + t * 10;
    const r = Math.hypot(halfW + 28, peak) + 6;
    const cy = RAIL_Y + (r - peak);
    const half = Math.atan2(halfW + 28, r - peak) + 0.12;
    return { cx: SHIP_X, cy: cy, r: r, thick: 26, half: Math.min(1.2, half) };
  }
  function pointHitsShieldArc(x, y, rad, run) {
    const A = shieldArcGeom(run);
    const dx = x - A.cx, dy = y - A.cy;
    const d = Math.hypot(dx, dy);
    if (d < A.r - A.thick - rad || d > A.r + A.thick + rad) return false;
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return Math.abs(a) < A.half;
  }
  function segmentHitsShieldArc(x0, y0, x1, y1, rad, run) {
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (pointHitsShieldArc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad, run)) return true;
    }
    return false;
  }
  function distToPolyline(px, py, pts) {
    let best = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const d = distToSegment(px, py, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      if (d < best) best = d;
    }
    return best;
  }
  function detonateNuke(run, b, primary) {
    const rad = b.nukeR || 220;
    if (!run.nukeFx) run.nukeFx = [];
    run.nukeFx.push({ x: b.x, y: b.y, t: 0, life: 0.72, r: rad, kind: "nuke" });
    run.flash = Math.max(run.flash || 0, 0.35);
    run.shake = Math.max(run.shake || 0, 16);
    burst(run, b.x, b.y, C.orange, 16);
    burst(run, b.x, b.y, C.magenta, 10);
    if (primary && primary.hp > 0) hitEnemy(run, primary, b.dmg, false);
    const splash = b.splash || b.dmg * 0.5;
    for (let k = run.enemies.length - 1; k >= 0; k--) {
      const e = run.enemies[k];
      if (!e || e.hp <= 0 || e === primary) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + rad) {
        const fall = 1 - 0.35 * Math.min(1, Math.hypot(e.x - b.x, e.y - b.y) / rad);
        hitEnemy(run, e, splash * fall, false);
      }
    }
  }
  function updateVoidBeam(run, dt, st) {
    if ((st.tierShip || 0) < 5) { run.voidBeam = null; return; }
    if (!run.voidBeam) run.voidBeam = { t: 0, pts: [], tick: 0 };
    const b = run.voidBeam;
    b.t += dt;
    const pts = [];
    const originX = SHIP_X, originY = turretPivotY() - 24;
    const top = fieldTop() + 8;
    const amp = 210 + 50 * Math.sin(b.t * 0.65);
    const phase = b.t * 2.15;
    const k = 0.0078;
    for (let y = originY; y > top; y -= 20) {
      const u = originY - y;
      const x = originX + Math.sin(phase + u * k) * amp + Math.sin(phase * 0.55 + u * k * 2.1) * (amp * 0.32);
      pts.push({ x: x, y: y });
    }
    b.pts = pts;
    b.tick -= dt;
    if (b.tick <= 0 && pts.length > 1) {
      b.tick = 0.08;
      const dmg = (st.gunDmg || st.dmg) * 5 * 0.08 * 1.15; // modest DoT on top of 5 guns
      const halfW = 18;
      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (!e || e.hp <= 0) continue;
        if (distToPolyline(e.x, e.y, pts) < e.r + halfW) hitEnemy(run, e, dmg, false, true);
      }
    }
  }

  function updateShopWeapons(run, dt, st) {
    const lvR = shopLv(run, "rail");
    if (lvR > 0) {
      run.railCd = (run.railCd || 0) - dt;
      if (run.railCd <= 0 && run.enemies.length) {
        const tgt = closestEnemy(run, SHIP_X, turretPivotY() - 20);
        if (tgt) {
          const m = { x: SHIP_X, y: turretPivotY() - 20 };
          const ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
          const x1 = m.x + Math.cos(ang) * 1800, y1 = m.y + Math.sin(ang) * 1800;
          const L = take("lasers");
          L.x0 = m.x; L.y0 = m.y; L.x1 = x1; L.y1 = y1;
          L.t = 0.20; L.dmg = st.dmg * (2.2 + 0.35 * lvR); L.tick = 0; L.w = 7 + lvR;
          L.tier = 0; L.color = C.cyan; L.kind = "rail"; L.hitSet = 0;
          run.lasers.push(L);
          // pierce all along the line once
          for (let k = run.enemies.length - 1; k >= 0; k--) {
            const e = run.enemies[k];
            if (!e || e.hp <= 0) continue;
            if (distToSegment(e.x, e.y, L.x0, L.y0, L.x1, L.y1) < e.r + L.w) hitEnemy(run, e, L.dmg, false);
          }
        }
        run.railCd = Math.max(0.35, 0.85 * Math.pow(0.92, lvR - 1));
      }
    }
    const lvT = shopLv(run, "tesla");
    if (lvT > 0) {
      run.teslaCd = (run.teslaCd || 0) - dt;
      if (!run.teslaArcs) run.teslaArcs = [];
      for (let i = run.teslaArcs.length - 1; i >= 0; i--) {
        run.teslaArcs[i].t -= dt;
        if (run.teslaArcs[i].t <= 0) run.teslaArcs.splice(i, 1);
      }
      if (run.teslaCd <= 0 && run.enemies.length) {
        const hops = 2 + (lvT / 3 | 0);
        const pts = [{ x: SHIP_X, y: turretPivotY() - 16 }];
        let from = { x: SHIP_X, y: turretPivotY() - 16 }, used = {};
        let dmg = st.dmg * (1.4 + 0.2 * lvT);
        for (let h = 0; h < hops; h++) {
          let nxt = null, bestD = 240 + lvT * 8;
          for (let k = 0; k < run.enemies.length; k++) {
            const e = run.enemies[k];
            if (!e || e.hp <= 0 || used[k]) continue;
            const d = Math.hypot(e.x - from.x, e.y - from.y);
            if (d < bestD) { bestD = d; nxt = e; used[k] = true; }
          }
          if (!nxt) break;
          pts.push({ x: nxt.x, y: nxt.y });
          hitEnemy(run, nxt, dmg, false);
          dmg *= 0.78;
          from = nxt;
        }
        if (pts.length > 1) run.teslaArcs.push({ pts: pts, t: 0.16, life: 0.16 });
        run.teslaCd = Math.max(0.40, 1.0 * Math.pow(0.93, lvT - 1));
      }
    }
    const lvF = shopLv(run, "flak");
    if (lvF > 0) {
      run.flakCd = (run.flakCd || 0) - dt;
      if (run.flakCd <= 0 && run.enemies.length) {
        const tgt = closestEnemy(run, SHIP_X, turretPivotY() - 20);
        if (tgt) {
          const ang = Math.atan2(tgt.y - (turretPivotY() - 16), tgt.x - SHIP_X);
          const b = take("bullets");
          b.x = SHIP_X; b.y = turretPivotY() - 16;
          b.vx = Math.cos(ang) * 520; b.vy = Math.sin(ang) * 520;
          b.r = 9; b.dmg = st.dmg * (1.6 + 0.25 * lvF); b.friendly = true;
          b.color = C.orange; b.life = 1.1; b.kind = "flak"; b.crit = false;
          b.tier = 0; b.pierce = 0; b.bounces = 0; b.target = tgt; b.turn = 0;
          b.flakR = 70 + lvF * 6;
          run.bullets.push(b);
        }
        run.flakCd = Math.max(0.40, 0.80 * Math.pow(0.93, lvF - 1));
      }
    }
    const lvNk = shopLv(run, "nuke");
    if (!run.nukeFx) run.nukeFx = [];
    for (let i = run.nukeFx.length - 1; i >= 0; i--) {
      run.nukeFx[i].t += dt;
      if (run.nukeFx[i].t >= run.nukeFx[i].life) run.nukeFx.splice(i, 1);
    }
    if (lvNk > 0) {
      run.nukeCd = (run.nukeCd == null ? 0.6 : run.nukeCd) - dt;
      if (run.nukeCd <= 0 && run.enemies.length) {
        const tgt = closestEnemy(run, SHIP_X, turretPivotY() - 20);
        if (tgt) {
          const m = muzzle(run);
          const ang = Math.atan2(tgt.y - m.y, tgt.x - m.x);
          const b = take("bullets");
          b.x = m.x; b.y = m.y;
          b.vx = Math.cos(ang) * 280; b.vy = Math.sin(ang) * 280;
          b.r = 11; b.dmg = st.dmg * (16 + 1.6 * lvNk); b.friendly = true;
          b.color = C.orange; b.life = 3.2; b.kind = "nuke"; b.crit = false;
          b.tier = 0; b.pierce = 0; b.bounces = 0; b.target = tgt; b.turn = 4;
          b.splash = st.dmg * (7.5 + 0.85 * lvNk);
          b.nukeR = 200 + lvNk * 16;
          run.bullets.push(b);
        }
        run.nukeCd = Math.max(3.4, 5.2 - lvNk * 0.14);
      }
    }
    const lvPy = shopLv(run, "pylon");
    if (lvPy > 0) {
      const pp = { x: SHIP_X - 175, y: RAIL_Y };
      const tgt = closestEnemy(run, pp.x, pp.y - 40);
      if (tgt) run.pylonAim = Math.atan2(tgt.y - pp.y, tgt.x - pp.x);
      run.pylonCd = (run.pylonCd || 0) - dt;
      const reach = 340 + lvPy * 18;
      if (run.pylonCd <= 0 && tgt && Math.hypot(tgt.x - pp.x, tgt.y - pp.y) <= reach + tgt.r) {
        const dmg = st.dmg * (1.25 + 0.22 * lvPy);
        hitEnemy(run, tgt, dmg, false);
        if (!run.teslaArcs) run.teslaArcs = [];
        const pts = [{ x: pp.x, y: pp.y - 36 }, { x: tgt.x, y: tgt.y }];
        if (lvPy >= 5) {
          const hop = closestEnemy(run, tgt.x, tgt.y, tgt);
          if (hop && Math.hypot(hop.x - tgt.x, hop.y - tgt.y) < 200) {
            hitEnemy(run, hop, dmg * 0.55, false, true);
            pts.push({ x: hop.x, y: hop.y });
          }
        }
        run.teslaArcs.push({ pts: pts, t: 0.16, life: 0.16 });
        run.pylonCd = Math.max(0.42, 0.95 * Math.pow(0.93, lvPy - 1));
      }
    }
    const lvM = shopLv(run, "mines");
    if (!run.mines) run.mines = [];
    if (lvM > 0) {
      const blastR = 80 + lvM * 6;
      for (let i = run.mines.length - 1; i >= 0; i--) {
        const m = run.mines[i];
        let hit = false;
        for (let k = 0; k < run.enemies.length; k++) {
          const e = run.enemies[k];
          if (!e || e.hp <= 0) continue;
          if (Math.hypot(e.x - m.x, e.y - m.y) < e.r + m.r) { hit = true; break; }
        }
        if (hit) {
          burst(run, m.x, m.y, C.orange, 12);
          if (!run.nukeFx) run.nukeFx = [];
          run.nukeFx.push({ x: m.x, y: m.y, t: 0, life: 0.28, r: blastR, kind: "mine" });
          for (let j = run.enemies.length - 1; j >= 0; j--) {
            const e2 = run.enemies[j];
            if (e2 && e2.hp > 0 && Math.hypot(e2.x - m.x, e2.y - m.y) < e2.r + blastR) hitEnemy(run, e2, m.dmg, false);
          }
          run.mines.splice(i, 1);
        }
      }
    }
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

    // Base is stationary. Turrets rotate independently within ±70° of straight up.
    run.hullAng = -Math.PI / 2;
    if (!run.turretAng) run.turretAng = [-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2,-Math.PI/2];
    const assigned = assignTurretTargets(run, st);
    for (let i = 0; i < assigned.length; i++) {
      const a0 = assigned[i];
      let want = -Math.PI / 2;
      if (a0.target) want = leadPoint(a0.hp.x, a0.hp.y, a0.target, st.bulletSpd).ang;
      want = clampTurretAng(want);
      let have = run.turretAng[i] != null ? run.turretAng[i] : -Math.PI / 2;
      let da = want - have;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      have += da * Math.min(1, 12 * dt);
      run.turretAng[i] = clampTurretAng(have);
    }
    run.aimAng = run.turretAng[assigned.length >> 1] || -Math.PI / 2;

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

    updateShopWeapons(run, dt, st);
    updateVoidBeam(run, dt, st);
    if (run.shieldBreakT > 0) run.shieldBreakT = Math.max(0, run.shieldBreakT - dt);
    if (run.wallFx && run.wallFx.length) {
      for (let i = run.wallFx.length - 1; i >= 0; i--) {
        run.wallFx[i].t += dt;
        if (run.wallFx[i].t >= (run.wallFx[i].life || 0.4)) run.wallFx.splice(i, 1);
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

    updatePointDef(run, dt, st);

    for (let i = run.bullets.length - 1; i >= 0; i--) {
      const b = run.bullets[i];
      if (b.kind === "missile") {
        const tgt = missileLock(run, b);
        if (tgt) {
          const d = Math.hypot(tgt.x - b.x, tgt.y - b.y);
          if (d < (b.closestD || 1e9)) b.closestD = d;
          const spd0 = Math.hypot(b.vx, b.vy);
          const lp = leadPoint(b.x, b.y, tgt, Math.max(220, spd0));
          let have = Math.atan2(b.vy, b.vx);
          let diff = lp.ang - have;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          let turn = 14;
          if (d < 160) turn = 22;
          if (d < 80) turn = 28;
          if (Math.abs(diff) > 1.2) turn += 6;
          const receding = (b.vx * (tgt.x - b.x) + b.vy * (tgt.y - b.y)) < 0;
          if (receding && (b.closestD || 1e9) < 120 && d < 260) {
            turn = Math.max(turn, 26);
            if (!b.fuse) b.fuse = 0.32;
          }
          const step = Math.max(-turn * dt, Math.min(turn * dt, diff));
          have += step;
          b.steerAcc = (b.steerAcc || 0) + Math.abs(step);
          let spd = spd0 + 70 * dt;
          if (d < 100) spd = Math.min(spd, Math.max(240, spd0));
          spd = Math.min(520, Math.max(220, spd));
          b.vx = Math.cos(have) * spd; b.vy = Math.sin(have) * spd;
          if (b.fuse > 0) { b.fuse -= dt; if (b.fuse <= 0) b.boom = true; }
          if ((b.steerAcc || 0) > Math.PI * 2 * 1.05) b.boom = true;
        }
      }
      if (b.kind === "missile" && b.boom) {
        detonateMissile(run, b, i);
        continue;
      }
      const x0 = b.x, y0 = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -80 || b.x > W + 80 || b.y < -80 || b.y > RAIL_Y + 60) {
        if (b.kind === "missile" && run.missileStats) {
          run.missileStats.expired++;
          if ((b.steerAcc || 0) > Math.PI * 2 * 1.05) run.missileStats.orbits++;
        }
        give("bullets", popAt(run.bullets, i)); continue;
      }
      if (b.kind === "flak") {
        let explode = b.life < 0.15;
        for (let k = 0; k < run.enemies.length; k++) {
          const e = run.enemies[k];
          if (e && e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 18) { explode = true; break; }
        }
        if (explode) {
          burst(run, b.x, b.y, C.orange, 14);
          const rad = b.flakR || 80;
          for (let k = run.enemies.length - 1; k >= 0; k--) {
            const e = run.enemies[k];
            if (e && e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + rad) hitEnemy(run, e, b.dmg, false);
          }
          give("bullets", popAt(run.bullets, i));
          continue;
        }
      }
      if (b.kind === "nuke") {
        let explode = b.life < 0.12;
        let primary = null;
        for (let k = 0; k < run.enemies.length; k++) {
          const e = run.enemies[k];
          if (e && e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 22) { explode = true; primary = e; break; }
        }
        if (explode) {
          detonateNuke(run, b, primary);
          give("bullets", popAt(run.bullets, i));
          continue;
        }
      }
      if (b.friendly) {
        let hit = false;
        for (let k = run.enemies.length - 1; k >= 0; k--) {
          const e = run.enemies[k];
          if (!e || e.hp <= 0) continue;
          if (distToSegment(e.x, e.y, x0, y0, b.x, b.y) < e.r + b.r + HIT_PAD) {
            hitEnemy(run, e, b.dmg, b.crit);
            hit = true;
            if (b.kind === "missile" && run.missileStats) {
              run.missileStats.hits++;
              if ((b.steerAcc || 0) > Math.PI * 2 * 1.05) run.missileStats.orbits++;
            }
            if (b.pierce && b.pierce > 0) { b.pierce--; continue; }
            if (bounceBullet(run, b, e)) break;
            give("bullets", popAt(run.bullets, i));
            break;
          }
        }
        if (hit && !run.bullets[i]) continue;
      } else {
        const hitArc = (st.maxShield > 0 && run.shield > 0) && segmentHitsShieldArc(x0, y0, b.x, b.y, b.r, run);
        const half = baseHalfW(st.tierShip || 0) + 20;
        const hitHull = (b.y > RAIL_Y - 90 && Math.abs(b.x - SHIP_X) < half) || (b.y > wallFace() - 8);
        if (hitArc || hitHull) {
          hurt(run, b.dmg);
          give("bullets", popAt(run.bullets, i));
        }
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
          if (e.spawnCd <= 0 && run.enemies.length < Math.max(BAL.countMax + 6, waveEnemyCount(run.wave) + 8)) {
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
    const targetY = bossTargetY(e.bossKind);
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
    if (e._onField || e.y + (e.r || 16) >= fieldTop()) {
      e._onField = true;
      if (e.type === "boss") {
        const keep = Math.min(bossTargetY(e.bossKind || "herald") + 40, RAIL_Y - 380);
        e.y = Math.max(fieldTop() + 20, Math.min(keep, e.y));
      } else {
        clampEnemyPos(e);
      }
    }
    if (e.type === "boss") return; // bosses never reach the wall
    const face = wallFace();
    if (e.y + (e.r || 16) >= face) {
      const sizeMul = 0.9 + Math.max(0, ((e.r || 16) - 14) / 36);
      hurt(run, e.dmg * sizeMul, e, true);
      run.wallHits = (run.wallHits || 0) + 1;
      burst(run, e.x, Math.min(e.y, face - 4), e.color || C.orange, 10);
      if (!run.wallFx) run.wallFx = [];
      run.wallFx.push({ x: e.x, y: face - 6, t: 0, life: 0.38, color: e.color || C.orange, r: 18 + (e.r || 16) });
      const idx = run.enemies.indexOf(e);
      if (idx >= 0) run.enemies.splice(idx, 1);
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
    if (def.shop) return false; // gem-shop items upgrade with gems only
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
    order.push("spread", "bspd", "laser", "missile", "coinVal");
    if (hpFrac < 0.6) order.push("hp", "armor", "shield", "pdef");
    order.push("pierce", "multi", "crit", "critDmg", "burn");
    order.push("drone", "interest");
    order.push("shRegen", "regen", "knock", "pdef", "freeze", "thorns");
    order.push("dcount", "dmgDrone", "laserW", "mcount", "chain", "ricochet");
    order.push("skip", "orbit", "emp", "hp");
    const unlockBest = Math.max(run.wave || 0, run.bestWave || 0);
    if ((run.up.laser || 0) < 1 && isUnlocked("laser", run.wave, run.up, unlockBest, run.shop) && tryBuy(run, "laser")) return true;
    if ((run.up.missile || 0) < 1 && isUnlocked("missile", run.wave, run.up, unlockBest, run.shop) && tryBuy(run, "missile")) return true;
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
    const order = ["dmg", "hp", "startCoins", "rate", "coinValue", "armor", "shield", "crit", "critDmg", "regen", "interest", "pdef", "pierce", "shRegen", "multi", "slot", "salvage", "thorns", "skip", "wind"];
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
      waveReached: run.wave, kills: run.kills, gemsEarned: gemsFor(run, (opts && opts.prevBest) || run.bestWave || 0),
      coins: run.coins, time: t, bossesBeaten: run.bossesBeaten, dead: run.dead,
      up: Object.assign({}, run.up)
    };
  }

  function simulateRuns(n, opts) {
    opts = opts || {};
    let perma = defaultPerma(), gems = 0, best = 0, mid = defaultMid(), prest = defaultPrest(), bankCoins = 0;
    const rows = [];
    for (let i = 0; i < n; i++) {
      bankCoins = autoBuyPerma(perma, bankCoins);
      const wallet = { gems: gems };
      const run = createRun(perma, { seed: (opts.seed || 77001) + i * 997, bestWave: best, persist: false, mid: mid, prest: prest, carryCoins: 0, gemWallet: wallet, shop: defaultShop() });
      const end = simulateUntilDeath(run, { autoBuy: true, prevBest: best });
      settlePickups(run);
      mid = Object.assign(defaultMid(), end.up);
      prest = Object.assign(defaultPrest(), run.prest || prest);
      bankCoins = (bankCoins | 0) + Math.floor((run.coinsEarned || 0) * carryRate(perma));
      gems = (wallet.gems | 0) + end.gemsEarned;
      best = Math.max(best, end.waveReached);
      rows.push({
        run: i + 1, wave: end.waveReached, kills: end.kills, gemsEarned: end.gemsEarned,
        gemsBank: gems, bankCoins: bankCoins, carryCoins: bankCoins, bosses: end.bossesBeaten,
        time: Math.round(end.time * 10) / 10,
        perma: Object.assign({}, perma), mid: Object.assign({}, mid), prest: Object.assign({}, prest)
      });
    }
    return rows;
  }

  function simulateSwarmCheck(opts) {
    opts = opts || {};
    const mid = Object.assign(defaultMid(), {
      dmg: 8, rate: 8, spread: 3, multi: 2, pierce: 3, bspd: 5, crit: 4, critDmg: 3, burn: 2,
      ship: 10, hp: 12, shield: 8, shRegen: 6, armor: 6, regen: 4, knock: 12, pdef: 6,
      laser: 4, missile: 3, drone: 2, dcount: 1, coinVal: 4
    });
    const prest = Object.assign(defaultPrest(), { dmg: 3, ship: 4, laser: 2, missile: 2, armor: 2, shield: 2, drone: 1 });
    const perma = Object.assign(defaultPerma(), { dmg: 10, rate: 8, hp: 10, armor: 6, shield: 6, crit: 5, startCoins: 8, coinValue: 5, pdef: 4 });
    const run = createRun(perma, { seed: opts.seed || 4242, bestWave: 40, persist: false, mid: mid, prest: prest, carryCoins: 800, shop: defaultShop() });
    run.wave = 0;
    beginWave(run, opts.wave || 33);
    run.phase = "combat"; run.phaseT = 0; run.banner = null;
    composeWave(run);
    // flush pending quickly onto the field
    const pending = run.pending.slice();
    run.pending = [];
    pending.forEach((p, i) => {
      if (p.type === "boss") return;
      const e = spawnEnemy(run, p.type);
      e.y = 80 + (i % 10) * 40 + (i * 13) % 220;
      e._onField = true;
    });
    const samples = [];
    const dt = 1 / 30;
    const secs = opts.secs || 8;
    for (let t = 0; t < secs; t += dt) {
      autoBuyMid(run);
      updateRun(run, dt);
      const on = [];
      for (let i = 0; i < run.enemies.length; i++) {
        const e = run.enemies[i];
        if (!e || e.type === "boss") continue;
        const vis = e.y + e.r > fieldTop() && e.y - e.r < RAIL_Y;
        if (vis) on.push(e.y);
      }
      let total = run.enemies.filter(e => e && e.type !== "boss").length;
      if (total < 16) {
        const kinds = ["spark","drifter","razor","needle","shooter","shellback"];
        const e = spawnEnemy(run, kinds[(t * 7 | 0) % kinds.length], { x: 60 + ((t * 970) | 0) % 960, y: 70 + ((t * 400) | 0) % 160 });
        if (e) e._onField = true;
        total = run.enemies.filter(en => en && en.type !== "boss").length;
      }
      samples.push({ n: total, on: on.length, ys: on.slice() });
    }
    const ys = [];
    let onSum = 0, nSum = 0, fracSum = 0, fracN = 0;
    samples.forEach(s => {
      nSum += s.n; onSum += s.on;
      if (s.n > 0) { fracSum += s.on / s.n; fracN++; }
      s.ys.forEach(y => ys.push(y));
    });
    ys.sort((a, b) => a - b);
    const median = ys.length ? ys[ys.length >> 1] : 0;
    const avg = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
    return {
      wave: opts.wave || 33,
      samples: samples.length,
      avgY: Math.round(avg),
      medianY: Math.round(median),
      onScreenFrac: fracN ? Math.round(1000 * fracSum / fracN) / 1000 : 0,
      fieldTop: fieldTop(),
      railY: RAIL_Y,
      shipY: SHIP_Y,
      midY: Math.round((fieldTop() + RAIL_Y) / 2),
      enemiesEnd: run.enemies.length,
      knock: playerStats(run).knockLv,
      dead: !!run.dead,
      wallHits: run.wallHits || 0,
      hpEnd: Math.round(run.hp || 0),
      shieldEnd: Math.round(run.shield || 0)
    };
  }

  const LO = {
    BAL, UPGRADES, PERMA, ENEMY, TABS,
    createRun, updateRun, tryBuy, tryBuyPerma, autoBuyMid, autoBuyPerma, fireMissile, fireBlaster, shopLv, shopUpgradeCost, shipMuzzles, turretHardpoints, turretCount, simulateSwarmCheck, placeWaveMines, waveEnemyCount, fieldTop, wallFace,
    playerStats, gemsFor, simulateUntilDeath, simulateRuns, beginWave, spawnEnemy,
    defaultPerma, defaultMid, defaultPrest, defaultSave, defaultShop, loadSave, writeSave, migrateSave, midCost, costOf, isUnlocked, SHOP, carryRate, pdefTurretCount, pdefNextAt,
    bossInfo, settlePickups, tryPrestige, prestigeCost, prestMul, tierOf, PRESTIGE_IDS, TIER, MAX_PREST, INFO, PERMA_INFO, effectLine,
    W, get H() { return H; }, get RAIL_Y() { return RAIL_Y; }, SHIP_X,
    get SHIP_Y() { return SHIP_Y; }, C, BUILD
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

  let lastFitKey = "";
  function fit() {
    const fitEl = document.getElementById("fit");
    const stack = document.getElementById("game-stack") || frame || fitEl;
    const vw = Math.max(1, stack.clientWidth || fitEl.clientWidth);
    const vh = Math.max(1, stack.clientHeight || fitEl.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    const key = vw + "x" + vh + "x" + dpr.toFixed(3);
    if (key === lastFitKey && canvas.width) return;
    lastFitKey = key;
    const scale = vw / W;
    const logicalH = Math.max(1, Math.round(vh / scale));
    H = logicalH;
    RAIL_Y = H - CONSOLE_H;
    SHIP_Y = RAIL_Y - 72;
    stage.style.width = W + "px";
    stage.style.height = H + "px";
    stage.style.transform = "scale(" + scale + ")";
    // Backing store tracks the *displayed* size. Cap device pixels but don't go too soft on phones.
    const cap = 2;
    dprScale = Math.min(dpr, cap) * scale;
    dprScale = Math.max(0.75, Math.min(2.5, dprScale));
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
  function mixHex(col, toward, t) {
    const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const a = p(col), b = p(toward.length > 6 ? toward : "#ffffff");
    const r = (a[0] + (b[0] - a[0]) * t) | 0, g0 = (a[1] + (b[1] - a[1]) * t) | 0, bl = (a[2] + (b[2] - a[2]) * t) | 0;
    return "rgb(" + r + "," + g0 + "," + bl + ")";
  }
  function fillSolid(g, pathFn, col, opts) {
    opts = opts || {};
    g.save();
    pathFn();
    const y0 = opts.y0 != null ? opts.y0 : -90;
    const y1 = opts.y1 != null ? opts.y1 : 70;
    const grd = g.createLinearGradient(0, y0, 0, y1);
    grd.addColorStop(0, mixHex(col, "#ffffff", opts.hi != null ? opts.hi : 0.55));
    grd.addColorStop(0.42, col);
    grd.addColorStop(1, mixHex(col, "#000000", opts.lo != null ? opts.lo : 0.45));
    g.fillStyle = grd;
    g.shadowColor = col;
    g.shadowBlur = opts.bloom != null ? opts.bloom : 12;
    g.globalAlpha = opts.alpha != null ? opts.alpha : 0.96;
    g.fill();
    g.restore();
  }
  function outlineClean(g, pathFn, col, width) {
    g.save();
    g.lineJoin = "round"; g.lineCap = "round";
    g.shadowColor = col; g.shadowBlur = 10;
    g.strokeStyle = col; g.lineWidth = (width || 2.4) + 2.2; g.globalAlpha = 0.4;
    pathFn(); g.stroke();
    g.globalAlpha = 1; g.shadowBlur = 3; g.strokeStyle = mixHex(col, "#ffffff", 0.75); g.lineWidth = width || 2.4;
    pathFn(); g.stroke();
    g.restore();
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


  /* ---- Prestige ship drawers, ported from mockups/ships/ships.js ---- */
  function skinPal(tier, skin) {
    const t = TIER[Math.max(0, Math.min(5, tier | 0))];
    const base = {
      glow: t.color, core: t.core, accent: t.accent,
      metalDark: "#080c14", metal: "#171f2c", metalHi: "#4a5b70", ink: "#03060b",
      name: t.name
    };
    if (skin === "stealth") return Object.assign({}, base, {
      glow: "#c8b56a", core: "#e8dca8", accent: "#7a6a30",
      metal: "#12161c", metalHi: "#3a4250", metalDark: "#05070a", ink: "#020305"
    });
    if (skin === "racer") return Object.assign({}, base, {
      glow: "#ffe500", core: "#fff8d0", accent: "#ff4a00",
      metal: "#3a2800", metalHi: "#e8c040", metalDark: "#1a0e00"
    });
    if (skin === "chrome") return Object.assign({}, base, {
      glow: "#d8ecff", core: "#ffffff", accent: "#7ec8ff",
      metal: "#8a98a8", metalHi: "#f4f8ff", metalDark: "#3a4450", ink: "#1a2430"
    });
    if (skin === "alien") return Object.assign({}, base, {
      glow: "#6dff8a", core: "#e8ffe8", accent: "#c8ff00",
      metal: "#102018", metalHi: "#2a4a30", metalDark: "#06100a", ink: "#030a06"
    });
    return base;
  }
  function paintSkinExtras(g, pal, skin, tier) {
    if (!skin || skin === "default") return;
    if (skin === "racer") {
      g.save();
      g.strokeStyle = pal.accent; g.lineWidth = 4; g.shadowColor = pal.accent; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(0, -70); g.lineTo(0, 44); g.stroke();
      g.fillStyle = pal.accent;
      g.beginPath(); g.moveTo(-22, 40); g.lineTo(22, 40); g.lineTo(26, 50); g.lineTo(-26, 50); g.closePath(); g.fill();
      outline(g, (gg) => { gg.beginPath(); gg.moveTo(-22, 40); gg.lineTo(22, 40); gg.lineTo(26, 50); gg.lineTo(-26, 50); gg.closePath(); }, pal.glow, 1.4, 6);
      g.restore();
    } else if (skin === "chrome") {
      g.save();
      const grd = g.createLinearGradient(-80, -40, 80, 50);
      grd.addColorStop(0, "rgba(255,255,255,0)");
      grd.addColorStop(0.45, "rgba(255,255,255,0.18)");
      grd.addColorStop(1, "rgba(180,220,255,0.08)");
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(0, 0, 90, 70, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    } else if (skin === "alien") {
      g.save();
      g.strokeStyle = pal.glow; g.globalAlpha = 0.7; g.lineWidth = 1.4; g.shadowColor = pal.glow; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(-18, -20); g.bezierCurveTo(-40, 0, -50, 20, -28, 36); g.stroke();
      g.beginPath(); g.moveTo(18, -20); g.bezierCurveTo(40, 0, 50, 20, 28, 36); g.stroke();
      // eye canopy overlay
      const eye = (gg) => { gg.beginPath(); gg.ellipse(0, -16, 10, 16, 0, 0, Math.PI * 2); };
      shade(g, eye, 0, -28, 0, 4, [[0, "#fff"], [0.35, pal.core], [1, "#041208"]], pal.glow, 8);
      outline(g, eye, pal.glow, 1.3, 5);
      g.fillStyle = pal.accent; g.shadowColor = pal.accent; g.shadowBlur = 8;
      g.beginPath(); g.ellipse(0, -18, 3.2, 5, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }
  function drawPrestigeShip(g, tier, skin) {
    tier = Math.max(0, Math.min(5, tier | 0));
    skin = skin || "default";
    const p = skinPal(tier, skin);
    const sc = (typeof SHIP_GUN_LAYOUT !== "undefined" ? SHIP_GUN_LAYOUT[tier].scale : 0.8);
    g.save();
    g.scale(sc, sc);
    const drawers = [drawScout, drawFighter, drawHeavyFighter, drawGunship, drawInterceptor, drawFlagship];
    if (tier === 1 && skin === "stealth") drawFighterStealth(g, p);
    else if (tier === 1 && skin === "racer") drawFighterRacer(g, p);
    else if (tier === 1 && skin === "chrome") drawFighterChrome(g, p);
    else if (tier === 1 && skin === "alien") drawFighterAlien(g, p);
    else {
      drawers[tier](g, p, skin === "default" ? "stock" : skin);
      if (tier !== 1) paintSkinExtras(g, p, skin, tier);
    }
    g.restore();
  }
  function drawPlayerTo(g, col, accent, tier, skin) {
    drawPrestigeShip(g, tier, skin || "default");
  }

  function path(g, fn) { g.beginPath(); fn(g); }
  function fillPath(g, fn, style) { path(g, fn); g.fillStyle = style; g.fill(); }
  function strokePath(g, fn, style, w, join) {
    path(g, fn); g.strokeStyle = style; g.lineWidth = w; g.lineJoin = join || "round"; g.lineCap = "round"; g.stroke();
  }

  function shade(g, fn, x0, y0, x1, y1, stops, glow, blur) {
    g.save();
    path(g, fn);
    const grd = g.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grd;
    if (glow) { g.shadowColor = glow; g.shadowBlur = blur == null ? 16 : blur; }
    g.fill();
    g.restore();
  }

  function outline(g, fn, color, w, blur) {
    g.save();
    path(g, fn);
    g.strokeStyle = color;
    g.lineWidth = w || 2.2;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.shadowColor = color;
    g.shadowBlur = blur == null ? 10 : blur;
    g.stroke();
    g.restore();
  }

  function clip(g, fn, draw) {
    g.save();
    path(g, fn);
    g.clip();
    draw(g);
    g.restore();
  }

  function highlight(g, fn, x, y, rx, ry, alpha) {
    clip(g, fn, () => {
      const grd = g.createRadialGradient(x, y, 0, x, y, rx);
      grd.addColorStop(0, "rgba(255,255,255," + (alpha == null ? 0.55 : alpha) + ")");
      grd.addColorStop(0.45, "rgba(255,255,255,0.12)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x, y, rx, ry || rx, 0, 0, Math.PI * 2);
      g.fill();
    });
  }

  function panel(g, x1, y1, x2, y2, col) {
    g.save();
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = col || "rgba(255,255,255,0.12)";
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x1 + 0.8, y1); g.lineTo(x2 + 0.8, y2); g.stroke();
    g.restore();
  }

  function engine(g, x, y, w, h, color, core) {
    g.save();
    g.translate(x, y);
    // nozzle housing
    const house = (gg) => { gg.beginPath(); gg.moveTo(-w, 0); gg.lineTo(w, 0); gg.lineTo(w * 0.72, h * 0.28); gg.lineTo(-w * 0.72, h * 0.28); gg.closePath(); };
    shade(g, () => house(g), -w, 0, w, 0, [[0, "#1a1a1a"], [0.5, "#3a3a42"], [1, "#101014"]], color, 6);
    outline(g, () => house(g), color, 1.2, 6);
    // plume
    const plume = (gg) => { gg.beginPath(); gg.moveTo(-w * 0.55, h * 0.25); gg.lineTo(w * 0.55, h * 0.25); gg.lineTo(w * 0.18, h); gg.lineTo(-w * 0.18, h); gg.closePath(); };
    shade(g, () => plume(g), 0, h * 0.2, 0, h, [[0, "#fff"], [0.25, core || color], [0.7, color], [1, "rgba(0,0,0,0)"]], color, 16);
    g.restore();
  }

  function barrel(g, x, y, len, r, pal, ang) {
    g.save();
    g.translate(x, y);
    g.rotate(ang || 0);
    const body = (gg) => { gg.beginPath(); gg.roundRect(-r, -len, r * 2, len + 4, r * 0.4); };
    shade(g, () => body(g), -r, 0, r, 0, [[0, pal.metalHi], [0.5, pal.metal], [1, pal.metalDark]], pal.glow, 4);
    outline(g, () => body(g), pal.glow, 1.1, 5);
    // muzzle glow
    g.fillStyle = pal.core;
    g.shadowColor = pal.glow;
    g.shadowBlur = 10;
    g.beginPath();
    g.ellipse(0, -len, r * 0.7, r * 0.45, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
    // local (0, -len) rotated
    return { x: x + sa * -len, y: y + ca * -len };
  }

  function canopyGlass(g, fn, pal, hx, hy) {
    shade(g, fn, hx, hy - 16, hx, hy + 22, [
      [0, "rgba(255,255,255,0.85)"],
      [0.22, pal.core],
      [0.55, pal.accent],
      [1, "rgba(8,10,20,0.92)"]
    ], pal.accent, 8);
    outline(g, fn, pal.accent, 1.5, 6);
    highlight(g, fn, hx - 4, hy - 8, 10, 16, 0.7);
  }

  function metalStops(pal) {
    return [
      [0, pal.metalHi],
      [0.28, pal.metal],
      [0.7, pal.metalDark],
      [1, pal.ink]
    ];
  }

  /* ---------------- SHIPS ---------------- */
  // All ships drawn nose-up, origin at approximate visual center. Return { muzzles, scaleHint }

  function drawScout(g, pal) {
    // Compact one-person pod. Single nose gun.
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -52);
      gg.bezierCurveTo(16, -48, 24, -20, 24, 4);
      gg.bezierCurveTo(24, 28, 16, 42, 0, 48);
      gg.bezierCurveTo(-16, 42, -24, 28, -24, 4);
      gg.bezierCurveTo(-24, -20, -16, -48, 0, -52);
    };
    const finL = (gg) => { gg.beginPath(); gg.moveTo(-14, 10); gg.lineTo(-46, 28); gg.lineTo(-40, 40); gg.lineTo(-12, 28); gg.closePath(); };
    const finR = (gg) => { gg.beginPath(); gg.moveTo(14, 10); gg.lineTo(46, 28); gg.lineTo(40, 40); gg.lineTo(12, 28); gg.closePath(); };
    const canopy = (gg) => {
      gg.beginPath();
      gg.ellipse(0, -16, 11, 18, 0, 0, Math.PI * 2);
    };

    shade(g, finL, -14, 10, -46, 40, metalStops(pal), pal.glow, 8);
    shade(g, finR, 14, 10, 46, 40, metalStops(pal), pal.glow, 8);
    outline(g, finL, pal.glow, 1.8, 8);
    outline(g, finR, pal.glow, 1.8, 8);

    shade(g, body, -24, -52, 24, 48, [
      [0, pal.metalHi], [0.2, blend(pal.metal, pal.glow, 0.18)], [0.65, pal.metal], [1, pal.ink]
    ], pal.glow, 16);
    outline(g, body, pal.glow, 2.4, 12);
    clip(g, body, () => {
      panel(g, -8, -36, -16, 20, pal.glow);
      panel(g, 8, -36, 16, 20, pal.glow);
      panel(g, -18, 8, 18, 8, pal.glow);
    });
    highlight(g, body, -6, -24, 16, 28, 0.45);

    canopyGlass(g, canopy, pal, 0, -18);

    engine(g, 0, 48, 11, 28, pal.glow, pal.core);
    const m = barrel(g, 0, -50, 22, 3.2, pal, 0);
    return { muzzles: [{ x: m.x, y: m.y, id: "1", label: "Nose cannon" }] };
  }

  function drawFighter(g, pal, skin) {
    skin = skin || "stock";
    const stealth = skin === "stealth";
    const racer = skin === "racer";
    const chrome = skin === "chrome";
    const alien = skin === "alien";

    if (alien) return drawFighterAlien(g, pal);
    if (stealth) return drawFighterStealth(g, pal);
    if (racer) return drawFighterRacer(g, pal);
    if (chrome) return drawFighterChrome(g, pal);

    const span = 108;
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -78);
      gg.lineTo(9, -54);
      gg.lineTo(13, -10);
      gg.lineTo(16, 22);
      gg.lineTo(10, 44);
      gg.lineTo(0, 52);
      gg.lineTo(-10, 44);
      gg.lineTo(-16, 22);
      gg.lineTo(-13, -10);
      gg.lineTo(-9, -54);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-10, -8);
      gg.lineTo(-span, 18);
      gg.lineTo(-span - 8, 36);
      gg.lineTo(-span + 18, 48);
      gg.lineTo(-14, 28);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(10, -8);
      gg.lineTo(span, 18);
      gg.lineTo(span + 8, 36);
      gg.lineTo(span - 18, 48);
      gg.lineTo(14, 28);
      gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -42);
      gg.bezierCurveTo(9, -36, 10, -8, 0, 6);
      gg.bezierCurveTo(-10, -8, -9, -36, 0, -42);
    };
    const noseCap = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -78);
      gg.lineTo(6, -60);
      gg.lineTo(-6, -60);
      gg.closePath();
    };

    shade(g, wingL, -10, -8, -span, 48, metalStops(pal), pal.glow, 12);
    shade(g, wingR, 10, -8, span, 48, metalStops(pal), pal.glow, 12);
    outline(g, wingL, pal.glow, 2.2, 10);
    outline(g, wingR, pal.glow, 2.2, 10);
    clip(g, wingL, () => { panel(g, -22, 4, -90, 28, pal.glow); panel(g, -28, 16, -80, 36, pal.glow); });
    clip(g, wingR, () => { panel(g, 22, 4, 90, 28, pal.glow); panel(g, 28, 16, 80, 36, pal.glow); });

    shade(g, body, 0, -78, 0, 52, [
      [0, pal.metalHi], [0.25, blend(pal.metal, pal.glow, 0.15)], [0.7, pal.metal], [1, pal.ink]
    ], pal.glow, 16);
    outline(g, body, pal.glow, 2.5, 12);
    clip(g, body, () => {
      panel(g, -7, -50, -12, 24, pal.glow);
      panel(g, 7, -50, 12, 24, pal.glow);
      panel(g, -10, 16, 10, 16, pal.glow);
    });
    highlight(g, body, -5, -30, 14, 26, 0.42);

    // decorative nose sensor (not a gun)
    shade(g, noseCap, 0, -78, 0, -60, [[0, pal.accent], [1, pal.metalDark]], pal.accent, 6);
    outline(g, noseCap, pal.accent, 1.2, 5);
    g.save();
    g.fillStyle = pal.core; g.shadowColor = pal.accent; g.shadowBlur = 6;
    g.beginPath(); g.arc(0, -70, 2.2, 0, Math.PI * 2); g.fill();
    g.restore();

    canopyGlass(g, canopy, pal, 0, -20);

    engine(g, -12, 50, 8, 26, pal.glow, pal.core);
    engine(g, 12, 50, 8, 26, pal.glow, pal.core);

    const l = barrel(g, -78, 8, 26, 3.1, pal, 0);
    const r = barrel(g, 78, 8, 26, 3.1, pal, 0);
    return { muzzles: [
      { x: l.x, y: l.y, id: "1", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "2", label: "Right wing gun" }
    ] };
  }

  function drawFighterStealth(g, pal) {
    const p = Object.assign({}, pal, { glow: "#c8b56a", core: "#e8dca8", accent: "#7a6a30", metal: "#0c1016", metalHi: "#222830", metalDark: "#05070a", ink: "#020305" });
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -74);
      gg.lineTo(12, -48);
      gg.lineTo(14, -8);
      gg.lineTo(18, 28);
      gg.lineTo(8, 50);
      gg.lineTo(0, 44);
      gg.lineTo(-8, 50);
      gg.lineTo(-18, 28);
      gg.lineTo(-14, -8);
      gg.lineTo(-12, -48);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-12, -4);
      gg.lineTo(-118, 8);
      gg.lineTo(-124, 18);
      gg.lineTo(-96, 22);
      gg.lineTo(-110, 34);
      gg.lineTo(-18, 32);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(12, -4);
      gg.lineTo(118, 8);
      gg.lineTo(124, 18);
      gg.lineTo(96, 22);
      gg.lineTo(110, 34);
      gg.lineTo(18, 32);
      gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(-7, -28); gg.lineTo(7, -28); gg.lineTo(8, 0); gg.lineTo(0, 8); gg.lineTo(-8, 0); gg.closePath();
    };
    shade(g, wingL, -12, -4, -118, 34, [[0, "#3a4250"], [0.45, "#1a2028"], [1, "#0a0d12"]], p.glow, 8);
    shade(g, wingR, 12, -4, 118, 34, [[0, "#3a4250"], [0.45, "#1a2028"], [1, "#0a0d12"]], p.glow, 8);
    outline(g, wingL, p.glow, 1.7, 6);
    outline(g, wingR, p.glow, 1.7, 6);
    highlight(g, wingL, -40, 8, 36, 18, 0.22);
    highlight(g, wingR, 40, 8, 36, 18, 0.22);
    shade(g, body, 0, -74, 0, 50, [[0, "#4a5260"], [0.35, "#1e242c"], [1, "#0a0d12"]], p.glow, 10);
    outline(g, body, p.glow, 2.0, 8);
    clip(g, body, () => {
      panel(g, -8, -50, -14, 20, p.glow);
      panel(g, 8, -50, 14, 20, p.glow);
      panel(g, -10, 10, 10, 10, p.glow);
    });
    highlight(g, body, -5, -20, 12, 22, 0.28);
    shade(g, canopy, 0, -28, 0, 8, [[0, "#3a4850"], [0.5, "#151a20"], [1, "#05080c"]], p.glow, 4);
    outline(g, canopy, p.glow, 1.3, 4);
    engine(g, -11, 48, 7, 20, p.glow, "#888060");
    engine(g, 11, 48, 7, 20, p.glow, "#888060");
    const l = barrel(g, -86, 2, 22, 2.6, p, 0);
    const r = barrel(g, 86, 2, 22, 2.6, p, 0);
    return { muzzles: [
      { x: l.x, y: l.y, id: "1", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "2", label: "Right wing gun" }
    ] };
  }

  function drawFighterRacer(g, pal) {
    const p = Object.assign({}, pal, { glow: "#ffe500", core: "#fff8d0", accent: "#ff4a00" });
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -96);
      gg.lineTo(7, -60);
      gg.lineTo(11, -8);
      gg.lineTo(13, 28);
      gg.lineTo(8, 48);
      gg.lineTo(0, 54);
      gg.lineTo(-8, 48);
      gg.lineTo(-13, 28);
      gg.lineTo(-11, -8);
      gg.lineTo(-7, -60);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-8, 0);
      gg.lineTo(-112, 26);
      gg.lineTo(-100, 44);
      gg.lineTo(-12, 30);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(8, 0);
      gg.lineTo(112, 26);
      gg.lineTo(100, 44);
      gg.lineTo(12, 30);
      gg.closePath();
    };
    const spoiler = (gg) => {
      gg.beginPath();
      gg.moveTo(-28, 40); gg.lineTo(28, 40); gg.lineTo(30, 50); gg.lineTo(-30, 50); gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -50);
      gg.bezierCurveTo(8, -44, 9, -12, 0, 4);
      gg.bezierCurveTo(-9, -12, -8, -44, 0, -50);
    };
    shade(g, wingL, -8, 0, -112, 44, [[0, "#f4f0e0"], [0.4, "#c8a020"], [1, "#2a1a00"]], p.glow, 10);
    shade(g, wingR, 8, 0, 112, 44, [[0, "#f4f0e0"], [0.4, "#c8a020"], [1, "#2a1a00"]], p.glow, 10);
    outline(g, wingL, p.glow, 2, 8);
    outline(g, wingR, p.glow, 2, 8);
    shade(g, body, 0, -96, 0, 54, [[0, "#fff8e0"], [0.25, "#e8c040"], [0.7, "#5a3a00"], [1, "#1a0e00"]], p.glow, 14);
    outline(g, body, p.glow, 2.4, 10);
    // racing stripe
    clip(g, body, () => {
      g.fillStyle = "#111";
      g.fillRect(-4, -96, 8, 150);
      g.fillStyle = p.accent;
      g.fillRect(-2, -96, 4, 150);
      // number
      g.fillStyle = "#111";
      g.font = "700 16px Orbitron, sans-serif";
      g.textAlign = "center";
      g.fillText("02", 0, 24);
    });
    shade(g, spoiler, 0, 40, 0, 50, [[0, "#222"], [1, "#000"]], p.accent, 6);
    outline(g, spoiler, p.accent, 1.4, 5);
    canopyGlass(g, canopy, p, 0, -24);
    engine(g, -11, 52, 7.5, 30, p.glow, "#fff");
    engine(g, 11, 52, 7.5, 30, p.glow, "#fff");
    const l = barrel(g, -80, 14, 24, 2.8, p, 0);
    const r = barrel(g, 80, 14, 24, 2.8, p, 0);
    return { muzzles: [
      { x: l.x, y: l.y, id: "1", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "2", label: "Right wing gun" }
    ] };
  }

  function drawFighterChrome(g, pal) {
    const p = Object.assign({}, pal, { glow: "#d0e8f8", core: "#ffffff", accent: "#8ad8ff" });
    const chromeStops = [[0, "#ffffff"], [0.18, "#c8d8e8"], [0.4, "#6a7a88"], [0.62, "#e8f0f8"], [0.82, "#3a4450"], [1, "#101418"]];
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -80);
      gg.bezierCurveTo(14, -60, 16, -8, 15, 24);
      gg.lineTo(10, 50);
      gg.lineTo(0, 56);
      gg.lineTo(-10, 50);
      gg.lineTo(-15, 24);
      gg.bezierCurveTo(-16, -8, -14, -60, 0, -80);
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-10, -2);
      gg.bezierCurveTo(-60, 8, -110, 16, -114, 24);
      gg.lineTo(-96, 46);
      gg.lineTo(-14, 30);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(10, -2);
      gg.bezierCurveTo(60, 8, 110, 16, 114, 24);
      gg.lineTo(96, 46);
      gg.lineTo(14, 30);
      gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -40);
      gg.bezierCurveTo(10, -32, 11, -4, 0, 12);
      gg.bezierCurveTo(-11, -4, -10, -32, 0, -40);
    };
    shade(g, wingL, -10, 0, -114, 46, chromeStops, p.glow, 10);
    shade(g, wingR, 10, 0, 114, 46, chromeStops, p.glow, 10);
    outline(g, wingL, p.glow, 1.8, 8);
    outline(g, wingR, p.glow, 1.8, 8);
    shade(g, body, -16, -80, 16, 56, chromeStops, p.glow, 14);
    outline(g, body, p.glow, 2.2, 10);
    highlight(g, body, -4, -30, 18, 30, 0.75);
    canopyGlass(g, canopy, p, 0, -16);
    engine(g, -11, 52, 8, 24, p.accent, "#fff");
    engine(g, 11, 52, 8, 24, p.accent, "#fff");
    const l = barrel(g, -80, 10, 24, 3, p, 0);
    const r = barrel(g, 80, 10, 24, 3, p, 0);
    return { muzzles: [
      { x: l.x, y: l.y, id: "1", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "2", label: "Right wing gun" }
    ] };
  }

  function drawFighterAlien(g, pal) {
    const p = Object.assign({}, pal, { glow: "#7cff9a", core: "#e8ffe0", accent: "#c06bff", metal: "#1a1420", metalHi: "#3a2850", metalDark: "#0a0810", ink: "#050308" });
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -70);
      gg.bezierCurveTo(22, -50, 26, -8, 22, 24);
      gg.bezierCurveTo(16, 44, 6, 52, 0, 50);
      gg.bezierCurveTo(-6, 52, -16, 44, -22, 24);
      gg.bezierCurveTo(-26, -8, -22, -50, 0, -70);
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-10, -6);
      gg.bezierCurveTo(-40, 0, -100, 6, -120, 22);
      gg.bezierCurveTo(-110, 40, -60, 36, -16, 26);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(10, -6);
      gg.bezierCurveTo(40, 0, 100, 6, 120, 22);
      gg.bezierCurveTo(110, 40, 60, 36, 16, 26);
      gg.closePath();
    };
    const eye = (gg) => { gg.beginPath(); gg.ellipse(0, -18, 12, 16, 0, 0, Math.PI * 2); };
    shade(g, wingL, -10, -6, -120, 36, [[0, "#3a2048"], [0.5, "#1a1028"], [1, "#0a0610"]], p.accent, 12);
    shade(g, wingR, 10, -6, 120, 36, [[0, "#3a2048"], [0.5, "#1a1028"], [1, "#0a0610"]], p.accent, 12);
    outline(g, wingL, p.glow, 2, 10);
    outline(g, wingR, p.glow, 2, 10);
    clip(g, wingL, () => {
      g.strokeStyle = p.glow; g.lineWidth = 1.1; g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(-20, 8); g.quadraticCurveTo(-70, 8, -100, 22); g.stroke();
      g.beginPath(); g.moveTo(-24, 16); g.quadraticCurveTo(-60, 22, -90, 30); g.stroke();
      g.globalAlpha = 1;
    });
    clip(g, wingR, () => {
      g.strokeStyle = p.glow; g.lineWidth = 1.1; g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(20, 8); g.quadraticCurveTo(70, 8, 100, 22); g.stroke();
      g.beginPath(); g.moveTo(24, 16); g.quadraticCurveTo(60, 22, 90, 30); g.stroke();
      g.globalAlpha = 1;
    });
    shade(g, body, 0, -70, 0, 50, [[0, "#6a4080"], [0.3, "#2a1838"], [1, "#0a0610"]], p.accent, 16);
    outline(g, body, p.glow, 2.3, 12);
    clip(g, body, () => {
      g.strokeStyle = p.glow; g.lineWidth = 1; g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(-8, -40); g.quadraticCurveTo(-16, 0, -10, 30); g.stroke();
      g.beginPath(); g.moveTo(8, -40); g.quadraticCurveTo(16, 0, 10, 30); g.stroke();
      g.globalAlpha = 1;
    });
    // eye canopy
    shade(g, eye, 0, -28, 0, 0, [[0, "#f0ffe8"], [0.3, p.glow], [0.7, p.accent], [1, "#100818"]], p.glow, 12);
    outline(g, eye, p.glow, 1.6, 8);
    g.save(); g.fillStyle = "#050308"; g.beginPath(); g.ellipse(0, -18, 5, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = p.core; g.beginPath(); g.arc(-2, -22, 2, 0, Math.PI * 2); g.fill(); g.restore();
    engine(g, -10, 48, 8, 22, p.accent, p.glow);
    engine(g, 10, 48, 8, 22, p.accent, p.glow);
    // organic gun stalks
    const stalk = (sx, sy, dir) => {
      g.save();
      g.strokeStyle = p.glow; g.lineWidth = 5; g.shadowColor = p.glow; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(sx * 0.3, 6); g.quadraticCurveTo(sx * 0.7, 0, sx, sy); g.stroke();
      g.restore();
      return barrel(g, sx, sy, 20, 3.4, p, 0);
    };
    const l = stalk(-88, 6);
    const r = stalk(88, 6);
    return { muzzles: [
      { x: l.x, y: l.y, id: "1", label: "Left bio-cannon" },
      { x: r.x, y: r.y, id: "2", label: "Right bio-cannon" }
    ] };
  }

  function drawHeavyFighter(g, pal) {
    const span = 128;
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -92);
      gg.lineTo(11, -62);
      gg.lineTo(17, -8);
      gg.lineTo(22, 24);
      gg.lineTo(16, 50);
      gg.lineTo(0, 60);
      gg.lineTo(-16, 50);
      gg.lineTo(-22, 24);
      gg.lineTo(-17, -8);
      gg.lineTo(-11, -62);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-14, -16);
      gg.lineTo(-span, 10);
      gg.lineTo(-span - 14, 32);
      gg.lineTo(-span + 16, 56);
      gg.lineTo(-20, 36);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(14, -16);
      gg.lineTo(span, 10);
      gg.lineTo(span + 14, 32);
      gg.lineTo(span - 16, 56);
      gg.lineTo(20, 36);
      gg.closePath();
    };
    const canL = (gg) => { gg.beginPath(); gg.moveTo(-12, -40); gg.lineTo(-52, -58); gg.lineTo(-28, -22); gg.closePath(); };
    const canR = (gg) => { gg.beginPath(); gg.moveTo(12, -40); gg.lineTo(52, -58); gg.lineTo(28, -22); gg.closePath(); };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -50);
      gg.bezierCurveTo(11, -42, 12, -8, 0, 10);
      gg.bezierCurveTo(-12, -8, -11, -42, 0, -50);
    };
    const intakeL = (gg) => { gg.beginPath(); gg.moveTo(-16, 8); gg.lineTo(-30, 18); gg.lineTo(-26, 36); gg.lineTo(-16, 32); gg.closePath(); };
    const intakeR = (gg) => { gg.beginPath(); gg.moveTo(16, 8); gg.lineTo(30, 18); gg.lineTo(26, 36); gg.lineTo(16, 32); gg.closePath(); };

    shade(g, wingL, -14, -16, -span, 56, metalStops(pal), pal.glow, 12);
    shade(g, wingR, 14, -16, span, 56, metalStops(pal), pal.glow, 12);
    outline(g, wingL, pal.glow, 2.3, 10);
    outline(g, wingR, pal.glow, 2.3, 10);
    shade(g, canL, -12, -58, -52, -22, metalStops(pal), pal.glow, 6);
    shade(g, canR, 12, -58, 52, -22, metalStops(pal), pal.glow, 6);
    outline(g, canL, pal.glow, 1.6, 6);
    outline(g, canR, pal.glow, 1.6, 6);

    shade(g, body, 0, -92, 0, 60, [
      [0, pal.metalHi], [0.2, blend(pal.metal, pal.glow, 0.2)], [0.65, pal.metal], [1, pal.ink]
    ], pal.glow, 18);
    outline(g, body, pal.glow, 2.6, 12);
    clip(g, body, () => {
      panel(g, -9, -64, -16, 20, pal.glow);
      panel(g, 9, -64, 16, 20, pal.glow);
      panel(g, -14, 8, 14, 8, pal.glow);
      panel(g, -12, 28, 12, 28, pal.glow);
    });
    highlight(g, body, -6, -36, 16, 28, 0.42);
    shade(g, intakeL, -16, 8, -30, 36, [[0, "#222"], [1, "#000"]], pal.glow, 4);
    shade(g, intakeR, 16, 8, 30, 36, [[0, "#222"], [1, "#000"]], pal.glow, 4);
    outline(g, intakeL, pal.glow, 1.2, 4);
    outline(g, intakeR, pal.glow, 1.2, 4);
    canopyGlass(g, canopy, pal, 0, -22);

    engine(g, -16, 58, 9, 28, pal.glow, pal.core);
    engine(g, 16, 58, 9, 28, pal.glow, pal.core);

    const n = barrel(g, 0, -90, 28, 3.6, pal, 0);
    const l = barrel(g, -92, 0, 28, 3.3, pal, 0);
    const r = barrel(g, 92, 0, 28, 3.3, pal, 0);
    return { muzzles: [
      { x: n.x, y: n.y, id: "1", label: "Nose cannon" },
      { x: l.x, y: l.y, id: "2", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "3", label: "Right wing gun" }
    ] };
  }

  function drawGunship(g, pal) {
    const span = 148;
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -88);
      gg.lineTo(16, -58);
      gg.lineTo(24, -8);
      gg.lineTo(28, 28);
      gg.lineTo(22, 58);
      gg.lineTo(0, 68);
      gg.lineTo(-22, 58);
      gg.lineTo(-28, 28);
      gg.lineTo(-24, -8);
      gg.lineTo(-16, -58);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-20, -8);
      gg.lineTo(-span, 8);
      gg.lineTo(-span - 10, 28);
      gg.lineTo(-span + 8, 40);
      gg.lineTo(-span + 20, 62);
      gg.lineTo(-24, 44);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(20, -8);
      gg.lineTo(span, 8);
      gg.lineTo(span + 10, 28);
      gg.lineTo(span - 8, 40);
      gg.lineTo(span - 20, 62);
      gg.lineTo(24, 44);
      gg.closePath();
    };
    const armorL = (gg) => { gg.beginPath(); gg.moveTo(-18, -20); gg.lineTo(-36, -8); gg.lineTo(-34, 36); gg.lineTo(-20, 32); gg.closePath(); };
    const armorR = (gg) => { gg.beginPath(); gg.moveTo(18, -20); gg.lineTo(36, -8); gg.lineTo(34, 36); gg.lineTo(20, 32); gg.closePath(); };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -40);
      gg.bezierCurveTo(12, -32, 13, 0, 0, 14);
      gg.bezierCurveTo(-13, 0, -12, -32, 0, -40);
    };

    shade(g, wingL, -20, -8, -span, 62, metalStops(pal), pal.glow, 12);
    shade(g, wingR, 20, -8, span, 62, metalStops(pal), pal.glow, 12);
    outline(g, wingL, pal.glow, 2.4, 10);
    outline(g, wingR, pal.glow, 2.4, 10);

    shade(g, armorL, -18, -20, -36, 36, [[0, pal.core], [0.3, pal.metalHi], [1, pal.ink]], pal.glow, 6);
    shade(g, armorR, 18, -20, 36, 36, [[0, pal.core], [0.3, pal.metalHi], [1, pal.ink]], pal.glow, 6);
    outline(g, armorL, pal.glow, 1.8, 6);
    outline(g, armorR, pal.glow, 1.8, 6);

    shade(g, body, 0, -88, 0, 68, [
      [0, "#f8fbff"], [0.15, pal.metalHi], [0.45, pal.metal], [1, pal.ink]
    ], pal.glow, 16);
    outline(g, body, pal.glow, 2.8, 12);
    clip(g, body, () => {
      panel(g, -12, -60, -20, 20, pal.accent);
      panel(g, 12, -60, 20, 20, pal.accent);
      panel(g, -16, 0, 16, 0, pal.accent);
      panel(g, -18, 24, 18, 24, pal.accent);
      panel(g, -14, 44, 14, 44, pal.accent);
    });
    highlight(g, body, -8, -30, 18, 30, 0.55);
    canopyGlass(g, canopy, pal, 0, -14);

    engine(g, -20, 66, 10, 30, pal.accent, pal.core);
    engine(g, 0, 68, 11, 32, pal.accent, pal.core);
    engine(g, 20, 66, 10, 30, pal.accent, pal.core);

    // twin nose + two wing = 4
    const n1 = barrel(g, -13, -86, 26, 3.3, pal, 0);
    const n2 = barrel(g, 13, -86, 26, 3.3, pal, 0);
    const l = barrel(g, -108, -2, 28, 3.5, pal, 0);
    const r = barrel(g, 108, -2, 28, 3.5, pal, 0);
    return { muzzles: [
      { x: n1.x, y: n1.y, id: "1", label: "Left nose cannon" },
      { x: n2.x, y: n2.y, id: "2", label: "Right nose cannon" },
      { x: l.x, y: l.y, id: "3", label: "Left wing gun" },
      { x: r.x, y: r.y, id: "4", label: "Right wing gun" }
    ] };
  }

  function drawInterceptor(g, pal) {
    const span = 160;
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -108);
      gg.lineTo(10, -70);
      gg.lineTo(16, -16);
      gg.lineTo(20, 28);
      gg.lineTo(14, 58);
      gg.lineTo(0, 70);
      gg.lineTo(-14, 58);
      gg.lineTo(-20, 28);
      gg.lineTo(-16, -16);
      gg.lineTo(-10, -70);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-12, -28);
      gg.lineTo(-span + 10, -8);
      gg.lineTo(-span - 16, 16);
      gg.lineTo(-span + 8, 24);
      gg.lineTo(-span, 50);
      gg.lineTo(-20, 36);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(12, -28);
      gg.lineTo(span - 10, -8);
      gg.lineTo(span + 16, 16);
      gg.lineTo(span - 8, 24);
      gg.lineTo(span, 50);
      gg.lineTo(20, 36);
      gg.closePath();
    };
    const podL = (gg) => {
      gg.beginPath();
      gg.moveTo(-48, -8);
      gg.lineTo(-66, 2);
      gg.lineTo(-70, 28);
      gg.lineTo(-62, 50);
      gg.lineTo(-50, 46);
      gg.lineTo(-44, 8);
      gg.closePath();
    };
    const podR = (gg) => {
      gg.beginPath();
      gg.moveTo(48, -8);
      gg.lineTo(66, 2);
      gg.lineTo(70, 28);
      gg.lineTo(62, 50);
      gg.lineTo(50, 46);
      gg.lineTo(44, 8);
      gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -56);
      gg.bezierCurveTo(11, -48, 12, -10, 0, 8);
      gg.bezierCurveTo(-12, -10, -11, -48, 0, -56);
    };

    shade(g, wingL, -12, -28, -span, 50, metalStops(pal), pal.glow, 12);
    shade(g, wingR, 12, -28, span, 50, metalStops(pal), pal.glow, 12);
    outline(g, wingL, pal.glow, 2.3, 10);
    outline(g, wingR, pal.glow, 2.3, 10);
    shade(g, podL, -48, -8, -70, 50, metalStops(pal), pal.glow, 8);
    shade(g, podR, 48, -8, 70, 50, metalStops(pal), pal.glow, 8);
    outline(g, podL, pal.glow, 1.6, 6);
    outline(g, podR, pal.glow, 1.6, 6);

    shade(g, body, 0, -108, 0, 70, [
      [0, pal.core], [0.18, blend(pal.metalHi, pal.glow, 0.25)], [0.6, pal.metal], [1, pal.ink]
    ], pal.glow, 16);
    outline(g, body, pal.glow, 2.6, 12);
    clip(g, body, () => {
      panel(g, -8, -80, -14, 30, pal.glow);
      panel(g, 8, -80, 14, 30, pal.glow);
      panel(g, -12, 8, 12, 8, pal.glow);
      panel(g, -10, 36, 10, 36, pal.glow);
    });
    highlight(g, body, -6, -40, 14, 32, 0.45);
    canopyGlass(g, canopy, pal, 0, -24);

    engine(g, -18, 66, 8, 26, pal.glow, pal.core);
    engine(g, 0, 70, 10, 30, pal.glow, pal.core);
    engine(g, 18, 66, 8, 26, pal.glow, pal.core);
    engine(g, -56, 48, 8, 24, pal.glow, pal.core);
    engine(g, 56, 48, 8, 24, pal.glow, pal.core);

    const n = barrel(g, 0, -106, 30, 3.6, pal, 0);
    const li = barrel(g, -58, -8, 24, 3.0, pal, 0);
    const ri = barrel(g, 58, -8, 24, 3.0, pal, 0);
    const lo = barrel(g, -118, -4, 26, 3.2, pal, 0);
    const ro = barrel(g, 118, -4, 26, 3.2, pal, 0);
    return { muzzles: [
      { x: n.x, y: n.y, id: "1", label: "Nose cannon" },
      { x: li.x, y: li.y, id: "2", label: "Left inner" },
      { x: ri.x, y: ri.y, id: "3", label: "Right inner" },
      { x: lo.x, y: lo.y, id: "4", label: "Left outer" },
      { x: ro.x, y: ro.y, id: "5", label: "Right outer" }
    ] };
  }

  function drawFlagship(g, pal) {
    const span = 166;
    const body = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -100);
      gg.lineTo(18, -64);
      gg.lineTo(28, -12);
      gg.lineTo(32, 28);
      gg.lineTo(26, 62);
      gg.lineTo(0, 78);
      gg.lineTo(-26, 62);
      gg.lineTo(-32, 28);
      gg.lineTo(-28, -12);
      gg.lineTo(-18, -64);
      gg.closePath();
    };
    const wingL = (gg) => {
      gg.beginPath();
      gg.moveTo(-20, -24);
      gg.lineTo(-span + 20, -16);
      gg.lineTo(-span - 18, 8);
      gg.lineTo(-span - 8, 28);
      gg.lineTo(-span + 12, 36);
      gg.lineTo(-span + 4, 64);
      gg.lineTo(-26, 50);
      gg.closePath();
    };
    const wingR = (gg) => {
      gg.beginPath();
      gg.moveTo(20, -24);
      gg.lineTo(span - 20, -16);
      gg.lineTo(span + 18, 8);
      gg.lineTo(span + 8, 28);
      gg.lineTo(span - 12, 36);
      gg.lineTo(span - 4, 64);
      gg.lineTo(26, 50);
      gg.closePath();
    };
    const deck = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -36);
      gg.lineTo(16, -20);
      gg.lineTo(14, 16);
      gg.lineTo(0, 24);
      gg.lineTo(-14, 16);
      gg.lineTo(-16, -20);
      gg.closePath();
    };
    const canopy = (gg) => {
      gg.beginPath();
      gg.moveTo(0, -28);
      gg.bezierCurveTo(10, -22, 11, 2, 0, 14);
      gg.bezierCurveTo(-11, 2, -10, -22, 0, -28);
    };
    const ramL = (gg) => { gg.beginPath(); gg.moveTo(-16, -70); gg.lineTo(-40, -40); gg.lineTo(-28, -16); gg.lineTo(-14, -50); gg.closePath(); };
    const ramR = (gg) => { gg.beginPath(); gg.moveTo(16, -70); gg.lineTo(40, -40); gg.lineTo(28, -16); gg.lineTo(14, -50); gg.closePath(); };
    const sponsonL = (gg) => { gg.beginPath(); gg.moveTo(-26, -6); gg.lineTo(-54, 8); gg.lineTo(-52, 52); gg.lineTo(-24, 58); gg.closePath(); };
    const sponsonR = (gg) => { gg.beginPath(); gg.moveTo(26, -6); gg.lineTo(54, 8); gg.lineTo(52, 52); gg.lineTo(24, 58); gg.closePath(); };

    shade(g, wingL, -20, -24, -span, 64, metalStops(pal), pal.glow, 14);
    shade(g, wingR, 20, -24, span, 64, metalStops(pal), pal.glow, 14);
    outline(g, wingL, pal.glow, 2.5, 12);
    outline(g, wingR, pal.glow, 2.5, 12);
    clip(g, wingL, () => {
      panel(g, -40, -8, -150, 8, pal.glow);
      panel(g, -36, 16, -140, 32, pal.glow);
    });
    clip(g, wingR, () => {
      panel(g, 40, -8, 150, 8, pal.glow);
      panel(g, 36, 16, 140, 32, pal.glow);
    });

    shade(g, sponsonL, -26, -6, -54, 58, metalStops(pal), pal.glow, 8);
    shade(g, sponsonR, 26, -6, 54, 58, metalStops(pal), pal.glow, 8);
    outline(g, sponsonL, pal.glow, 1.8, 7);
    outline(g, sponsonR, pal.glow, 1.8, 7);

    shade(g, ramL, -16, -70, -40, -16, metalStops(pal), pal.glow, 6);
    shade(g, ramR, 16, -70, 40, -16, metalStops(pal), pal.glow, 6);
    outline(g, ramL, pal.glow, 1.6, 6);
    outline(g, ramR, pal.glow, 1.6, 6);

    shade(g, body, 0, -100, 0, 78, [
      [0, pal.core], [0.15, blend(pal.metalHi, pal.glow, 0.3)], [0.5, pal.metal], [1, pal.ink]
    ], pal.glow, 18);
    outline(g, body, pal.glow, 2.8, 14);
    clip(g, body, () => {
      panel(g, -14, -70, -24, 20, pal.glow);
      panel(g, 14, -70, 24, 20, pal.glow);
      panel(g, -20, 8, 20, 8, pal.glow);
      panel(g, -22, 32, 22, 32, pal.glow);
      panel(g, -16, 52, 16, 52, pal.glow);
    });
    highlight(g, body, -8, -36, 20, 34, 0.4);

    shade(g, deck, 0, -36, 0, 24, [[0, pal.metalHi], [1, pal.ink]], pal.accent, 6);
    outline(g, deck, pal.accent, 1.5, 6);
    canopyGlass(g, canopy, pal, 0, -8);

    engine(g, -32, 74, 11, 30, pal.glow, pal.core);
    engine(g, -11, 80, 11, 32, pal.glow, pal.core);
    engine(g, 11, 80, 11, 32, pal.glow, pal.core);
    engine(g, 32, 74, 11, 30, pal.glow, pal.core);

    const n = barrel(g, 0, -98, 32, 4.2, pal, 0);
    const li = barrel(g, -64, -10, 26, 3.3, pal, 0);
    const ri = barrel(g, 64, -10, 26, 3.3, pal, 0);
    const lo = barrel(g, -132, -8, 28, 3.6, pal, 0);
    const ro = barrel(g, 132, -8, 28, 3.6, pal, 0);
    return { muzzles: [
      { x: n.x, y: n.y, id: "1", label: "Spinal cannon" },
      { x: li.x, y: li.y, id: "2", label: "Left inner" },
      { x: ri.x, y: ri.y, id: "3", label: "Right inner" },
      { x: lo.x, y: lo.y, id: "4", label: "Left outer" },
      { x: ro.x, y: ro.y, id: "5", label: "Right outer" }
    ] };
  }

  function blend(a, b, t) {
    const pa = hex(a), pb = hex(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function hex(c) {
    if (c[0] === "#") {
      const n = c.length === 4
        ? [c[1] + c[1], c[2] + c[2], c[3] + c[3]]
        : [c.slice(1, 3), c.slice(3, 5), c.slice(5, 7)];
      return n.map((x) => parseInt(x, 16));
    }
    const m = c.match(/\d+/g);
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  }


  function buildBossSprites() {
    sprite("boss-herald-body", 720, 520, g => {
      const col = C.orange;
      const bell = () => { g.beginPath(); g.ellipse(0, -40, 250, 175, 0, 0, Math.PI * 2); };
      fillSolid(g, bell, col, { y0: -220, y1: 140, hi: 0.45, lo: 0.5, bloom: 18 });
      outlineClean(g, bell, col, 3.4);
      // soft inner shade, not a second wire ring
      g.save();
      const ig = g.createRadialGradient(0, -70, 20, 0, -30, 170);
      ig.addColorStop(0, "rgba(255,230,120,0.35)");
      ig.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = ig; g.beginPath(); g.ellipse(0, -50, 160, 110, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    sprite("boss-herald-eye", 180, 180, g => {
      g.save();
      const rg = g.createRadialGradient(-8, -8, 4, 0, 0, 62);
      rg.addColorStop(0, "#fff8d0");
      rg.addColorStop(0.18, C.yellow);
      rg.addColorStop(0.45, C.orange);
      rg.addColorStop(1, "#4a1000");
      g.fillStyle = rg; g.shadowColor = C.yellow; g.shadowBlur = 22;
      g.beginPath(); g.arc(0, 0, 58, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = "#1a0500"; g.beginPath(); g.arc(4, 6, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(-14, -12, 8, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    sprite("boss-herald-eyeShut", 180, 180, g => {
      fillSolid(g, () => { g.beginPath(); g.ellipse(0, 0, 58, 10, 0, 0, Math.PI * 2); }, C.orange, { y0: -12, y1: 12 });
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 58, 10, 0, 0, Math.PI * 2); }, C.yellow, 2);
    });
    sprite("boss-herald-jaw", 300, 180, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-100, -8); g.lineTo(-80, 44); g.lineTo(0, 64); g.lineTo(80, 44); g.lineTo(100, -8); g.lineTo(0, 16); g.closePath(); };
      fillSolid(g, jaw, C.orange, { y0: -10, y1: 70, lo: 0.4 });
      outlineClean(g, jaw, C.orange, 2.4);
      g.save(); g.fillStyle = mixHex(C.yellow, "#ffffff", 0.3);
      for (const x of [-48, -24, 0, 24, 48]) {
        g.beginPath(); g.moveTo(x - 6, 14); g.lineTo(x, 42); g.lineTo(x + 6, 14); g.closePath(); g.fill();
      }
      g.restore();
    });
    sprite("boss-herald-jawOpen", 320, 220, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-110, -8); g.lineTo(-86, 78); g.lineTo(0, 108); g.lineTo(86, 78); g.lineTo(110, -8); g.lineTo(0, 24); g.closePath(); };
      fillSolid(g, jaw, "#6a1020", { y0: -10, y1: 110, hi: 0.15, lo: 0.2, bloom: 8 });
      outlineClean(g, () => { g.beginPath(); g.moveTo(-110, -8); g.lineTo(-86, 78); g.lineTo(0, 108); g.lineTo(86, 78); g.lineTo(110, -8); }, C.orange, 2.6);
      g.save(); g.fillStyle = "#ffe9a0";
      for (const x of [-56, -28, 0, 28, 56]) {
        g.beginPath(); g.moveTo(x - 7, 18); g.lineTo(x, 78); g.lineTo(x + 7, 18); g.closePath(); g.fill();
      }
      g.restore();
    });

    // Twin Spire — one solid two-headed beast
    sprite("boss-twin-body", 860, 560, g => {
      const col = C.violet;
      // Broad monstrous thorax: two shoulder mounds joined by a HIGH yoke / neck, not a heart cleft.
      const torso = () => {
        g.beginPath();
        g.moveTo(-90, 55);
        g.bezierCurveTo(-205, 28, -275, -8, -238, -118);
        g.bezierCurveTo(-220, -162, -180, -158, -130, -140);
        g.bezierCurveTo(-50, -132, 50, -132, 130, -140);
        g.bezierCurveTo(180, -158, 220, -162, 238, -118);
        g.bezierCurveTo(275, -8, 205, 28, 90, 55);
        g.bezierCurveTo(60, 150, -60, 150, -90, 55);
        g.closePath();
      };
      fillSolid(g, torso, col, { y0: -180, y1: 160, hi: 0.4, lo: 0.5, bloom: 18 });
      outlineClean(g, torso, col, 3.2);
      // slight spinal ridge so the join reads as a neck, not a dip
      const ridge = () => {
        g.beginPath();
        g.moveTo(-40, -90);
        g.quadraticCurveTo(0, -142, 40, -90);
        g.quadraticCurveTo(20, 20, 0, 70);
        g.quadraticCurveTo(-20, 20, -36, -80);
        g.closePath();
      };
      fillSolid(g, ridge, col, { y0: -120, y1: 80, hi: 0.25, lo: 0.35, bloom: 8, alpha: 0.85 });
    });
    sprite("boss-twin-head", 260, 260, g => {
      const col = C.violet;
      const hd = () => { g.beginPath(); g.ellipse(0, 10, 88, 78, 0, 0, Math.PI * 2); };
      fillSolid(g, hd, col, { y0: -80, y1: 90, hi: 0.45, lo: 0.45, bloom: 14 });
      outlineClean(g, hd, col, 2.8);
      const horn = () => { g.beginPath(); g.moveTo(-18, -60); g.lineTo(0, -118); g.lineTo(18, -60); g.closePath(); };
      fillSolid(g, horn, C.magenta, { y0: -120, y1: -50, hi: 0.4 });
      outlineClean(g, horn, C.magenta, 2);
    });
    sprite("boss-twin-eye", 80, 80, g => {
      g.save();
      const rg = g.createRadialGradient(-4, -4, 2, 0, 0, 18);
      rg.addColorStop(0, "#fff"); rg.addColorStop(0.3, C.cyan); rg.addColorStop(1, "#041018");
      g.fillStyle = rg; g.shadowColor = C.cyan; g.shadowBlur = 16;
      g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(-5, -5, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    sprite("boss-twin-eyeShut", 80, 80, g => {
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); }, C.cyan, 2.4);
    });
    sprite("boss-twin-jaw", 200, 140, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-36, 40); g.lineTo(0, 52); g.lineTo(36, 40); g.lineTo(60, 0); g.lineTo(0, 16); g.closePath(); };
      fillSolid(g, jaw, C.magenta, { y0: 0, y1: 56, lo: 0.3 });
      outlineClean(g, () => { g.beginPath(); g.moveTo(-60, 0); g.lineTo(-36, 40); g.lineTo(0, 52); g.lineTo(36, 40); g.lineTo(60, 0); }, C.magenta, 2.2);
    });
    sprite("boss-twin-jawOpen", 200, 180, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-68, -2); g.lineTo(-40, 62); g.lineTo(0, 80); g.lineTo(40, 62); g.lineTo(68, -2); g.lineTo(0, 18); g.closePath(); };
      fillSolid(g, jaw, "#4a1020", { y0: 0, y1: 80, hi: 0.1, lo: 0.2 });
      outlineClean(g, () => { g.beginPath(); g.moveTo(-68, -2); g.lineTo(-40, 62); g.lineTo(0, 80); g.lineTo(40, 62); g.lineTo(68, -2); }, C.magenta, 2.4);
      g.save(); g.fillStyle = "#eaffff";
      for (const x of [-28, 0, 28]) { g.beginPath(); g.moveTo(x - 5, 12); g.lineTo(x, 58); g.lineTo(x + 5, 12); g.closePath(); g.fill(); }
      g.restore();
    });

    sprite("boss-lattice-body", 800, 560, g => {
      const col = C.cyan;
      const car = () => {
        g.beginPath();
        g.moveTo(0, -190);
        g.lineTo(200, -70);
        g.lineTo(240, 80);
        g.lineTo(110, 170);
        g.lineTo(0, 130);
        g.lineTo(-110, 170);
        g.lineTo(-240, 80);
        g.lineTo(-200, -70);
        g.closePath();
      };
      fillSolid(g, car, col, { y0: -200, y1: 180, hi: 0.4, lo: 0.5, bloom: 16 });
      outlineClean(g, car, col, 3.2);
    });
    sprite("boss-lattice-eye", 56, 56, g => {
      g.save();
      const rg = g.createRadialGradient(-3, -3, 1, 0, 0, 13);
      rg.addColorStop(0, "#fff"); rg.addColorStop(0.3, C.lime); rg.addColorStop(1, "#02100a");
      g.fillStyle = rg; g.shadowColor = C.lime; g.shadowBlur = 12;
      g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-lattice-eyeShut", 56, 56, g => {
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 13, 3, 0, 0, Math.PI * 2); }, C.lime, 2);
    });
    sprite("boss-lattice-pincer", 200, 200, g => {
      const p = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(80, 40); g.lineTo(70, 90); g.lineTo(20, 60); g.lineTo(40, 80); g.lineTo(10, 20); g.closePath(); };
      fillSolid(g, p, C.cyan, { y0: 0, y1: 90 });
      outlineClean(g, p, C.cyan, 2.4);
    });

    sprite("boss-harbinger-body", 900, 640, g => {
      const col = C.magenta;
      const leftArm = () => { g.beginPath(); g.moveTo(-70, 10); g.lineTo(-260, 70); g.lineTo(-330, 160); g.lineTo(-260, 200); g.lineTo(-180, 130); g.lineTo(-80, 70); g.closePath(); };
      const rightArm = () => { g.beginPath(); g.moveTo(70, 10); g.lineTo(260, 70); g.lineTo(330, 160); g.lineTo(260, 200); g.lineTo(180, 130); g.lineTo(80, 70); g.closePath(); };
      const torso = () => { g.beginPath(); g.moveTo(0, -150); g.lineTo(110, -30); g.lineTo(130, 80); g.lineTo(55, 190); g.lineTo(0, 150); g.lineTo(-55, 190); g.lineTo(-130, 80); g.lineTo(-110, -30); g.closePath(); };
      fillSolid(g, leftArm, col, { y0: 0, y1: 200, bloom: 14 });
      fillSolid(g, rightArm, col, { y0: 0, y1: 200, bloom: 14 });
      outlineClean(g, leftArm, col, 2.8);
      outlineClean(g, rightArm, col, 2.8);
      fillSolid(g, torso, col, { y0: -160, y1: 190, hi: 0.4, lo: 0.5, bloom: 16 });
      outlineClean(g, torso, col, 3.2);
      const hornL = () => { g.beginPath(); g.moveTo(-70, -110); g.lineTo(-126, -250); g.lineTo(-36, -130); g.closePath(); };
      const hornR = () => { g.beginPath(); g.moveTo(70, -110); g.lineTo(126, -250); g.lineTo(36, -130); g.closePath(); };
      fillSolid(g, hornL, C.cyan, { y0: -250, y1: -110 });
      fillSolid(g, hornR, C.cyan, { y0: -250, y1: -110 });
      outlineClean(g, hornL, C.cyan, 2.2);
      outlineClean(g, hornR, C.cyan, 2.2);
    });
    sprite("boss-harbinger-eye", 80, 80, g => {
      g.save();
      const rg = g.createRadialGradient(-4, -3, 2, 0, 0, 20);
      rg.addColorStop(0, "#fff"); rg.addColorStop(0.3, C.cyan); rg.addColorStop(1, "#080010");
      g.fillStyle = rg; g.shadowColor = C.cyan; g.shadowBlur = 16;
      g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-harbinger-eyeShut", 80, 80, g => {
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 22, 4, 0, 0, Math.PI * 2); }, C.cyan, 2.4);
    });
    sprite("boss-harbinger-jaw", 320, 180, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-120, 0); g.lineTo(-86, 52); g.lineTo(0, 74); g.lineTo(86, 52); g.lineTo(120, 0); g.lineTo(0, 18); g.closePath(); };
      fillSolid(g, jaw, C.magenta, { y0: 0, y1: 76 });
      outlineClean(g, () => { g.beginPath(); g.moveTo(-120, 0); g.lineTo(-86, 52); g.lineTo(0, 74); g.lineTo(86, 52); g.lineTo(120, 0); }, C.magenta, 2.6);
    });
    sprite("boss-harbinger-jawOpen", 360, 240, g => {
      const jaw = () => { g.beginPath(); g.moveTo(-130, -8); g.lineTo(-90, 96); g.lineTo(0, 128); g.lineTo(90, 96); g.lineTo(130, -8); g.lineTo(0, 22); g.closePath(); };
      fillSolid(g, jaw, "#4a1020", { y0: 0, y1: 128, hi: 0.1 });
      outlineClean(g, () => { g.beginPath(); g.moveTo(-130, -8); g.lineTo(-90, 96); g.lineTo(0, 128); g.lineTo(90, 96); g.lineTo(130, -8); }, C.magenta, 2.8);
      g.save(); g.fillStyle = "#f4fbff";
      for (const x of [-70, -35, 0, 35, 70]) { g.beginPath(); g.moveTo(x - 8, 16); g.lineTo(x, 90); g.lineTo(x + 8, 16); g.closePath(); g.fill(); }
      g.restore();
    });

    sprite("boss-eclipse-body", 860, 620, g => {
      // solid donut
      const ring = () => {
        g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2);
        g.moveTo(150, 0); g.arc(0, 0, 150, 0, Math.PI * 2, true);
      };
      g.save();
      const grd = g.createRadialGradient(0, 0, 150, 0, 0, 250);
      grd.addColorStop(0, mixHex(C.magenta, "#000000", 0.2));
      grd.addColorStop(0.45, C.magenta);
      grd.addColorStop(1, mixHex(C.violet, "#000000", 0.4));
      g.fillStyle = grd; g.shadowColor = C.magenta; g.shadowBlur = 20;
      ring(); g.fill("evenodd");
      g.restore();
      outlineClean(g, () => { g.beginPath(); g.arc(0, 0, 250, 0, Math.PI * 2); }, C.magenta, 4);
      outlineClean(g, () => { g.beginPath(); g.arc(0, 0, 150, 0, Math.PI * 2); }, C.pink, 2.4);
      g.save(); g.fillStyle = mixHex(C.pink, "#ffffff", 0.3);
      for (let k = 0; k < 16; k++) {
        const a = k * Math.PI / 8;
        const x0 = Math.cos(a) * 150, y0 = Math.sin(a) * 150;
        const x1 = Math.cos(a) * 124, y1 = Math.sin(a) * 124;
        const px = -Math.sin(a) * 8, py = Math.cos(a) * 8;
        g.beginPath(); g.moveTo(x0 + px, y0 + py); g.lineTo(x1, y1); g.lineTo(x0 - px, y0 - py); g.closePath(); g.fill();
      }
      g.restore();
    });
    sprite("boss-eclipse-eye", 64, 64, g => {
      g.save();
      const rg = g.createRadialGradient(-3, -3, 1, 0, 0, 15);
      rg.addColorStop(0, "#fff"); rg.addColorStop(0.3, C.pink); rg.addColorStop(1, "#1a0010");
      g.fillStyle = rg; g.shadowColor = C.pink; g.shadowBlur = 14;
      g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.fill(); g.restore();
    });
    sprite("boss-eclipse-eyeShut", 64, 64, g => {
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 15, 3, 0, 0, Math.PI * 2); }, C.pink, 2.2);
    });

    sprite("boss-membrane", 700, 560, g => {
      g.globalAlpha = 0.1; g.fillStyle = C.violet; g.shadowColor = C.violet; g.shadowBlur = 20;
      g.beginPath(); g.ellipse(0, 0, 270, 220, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.7;
      outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 270, 220, 0, 0, Math.PI * 2); }, C.violet, 2.4);
    });
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


  function drawOutpostBase(g, tier, skin) {
    tier = Math.max(0, Math.min(5, tier | 0));
    skin = skin || "default";
    const pal = skinPal(tier, skin);
    const halfW = (typeof baseHalfW === "function" ? baseHalfW(tier) : 200 + tier * 50);
    const wallH = 62 + tier * 8;
    const coreR = 16 + tier * 3.5;

    function slab(x0, y0, x1, y1, col) {
      g.fillStyle = col;
      g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.fill();
    }
    function strokePoly(fn, col, w, blur) {
      g.save();
      g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = blur || 10; g.lineWidth = w || 2;
      g.beginPath(); fn(g); g.stroke();
      g.restore();
    }
    function fillPoly(fn, col, blur) {
      g.save();
      g.fillStyle = col; if (blur) { g.shadowColor = col; g.shadowBlur = blur; }
      g.beginPath(); fn(g); g.fill();
      g.restore();
    }

    // foundation lip (slightly below the rail)
    fillPoly((gg) => {
      gg.moveTo(-halfW - 16, 2);
      gg.lineTo(halfW + 16, 2);
      gg.lineTo(halfW + 8, 14);
      gg.lineTo(-halfW - 8, 14);
      gg.closePath();
    }, pal.metalDark || "#080c14");
    strokePoly((gg) => {
      gg.moveTo(-halfW - 16, 2); gg.lineTo(halfW + 16, 2);
    }, pal.glow, 2, 8);

    // main bunker body
    const body = (gg) => {
      gg.moveTo(-halfW, 0);
      gg.lineTo(-halfW + 10, -wallH);
      gg.lineTo(halfW - 10, -wallH);
      gg.lineTo(halfW, 0);
      gg.closePath();
    };
    const bodyGrad = g.createLinearGradient(0, -wallH, 0, 4);
    bodyGrad.addColorStop(0, pal.metalHi || "#4a5b70");
    bodyGrad.addColorStop(0.35, pal.metal || "#171f2c");
    bodyGrad.addColorStop(1, pal.metalDark || "#080c14");
    g.save();
    g.beginPath(); body(g);
    g.fillStyle = bodyGrad; g.fill();
    g.restore();
    strokePoly(body, pal.glow, 2.2, 12);

    // battlements
    const merlonW = 22 + tier * 2;
    const merlonH = 10 + Math.min(8, tier * 2);
    const topY = -wallH;
    let x = -halfW + 18;
    g.save();
    while (x < halfW - 18) {
      const cren = (gg) => {
        if (skin === "stealth") {
          gg.moveTo(x, topY);
          gg.lineTo(x + merlonW * 0.5, topY - merlonH - 4);
          gg.lineTo(x + merlonW, topY);
          gg.closePath();
        } else {
          gg.rect(x, topY - merlonH, merlonW * 0.7, merlonH + 2);
        }
      };
      fillPoly(cren, pal.metal || "#171f2c");
      strokePoly(cren, pal.glow, 1.3, 6);
      x += merlonW + 8;
    }
    g.restore();

    // panel seams
    g.save();
    g.strokeStyle = pal.glow; g.globalAlpha = 0.35; g.lineWidth = 1; g.shadowColor = pal.glow; g.shadowBlur = 4;
    const seams = 4 + tier;
    for (let i = 1; i < seams; i++) {
      const sx = -halfW + 20 + i * ((2 * halfW - 40) / seams);
      g.beginPath(); g.moveTo(sx, -8); g.lineTo(sx * 0.96, -wallH + 8); g.stroke();
    }
    g.beginPath(); g.moveTo(-halfW + 16, -wallH * 0.45); g.lineTo(halfW - 16, -wallH * 0.45); g.stroke();
    g.restore();

    // side bastions for higher tiers
    if (tier >= 2) {
      const bw = 36 + tier * 4, bh = wallH * 0.7;
      [-1, 1].forEach((side) => {
        const bx = side * (halfW - 8);
        const bast = (gg) => {
          gg.moveTo(bx, 0);
          gg.lineTo(bx + side * bw, -8);
          gg.lineTo(bx + side * (bw - 6), -bh);
          gg.lineTo(bx - side * 8, -bh + 6);
          gg.closePath();
        };
        fillPoly(bast, pal.metalDark || "#080c14", 4);
        strokePoly(bast, pal.accent, 1.6, 8);
      });
    }
    if (tier >= 4) {
      // extra towers
      [-1, 1].forEach((side) => {
        const tx = side * (halfW * 0.55);
        fillPoly((gg) => { gg.rect(tx - 14, -wallH - 22, 28, 26); }, pal.metal || "#171f2c");
        strokePoly((gg) => { gg.rect(tx - 14, -wallH - 22, 28, 26); }, pal.glow, 1.5, 8);
      });
    }
    if (tier >= 5) {
      // citadel spires
      [-1, 1].forEach((side) => {
        const sx = side * (halfW * 0.78);
        fillPoly((gg) => {
          gg.moveTo(sx - 8, -wallH);
          gg.lineTo(sx, -wallH - 42);
          gg.lineTo(sx + 8, -wallH);
          gg.closePath();
        }, pal.accent, 10);
        strokePoly((gg) => {
          gg.moveTo(sx - 8, -wallH);
          gg.lineTo(sx, -wallH - 42);
          gg.lineTo(sx + 8, -wallH);
          gg.closePath();
        }, pal.glow, 1.6, 10);
      });
    }

    // central core / reactor
    const coreY = -wallH * 0.42;
    const grd = g.createRadialGradient(0, coreY, 3, 0, coreY, coreR + 16);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(0.25, pal.core);
    grd.addColorStop(0.7, pal.glow);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.save();
    g.fillStyle = grd; g.shadowColor = pal.glow; g.shadowBlur = 18;
    g.beginPath(); g.arc(0, coreY, coreR + 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal.ink || "#03060b";
    g.beginPath(); g.arc(0, coreY, coreR * 0.72, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal.core; g.shadowBlur = 14;
    if (skin === "alien") {
      g.beginPath(); g.ellipse(0, coreY, coreR * 0.42, coreR * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = pal.accent;
      g.beginPath(); g.ellipse(0, coreY - 2, 4, 6, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.beginPath(); g.arc(0, coreY, coreR * 0.45, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = pal.glow; g.lineWidth = 2; g.beginPath(); g.arc(0, coreY, coreR * 0.72, 0, Math.PI * 2); g.stroke();
    g.restore();

    // turret sockets (mount rings only; barrels drawn live)
    const xs = (typeof TURRET_LAYOUT !== "undefined" ? TURRET_LAYOUT[tier].xs : [0]);
    const sockY = -72 + (RAIL_Y ? 0 : 0); // pivot is at y = (RAIL_Y-72) - RAIL_Y = -72 in this space
    xs.forEach((sx) => {
      g.save();
      g.fillStyle = pal.metalDark || "#080c14";
      g.beginPath(); g.arc(sx, -72, 16, 0, Math.PI * 2); g.fill();
      g.strokeStyle = pal.glow; g.shadowColor = pal.glow; g.shadowBlur = 8; g.lineWidth = 2;
      g.beginPath(); g.arc(sx, -72, 16, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = pal.accent; g.lineWidth = 1.4; g.shadowBlur = 4;
      g.beginPath(); g.arc(sx, -72, 10, 0, Math.PI * 2); g.stroke();
      g.restore();
    });

    // skin extras
    if (skin === "racer") {
      g.save();
      g.fillStyle = pal.accent; g.shadowColor = pal.accent; g.shadowBlur = 8;
      g.fillRect(-6, -wallH + 4, 12, wallH - 8);
      g.fillStyle = "#111"; g.fillRect(-2, -wallH + 4, 4, wallH - 8);
      // spoiler fins
      [-1, 1].forEach((side) => {
        g.fillStyle = pal.accent;
        g.beginPath();
        g.moveTo(side * (halfW - 24), -wallH + 6);
        g.lineTo(side * (halfW + 18), -wallH - 10);
        g.lineTo(side * (halfW + 10), -wallH + 18);
        g.closePath(); g.fill();
      });
      g.restore();
    } else if (skin === "chrome") {
      g.save();
      const sheen = g.createLinearGradient(-halfW, -wallH, halfW, 0);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0.22)");
      sheen.addColorStop(1, "rgba(160,210,255,0.08)");
      g.fillStyle = sheen;
      g.beginPath(); body(g); g.fill();
      g.restore();
    } else if (skin === "alien") {
      g.save();
      g.strokeStyle = pal.glow; g.globalAlpha = 0.7; g.lineWidth = 1.5; g.shadowColor = pal.glow; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(-halfW * 0.4, -8); g.bezierCurveTo(-halfW * 0.6, -wallH * 0.4, -20, -wallH * 0.7, 0, coreY); g.stroke();
      g.beginPath(); g.moveTo(halfW * 0.4, -8); g.bezierCurveTo(halfW * 0.6, -wallH * 0.4, 20, -wallH * 0.7, 0, coreY); g.stroke();
      g.restore();
    } else if (skin === "stealth") {
      g.save();
      g.globalAlpha = 0.35;
      g.fillStyle = pal.ink || "#020305";
      g.beginPath(); body(g); g.fill();
      g.restore();
    }

    // rail glow line already exists in the playfield; add a neon lip
    g.save();
    g.strokeStyle = pal.glow; g.shadowColor = pal.glow; g.shadowBlur = 14; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-halfW - 8, 0); g.lineTo(halfW + 8, 0); g.stroke();
    g.restore();
  }

  function drawOutpostTurret(g, tier, skin) {
    tier = Math.max(0, Math.min(5, tier | 0));
    skin = skin || "default";
    const pal = skinPal(tier, skin);
    const barrelL = 36 + tier * 3;
    const barrelW = 7 + Math.min(4, tier);
    // mount
    g.save();
    g.fillStyle = pal.metalDark || "#080c14";
    g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = pal.glow; g.shadowColor = pal.glow; g.shadowBlur = 8; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.stroke();
    // barrel pointing up (negative y)
    const barrel = (gg) => {
      if (skin === "alien") {
        gg.moveTo(-barrelW * 0.5, 4);
        gg.quadraticCurveTo(-barrelW - 2, -barrelL * 0.5, -barrelW * 0.45, -barrelL);
        gg.lineTo(barrelW * 0.45, -barrelL);
        gg.quadraticCurveTo(barrelW + 2, -barrelL * 0.5, barrelW * 0.5, 4);
        gg.closePath();
      } else {
        gg.moveTo(-barrelW, 4);
        gg.lineTo(-barrelW * 0.7, -barrelL);
        gg.lineTo(barrelW * 0.7, -barrelL);
        gg.lineTo(barrelW, 4);
        gg.closePath();
      }
    };
    const bg = g.createLinearGradient(-barrelW, 0, barrelW, 0);
    bg.addColorStop(0, pal.metalDark || "#080c14");
    bg.addColorStop(0.45, pal.metalHi || "#4a5b70");
    bg.addColorStop(1, pal.metalDark || "#080c14");
    g.fillStyle = bg;
    g.beginPath(); barrel(g); g.fill();
    g.strokeStyle = pal.glow; g.lineWidth = 1.6; g.shadowBlur = 8;
    g.beginPath(); barrel(g); g.stroke();
    // muzzle
    g.fillStyle = pal.core; g.shadowColor = pal.glow; g.shadowBlur = 12;
    g.beginPath(); g.ellipse(0, -barrelL, barrelW * 0.7, 3.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.ellipse(0, -barrelL - 1, 2.2, 1.6, 0, 0, Math.PI * 2); g.fill();
    // hub
    g.fillStyle = pal.core; g.shadowBlur = 8;
    g.beginPath(); g.arc(0, 0, 5 + tier * 0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  }



  /* Live fortress: always drawn, no cached-canvas dependency, no per-frame shadowBlur.
     Origin (x,y) is the rail point under the bunker; turrets pivot at y-72. */
  function drawFortressAt(g, x, y, tier, skin, scale, angs) {
    tier = Math.max(0, Math.min(5, tier | 0));
    skin = skin || "default";
    scale = scale || 1;
    const pal = skinPal(tier, skin);
    const halfW = (typeof baseHalfW === "function" ? baseHalfW(tier) : 210 + tier * 50);
    const wallH = 100 + tier * 10;
    const coreR = 22 + tier * 4;
    const xs = (typeof TURRET_LAYOUT !== "undefined" ? TURRET_LAYOUT[tier].xs : [0]);
    const metalHi = (skin === "default") ? "#8aa0b8" : (pal.metalHi || "#6a7d96");
    const metal = (skin === "default") ? "#3c4c62" : (pal.metal || "#2a3546");
    const metalDark = (skin === "default") ? "#1a2432" : (pal.metalDark || "#101820");

    g.save();
    g.translate(x, y);
    g.scale(scale, scale);

    g.fillStyle = metalDark;
    g.beginPath();
    g.moveTo(-halfW - 22, 2);
    g.lineTo(halfW + 22, 2);
    g.lineTo(halfW + 12, 18);
    g.lineTo(-halfW - 12, 18);
    g.closePath();
    g.fill();

    const body = function () {
      g.beginPath();
      g.moveTo(-halfW, 0);
      g.lineTo(-halfW + 16, -wallH);
      g.lineTo(halfW - 16, -wallH);
      g.lineTo(halfW, 0);
      g.closePath();
    };
    const bodyGrad = g.createLinearGradient(0, -wallH, 0, 4);
    bodyGrad.addColorStop(0, metalHi);
    bodyGrad.addColorStop(0.4, metal);
    bodyGrad.addColorStop(1, metalDark);
    body();
    g.fillStyle = bodyGrad;
    g.fill();
    g.strokeStyle = pal.glow;
    g.lineWidth = 5;
    g.lineJoin = "round";
    body();
    g.stroke();
    g.strokeStyle = pal.core || "#fff";
    g.globalAlpha = 0.55;
    g.lineWidth = 2;
    body();
    g.stroke();
    g.globalAlpha = 1;

    const merlonW = 26 + tier * 2;
    const merlonH = 16 + Math.min(10, tier * 2);
    const topY = -wallH;
    let mx = -halfW + 22;
    g.fillStyle = metal;
    g.strokeStyle = pal.glow;
    g.lineWidth = 2.2;
    while (mx < halfW - 22) {
      const mw = merlonW * 0.72;
      if (skin === "stealth") {
        g.beginPath();
        g.moveTo(mx, topY);
        g.lineTo(mx + merlonW * 0.5, topY - merlonH - 4);
        g.lineTo(mx + merlonW, topY);
        g.closePath();
        g.fill();
        g.stroke();
      } else {
        g.fillRect(mx, topY - merlonH, mw, merlonH + 2);
        g.strokeRect(mx, topY - merlonH, mw, merlonH + 2);
      }
      mx += merlonW + 8;
    }

    g.strokeStyle = pal.glow;
    g.globalAlpha = 0.45;
    g.lineWidth = 1.4;
    const seams = 4 + tier;
    for (let i = 1; i < seams; i++) {
      const sx = -halfW + 20 + i * ((2 * halfW - 40) / seams);
      g.beginPath(); g.moveTo(sx, -8); g.lineTo(sx * 0.96, -wallH + 10); g.stroke();
    }
    g.beginPath(); g.moveTo(-halfW + 18, -wallH * 0.48); g.lineTo(halfW - 18, -wallH * 0.48); g.stroke();
    g.globalAlpha = 1;

    if (tier >= 2) {
      const bw = 40 + tier * 5, bh = wallH * 0.72;
      [-1, 1].forEach(function (side) {
        const bx = side * (halfW - 6);
        g.beginPath();
        g.moveTo(bx, 0);
        g.lineTo(bx + side * bw, -8);
        g.lineTo(bx + side * (bw - 6), -bh);
        g.lineTo(bx - side * 10, -bh + 8);
        g.closePath();
        g.fillStyle = metalDark;
        g.fill();
        g.strokeStyle = pal.accent || pal.glow;
        g.lineWidth = 2.4;
        g.stroke();
      });
    }
    if (tier >= 4) {
      [-1, 1].forEach(function (side) {
        const tx = side * (halfW * 0.55);
        g.fillStyle = metal;
        g.fillRect(tx - 16, -wallH - 26, 32, 30);
        g.strokeStyle = pal.glow; g.lineWidth = 2;
        g.strokeRect(tx - 16, -wallH - 26, 32, 30);
      });
    }
    if (tier >= 5) {
      [-1, 1].forEach(function (side) {
        const sx = side * (halfW * 0.78);
        g.beginPath();
        g.moveTo(sx - 10, -wallH);
        g.lineTo(sx, -wallH - 48);
        g.lineTo(sx + 10, -wallH);
        g.closePath();
        g.fillStyle = pal.accent;
        g.fill();
        g.strokeStyle = pal.glow; g.lineWidth = 2;
        g.stroke();
      });
    }

    const coreY = -wallH * 0.42;
    const grd = g.createRadialGradient(0, coreY, 2, 0, coreY, coreR + 22);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(0.22, pal.core);
    grd.addColorStop(0.55, pal.glow);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, coreY, coreR + 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal.ink || "#03060b";
    g.beginPath(); g.arc(0, coreY, coreR * 0.78, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal.core;
    if (skin === "alien") {
      g.beginPath(); g.ellipse(0, coreY, coreR * 0.46, coreR * 0.66, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = pal.accent;
      g.beginPath(); g.ellipse(0, coreY - 2, 5, 7, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.beginPath(); g.arc(0, coreY, coreR * 0.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#fff";
    g.globalAlpha = 0.85;
    g.beginPath(); g.arc(-3, coreY - 4, coreR * 0.18, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = pal.glow; g.lineWidth = 2.4;
    g.beginPath(); g.arc(0, coreY, coreR * 0.78, 0, Math.PI * 2); g.stroke();

    if (skin === "racer") {
      g.fillStyle = pal.accent;
      g.fillRect(-7, -wallH + 4, 14, wallH - 10);
      g.fillStyle = "#111";
      g.fillRect(-2.5, -wallH + 4, 5, wallH - 10);
      [-1, 1].forEach(function (side) {
        g.fillStyle = pal.accent;
        g.beginPath();
        g.moveTo(side * (halfW - 24), -wallH + 6);
        g.lineTo(side * (halfW + 20), -wallH - 12);
        g.lineTo(side * (halfW + 10), -wallH + 20);
        g.closePath(); g.fill();
      });
    } else if (skin === "chrome") {
      const sheen = g.createLinearGradient(-halfW, -wallH, halfW, 0);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0.28)");
      sheen.addColorStop(1, "rgba(160,210,255,0.1)");
      g.fillStyle = sheen;
      body(); g.fill();
    } else if (skin === "alien") {
      g.strokeStyle = pal.glow; g.globalAlpha = 0.75; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-halfW * 0.4, -8); g.bezierCurveTo(-halfW * 0.6, -wallH * 0.4, -20, -wallH * 0.7, 0, coreY); g.stroke();
      g.beginPath(); g.moveTo(halfW * 0.4, -8); g.bezierCurveTo(halfW * 0.6, -wallH * 0.4, 20, -wallH * 0.7, 0, coreY); g.stroke();
      g.globalAlpha = 1;
    } else if (skin === "stealth") {
      g.globalAlpha = 0.22;
      g.fillStyle = pal.ink || "#020305";
      body(); g.fill();
      g.globalAlpha = 1;
    }

    g.strokeStyle = pal.glow;
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(-halfW - 10, 0); g.lineTo(halfW + 10, 0); g.stroke();
    g.strokeStyle = "#fff";
    g.globalAlpha = 0.5;
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-halfW - 10, 0); g.lineTo(halfW + 10, 0); g.stroke();
    g.globalAlpha = 1;

    const barrelL = 52 + tier * 5;
    const barrelW = 12 + Math.min(6, tier);
    const angsArr = angs || [];
    for (let i = 0; i < xs.length; i++) {
      const sx = xs[i];
      const ang = (angsArr[i] != null) ? angsArr[i] : -Math.PI / 2;
      g.save();
      g.translate(sx, -72);
      g.rotate(ang + Math.PI / 2);

      g.fillStyle = metalDark;
      g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
      g.strokeStyle = pal.glow; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = pal.accent || pal.core; g.lineWidth = 1.8;
      g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.stroke();

      g.beginPath();
      if (skin === "alien") {
        g.moveTo(-barrelW * 0.5, 6);
        g.quadraticCurveTo(-barrelW - 3, -barrelL * 0.5, -barrelW * 0.5, -barrelL);
        g.lineTo(barrelW * 0.5, -barrelL);
        g.quadraticCurveTo(barrelW + 3, -barrelL * 0.5, barrelW * 0.5, 6);
        g.closePath();
      } else {
        g.moveTo(-barrelW, 6);
        g.lineTo(-barrelW * 0.65, -barrelL);
        g.lineTo(barrelW * 0.65, -barrelL);
        g.lineTo(barrelW, 6);
        g.closePath();
      }
      const bg = g.createLinearGradient(-barrelW, 0, barrelW, 0);
      bg.addColorStop(0, metalDark);
      bg.addColorStop(0.45, metalHi);
      bg.addColorStop(1, metalDark);
      g.fillStyle = bg;
      g.fill();
      g.strokeStyle = pal.glow; g.lineWidth = 2.4;
      g.stroke();

      const mz = g.createRadialGradient(0, -barrelL, 0, 0, -barrelL, barrelW + 6);
      mz.addColorStop(0, "#fff");
      mz.addColorStop(0.35, pal.core);
      mz.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = mz;
      g.beginPath(); g.arc(0, -barrelL, barrelW + 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = pal.core;
      g.beginPath(); g.ellipse(0, -barrelL, barrelW * 0.75, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.ellipse(0, -barrelL - 1, 3, 2, 0, 0, Math.PI * 2); g.fill();

      g.fillStyle = pal.core;
      g.beginPath(); g.arc(0, 0, 6.5 + tier * 0.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#fff"; g.globalAlpha = 0.7; g.lineWidth = 1.4;
      g.beginPath(); g.arc(0, 0, 6.5 + tier * 0.5, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
      g.restore();
    }

    g.restore();
  }

  function buildSprites() {
    // Base and turrets are drawn live (see drawFortress). Caching 30 full-width
    // 1080x280 canvases with shadowBlur was blowing mobile GPU memory and leaving
    // the outpost invisible on some Android devices.

    sprite("pdef-base", 90, 70, g => {
      const pad = () => { g.beginPath(); g.moveTo(-28, 18); g.lineTo(-22, 8); g.lineTo(22, 8); g.lineTo(28, 18); g.lineTo(20, 24); g.lineTo(-20, 24); g.closePath(); };
      const house = () => { g.beginPath(); g.moveTo(-16, 10); g.lineTo(-14, -6); g.lineTo(14, -6); g.lineTo(16, 10); g.closePath(); };
      fillSolid(g, pad, C.lime, { y0: 4, y1: 28, bloom: 12 });
      outlineClean(g, pad, C.lime, 2.2);
      fillSolid(g, house, C.lime, { y0: -8, y1: 12, hi: 0.45 });
      outlineClean(g, house, C.lime, 1.8);
    });
    sprite("pdef-barrel", 48, 90, g => {
      const barrel = () => { g.beginPath(); g.moveTo(-7, 16); g.lineTo(-5, -34); g.lineTo(5, -34); g.lineTo(7, 16); g.closePath(); };
      fillSolid(g, barrel, C.lime, { y0: -34, y1: 16, hi: 0.55, bloom: 10 });
      outlineClean(g, barrel, C.lime, 1.8);
      g.save(); g.fillStyle = "#fff"; g.shadowColor = C.lime; g.shadowBlur = 10;
      g.beginPath(); g.arc(0, 12, 6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(0, -34, 4, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    function flameBlob(g, color) {
      g.save();
      g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 16;
      g.beginPath();
      g.moveTo(0, -20);
      g.bezierCurveTo(14, -8, 16, 8, 0, 20);
      g.bezierCurveTo(-16, 8, -14, -8, 0, -20);
      g.fill();
      g.fillStyle = "#fff"; g.globalAlpha = 0.55; g.shadowBlur = 8;
      g.beginPath(); g.ellipse(0, -2, 5, 10, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    sprite("flame-0", 56, 72, g => flameBlob(g, C.orange));
    sprite("flame-1", 56, 72, g => flameBlob(g, C.magenta));
    sprite("flame-2", 56, 72, g => flameBlob(g, C.cyan));
    sprite("nuke-flash", 320, 360, g => {
      const glow = g.createRadialGradient(0, 40, 8, 0, 40, 150);
      glow.addColorStop(0, "rgba(255,255,230,0.95)");
      glow.addColorStop(0.2, "rgba(255,200,80,0.75)");
      glow.addColorStop(0.45, "rgba(255,60,200,0.45)");
      glow.addColorStop(0.75, "rgba(0,246,255,0.22)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.beginPath(); g.arc(0, 40, 150, 0, Math.PI * 2); g.fill();
      const stem = g.createLinearGradient(0, -10, 0, 130);
      stem.addColorStop(0, "rgba(255,255,230,0.95)");
      stem.addColorStop(0.35, "rgba(255,140,220,0.85)");
      stem.addColorStop(1, "rgba(0,180,255,0.15)");
      g.fillStyle = stem;
      g.shadowColor = "#ff4ad0"; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(32, 128); g.lineTo(-32, 128); g.closePath(); g.fill();
      const cap = g.createRadialGradient(0, -36, 8, 0, -20, 110);
      cap.addColorStop(0, "rgba(255,255,255,1)");
      cap.addColorStop(0.22, "rgba(255,230,120,0.95)");
      cap.addColorStop(0.5, "rgba(255,70,200,0.9)");
      cap.addColorStop(0.82, "rgba(80,200,255,0.45)");
      cap.addColorStop(1, "rgba(0,0,40,0)");
      g.fillStyle = cap;
      g.shadowColor = "#ff2bd6"; g.shadowBlur = 24;
      g.beginPath(); g.ellipse(0, -24, 112, 52, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.7)"; g.shadowBlur = 12;
      g.beginPath(); g.ellipse(0, -40, 54, 18, 0, 0, Math.PI * 2); g.fill();
    });
    sprite("nuke-ring", 260, 260, g => {
      g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 16; g.lineWidth = 6;
      g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = C.magenta; g.shadowColor = C.magenta; g.shadowBlur = 10; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, 88, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "#fff"; g.shadowBlur = 6; g.lineWidth = 1.5;
      g.beginPath(); g.arc(0, 0, 108, 0, Math.PI * 2); g.stroke();
    });
    sprite("pylon", 70, 110, g => {
      const base = () => { g.beginPath(); g.moveTo(-22, 28); g.lineTo(-16, 14); g.lineTo(16, 14); g.lineTo(22, 28); g.lineTo(14, 36); g.lineTo(-14, 36); g.closePath(); };
      const coil = () => { g.beginPath(); g.moveTo(-7, 16); g.lineTo(-9, -28); g.lineTo(0, -38); g.lineTo(9, -28); g.lineTo(7, 16); g.closePath(); };
      fillSolid(g, base, C.magenta, { y0: 10, y1: 36, bloom: 10 });
      outlineClean(g, base, C.magenta, 2);
      fillSolid(g, coil, C.cyan, { y0: -38, y1: 16, hi: 0.55, bloom: 12 });
      outlineClean(g, coil, C.cyan, 1.8);
      g.save(); g.fillStyle = "#fff"; g.shadowColor = C.cyan; g.shadowBlur = 12;
      g.beginPath(); g.arc(0, -36, 6, 0, Math.PI * 2); g.fill();
      g.restore();
    });
    sprite("mine", 72, 72, g => {
      g.save();
      g.strokeStyle = "rgba(255,229,0,0.55)"; g.shadowColor = C.orange; g.shadowBlur = 10; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#3a1400"; g.shadowBlur = 0;
      g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = C.orange; g.shadowColor = C.orange; g.shadowBlur = 16;
      g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = C.yellow; g.lineWidth = 3; g.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.2;
        g.beginPath();
        g.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        g.stroke();
        g.fillStyle = C.yellow; g.shadowBlur = 8;
        g.beginPath(); g.arc(Math.cos(a) * 20, Math.sin(a) * 20, 2.4, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = "#fff"; g.shadowColor = "#fff"; g.shadowBlur = 8;
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
      g.restore();
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
      sprite("shield-t" + i, 260, 230, g => {
        // faint single ring / lattice, low fill so the ship stays readable
        g.globalAlpha = 0.06; g.fillStyle = ti.color; g.shadowColor = ti.color; g.shadowBlur = 12;
        if (i <= 1) { g.beginPath(); g.ellipse(0, 0, 108, 92, 0, 0, Math.PI * 2); g.fill(); }
        else if (i <= 3) {
          g.beginPath();
          for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 110, Math.sin(a) * 94); }
          g.closePath(); g.fill();
        } else { g.beginPath(); g.ellipse(0, 0, 112, 96, 0, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 0.85;
        outlineClean(g, () => {
          g.beginPath();
          if (i <= 1) g.ellipse(0, 0, 108, 92, 0, 0, Math.PI * 2);
          else if (i <= 3) {
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g[k ? "lineTo" : "moveTo"](Math.cos(a) * 110, Math.sin(a) * 94); }
            g.closePath();
          } else g.ellipse(0, 0, 112, 96, 0, 0, Math.PI * 2);
        }, ti.color, 1.8);
        if (i >= 4) {
          g.globalAlpha = 0.5;
          outlineClean(g, () => { g.beginPath(); g.ellipse(0, 0, 86, 72, 0, 0, Math.PI * 2); }, ti.core, 1.3);
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


  function fillTentacle(g, x0, y0, ang, len, wobble, color, width) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const x1 = x0 + ca * len * 0.28 + Math.cos(ang + 1.2) * wobble;
    const y1 = y0 + sa * len * 0.28 + Math.sin(ang + 1.2) * wobble;
    const x2 = x0 + ca * len * 0.64 + Math.cos(ang - 1.05) * wobble * 0.75;
    const y2 = y0 + sa * len * 0.64 + Math.sin(ang - 1.05) * wobble * 0.75;
    const x3 = x0 + ca * len;
    const y3 = y0 + sa * len;
    const n = 10;
    function bez(t) {
      const u = 1 - t;
      const ax = u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3;
      const ay = u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3;
      const tx = 3*u*u*(x1-x0) + 6*u*t*(x2-x1) + 3*t*t*(x3-x2);
      const ty = 3*u*u*(y1-y0) + 6*u*t*(y2-y1) + 3*t*t*(y3-y2);
      const tl = Math.hypot(tx, ty) || 1;
      const w = width * Math.max(0.32, 1 - t * 0.68);
      return { x: ax, y: ay, nx: -ty / tl * w * 0.5, ny: tx / tl * w * 0.5 };
    }
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = bez(i / n);
      if (i === 0) g.moveTo(p.x + p.nx, p.y + p.ny);
      else g.lineTo(p.x + p.nx, p.y + p.ny);
    }
    for (let i = n; i >= 0; i--) {
      const p = bez(i / n);
      g.lineTo(p.x - p.nx, p.y - p.ny);
    }
    g.closePath();
    g.fillStyle = color;
    g.globalAlpha = 1;
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.38)";
    g.lineWidth = Math.max(1.2, width * 0.2);
    g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = bez(i / n);
      const hx = p.x + p.nx * 0.35, hy = p.y + p.ny * 0.35;
      if (i === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
    }
    g.stroke();
  }

  function strokeTentacle(g, x0, y0, ang, len, wobble, color, width) {
    const x1 = x0 + Math.cos(ang) * len * 0.45 + Math.cos(ang + 1.2) * wobble;
    const y1 = y0 + Math.sin(ang) * len * 0.45 + Math.sin(ang + 1.2) * wobble;
    const x2 = x0 + Math.cos(ang) * len;
    const y2 = y0 + Math.sin(ang) * len;
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = color; g.globalAlpha = 1;
    g.lineWidth = width + 5;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
    g.strokeStyle = color; g.lineWidth = width;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = Math.max(1.5, width * 0.35);
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
        const u = i / (n - 1);
        const base = Math.PI * (0.22 + u * 0.56);
        const mid = 1 - Math.abs(u - 0.5) * 2;
        const len = 360 + mid * 110;
        const wob = Math.sin(t * (rage ? 4.0 : 1.55) + i * 0.85) * (rage ? 52 : 48) + Math.sin(t * 2.45 + i * 1.35) * (rage ? 26 : 22);
        const w = 22 + mid * 8;
        fillTentacle(g, Math.sin(base - Math.PI / 2) * 64, 70, base, len, wob, tentCol, w);
      }
      blit(g, "boss-herald-body", 0, 0, 1);
      blit(g, blink ? "boss-herald-eyeShut" : "boss-herald-eye", 0, -30, rage ? 1.15 : 1);
      blit(g, firing ? "boss-herald-jawOpen" : "boss-herald-jaw", 0, 70, 1);
    } else if (kind === "twin") {
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ang = Math.PI * 0.5 + sx * (0.25 + i * 0.12);
          const wob = Math.sin(t * 2.4 + i + sx) * 18;
          strokeTentacle(g, sx * 50, 80, ang, 150 + i * 16, wob, tentCol, 13);
        }
      }
      blit(g, "boss-twin-body", 0, 30, 1);
      for (const sx of [-1, 1]) {
        const hx = sx * 148, hy = -42 + Math.sin(t * 2.0 + sx) * 6;
        g.save(); g.translate(hx, hy); g.rotate(sx * 0.12 + Math.sin(t * 1.2) * 0.05 * sx);
        blit(g, "boss-twin-head", 0, 0, 1.15);
        blit(g, blink ? "boss-twin-eyeShut" : "boss-twin-eye", sx * -10, -8, 1.15);
        blit(g, firing ? "boss-twin-jawOpen" : "boss-twin-jaw", 0, 48, 1.1);
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
      const haze = g.createLinearGradient(0, RAIL_Y - 210, 0, RAIL_Y + 40);
      haze.addColorStop(0, "rgba(0,246,255,0)"); haze.addColorStop(1, "rgba(0,246,255,0.10)");
      g.fillStyle = haze; g.fillRect(0, RAIL_Y - 210, W, 260);
      g.save();
      g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 16; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, RAIL_Y); g.lineTo(W, RAIL_Y); g.stroke();
      g.strokeStyle = C.magenta; g.shadowColor = C.magenta; g.shadowBlur = 8; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, RAIL_Y + 8); g.lineTo(W, RAIL_Y + 8); g.stroke();
      g.restore();
    }
    bgCache[kind] = c;
    return c;
  }



  function drawShieldArcAt(g, x, y, power, col, core, state, run) {
    const A = (typeof shieldArcGeom === "function") ? shieldArcGeom(run) : { cx: x, cy: (y || RAIL_Y) + 36, r: 220, thick: 26, half: 1.05 };
    const cx = x != null ? x : A.cx, cy = A.cy;
    const r = A.r;
    const a0 = -Math.PI / 2 - A.half, a1 = -Math.PI / 2 + A.half;
    g.save();
    g.lineCap = "round";
    g.globalAlpha = Math.max(0.15, Math.min(1, power || 1));
    if (state === "broken") {
      const shards = [[-0.95, -0.7], [-0.55, -0.32], [-0.12, 0.14], [0.28, 0.5], [0.62, 0.95]];
      shards.forEach((sg, i) => {
        g.strokeStyle = col; g.shadowColor = "transparent"; g.shadowBlur = 0;
        g.globalAlpha = (0.45 + 0.5 * (power || 0.7)) * (0.75 + 0.25 * (i % 2));
        g.lineWidth = 6.5;
        g.beginPath();
        g.arc(cx, cy, r + (i % 2) * 5, -Math.PI / 2 + sg[0], -Math.PI / 2 + sg[1]);
        g.stroke();
        g.strokeStyle = core || "#fff"; g.lineWidth = 1.8; g.shadowBlur = 6;
        g.beginPath();
        g.arc(cx, cy, r + (i % 2) * 5, -Math.PI / 2 + sg[0], -Math.PI / 2 + sg[1]);
        g.stroke();
      });
      g.restore();
      return;
    }
    const segs = state === "cracked"
      ? [[a0, a0 + 0.28], [a0 + 0.4, a0 + 0.7], [a0 + 0.88, a0 + 1.2], [a0 + 1.36, a1]]
      : [[a0, a1]];
    const stroke = (w, alpha, blur, style) => {
      g.strokeStyle = style; g.globalAlpha = alpha * Math.max(0.2, power || 1);
      g.lineWidth = w; g.shadowColor = style; g.shadowBlur = blur;
      segs.forEach(sg => { g.beginPath(); g.arc(cx, cy, r, sg[0], sg[1]); g.stroke(); });
    };
    stroke(16, 0.3, 0, col);
    stroke(7, 0.95, 0, col);
    stroke(2.4, 1, 0, core || "#fff");
    g.restore();
  }
  function drawVoidBeam(g, beam, t) {
    const pts = beam.pts;
    if (!pts || pts.length < 2) return;
    g.save();
    g.lineCap = "round"; g.lineJoin = "round";
    g.globalCompositeOperation = "lighter";
    const col = TIER[5].color, core = TIER[5].core, acc = TIER[5].accent;
    const stroke = (w, alpha, blur, style) => {
      g.strokeStyle = style; g.globalAlpha = alpha; g.lineWidth = w; g.shadowColor = style; g.shadowBlur = blur;
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke();
    };
    stroke(16, 0.22, 22, col);
    stroke(7, 0.8, 12, acc);
    stroke(2.4, 0.95, 6, core);
    // traveling pulse
    const u = (t * 1.6) % 1;
    const i = Math.min(pts.length - 1, (u * (pts.length - 1)) | 0);
    blitGlow(g, "spark", pts[i].x, pts[i].y, 1.4);
    g.restore();
    g.globalAlpha = 1;
  }
  function drawNukeFx(g, fx) {
    const u = Math.max(0, Math.min(1, fx.t / fx.life));
    const grow = 0.35 + u * 1.35;
    g.save();
    g.globalCompositeOperation = "lighter";
    if (fx.kind === "nuke") {
      g.globalAlpha = 1 - u * 0.75;
      blit(g, "nuke-flash", fx.x, fx.y - 36 * u, grow * 1.05);
    }
    g.globalAlpha = Math.max(0, 0.9 - u);
    const ringS = (fx.r || 200) / 100 * (0.35 + u * 1.1);
    blit(g, "nuke-ring", fx.x, fx.y, ringS);
    g.restore();
    g.globalAlpha = 1;
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
    g.fillText("Base  ·  Turrets  ·  Bullets  ·  Laser  ·  Missiles  ·  Drones  ·  Shield", W / 2, 136);
    for (let n = 0; n < 3; n++) {
      const i = ids[n], x = xs[n], y = SHIP_Y, ti = TIER[i];
      g.fillStyle = ti.color;
      g.font = "700 24px Orbitron, sans-serif";
      g.fillText(labels[n], x, 180);
      g.save();
      drawShieldArcAt(g, x, y, 1, ti.color, ti.core, "full");
      g.restore();
      drawFortressAt(g, x, RAIL_Y, i, "default", 0.42, null);
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
      const titleY = Math.min(H - 280, 1280);
      drawFortressAt(g, SHIP_X, titleY, 0, "default", 0.7, null);
      if (titleShots.length === 0 || titleShots[titleShots.length - 1].y < titleY - 140) titleShots.push({ x: 540, y: titleY - 110 });
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < titleShots.length; i++) {
        titleShots[i].y -= 6;
        blitGlow(g, "bolt", titleShots[i].x, titleShots[i].y, 1);
      }
      g.restore();
      if (titleShots.length && titleShots[0].y <= 580) titleShots.shift();
    } else if (mode === "over") {
      const overTier = (save && save.prest && save.prest.ship) || 0;
      drawFortressAt(g, 820, Math.min(H - 80, 1480), overTier, "default", 0.45, null);
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
        const a = Math.max(0, L.t / (L.kind === "rail" ? 0.12 : 0.18));
        drawLaserLook(g, L.x0, L.y0, L.x1, L.y1, L.tier || 0, a);
      }
      if (run.teslaArcs) {
        for (let i = 0; i < run.teslaArcs.length; i++) {
          const arc = run.teslaArcs[i];
          const a = Math.max(0, arc.t / (arc.life || 0.16));
          g.strokeStyle = C.cyan; g.lineWidth = 4; g.globalAlpha = a;
          g.beginPath();
          g.moveTo(arc.pts[0].x, arc.pts[0].y);
          for (let k = 1; k < arc.pts.length; k++) {
            const p0 = arc.pts[k - 1], p1 = arc.pts[k];
            const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * 16;
            const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * 16;
            g.quadraticCurveTo(mx, my, p1.x, p1.y);
          }
          g.stroke();
          g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.stroke();
          g.globalAlpha = 1;
        }
      }
      let blastN = 0;
      for (let bi = 0; bi < run.bullets.length; bi++) {
        const bb = run.bullets[bi];
        if (bb.kind === "blast" || (bb.friendly && bb.kind !== "missile" && bb.kind !== "flak" && bb.kind !== "nuke")) blastN++;
      }
      // Draw every blast every frame at steady brightness. Never skip or flicker.
      // Subtle constant dim only for genuinely dense late-wave volleys.
      const lateDense = (run.wave || 0) >= 28 && blastN > 64;
      const blastA = lateDense ? 0.88 : 1;
      for (let i = 0; i < run.bullets.length; i++) {
        const b = run.bullets[i];
        const a = Math.atan2(b.vy, b.vx);
        if (b.kind === "missile") {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          blit(g, "missile-t" + (b.tier || 0), 0, 0, 1.1 + (b.tier || 0) * 0.18);
          g.restore();
        } else if (b.kind === "flak") {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          g.fillStyle = C.orange;
          g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
          g.restore();
        } else if (b.kind === "nuke") {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          g.fillStyle = C.magenta;
          g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
          g.restore();
        } else if (b.friendly) {
          g.save(); g.translate(b.x, b.y); g.rotate(a);
          g.globalAlpha = blastA;
          blit(g, "streak-t" + (b.tier || 0), 0, 0, (b.crit ? 1.2 : 1.05) * (1 + (b.tier || 0) * 0.05));
          const trail = (run.shop && run.shop.trail) || "default";
          if (trail === "spark") {
            g.fillStyle = C.yellow; g.globalAlpha = 0.7 * blastA;
            g.beginPath(); g.arc(-14, 0, 3, 0, Math.PI * 2); g.fill();
          } else if (trail === "prism") {
            g.fillStyle = C.magenta; g.globalAlpha = 0.7 * blastA;
            g.beginPath(); g.moveTo(8, 0); g.lineTo(-10, -5); g.lineTo(-10, 5); g.closePath(); g.fill();
          }
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
      // Forward energy arc (full / cracked / broken / powering up)
      if (st.maxShield > 0) {
        const ratio = run.shield / Math.max(1, st.maxShield);
        let state = "hidden";
        if (run.shield > 0) {
          if (ratio > 0.55) state = "full";
          else state = "cracked";
        } else if ((run.shieldBreakT || 0) > 0) state = "broken";
        else if (run.shieldWait <= 0 && run.shield < st.maxShield) state = "regen";
        if (state !== "hidden") {
          const ti = TIER[st.tierShield || 0];
          const power = state === "regen" ? Math.min(1, 0.15 + ratio * 3) : (state === "broken" ? (run.shieldBreakT || 0) / 0.85 : 0.45 + 0.55 * ratio);
          drawShieldArcAt(g, SHIP_X, RAIL_Y, power, ti.color, ti.core, state === "regen" ? "full" : state, run);
        }
      }
      if (run.voidBeam && run.voidBeam.pts && run.voidBeam.pts.length > 1) {
        drawVoidBeam(g, run.voidBeam, t);
      }
      // Stationary fortress + rotating turrets. Always drawn solid and fully lit
      // at the current rail Y. No sprite cache, no hit-flash, no frame skip.
      {
        const shipT = st.tierShip || 0;
        const skin = (run.shop && run.shop.skin) || "default";
        drawFortressAt(g, SHIP_X, RAIL_Y, shipT, skin, 1, run.turretAng);
      }
      if (run.wallFx && run.wallFx.length) {
        for (let i = 0; i < run.wallFx.length; i++) {
          const fx = run.wallFx[i];
          const u = Math.min(1, fx.t / (fx.life || 0.38));
          const col = fx.color || C.orange;
          const rr = (fx.r || 24) * (0.45 + u * 1.6);
          g.save();
          g.globalCompositeOperation = "lighter";
          const grd = g.createRadialGradient(fx.x, fx.y - 8, 2, fx.x, fx.y - 8, rr);
          grd.addColorStop(0, "rgba(255,255,230,0.95)");
          grd.addColorStop(0.35, col);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          g.globalAlpha = 1 - u * 0.85;
          g.fillStyle = grd;
          g.beginPath(); g.arc(fx.x, fx.y - 8, rr, 0, Math.PI * 2); g.fill();
          g.strokeStyle = col; g.shadowBlur = 0; g.lineWidth = 5;
          g.beginPath(); g.arc(fx.x, fx.y - 4, rr * 0.85, 0, Math.PI * 2); g.stroke();
          g.strokeStyle = "#fff"; g.lineWidth = 2; g.shadowBlur = 0;
          g.beginPath(); g.arc(fx.x, fx.y - 4, rr * 1.05, 0, Math.PI * 2); g.stroke();
          g.fillStyle = "#fff"; g.globalAlpha = (1 - u) * 0.85;
          g.beginPath(); g.arc(fx.x, fx.y - 10, 8 * (1 - u), 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
      if (run.mines) {
        for (let i = 0; i < run.mines.length; i++) blit(g, "mine", run.mines[i].x, run.mines[i].y, 1);
      }
      if (shopLv && shopLv(run, "pylon") > 0) {
        const px = SHIP_X - 175, py = RAIL_Y;
        blit(g, "pylon", px, py, 1.1);
      }
      if (run.nukeFx && run.nukeFx.length) {
        for (let i = 0; i < run.nukeFx.length; i++) drawNukeFx(g, run.nukeFx[i]);
      }
      if (st.pdefLv > 0) {
        const n = st.pdefTurrets || 1;
        for (let i = 0; i < n; i++) {
          const tp = pdefTurretPos(i, n);
          blit(g, "pdef-base", tp.x, tp.y, 1.15);
          g.save();
          g.translate(tp.x, tp.y);
          g.rotate((run.pdefAim && run.pdefAim[i]) || -Math.PI / 2);
          blit(g, "pdef-barrel", 0, 0, 1.15);
          g.restore();
        }
      }
      if (run.pdefBeams && run.pdefBeams.length) {
        g.save();
        g.lineCap = "round";
        for (let i = 0; i < run.pdefBeams.length; i++) {
          const z = run.pdefBeams[i];
          const life = z.life || 0.28;
          const a = Math.max(0, z.t / life);
          g.globalAlpha = Math.min(1, a * 1.2);
          g.strokeStyle = z.deflect ? C.yellow : C.lime;
          g.lineWidth = z.deflect ? 10 : 8;
          g.beginPath(); g.moveTo(z.x0, z.y0); g.lineTo(z.x1, z.y1); g.stroke();
          g.strokeStyle = "#fff"; g.lineWidth = 2.6;
          g.beginPath(); g.moveTo(z.x0, z.y0); g.lineTo(z.x1, z.y1); g.stroke();
          // impact / ricochet flash
          g.fillStyle = z.deflect ? C.yellow : C.lime;
          g.beginPath(); g.arc(z.x1, z.y1, 10 + (1 - a) * 14, 0, Math.PI * 2); g.fill();
          g.fillStyle = "#fff";
          g.beginPath(); g.arc(z.x1, z.y1, 4 + (1 - a) * 5, 0, Math.PI * 2); g.fill();
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

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function overlayOpen() {
    const o = el("over"), i = el("info"), sh = el("shop"), u = el("upgrades");
    return (o && o.classList.contains("show")) || (i && i.classList.contains("show")) || (sh && sh.classList.contains("show")) || (u && u.classList.contains("show"));
  }
  function setPlayDock(on) {
    const bar = el("play-bar");
    const was = bar && !bar.classList.contains("hidden");
    if (bar) bar.classList.toggle("hidden", !on);
    const now = bar && !bar.classList.contains("hidden");
    if (was !== now && typeof fit === "function") fit();
  }
  function syncOverlayMode() {
    const on = overlayOpen();
    document.documentElement.classList.toggle("overlay-open", on);
    document.body.classList.toggle("overlay-open", on);
    const ui = el("play-ui");
    if (on && ui) ui.classList.add("hidden");
    else if (ui && mode === "play" && run && !run._tierShow && !run.dead) ui.classList.remove("hidden");
    setPlayDock(mode === "play" && run && !run.dead && !run._tierShow);
  }
  let overlayResume = "none";
  function markOverlayResume() {
    if (mode !== "play") { overlayResume = "none"; return; }
    const pauseEl = el("pause");
    if (pauseEl && pauseEl.classList.contains("show")) {
      overlayResume = "pause";
      pauseEl.classList.remove("show");
    } else if (overlayResume !== "pause") {
      overlayResume = "play";
    }
    paused = true;
  }
  function finishOverlayResume() {
    if (overlayResume === "play" && mode === "play" && run && !run.dead) paused = false;
    else if (overlayResume === "pause" && mode === "play" && run && !run.dead) {
      paused = true;
      const pauseEl = el("pause");
      if (pauseEl) pauseEl.classList.add("show");
    }
    overlayResume = "none";
  }
  function closeShop() {
    const sh = el("shop");
    if (sh) sh.classList.remove("show");
    if (!overlayOpen()) finishOverlayResume();
    syncOverlayMode();
  }
  function openShop(tab) {
    const sh = el("shop");
    if (!sh) return;
    const up = el("upgrades");
    if (up) up.classList.remove("show");
    markOverlayResume();
    sh.classList.add("show");
    const ui = el("play-ui");
    if (ui) ui.classList.add("hidden");
    buildShop(tab || shopTab || "weapons");
    syncOverlayMode();
  }
  function openUpgrades() {
    const up = el("upgrades");
    if (!up) return;
    const sh = el("shop");
    if (sh) sh.classList.remove("show");
    markOverlayResume();
    up.classList.add("show");
    const ui = el("play-ui");
    if (ui) ui.classList.add("hidden");
    const sc = el("up-scroll");
    if (sc) sc.scrollTop = 0;
    consoleDirty = true;
    refreshConsole(true);
    syncOverlayMode();
  }
  function closeUpgrades() {
    const up = el("upgrades");
    if (up) up.classList.remove("show");
    if (!overlayOpen()) finishOverlayResume();
    syncOverlayMode();
  }
  let shopTab = "weapons";
  function shopToast(msg) {
    const t = el("shop-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1600);
  }
  function refreshGemDisplays() {
    const g = String(save.gems | 0);
    if (el("hud-gems")) el("hud-gems").textContent = g;
    if (el("shop-gems")) el("shop-gems").textContent = g;
    if (el("over-bank") && el("over").classList.contains("show")) el("over-bank").textContent = g;
    if (el("over-coins") && el("over").classList.contains("show")) el("over-coins").textContent = String(save.bankCoins | 0);
    refreshDailyChip();
  }
  function refreshDailyChip() {
    const b = el("btn-daily");
    if (!b) return;
    const ready = (save.lastDaily || "") !== todayKey();
    b.classList.toggle("off", !ready);
    b.textContent = ready ? "DAILY +5 ◆" : "DAILY CLAIMED";
  }
  function claimDaily() {
    if ((save.lastDaily || "") === todayKey()) { shopToast("Already claimed today"); return; }
    save.lastDaily = todayKey();
    save.gems = (save.gems | 0) + (BAL.gemDaily || 5);
    if (!demo) writeSave(save);
    refreshGemDisplays();
    shopToast("Daily gift: +5 gems");
    audio.buy && audio.buy();
  }
  function buildShop(tab) {
    shopTab = tab || "weapons";
    document.querySelectorAll(".shop-tab").forEach(b => b.classList.toggle("on", b.dataset.shop === shopTab));
    const body = el("shop-body");
    if (!body) return;
    if (!save.shop) save.shop = defaultShop();
    const sh = save.shop;
    refreshGemDisplays();
    let html = "";
    if (shopTab === "weapons") {
      html += '<div class="shop-note">Unlock a weapon with gems, equip it (up to 2), and upgrade it here with gems only.</div>';
      SHOP.weapons.forEach(item => { html += shopWeaponCard(item, "weapons"); });
    } else if (shopTab === "addons") {
      html += '<div class="shop-note">Unlock an add-on with gems, equip it (up to 2), and upgrade it here with gems only.</div>';
      SHOP.addons.forEach(item => { html += shopWeaponCard(item, "addons"); });
    } else if (shopTab === "cosmo") {
      html += '<div class="shop-note">Looks change the base and turret design and paint, on top of your current Mk fortress and turret layout. Trails change bullets only.</div>';
      SHOP.cosmo.forEach(item => {
        const owned = !!(sh.unlocked && sh.unlocked[item.id]);
        const on = (item.kind === "skin" && sh.skin === item.value) || (item.kind === "trail" && sh.trail === item.value);
        html += '<div class="shop-card' + (owned ? " owned" : "") + '"><div><h3>' + item.name + '</h3><p>' + item.blurb + '</p></div><div>';
        if (!owned) html += '<button class="shop-buy" data-buy="' + item.id + '">' + item.cost + ' ◆</button>';
        else html += '<button class="shop-equip' + (on ? " shop-on" : "") + '" data-equip="' + item.id + '">' + (on ? "EQUIPPED" : "EQUIP") + '</button>';
        html += '</div></div>';
      });
    } else if (shopTab === "extras") {
      html += '<div class="shop-note">Premium conveniences. Free players can still finish prestige and speed at 2×.</div>';
      SHOP.extras.forEach(item => {
        const owned = !!(sh.unlocked && sh.unlocked[item.id]);
        html += '<div class="shop-card' + (owned ? " owned" : "") + '"><div><h3>' + item.name + '</h3><p>' + item.blurb + '</p></div><div>';
        if (!owned) html += '<button class="shop-buy" data-buy="' + item.id + '">' + item.cost + ' ◆</button>';
        else html += '<button class="shop-on" disabled>OWNED</button>';
        html += '</div></div>';
      });
    } else {
      html += '<div class="shop-note">Gem packs are a mock storefront for this prototype. There is no real payment and no purchase will be charged.</div>';
      SHOP.packs.forEach(item => {
        html += '<div class="shop-card pack-card"><div><h3>' + item.name + '</h3><p>' + item.gems.toLocaleString("en-US") + ' gems</p><div class="pack-price">' + item.price + '</div><div class="pack-demo">DEMO: NO REAL PURCHASE</div></div><button class="shop-buy" data-pack="' + item.id + '">VIEW</button></div>';
      });
      html += '<div class="shop-test"><b>TEST LABEL</b> — This is a prototype. Packs do not grant gems and cannot be bought. Use the button below only to preview the shop with temporary test gems (they are marked in the toast).</div>';
      html += '<button class="shop-buy" id="btn-test-gems" data-test="1">TEST +50 GEMS</button>';
    }
    body.innerHTML = html;
  }
  function shopWeaponCard(item, listKey) {
    const sh = save.shop;
    const owned = !!(sh.unlocked && sh.unlocked[item.id]);
    const list = listKey === "addons" ? (sh.addons || []) : (sh.weapons || []);
    const on = list.indexOf(item.id) >= 0;
    const def = UP_BY_ID[item.id];
    const lv = owned ? Math.max(1, (sh.levels && sh.levels[item.id]) | 0 || 1) : 0;
    const max = def ? def.max : 10;
    let html = '<div class="shop-card' + (owned ? " owned" : "") + '"><div><h3>' + item.name + '</h3><p>' + item.blurb + '</p>';
    if (owned) html += '<p class="shop-lv">Lv. ' + lv + (lv >= max ? "  ·  MAX" : "") + '</p>';
    html += '</div><div>';
    if (!owned) html += '<button class="shop-buy" data-buy="' + item.id + '">' + item.cost + ' ◆</button>';
    else {
      html += '<button class="shop-equip' + (on ? " shop-on" : "") + '" data-equip="' + item.id + '">' + (on ? "EQUIPPED" : "EQUIP") + '</button>';
      if (lv < max) {
        const c = shopUpgradeCost(item.id, lv);
        html += '<button class="shop-buy" data-upg="' + item.id + '">UPGRADE ' + c + ' ◆</button>';
      } else html += '<button class="shop-on" disabled>MAX</button>';
    }
    return html + '</div></div>';
  }
  function allShopItems() {
    return SHOP.weapons.concat(SHOP.addons, SHOP.cosmo, SHOP.extras);
  }
  function onShopClick(ev) {
    const btn = ev.target.closest("button");
    if (!btn) return;
    audio.unlock();
    if (btn.dataset.pack) { shopToast("Demo: no real purchase"); return; }
    if (btn.dataset.test) {
      save.gems = (save.gems | 0) + 50;
      if (!demo) writeSave(save);
      refreshGemDisplays();
      shopToast("TEST +50 GEMS (not a purchase)");
      return;
    }
    if (btn.dataset.upg) {
      const id = btn.dataset.upg;
      if (!save.shop) save.shop = defaultShop();
      if (!save.shop.levels) save.shop.levels = {};
      const def = UP_BY_ID[id];
      const lv = Math.max(1, save.shop.levels[id] | 0 || 1);
      if (def && lv >= def.max) { shopToast("Maxed"); return; }
      const cost = shopUpgradeCost(id, lv);
      if ((save.gems | 0) < cost) { audio.deny(); shopToast("Not enough gems"); return; }
      save.gems -= cost;
      save.shop.levels[id] = lv + 1;
      if (!demo) writeSave(save);
      if (run) { run.shop = save.shop; run._st = null; }
      audio.buy();
      buildShop(shopTab);
      refreshGemDisplays();
      consoleDirty = true;
      return;
    }
    if (btn.dataset.buy) {
      const item = allShopItems().find(x => x.id === btn.dataset.buy);
      if (!item) return;
      if ((save.gems | 0) < item.cost) { audio.deny(); shopToast("Not enough gems"); return; }
      save.gems -= item.cost;
      if (!save.shop) save.shop = defaultShop();
      save.shop.unlocked[item.id] = 1;
      if (item.id === "speed3") save.shop.speed3 = true;
      if (SHOP_IDS && SHOP_IDS.indexOf(item.id) >= 0) {
        if (!save.shop.levels) save.shop.levels = {};
        if (!save.shop.levels[item.id]) save.shop.levels[item.id] = 1;
      }
      if (item.kind === "skin" && !save.shop.skin || save.shop.skin === "default") {
        if (item.value) save.shop.skin = item.value;
      }
      if (!demo) writeSave(save);
      if (run) run.shop = save.shop;
      audio.buy();
      buildShop(shopTab);
      refreshGemDisplays();
      consoleDirty = true;
      return;
    }
    if (btn.dataset.equip) {
      const id = btn.dataset.equip;
      const item = allShopItems().find(x => x.id === id);
      if (!item) return;
      if (item.kind === "skin") save.shop.skin = item.value;
      else if (item.kind === "trail") save.shop.trail = item.value;
      else if ((SHOP.addons || []).some(x => x.id === id)) {
        const list = save.shop.addons || [];
        const ix = list.indexOf(id);
        if (ix >= 0) list.splice(ix, 1);
        else { if (list.length >= 2) list.shift(); list.push(id); }
        save.shop.addons = list;
      } else {
        const list = save.shop.weapons || [];
        const ix = list.indexOf(id);
        if (ix >= 0) list.splice(ix, 1);
        else { if (list.length >= 2) list.shift(); list.push(id); }
        save.shop.weapons = list;
      }
      if (!demo) writeSave(save);
      if (run) run.shop = save.shop;
      buildShop(shopTab);
      consoleDirty = true;
    }
  }

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

  function tryAutoPrestige() { /* removed in v9 */ }
  function onBuyMid(id) {
    if (!run || mode !== "play") return;
    const upOpen = el("upgrades") && el("upgrades").classList.contains("show");
    if (paused && !upOpen) return;
    audio.unlock();
    const def = UP_BY_ID[id];
    if (def && def.shop) {
      shopToast("Upgrade in the Gem Shop");
      audio.deny();
      return;
    }
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
    const key = consoleTab + "|" + (run.wave|0) + "|" + (run.coins|0) + "|" + (save.gems|0) + "|" + JSON.stringify(run.up) + "|" + JSON.stringify(run.prest || {}) + "|" + JSON.stringify((run.shop && run.shop.levels) || {});
    if (!force && !consoleDirty && key === lastConsoleKey) return;
    lastConsoleKey = key; consoleDirty = false;
    const armed = [];
    if (run.up.spread) armed.push("SPREAD");
    if (run.up.laser) armed.push("LASER");
    if (run.up.missile) armed.push("MISSILES");
    if (run.up.drone) armed.push("DRONE");
    if (run.up.orbit) armed.push("ORBITAL");
    if (run.up.emp) armed.push("EMP");
    if (shopLv(run, "rail")) armed.push("RAILGUN");
    if (shopLv(run, "tesla")) armed.push("TESLA");
    if (shopLv(run, "flak")) armed.push("FLAK");
    if (shopLv(run, "nuke")) armed.push("NUKE");
    if (shopLv(run, "pylon")) armed.push("PYLON");
    const sub = el("console-sub");
    if (sub) sub.textContent = armed.length ? "WEAPONS ONLINE" : "TRAINING FIRE  ·  SINGLE BLASTER";
    const buttons = document.querySelectorAll("#up-grid .up-btn");
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const id = btn.dataset.id;
      const def = UP_BY_ID[id];
      const nameEl = btn.querySelector(".name"), lvlEl = btn.querySelector(".lvl"), costEl = btn.querySelector(".cost");
      if (def.shop) {
        const owned = shopLv(run, id) > 0;
        const slv = owned ? shopLv(run, id) : 0;
        if (nameEl.textContent !== def.name) nameEl.textContent = def.name;
        if (lvlEl.textContent !== (owned ? ("Lv. " + slv + "  ·  GEM SHOP") : "GEM SHOP")) lvlEl.textContent = owned ? ("Lv. " + slv + "  ·  GEM SHOP") : "GEM SHOP";
        if (costEl.textContent !== "Upgrade in Gem Shop") costEl.textContent = "Upgrade in Gem Shop";
        const cls = "up-btn dim" + (owned ? "" : " locked");
        if (btn.className !== cls) btn.className = cls;
        continue;
      }
      const lv = run.up[id] || 0;
      const unlocked = isUnlocked(id, run.wave, run.up, Math.max(run.bestWave || 0, save.bestWave || 0), save.shop || run.shop);
      const tier = (run.prest && run.prest[id]) || 0;
      const atPrest = !!(def.prestige && lv >= 10 && tier < MAX_PREST);
      const maxed = def.prestige ? (tier >= MAX_PREST && lv >= 10) : lv >= def.max;
      const pcost = atPrest ? prestigeCost(id, tier) : null;
      const cost = maxed ? 0 : (atPrest ? pcost.coins : midCost(id, lv));
      const can = unlocked && !maxed && (atPrest ? (run.coins >= pcost.coins) : run.coins >= cost);
      const star = tier > 0 ? " " + "★".repeat(Math.min(5, tier)) : "";
      if (nameEl.textContent !== def.name + star) nameEl.textContent = def.name + star;
      let lvlTxt;
      if (!unlocked) lvlTxt = def.milestone ? "W" + def.milestone : "LOCKED";
      else if (atPrest) lvlTxt = "Lv. 10  ·  " + tierOf(tier).name;
      else if (maxed) lvlTxt = "MAX" + (tier ? "  " + tierOf(tier).name : "");
      else {
        lvlTxt = "Lv. " + lv + (tier ? "  " + tierOf(tier).name : "");
        if (id === "pdef") {
          const n = pdefTurretCount(lv);
          const nx = pdefNextAt(lv);
          lvlTxt = "Lv. " + lv + "  ·  " + n + (n === 1 ? " sentry" : " sentries") + (nx ? "  ·  next at Lv " + nx : "");
        }
      }
      if (lvlEl.textContent !== lvlTxt) lvlEl.textContent = lvlTxt;
      let costTxt;
      if (!unlocked) costTxt = midCost(id, 0) + " ¢";
      else if (maxed) costTxt = "—";
      else if (atPrest) costTxt = "PRESTIGE  " + pcost.coins + "¢";
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
    if (el("up-coins")) el("up-coins").textContent = Math.floor(run.coins).toLocaleString("en-US");
    const upBtn = el("btn-upgrades");
    if (upBtn) {
      let afford = false;
      for (let i = 0; i < buttons.length; i++) {
        if (/\bup-btn\b/.test(buttons[i].className) && !/\bdim\b/.test(buttons[i].className) && !/\blocked\b/.test(buttons[i].className)) { afford = true; break; }
      }
      upBtn.classList.toggle("afford", afford);
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
    if (el("hud-gems")) el("hud-gems").textContent = String(save.gems | 0);
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
        const can = !maxed && (save.bankCoins | 0) >= cost;
        row.className = "upg" + (maxed ? " maxed" : (can ? " buyable" : " costly"));
        const pipMax = Math.min(def.max, 8);
        const pips = def.max <= 8 ? pipsHtml(lv, pipMax) : "";
        row.innerHTML = '<div class="un">' + def.name + '</div><div class="ul">Lv ' + lv + (maxed ? " MAX" : "") + pips + '</div><div class="uc">' + (maxed ? "MAX" : cost + " ¢") + '</div>';
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
    const before = save.bankCoins | 0;
    save.bankCoins = tryBuyPerma(save.perma, before, id);
    if (save.bankCoins !== before) {
      audio.buy();
      if (!demo) writeSave(save);
      if (el("over-coins")) el("over-coins").textContent = String(save.bankCoins | 0);
      buildTrees();
    } else audio.deny();
  }

  function showTitle() {
    mode = "title"; paused = false;
    el("title").classList.remove("hidden");
    el("over").classList.remove("show");
    if (el("shop")) el("shop").classList.remove("show");
    if (el("info")) el("info").classList.remove("show");
    el("play-ui").classList.add("hidden");
    el("pause").classList.remove("show");
    el("title-best").textContent = String(save.bestWave);
    refreshDailyChip();
    refreshGemDisplays();
    setPlayDock(false);
    const up = el("upgrades");
    if (up) up.classList.remove("show");
    syncOverlayMode();
  }

  function startRun() {
    audio.unlock();
    if (run) settlePickups(run);
    run = createRun(save.perma, { bestWave: save.bestWave, persist: !demo, seed: (Date.now() ^ 0x9e3779b9) >>> 0, mid: save.mid, prest: save.prest, carryCoins: 0, gemWallet: save, shop: save.shop });
    if (el("shop")) el("shop").classList.remove("show");
    if (el("info")) el("info").classList.remove("show");
    syncOverlayMode();
    mode = "play"; paused = false; speed = 1;
    setPlayDock(true);
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
    const prevBest = save.bestWave | 0;
    const earned = gemsFor(run, prevBest);
    const reached = run.wave;
    const rate = carryRate(save.perma);
    const carry = Math.floor(Math.max(0, run.coinsEarned || 0) * rate);
    if (!demo) {
      save.gems += earned;
      save.mid = Object.assign(defaultMid(), run.up);
      save.prest = Object.assign(defaultPrest(), run.prest || save.prest);
      save.bankCoins = (save.bankCoins | 0) + carry;
      save.carryCoins = save.bankCoins;
      if (reached > save.bestWave) save.bestWave = reached;
      writeSave(save);
    } else {
      save.bankCoins = (save.bankCoins | 0) + carry;
      save.gems += earned;
    }
    mode = "over"; paused = false;
    el("play-ui").classList.add("hidden");
    if (el("shop")) el("shop").classList.remove("show");
    if (el("info")) el("info").classList.remove("show");
    el("over").classList.add("show");
    el("over-wave").textContent = String(reached);
    el("over-earned").textContent = "+" + earned;
    el("over-bank").textContent = String(save.gems);
    if (el("over-coins")) el("over-coins").textContent = String(save.bankCoins | 0);
    el("over-best").textContent = String(Math.max(save.bestWave, reached));
    el("over-carry").textContent = "+" + carry + " coins salvaged to bank (" + Math.round(rate * 100) + "% of earnings)  ·  leftover bank stays for the next run";
    buildTrees();
    syncOverlayMode();
    const sc = el("over-scroll");
    if (sc) sc.scrollTop = 0;
  }

  function setPaused(p) {
    if (mode !== "play" || !run || run.dead) return;
    paused = p;
    el("pause").classList.toggle("show", p);
  }
  function toggleSpeed() {
    const max = (save.shop && save.shop.speed3) ? 3 : 2;
    speed = speed >= max ? 1 : speed + 1;
    el("btn-speed").textContent = speed + "x";
    el("btn-speed").classList.toggle("on", speed > 1);
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
  const bind = (id, fn) => { const n = el(id); if (n) n.addEventListener("click", fn); };
  bind("btn-hud-gems", () => openShop("weapons"));
  bind("btn-title-shop", () => openShop("weapons"));
  bind("btn-over-shop", () => openShop("weapons"));
  bind("btn-pause-shop", () => openShop("weapons"));
  bind("btn-gems", () => openShop("weapons"));
  bind("btn-upgrades", () => openUpgrades());
  bind("btn-up-resume", closeUpgrades);
  bind("shop-close", closeShop);
  bind("btn-daily", claimDaily);
  const shopEl = el("shop");
  if (shopEl) {
    shopEl.addEventListener("click", ev => { if (ev.target.id === "shop") closeShop(); });
    const body = el("shop-body");
    if (body) body.addEventListener("click", onShopClick);
    document.querySelectorAll(".shop-tab").forEach(b => b.addEventListener("click", () => buildShop(b.dataset.shop)));
  }
  // Never preventDefault on touches inside overlays (so Android can scroll).
  ["touchstart", "touchmove"].forEach(type => {
    document.addEventListener(type, ev => {
      if (ev.target && ev.target.closest && ev.target.closest("#over, #info, #shop, #upgrades")) return;
    }, { passive: true });
  });
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
      const sh = el("shop");
      if (sh && sh.classList.contains("show")) { ev.preventDefault(); closeShop(); }
      else if (el("upgrades") && el("upgrades").classList.contains("show")) { ev.preventDefault(); closeUpgrades(); }
      else if (box && box.classList.contains("show")) { ev.preventDefault(); closeInfo(); }
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
        tryAutoPrestige();
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
    syncOverlayMode();
  }
  function closeInfo() {
    const root = el("info");
    if (root) root.classList.remove("show");
    syncOverlayMode();
  }

  function buildInfo(tab, focusId) {
    const body = el("info-body");
    if (!body) return;
    document.querySelectorAll(".info-tab").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const how = "<div class=\"info-how\"><h3>HOW PRESTIGE WORKS</h3><p>Bullets, Laser, Missiles, Drones, Armor, Shield and the Base cap at level 10. The button then becomes <b>PRESTIGE</b>. Paying the coin cost resets that item to level 1 at the next tier: it keeps a bank of the previous 10 levels, gains a <b>1.55x power multiplier per tier</b>, and changes its shape and color (Mk I cyan, Mk II gold, Mk III plasma, Mk IV white-hot, Mk V lime, Mk VI void). Tiers stay with you when you die, just like other console upgrades. Prestige is coins only, so free players can always progress. Gems are rare and buy shop weapons, add-ons, looks, and all upgrades for those shop items (no coin upgrades).</p><p>First prestige costs <b>" + prestigeCost("dmg", 0).coins + "¢</b>. Each further tier costs more. Secondaries such as Fire Rate, Crit and Pierce keep high caps and do not prestige.</p></div>";
    let html = "";
    if (tab === "prestige") html = how;
    else if (tab === "perma") {
      html = '<div class="info-sec">Permanent upgrades, bought with the coin bank on the game-over screen. They persist and stack on top of mid-run upgrades and prestige.</div>';
      ["atk","def","eco"].forEach(k => {
        html += '<h3 class="info-h">' + (k === "atk" ? "ATTACK" : k === "def" ? "DEFENSE" : "ECONOMY") + "</h3>";
        PERMA[k].forEach(def => {
          const lv = (save.perma && save.perma[def.id]) || 0;
          html += infoCard(def.name, PERMA_INFO[def.id] || "", "Lv " + lv, lv >= def.max ? "MAX" : ("Next costs " + costOf(def, lv) + "¢"), "perma-" + k);
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
          ? ("Prestige to " + tierOf(t + 1).name + " — " + prestigeCost(def.id, t).coins + "¢. " + effectLine(def.id, 1, t + 1))
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
      save.perma = { dmg: 5, rate: 3, crit: 2, critDmg: 1, pierce: 1, multi: 0, slot: 1, hp: 6, shield: 2, armor: 3, regen: 1, shRegen: 1, thorns: 0, wind: 0, startCoins: 4, coinValue: 2, salvage: 1, interest: 1, pdef: 2, skip: 0 };
      save.bankCoins = 1860; save.gems = 24;
      run = createRun(save.perma, { bestWave: 47, persist: false, seed: 23, shop: save.shop });
      run.wave = 23; run.kills = 80; run.bossesBeaten = 2; run.dead = true;
      run.up = Object.assign(defaultMid(), { dmg: 8, rate: 6, hp: 5, shield: 2, spread: 3, laser: 2, missile: 1, drone: 1, crit: 2, pdef: 2, coinVal: 2 });
      run.coins = 48;
      mode = "over";
      el("title").classList.add("hidden");
      el("play-ui").classList.add("hidden");
      el("over").classList.add("show");
      el("over-wave").textContent = "23";
      el("over-earned").textContent = "+20";
      el("over-bank").textContent = "24";
      if (el("over-coins")) el("over-coins").textContent = "1860";
      el("over-best").textContent = "47";
      el("over-carry").textContent = "+24 coins salvaged to bank (51.5% of earnings)  ·  leftover bank stays for the next run";
      buildTrees();
      syncOverlayMode();
      return;
    }
    if (name === "shop" || name === "packs") {
      save.gems = 160;
      showTitle();
      openShop(name === "packs" ? "packs" : "weapons");
      return;
    }
    if (name === "weapons" || name === "flame") {
      save.shop = defaultShop();
      save.shop.unlocked.nuke = 1; save.shop.unlocked.pylon = 1; save.shop.unlocked.rail = 1;
      save.shop.levels = { nuke: 5, pylon: 3, rail: 2 };
      save.shop.weapons = ["nuke"]; save.shop.addons = ["pylon"];
      startRun();
      run.shop = save.shop;
      run.wave = 0; beginWave(run, 8);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 4, rate: 2, hp: 6, ship: 4, pylon: 3, pdef: 1, shield: 2 });
      run.prest = Object.assign(defaultPrest(), { ship: 2 });
      run.coins = 200; run._st = null;
      const stw = playerStats(run); run.hp = stw.maxHp; run.shield = stw.maxShield;
      run.invuln = 8;
      run.enemies = [];
      const low = SHIP_Y;
      [["spark",low-240, 300],["spark",low-200, 540],["drifter",low-280, 420],["shellback",low-260, 700],["razor",low-180, 800],["spark",low-220, 200],["spark",low-230, 480],["drifter",low-250, 620]]
        .forEach(row => { const e = spawnEnemy(run, row[0], { x: row[2], y: row[1] }); if (e) { e.hp = e.maxHp = Math.max(e.hp, 90); e.vy = 12; e._onField = true; } });
      run.nukeCd = 0.15;
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      setPlayDock(true);
      if (root.LastOutpost) root.LastOutpost._run = run;
      return;
    }
    if (name === "upgrades") {
      startRun();
      run.wave = 0; beginWave(run, 8);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      run.up = Object.assign(defaultMid(), { dmg: 4, rate: 3, hp: 3, ship: 2, spread: 1, pdef: 2 });
      run.coins = 420; run._st = null;
      const stu = playerStats(run); run.hp = stu.maxHp; run.shield = stu.maxShield;
      run.enemies = [];
      spawnEnemy(run, "spark", { x: 400, y: 500 });
      openUpgrades();
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
      run.up = Object.assign(defaultMid(), { dmg: 0, rate: 0, hp: 10, ship: 8, shield: 6, armor: 6, pdef: 12, spread: 0, shRegen: 4 });
      run.coins = 80; run._st = null;
      const st = playerStats(run); run.hp = st.maxHp; run.shield = st.maxShield;
      run.invuln = 30;
      run.enemies = [];
      const low = SHIP_Y;
      [["shooter",130,low-420],["shooter",320,low-360],["shooter",540,low-480],["shooter",760,low-360],["shooter",950,low-420],["shooter",200,low-560],["shooter",400,low-620],["shooter",700,low-620],["shooter",880,low-560]]
        .forEach(p => {
          const e = spawnEnemy(run, p[0], { x: p[1], y: p[2] });
          if (e) { e.hp = e.maxHp = 4000; e.fireCd = 0.05 + run.rng() * 0.2; e.fireEvery = 0.85; }
        });
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
      const b2 = spawnEnemy(run, "boss", { boss: bossInfo(20), x: 540, y: 470 });
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

    function v9Play(opts) {
      opts = opts || {};
      startRun();
      if (opts.shop) run.shop = save.shop = Object.assign(defaultShop(), opts.shop);
      run.wave = 0; beginWave(run, opts.wave || 8);
      run.phase = "combat"; run.phaseT = 0; run.banner = null; run.pending = [];
      if (opts.up) run.up = Object.assign(defaultMid(), opts.up);
      if (opts.prest) run.prest = Object.assign(defaultPrest(), opts.prest);
      run.coins = opts.coins != null ? opts.coins : 300;
      run._st = null;
      const st = playerStats(run);
      run.hp = Math.round(st.maxHp * (opts.hpFrac != null ? opts.hpFrac : 1));
      if (opts.shield === "full") run.shield = st.maxShield;
      else if (opts.shield === "broken") { run.shield = 0; run.shieldWait = 8; run.shieldBreakT = 0.8; }
      else if (opts.shield === "cracked") run.shield = Math.round(st.maxShield * 0.32);
      else run.shield = st.maxShield;
      run.invuln = opts.invuln != null ? opts.invuln : 0;
      run.enemies = [];
      (opts.enemies || []).forEach(row => {
        const e = spawnEnemy(run, row[0], { x: row[1], y: row[2] });
        if (e) {
          e._onField = true;
          if (row[3]) { e.hp = e.maxHp = row[3]; }
        }
      });
      if (opts.mines) {
        save.shop.unlocked.mines = 1; save.shop.addons = ["mines"];
        save.shop.levels = Object.assign({}, save.shop.levels, { mines: opts.mineLv || 4 });
        run.shop = save.shop;
        placeWaveMines(run);
      }
      hudDirty = true; consoleDirty = true; refreshHud(true); refreshConsole(true);
      setPlayDock(true);
      if (root.LastOutpost) root.LastOutpost._run = run;
    }
    if (name === "wave7" || name === "bugfix") {
      save.shop = defaultShop();
      save.shop.speed3 = 1;
      save.bestWave = 40;
      save.gems = 120;
      save.perma = Object.assign(defaultPerma(), { hp: 10, shield: 8, dmg: 4, rate: 3 });
      v9Play({
        wave: 7, coins: 559,
        prest: { ship: 0, missile: 1, drone: 1 },
        up: { dmg: 10, rate: 8, hp: 16, ship: 4, shield: 12, spread: 4, drone: 3, dcount: 3, missile: 3, mcount: 2, crit: 2 },
        shield: "full",
        shop: save.shop,
        enemies: [
          ["spark", 200, 380], ["spark", 400, 340], ["spark", 600, 360], ["spark", 800, 400],
          ["drifter", 300, 520], ["drifter", 540, 500], ["razor", 780, 560],
          ["shellback", 480, 680], ["shooter", 250, 620], ["shooter", 820, 640]
        ]
      });
      return;
    }
    if (name === "mki") {
      v9Play({ wave: 4, prest: { ship: 0 }, up: { dmg: 2, rate: 2, hp: 2, ship: 3, shield: 2, spread: 1 }, shield: "full",
        enemies: [["spark",300,400],["spark",760,360],["drifter",540,520]] });
      return;
    }
    if (name === "mkiii") {
      v9Play({ wave: 12, prest: { ship: 2, dmg: 1 }, up: { dmg: 6, rate: 3, hp: 4, ship: 8, shield: 4, spread: 1, pdef: 2 }, shield: "full",
        enemies: [["spark",200,500],["razor",880,520],["drifter",540,420],["shellback",700,360]] });
      return;
    }
    if (name === "mkvi") {
      v9Play({ wave: 24, prest: { ship: 5, dmg: 2, shield: 2 }, up: { dmg: 8, rate: 4, hp: 6, ship: 10, shield: 6, spread: 2, multi: 1, pdef: 4 }, shield: "full",
        enemies: [["spark",200,300],["spark",500,260],["spark",800,320],["coil",300,500],["coil",760,540],["brood",540,700]] });
      return;
    }
    if (name === "wall") {
      v9Play({ wave: 10, prest: { ship: 2 }, up: { dmg: 3, rate: 2, hp: 6, ship: 6, shield: 3, spread: 0 }, shield: "full",
        enemies: [["spark",300,200],["drifter",540,240],["razor",780,180]] });
      // plant a few enemies about to ram the wall so the shot can catch the burst
      const face = wallFace();
      [["shellback", 400], ["spark", 540], ["drifter", 700], ["razor", 280]].forEach((row, i) => {
        const e = spawnEnemy(run, row[0], { x: row[1], y: face - 36 - i * 10 });
        if (e) { e._onField = true; e.vy = 80; e.spd = 140; }
      });
      return;
    }
    if (name === "skin") {
      save.shop = defaultShop();
      save.shop.unlocked.skin_racer = 1;
      save.shop.skin = "racer";
      v9Play({ wave: 10, prest: { ship: 1 }, up: { dmg: 4, rate: 2, hp: 3, ship: 6, shield: 3, spread: 1 }, shield: "full",
        shop: save.shop,
        enemies: [["spark",300,400],["drifter",800,460]] });
      return;
    }
    if (name === "shield-full") {
      v9Play({ wave: 10, prest: { ship: 2, shield: 2 }, up: { dmg: 4, rate: 3, hp: 4, ship: 6, shield: 8, shRegen: 4 }, shield: "full",
        enemies: [["shooter",300,420],["shooter",760,400]] });
      return;
    }
    if (name === "shield-broken") {
      v9Play({ wave: 10, prest: { ship: 2, shield: 2 }, up: { dmg: 4, rate: 3, hp: 4, ship: 6, shield: 8 }, shield: "broken",
        enemies: [["shooter",300,420],["shooter",760,400]] });
      return;
    }
    if (name === "nuke") {
      save.shop = defaultShop();
      save.shop.unlocked.nuke = 1;
      save.shop.levels = { nuke: 5 };
      save.shop.weapons = ["nuke"];
      v9Play({ wave: 8, prest: { ship: 2 }, up: { dmg: 4, rate: 2, hp: 6, ship: 4, shield: 2 }, shield: "full",
        shop: save.shop, coins: 212,
        enemies: [
          ["shellback", 500, 720, 80],
          ["spark", 430, 680, 40],
          ["spark", 580, 700, 40],
          ["drifter", 540, 800, 60],
          ["razor", 620, 760, 50],
          ["spark", 460, 780, 40]
        ] });
      run.nukeCd = 99;
      return;
    }
    if (name === "mines") {
      save.shop = defaultShop();
      v9Play({ wave: 11, prest: { ship: 2 }, up: { dmg: 5, rate: 3, hp: 4, ship: 6, shield: 3, spread: 1 }, shield: "full", mines: true, mineLv: 6,
        shop: save.shop,
        enemies: [["spark",240,360],["drifter",820,400],["razor",960,520]] });
      const mst = playerStats(run);
      const mdmg = mst.dmg * (2.4 + 0.38 * 6);
      run.mines = [
        { x: 220, y: 620, r: 18, t: 9999, dmg: mdmg, planted: true },
        { x: 400, y: 880, r: 18, t: 9999, dmg: mdmg, planted: true },
        { x: 540, y: 700, r: 18, t: 9999, dmg: mdmg, planted: true },
        { x: 720, y: 980, r: 18, t: 9999, dmg: mdmg, planted: true },
        { x: 860, y: 740, r: 18, t: 9999, dmg: mdmg, planted: true },
        { x: 300, y: 1100, r: 18, t: 9999, dmg: mdmg, planted: true }
      ];
      return;
    }
    if (name === "swarm") {
      v9Play({ wave: 33, prest: { ship: 4, dmg: 3, shield: 2, armor: 2 }, up: { dmg: 10, rate: 8, hp: 8, ship: 10, shield: 6, spread: 3, multi: 2, knock: 12, pdef: 6, pierce: 3 }, shield: "full",
        enemies: [] });
      // pack a visible mid-field swarm
      run.enemies = [];
      const kinds = ["spark","spark","drifter","razor","needle","coil","shooter","shellback","splitter","brood"];
      for (let i = 0; i < 36; i++) {
        const typ = kinds[i % kinds.length];
        const e = spawnEnemy(run, typ, { x: 80 + (i * 97) % 920, y: 420 + (i * 41) % 700 });
        if (e) { e._onField = true; e.hp = Math.max(e.hp, 40); }
      }
      hudDirty = true; refreshHud(true);
      if (root.LastOutpost) root.LastOutpost._run = run;
      return;
    }
    if (name === "shop-upg") {
      save.gems = 420;
      save.shop = defaultShop();
      save.shop.unlocked.nuke = 1; save.shop.unlocked.rail = 1; save.shop.unlocked.tesla = 1;
      save.shop.levels = { nuke: 3, rail: 2, tesla: 1 };
      save.shop.weapons = ["nuke"];
      showTitle();
      openShop("weapons");
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
      const b = spawnEnemy(run, "boss", { boss: bossInfo(10), x: 540, y: 460 });
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
    window.addEventListener("orientationchange", fit);
    if (window.visualViewport) {
      visualViewport.addEventListener("resize", fit);
    }
    requestAnimationFrame(loop);
    document.body.dataset.ready = "1";
  }

  LO._getRun = function () { return run; };
  LO.setSpeed = function (n) {
    speed = Math.max(1, Math.min(3, n | 0));
    el("btn-speed").textContent = speed + "x";
    el("btn-speed").classList.toggle("on", speed > 1);
  };
  LO.setPaused = function (p) { setPaused(!!p); };
  root.LastOutpost = LO;
  if (typeof module !== "undefined") module.exports = LO;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
