// The moving things: the guardian skiff, the falling shards in their six
// kinds, pulse bolts and plasma cells. Factories and per-entity movement live
// here; collisions and scoring live in game.js, drawing in render.js.

import { BOLT, PALETTE, SHARD_KINDS, SHIP, VIEW } from './config.js';

let nextId = 1;

export function makeShip(x, y) {
  return {
    id: nextId++,
    x, y,
    vx: 0, vy: 0,
    angle: -Math.PI / 2, // the way the nose points (toward the aim)
    hull: SHIP.hull,
    maxHull: SHIP.hull, // a boon can raise this; the HUD draws one pip each
    fireTimer: 0,
    invulnerable: 0,
    thrusting: false,
    alive: true,
  };
}

export function updateShip(ship, input, dt, mods) {
  let ax = 0;
  let ay = 0;
  if (input.down('KeyW', 'ArrowUp')) ay -= 1;
  if (input.down('KeyS', 'ArrowDown')) ay += 1;
  if (input.down('KeyA', 'ArrowLeft')) ax -= 1;
  if (input.down('KeyD', 'ArrowRight')) ax += 1;
  const length = Math.hypot(ax, ay);
  ship.thrusting = length > 0;
  if (length > 0) {
    const thrust = SHIP.thrust * (mods ? mods.thrust : 1);
    ax = (ax / length) * thrust;
    ay = (ay / length) * thrust;
  }

  // The Heart pulls gently; near it, holding position is real work.
  const dx = VIEW.coreX - ship.x;
  const dy = VIEW.coreY - ship.y;
  const dist = Math.max(60, Math.hypot(dx, dy));
  ax += (dx / dist) * SHIP.gravity;
  ay += (dy / dist) * SHIP.gravity;

  ship.vx += ax * dt;
  ship.vy += ay * dt;
  const damp = Math.exp(-SHIP.drag * dt);
  ship.vx *= damp;
  ship.vy *= damp;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > SHIP.maxSpeed) {
    ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
    ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Keep the skiff inside the field and out of the Heart's body.
  ship.x = Math.min(VIEW.width - 18, Math.max(18, ship.x));
  ship.y = Math.min(VIEW.height - 18, Math.max(52, ship.y));
  const fromCore = Math.hypot(ship.x - VIEW.coreX, ship.y - VIEW.coreY);
  const minDist = VIEW.coreRadius + SHIP.radius + 6;
  if (fromCore < minDist && fromCore > 0.01) {
    const push = minDist / fromCore;
    ship.x = VIEW.coreX + (ship.x - VIEW.coreX) * push;
    ship.y = VIEW.coreY + (ship.y - VIEW.coreY) * push;
  }

  ship.angle = Math.atan2(input.mouseY - ship.y, input.mouseX - ship.x);
  ship.fireTimer -= dt;
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);
}

// Shard fall behaviour by kind: how strongly the Heart's gravity bends the
// path, how fast it arrives, and any sideways weave.
const FALL = {
  shard: { gravity: 150, speed: 62 },
  splinter: { gravity: 170, speed: 84 },
  splitter: { gravity: 120, speed: 46 },
  weaver: { gravity: 140, speed: 66 },
  dart: { gravity: 55, speed: 148 },
  brute: { gravity: 95, speed: 30 },
};

export function makeShard(kind, x, y, rng, speedScale) {
  const spec = SHARD_KINDS[kind];
  const fall = FALL[kind];
  // Aim at a point near the Heart, scattered so falls cross the whole field.
  const targetX = VIEW.coreX + rng.range(-70, 70);
  const targetY = VIEW.coreY + rng.range(-70, 70);
  const angle = Math.atan2(targetY - y, targetX - x);
  const speed = fall.speed * speedScale * rng.range(0.85, 1.2);
  return {
    id: nextId++,
    kind,
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    hp: spec.hp,
    maxHp: spec.hp,
    radius: spec.radius * rng.range(0.9, 1.12),
    score: spec.score,
    heartDamage: spec.heartDamage,
    gravity: fall.gravity,
    rotation: rng.angle(),
    spin: rng.range(-1.4, 1.4),
    wobblePhase: rng.angle(),
    wobbleRate: rng.range(2.2, 3.4),
    age: 0,
    flash: 0, // white hit-flash timer, read by the renderer
    seed: rng.next(),
    trail: [], // recent positions, drawn as the fall's curved path
  };
}

export function updateShard(shard, dt) {
  shard.age += dt;
  const dx = VIEW.coreX - shard.x;
  const dy = VIEW.coreY - shard.y;
  const dist = Math.max(30, Math.hypot(dx, dy));
  let ax = (dx / dist) * shard.gravity;
  let ay = (dy / dist) * shard.gravity;
  if (shard.kind === 'weaver') {
    // A sideways sine threaded across the fall.
    const px = -dy / dist;
    const py = dx / dist;
    const weave = Math.sin(shard.age * shard.wobbleRate + shard.wobblePhase) * 210;
    ax += px * weave;
    ay += py * weave;
  }
  shard.vx += ax * dt;
  shard.vy += ay * dt;
  shard.x += shard.vx * dt;
  shard.y += shard.vy * dt;
  shard.rotation += shard.spin * dt;
  shard.flash = Math.max(0, shard.flash - dt * 6);
  // Remember the path so the renderer can draw the curve gravity bent.
  shard.trail.push({ x: shard.x, y: shard.y });
  if (shard.trail.length > 20) shard.trail.shift();
}

export function makeBolt(ship) {
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  return {
    id: nextId++,
    x: ship.x + cos * (SHIP.radius + 6),
    y: ship.y + sin * (SHIP.radius + 6),
    vx: cos * BOLT.speed + ship.vx * 0.25,
    vy: sin * BOLT.speed + ship.vy * 0.25,
    age: 0,
    life: BOLT.life,
    radius: BOLT.radius,
  };
}

export function updateBolt(bolt, dt) {
  bolt.age += dt;
  bolt.x += bolt.vx * dt;
  bolt.y += bolt.vy * dt;
}

export function makeCell(x, y, rng) {
  return {
    id: nextId++,
    x, y,
    vx: rng.range(-26, 26),
    vy: rng.range(-26, 26),
    radius: 7,
    age: 0,
    pulse: rng.angle(),
  };
}

export function updateCell(cell, dt) {
  cell.age += dt;
  // Cells drift slowly Heartward and fade if nobody comes for them.
  const dx = VIEW.coreX - cell.x;
  const dy = VIEW.coreY - cell.y;
  const dist = Math.max(40, Math.hypot(dx, dy));
  cell.vx += (dx / dist) * 9 * dt;
  cell.vy += (dy / dist) * 9 * dt;
  cell.x += cell.vx * dt;
  cell.y += cell.vy * dt;
}

export function shardColor(kind) {
  return kind === 'brute' ? PALETTE.brute : PALETTE.shard;
}
