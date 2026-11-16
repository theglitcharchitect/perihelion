// Deterministic screenshot scenes (?shot=title|battle|nova|dawn&seed=N) and
// the autopilot that flies the skiff inside them. The scenes are composed
// with a seeded world and rendered by the game's own code, so a screenshot
// is the real game at a chosen moment, never a mockup. The autopilot also
// serves as the attract mode behind the title screen.

import { VIEW } from './config.js';
import { makeShard } from './entities.js';

// A stand-in for the Input class: the autopilot fills a key set and a mouse
// position each frame, and the ship reads it exactly like a player's hands.
export class Autopilot {
  constructor() {
    this.keys = new Set();
    this.mouseX = VIEW.width / 2;
    this.mouseY = VIEW.height / 3;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.rightClicked = false;
    this.pressed = new Set();
    this.orbitAngle = -0.7;
    this.novaAt = -1; // scene time at which to fire the nova, or -1
    this.novaDone = false;
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  justPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
    this.rightClicked = false;
  }

  update(game, dt) {
    const ship = game.ship;
    this.keys.clear();
    this.orbitAngle += dt * 0.34;

    // Hold a loose orbit around the Heart, drifting with the fight.
    const orbitR = 238;
    const wantX = VIEW.coreX + Math.cos(this.orbitAngle) * orbitR;
    const wantY = VIEW.coreY + Math.sin(this.orbitAngle) * orbitR * 0.82;
    const dvx = (wantX - ship.x) * 2.4 - ship.vx;
    const dvy = (wantY - ship.y) * 2.4 - ship.vy;
    if (dvx > 26) this.keys.add('KeyD');
    if (dvx < -26) this.keys.add('KeyA');
    if (dvy > 26) this.keys.add('KeyS');
    if (dvy < -26) this.keys.add('KeyW');

    // Aim at the shard nearest the skiff, leading its fall.
    let target = null;
    let best = Infinity;
    for (const shard of game.shards) {
      const d = Math.hypot(shard.x - ship.x, shard.y - ship.y);
      if (d < best) {
        best = d;
        target = shard;
      }
    }
    this.mouseDown = false;
    if (target) {
      const lead = Math.min(0.55, best / 780);
      this.mouseX = target.x + target.vx * lead;
      this.mouseY = target.y + target.vy * lead;
      const aim = Math.atan2(this.mouseY - ship.y, this.mouseX - ship.x);
      let diff = Math.abs(aim - ship.angle) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.24 && best < 600) this.mouseDown = true;
    }

    if (this.novaAt > 0 && !this.novaDone && game.sceneTime >= this.novaAt) {
      this.pressed.add('Space');
      this.novaDone = true;
    }
  }
}

// Place a composed fall of shards around the Heart for the action scenes.
// They start far out and drift in slowly, so the frame reads as a fall in
// progress spread across the field, not a pile-up on the Heart.
function composeFall(game, kinds, radiusMin, radiusMax) {
  const rng = game.rng;
  kinds.forEach((kind, i) => {
    const angle = (i / kinds.length) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const radius = rng.range(radiusMin, radiusMax);
    const x = VIEW.coreX + Math.cos(angle) * radius;
    const y = VIEW.coreY + Math.sin(angle) * radius * 0.8;
    const shard = makeShard(kind, x, y, rng, 1.1);
    shard.vx *= 0.3;
    shard.vy *= 0.3;
    game.shards.push(shard);
  });
}

export function setupShotScene(game, name) {
  const autopilot = new Autopilot();
  game.autopilot = autopilot;
  game.shotMode = name;

  if (name === 'title') {
    game.state = 'title';
    // A quiet fall drifting behind the title, recycled by main.js.
    for (let i = 0; i < 7; i++) {
      const point = game.director.spawnPoint();
      const shard = makeShard(game.rng.pick(['shard', 'shard', 'weaver', 'splitter']), point.x, point.y, game.rng, 0.6);
      game.shards.push(shard);
    }
    return;
  }

  game.state = 'playing';
  game.ship.x = VIEW.coreX - 205;
  game.ship.y = VIEW.coreY + 128;
  game.director.wave = 5;

  if (name === 'battle' || name === 'nova') {
    game.score = 7350;
    game.kills = 61;
    game.combo = 9;
    game.comboTimer = 1.9;
    game.bestMultiplier = 3;
    game.heart = 78;
    game.elapsed = 214;
    game.novaCharges = 2;
    composeFall(game,
      ['shard', 'weaver', 'shard', 'splitter', 'dart', 'shard', 'brute', 'weaver', 'shard', 'dart', 'splitter'],
      250, 540);
    if (name === 'nova') {
      composeFall(game, ['shard', 'shard', 'weaver', 'shard', 'splitter', 'shard'], 130, 215);
      autopilot.novaAt = 1.05;
    }
    return;
  }

  if (name === 'dawn') {
    game.state = 'won';
    game.score = 18450;
    game.kills = 132;
    game.bestMultiplier = 5;
    game.elapsed = 486;
    game.heart = 43;
    game.director.wave = 8;
    game.bestScore = 18450;
    return;
  }

  game.state = 'title';
}
