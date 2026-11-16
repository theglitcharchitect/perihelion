// PERIHELION: the game. A guardian skiff holds orbit around a living star
// while hollow shards ride its gravity down to crack it open. Eight waves,
// a combo-driven score chase, plasma that feeds your nova and mends the
// Heart, and a dawn to earn. This file owns the state machine, collisions
// and scoring; entities.js moves things, waves.js deals the fall,
// render.js draws, particles.js reports every hit in light.

import { COMBO, HEART, NOVA, SHIP, VIEW, WAVE_CLEAR_BONUS } from './config.js';
import { Input } from './input.js';
import { Particles } from './particles.js';
import { makeBackground, drawGame } from './render.js';
import { makeRng } from './random.js';
import {
  makeBolt, makeCell, makeShard, makeShip, shardColor,
  updateBolt, updateCell, updateShard, updateShip,
} from './entities.js';
import { WaveDirector } from './waves.js';
import { setupShotScene } from './shots.js';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas, VIEW);
    this.rng = makeRng((Date.now() % 2147483647) + 1);
    this.background = makeBackground(this.rng);
    this.particles = new Particles(this.rng);
    this.director = new WaveDirector(this.rng);

    this.state = 'title'; // title | playing | paused | won | lost
    this.time = 0;
    this.sceneTime = 0;
    this.elapsed = 0;
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestMultiplier = 1;
    this.heart = HEART.integrity;
    this.ship = makeShip(VIEW.coreX - 190, VIEW.coreY + 150);
    this.shards = [];
    this.bolts = [];
    this.cells = [];
    this.novaCharges = NOVA.startCharges;
    this.novaMax = NOVA.maxCharges;
    this.cellsCollected = 0;
    this.plasmaFed = 0;
    this.nova = { active: false, t: 0, hit: new Set() };
    this.phase = 'falling'; // falling | intermission
    this.interT = 0;
    this.bannerText = '';
    this.bannerSub = '';
    this.bannerT = 0;
    this.damageFlash = 0;
    this.shake = 0;
    this.hitstopT = 0;
    this.slowmoT = 0;
    this.endT = 0;
    this.lostReason = 'heart';
    this.emberT = 0;
    this.autopilot = null;
    this.shotMode = null;
    this.bestScore = 0;
    try {
      this.bestScore = Number(window.localStorage.getItem('perihelion-best')) || 0;
    } catch {
      this.bestScore = 0;
    }
  }

  get cellProgress() {
    return (this.cellsCollected % NOVA.cellsPerCharge) / NOVA.cellsPerCharge;
  }

  multiplier() {
    let mult = 1;
    for (const tier of COMBO.tiers) if (this.combo >= tier) mult++;
    return Math.min(mult, COMBO.maxMultiplier);
  }

  banner(text, sub, duration) {
    this.bannerText = text;
    this.bannerSub = sub || '';
    this.bannerT = duration || 2.2;
  }

  startRun() {
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestMultiplier = 1;
    this.heart = HEART.integrity;
    this.ship = makeShip(VIEW.coreX - 190, VIEW.coreY + 150);
    this.shards = [];
    this.bolts = [];
    this.cells = [];
    this.novaCharges = NOVA.startCharges;
    this.cellsCollected = 0;
    this.plasmaFed = 0;
    this.nova.active = false;
    this.elapsed = 0;
    this.sceneTime = 0;
    this.endT = 0;
    this.damageFlash = 0;
    this.phase = 'falling';
    this.autopilot = null;
    this.state = 'playing';
    this.director.startWave(1);
    this.banner('WAVE 1', 'the fall begins', 2.2);
  }

  finishRun(won, reason) {
    this.state = won ? 'won' : 'lost';
    this.lostReason = reason || 'heart';
    this.endT = 0;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        window.localStorage.setItem('perihelion-best', String(this.bestScore));
      } catch {
        // A private window has nowhere to keep it; the run still counts.
      }
    }
    if (won) {
      this.particles.ring(VIEW.coreX, VIEW.coreY, '#ffd98a', 340, 5, 1.1);
      this.particles.ring(VIEW.coreX, VIEW.coreY, '#7df3ff', 240, 3, 0.9);
      this.particles.burst(VIEW.coreX, VIEW.coreY, '#ffd98a', 60, 320, 1.2, 2.6);
    }
  }

  // --- combat ------------------------------------------------------------

  killShard(shard, awardScore) {
    const color = shardColor(shard.kind);
    this.particles.burst(shard.x, shard.y, color, shard.kind === 'brute' ? 30 : 14, 260, 0.7, 2.2);
    this.particles.debris(shard.x, shard.y, color, shard.kind === 'brute' ? 12 : 6, shard.vx, shard.vy);
    if (shard.kind === 'brute') {
      this.particles.ring(shard.x, shard.y, color, 90, 3, 0.5);
      this.hitstopT = Math.max(this.hitstopT, 0.045);
      this.shake = Math.min(1, this.shake + 0.45);
    } else {
      this.shake = Math.min(1, this.shake + 0.12);
    }

    if (shard.kind === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const child = makeShard('splinter', shard.x, shard.y, this.rng, 1);
        const angle = (i / 3) * Math.PI * 2 + this.rng.angle() * 0.4;
        child.vx = shard.vx * 0.5 + Math.cos(angle) * 95;
        child.vy = shard.vy * 0.5 + Math.sin(angle) * 95;
        this.shards.push(child);
      }
    }

    if (shard.kind === 'brute') {
      this.cells.push(makeCell(shard.x - 12, shard.y, this.rng));
      this.cells.push(makeCell(shard.x + 12, shard.y + 6, this.rng));
    } else if (this.rng.chance(0.36)) {
      this.cells.push(makeCell(shard.x, shard.y, this.rng));
    }

    if (awardScore) {
      this.combo++;
      this.comboTimer = COMBO.window;
      const gained = shard.score * this.multiplier();
      this.score += gained;
      this.kills++;
      this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier());
      this.particles.text(shard.x, shard.y - 10, `+${gained}`, color, shard.kind === 'brute' ? 21 : 15);
    }
  }

  hurtHeart(shard) {
    this.heart -= shard.heartDamage;
    const angle = Math.atan2(shard.y - VIEW.coreY, shard.x - VIEW.coreX);
    const ix = VIEW.coreX + Math.cos(angle) * VIEW.coreRadius;
    const iy = VIEW.coreY + Math.sin(angle) * VIEW.coreRadius;
    this.particles.burst(ix, iy, '#ffb84d', 22, 300, 0.8, 2.4);
    this.particles.ring(ix, iy, '#ff7a2f', 90, 3, 0.5);
    this.damageFlash = 1;
    this.slowmoT = Math.max(this.slowmoT, 0.22);
    this.shake = Math.min(1, this.shake + 0.5);
    this.combo = 0;
    this.comboTimer = 0;
    if (this.heart <= 0) {
      this.heart = 0;
      this.particles.burst(VIEW.coreX, VIEW.coreY, '#ffd98a', 90, 420, 1.4, 3);
      this.particles.ring(VIEW.coreX, VIEW.coreY, '#ff7a2f', 420, 6, 1.2);
      this.finishRun(false, 'heart');
    }
  }

  hurtShip(shard) {
    this.ship.hull--;
    this.ship.invulnerable = 1.25;
    this.damageFlash = 1;
    this.shake = Math.min(1, this.shake + 0.55);
    this.particles.burst(this.ship.x, this.ship.y, '#7df3ff', 24, 320, 0.8, 2.3);
    this.combo = 0;
    this.comboTimer = 0;
    if (this.ship.hull <= 0) {
      this.ship.alive = false;
      this.particles.burst(this.ship.x, this.ship.y, '#eafcff', 70, 430, 1.3, 2.8);
      this.particles.debris(this.ship.x, this.ship.y, '#37e0ff', 14, 0, 0);
      this.particles.ring(this.ship.x, this.ship.y, '#37e0ff', 200, 4, 0.9);
      this.finishRun(false, 'hull');
    }
  }

  collectCell(cell) {
    this.cellsCollected++;
    this.plasmaFed++;
    this.score += 10;
    this.particles.burst(cell.x, cell.y, '#5cff9d', 7, 150, 0.45, 1.8);
    if (this.cellsCollected % NOVA.cellsPerCharge === 0 && this.novaCharges < this.novaMax) {
      this.novaCharges++;
      this.particles.text(this.ship.x, this.ship.y - 26, 'NOVA CHARGED', '#9df2ff', 16);
    }
    this.mendHeart();
  }

  mendHeart() {
    if (this.plasmaFed % HEART.cellRepairEvery === 0 && this.heart > 0) {
      this.heart = Math.min(HEART.integrity, this.heart + HEART.repairAmount);
    }
  }

  fireNova() {
    if (this.novaCharges <= 0 || this.nova.active) return;
    this.novaCharges--;
    this.nova.active = true;
    this.nova.t = 0;
    this.nova.hit = new Set();
    this.particles.ring(this.ship.x, this.ship.y, '#9df2ff', NOVA.radius, 5, NOVA.expandTime + 0.15);
    this.particles.ring(this.ship.x, this.ship.y, '#e8fbff', NOVA.radius * 0.72, 3, NOVA.expandTime);
    this.particles.burst(this.ship.x, this.ship.y, '#9df2ff', 16, 300, 0.4, 2);
    this.shake = Math.min(1, this.shake + 0.3);
  }

  // --- simulation ----------------------------------------------------------

  updatePlaying(dt) {
    this.elapsed += dt;
    this.sceneTime += dt;
    const control = this.autopilot || this.input;
    if (this.autopilot) this.autopilot.update(this, dt);

    for (const shard of this.director.update(dt)) this.shards.push(shard);

    updateShip(this.ship, control, dt);
    if ((control.mouseDown || control.down('KeyF')) && this.ship.fireTimer <= 0 && this.ship.alive) {
      this.bolts.push(makeBolt(this.ship));
      this.ship.fireTimer = SHIP.fireCooldown;
      this.ship.vx -= Math.cos(this.ship.angle) * 9;
      this.ship.vy -= Math.sin(this.ship.angle) * 9;
    }
    if (control.justPressed('Space', 'KeyE') || control.rightClicked) this.fireNova();

    // Nova expansion: a widening band that breaks what it crosses.
    if (this.nova.active) {
      this.nova.t += dt;
      const radius = NOVA.radius * (1 - Math.pow(1 - Math.min(1, this.nova.t / NOVA.expandTime), 2));
      for (const shard of this.shards) {
        const d = Math.hypot(shard.x - this.ship.x, shard.y - this.ship.y);
        if (d < radius && !this.nova.hit.has(shard.id)) {
          this.nova.hit.add(shard.id);
          shard.hp -= 2;
          shard.flash = 1;
        }
      }
      if (this.nova.t >= NOVA.expandTime) this.nova.active = false;
    }

    for (const bolt of this.bolts) updateBolt(bolt, dt);
    this.bolts = this.bolts.filter((b) => b.age < b.life && b.x > -30 && b.x < VIEW.width + 30 && b.y > -30 && b.y < VIEW.height + 30);
    for (const shard of this.shards) updateShard(shard, dt);
    for (const cell of this.cells) updateCell(cell, dt);
    this.cells = this.cells.filter((c) => c.age < 20);

    // Bolt against shard.
    const deadBolts = new Set();
    const deadShards = new Set();
    for (const bolt of this.bolts) {
      for (const shard of this.shards) {
        if (deadShards.has(shard.id)) continue;
        const d = Math.hypot(bolt.x - shard.x, bolt.y - shard.y);
        if (d < shard.radius + bolt.radius + 1) {
          deadBolts.add(bolt.id);
          shard.hp--;
          shard.flash = 1;
          this.particles.burst(bolt.x, bolt.y, '#7df3ff', 3, 170, 0.3, 1.6);
          if (shard.hp <= 0) deadShards.add(shard.id);
          break;
        }
      }
    }
    this.bolts = this.bolts.filter((b) => !deadBolts.has(b.id));

    // Shard against the Heart, the skiff, and nova's delayed kills.
    const survivors = [];
    for (const shard of this.shards) {
      if (deadShards.has(shard.id) || shard.hp <= 0) {
        this.killShard(shard, true);
        continue;
      }
      const coreDist = Math.hypot(shard.x - VIEW.coreX, shard.y - VIEW.coreY);
      if (coreDist < VIEW.coreRadius + shard.radius * 0.45) {
        this.hurtHeart(shard);
        if (this.state !== 'playing') return;
        continue;
      }
      const shipDist = Math.hypot(shard.x - this.ship.x, shard.y - this.ship.y);
      if (this.ship.alive && this.ship.invulnerable <= 0 && shipDist < shard.radius + 13) {
        this.killShard(shard, false);
        this.hurtShip(shard);
        if (this.state !== 'playing') return;
        continue;
      }
      survivors.push(shard);
    }
    this.shards = survivors;

    // Plasma: gathered by the skiff, or absorbed by the Heart it fell toward.
    const keptCells = [];
    for (const cell of this.cells) {
      const shipDist = Math.hypot(cell.x - this.ship.x, cell.y - this.ship.y);
      const coreDist = Math.hypot(cell.x - VIEW.coreX, cell.y - VIEW.coreY);
      if (this.ship.alive && shipDist < cell.radius + 20) {
        this.collectCell(cell);
      } else if (coreDist < VIEW.coreRadius + 5) {
        this.plasmaFed++;
        this.mendHeart();
        this.particles.burst(cell.x, cell.y, '#5cff9d', 4, 90, 0.4, 1.5);
      } else {
        keptCells.push(cell);
      }
    }
    this.cells = keptCells;

    // Combo decay.
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Wave flow.
    if (this.phase === 'falling' && this.director.spawningDone && this.shards.length === 0) {
      if (this.director.wave >= this.director.totalWaves) {
        this.finishRun(true);
        return;
      }
      const bonus = WAVE_CLEAR_BONUS * this.director.wave;
      this.score += bonus;
      this.banner(`WAVE ${this.director.wave} CLEARED`, `+${bonus} bonus`, 2.4);
      this.particles.ring(VIEW.coreX, VIEW.coreY, '#5cff9d', 200, 3, 0.8);
      this.phase = 'intermission';
      this.interT = 2.4;
    } else if (this.phase === 'intermission') {
      this.interT -= dt;
      if (this.interT <= 0) {
        this.director.startWave(this.director.wave + 1);
        this.banner(`WAVE ${this.director.wave}`, this.director.wave === this.director.totalWaves ? 'the last fall' : '', 2.2);
        this.phase = 'falling';
      }
    }
  }

  updateAmbient(dt) {
    // Behind the title and end screens the fall goes on, harmlessly.
    for (const shard of this.shards) updateShard(shard, dt);
    const kept = [];
    for (const shard of this.shards) {
      const d = Math.hypot(shard.x - VIEW.coreX, shard.y - VIEW.coreY);
      if (d < VIEW.coreRadius + 8) {
        if (this.state === 'title') {
          const point = this.director.spawnPoint();
          kept.push(makeShard(this.rng.pick(['shard', 'shard', 'weaver', 'splitter']), point.x, point.y, this.rng, 0.6));
        }
      } else {
        kept.push(shard);
      }
    }
    this.shards = kept;
    for (const cell of this.cells) updateCell(cell, dt);
  }

  update(rawDt) {
    this.time += rawDt;
    this.bannerT = Math.max(0, this.bannerT - rawDt);
    this.damageFlash = Math.max(0, this.damageFlash - rawDt * 2.4);
    this.shake = Math.max(0, this.shake - rawDt * 2.6);

    // The Heart sheds embers in every state; it is alive behind every screen.
    this.emberT -= rawDt;
    if (this.emberT <= 0) {
      this.emberT = 0.1;
      const angle = this.rng.angle();
      this.particles.ember(VIEW.coreX + Math.cos(angle) * VIEW.coreRadius * 0.8, VIEW.coreY + Math.sin(angle) * VIEW.coreRadius * 0.8);
    }

    if (this.state === 'playing') {
      if (this.input.justPressed('KeyP', 'Escape')) {
        this.state = 'paused';
      } else if (this.hitstopT > 0) {
        this.hitstopT -= rawDt;
      } else {
        let dt = rawDt;
        if (this.slowmoT > 0) {
          this.slowmoT -= rawDt;
          dt *= 0.35;
        }
        this.updatePlaying(dt);
        this.particles.update(dt);
      }
    } else if (this.state === 'paused') {
      if (this.input.justPressed('KeyP', 'Escape')) this.state = 'playing';
    } else if (this.state === 'title') {
      this.updateAmbient(rawDt);
      this.particles.update(rawDt);
      if (this.input.mouseClicked || this.input.justPressed('Enter', 'Space')) this.startRun();
    } else if (this.state === 'won' || this.state === 'lost') {
      this.endT += rawDt;
      this.updateAmbient(rawDt);
      this.particles.update(rawDt);
      if (this.endT > 0.6 && (this.input.justPressed('KeyR') || this.input.mouseClicked)) this.startRun();
    }

    this.input.endFrame();
    if (this.autopilot) this.autopilot.endFrame();
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0) {
      const s = this.shake * this.shake * 13;
      ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
    }
    drawGame(ctx, this);
    ctx.restore();
  }
}

// Boot: size the canvas for the display, read any screenshot-scene request,
// and start the loop. A debug handle is exposed for automated play-testing.
function boot() {
  const canvas = document.getElementById('game');
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  const game = new Game(canvas);
  game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed')) || 1;
    game.rng = makeRng(seed * 7919 + 13);
    game.background = makeBackground(game.rng);
    game.particles = new Particles(game.rng);
    game.director = new WaveDirector(game.rng);
    setupShotScene(game, shot);
  }

  window.__perihelion = game;
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
