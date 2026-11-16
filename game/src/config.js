// PERIHELION tuning: every number that shapes how the game feels lives here,
// so the balance can be read and adjusted in one place.

export const VIEW = {
  width: 1280,
  height: 800,
  coreX: 640,
  coreY: 424,
  coreRadius: 34,
};

export const SHIP = {
  radius: 13,
  thrust: 1560, // px per second^2 of engine push
  maxSpeed: 348,
  drag: 2.1, // exponential damping per second
  gravity: 62, // the Heart's pull on the skiff, px per second^2
  fireCooldown: 0.128, // seconds between pulse bolts
  hull: 3,
  invulnerableTime: 1.25,
};

export const BOLT = {
  speed: 780,
  life: 1.05,
  radius: 4,
};

export const NOVA = {
  maxCharges: 3,
  startCharges: 2,
  radius: 268,
  expandTime: 0.42,
  cellsPerCharge: 8, // plasma cells that refill one charge
};

export const HEART = {
  integrity: 100,
  cellRepairEvery: 5, // every Nth cell mends the Heart by repairAmount
  repairAmount: 1,
};

export const COMBO = {
  window: 2.5, // seconds a kill keeps the chain alive
  tiers: [20, 12, 7, 3], // chain lengths that raise the multiplier
  maxMultiplier: 5,
};

export const WAVES_TOTAL = 8;
export const WAVE_CLEAR_BONUS = 250; // multiplied by the wave number
export const INTERMISSION = 2.4; // seconds between waves

// The shard kinds: hit points, size, worth, and how hard each hurts the Heart
// when it lands. Speeds and fall behaviour live in entities.js.
export const SHARD_KINDS = {
  shard: { hp: 1, radius: 16, score: 50, heartDamage: 6 },
  splinter: { hp: 1, radius: 9, score: 25, heartDamage: 3 },
  splitter: { hp: 1, radius: 23, score: 80, heartDamage: 9 },
  weaver: { hp: 2, radius: 15, score: 90, heartDamage: 6 },
  dart: { hp: 1, radius: 10, score: 70, heartDamage: 5 },
  brute: { hp: 5, radius: 31, score: 200, heartDamage: 15 },
};

export const PALETTE = {
  void: '#070714',
  voidDeep: '#04040a',
  nebulaViolet: 'rgba(88, 60, 180, 0.16)',
  nebulaTeal: 'rgba(20, 120, 140, 0.13)',
  nebulaRose: 'rgba(150, 40, 90, 0.10)',
  starDim: '#8d97c9',
  starBright: '#e8ecff',
  heartCore: '#ffd98a',
  heartMid: '#ffb84d',
  heartEdge: '#ff7a2f',
  heartGlow: 'rgba(255, 150, 50, 0.55)',
  shipBody: '#eafcff',
  shipAccent: '#37e0ff',
  shipFlame: '#ffb84d',
  bolt: '#7df3ff',
  boltCore: '#ffffff',
  shard: '#ff4d8d',
  shardDark: '#a11747',
  shardGlow: 'rgba(255, 77, 141, 0.5)',
  brute: '#c44dff',
  bruteDark: '#5e1a80',
  cell: '#5cff9d',
  cellGlow: 'rgba(92, 255, 157, 0.55)',
  nova: '#9df2ff',
  textMain: '#eef2ff',
  textDim: '#9aa5d6',
  danger: '#ff5470',
  good: '#5cff9d',
};
