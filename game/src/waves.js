// The eight waves of the fall, and the director that deals them out: each
// wave is a bag of shard kinds shuffled together, spawned one by one from
// the field's edges on a tightening clock.

import { VIEW, WAVES_TOTAL } from './config.js';
import { makeShard } from './entities.js';
import { shuffle } from './random.js';

// kind: count pairs per wave. Later waves lean on the stranger kinds and
// everything falls a little faster (speedScale in the director).
const WAVE_TABLE = [
  { shard: 8 },
  { shard: 12 },
  { shard: 10, splitter: 4 },
  { shard: 11, weaver: 4, dart: 4 },
  { shard: 13, splitter: 6, brute: 2 },
  { shard: 14, weaver: 6, dart: 6, brute: 2 },
  { shard: 16, splitter: 7, weaver: 6, brute: 3 },
  { shard: 18, dart: 8, weaver: 7, splitter: 5, brute: 4 },
];

const SPAWN_INTERVALS = [1.05, 0.98, 0.92, 0.86, 0.8, 0.74, 0.68, 0.62];

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0; // 1-based once the first wave starts
    this.queue = [];
    this.timer = 0;
    this.interval = 1;
    this.speedScale = 1;
  }

  get totalWaves() {
    return WAVES_TOTAL;
  }

  get spawningDone() {
    return this.queue.length === 0;
  }

  startWave(wave) {
    this.wave = wave;
    const recipe = WAVE_TABLE[wave - 1];
    const bag = [];
    for (const [kind, count] of Object.entries(recipe)) {
      for (let i = 0; i < count; i++) bag.push(kind);
    }
    this.queue = shuffle(this.rng, bag);
    this.interval = SPAWN_INTERVALS[wave - 1];
    this.speedScale = 1 + (wave - 1) * 0.055;
    this.timer = 0.35; // a breath before the first shard of the wave
  }

  // Spawn points sit just outside a random edge, never in a corner clump.
  spawnPoint() {
    const rng = this.rng;
    const edge = rng.int(0, 3);
    const margin = 30;
    if (edge === 0) return { x: rng.range(60, VIEW.width - 60), y: -margin };
    if (edge === 1) return { x: rng.range(60, VIEW.width - 60), y: VIEW.height + margin };
    if (edge === 2) return { x: -margin, y: rng.range(70, VIEW.height - 60) };
    return { x: VIEW.width + margin, y: rng.range(70, VIEW.height - 60) };
  }

  // Returns the shards spawned this tick (usually zero or one).
  update(dt) {
    if (this.queue.length === 0) return [];
    this.timer -= dt;
    if (this.timer > 0) return [];
    this.timer = this.interval * this.rng.range(0.8, 1.2);
    const kind = this.queue.shift();
    const point = this.spawnPoint();
    return [makeShard(kind, point.x, point.y, this.rng, this.speedScale)];
  }
}
