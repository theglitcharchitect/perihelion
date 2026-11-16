// The particle system: every burst, spark, ember, debris shard, shockwave
// ring and floating score number in the game is born and dies here. Purely
// visual: particles never touch the simulation, they only report what it did.

import { PALETTE } from './config.js';

const MAX_PARTICLES = 900;

export class Particles {
  constructor(rng) {
    this.rng = rng;
    this.list = [];
    this.rings = [];
    this.texts = [];
  }

  spawn(particle) {
    if (this.list.length >= MAX_PARTICLES) this.list.shift();
    this.list.push(particle);
  }

  // A radial burst of sparks in one colour.
  burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.angle();
      const v = speed * (0.25 + this.rng.next() * 0.95);
      this.spawn({
        kind: 'spark',
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        age: 0,
        life: life * (0.5 + this.rng.next() * 0.8),
        size: size * (0.6 + this.rng.next() * 0.9),
        color,
        drag: 2.4,
      });
    }
  }

  // Slow drifting embers, the Heart's breathing made visible.
  ember(x, y) {
    const angle = this.rng.angle();
    const v = 14 + this.rng.next() * 30;
    this.spawn({
      kind: 'ember',
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 12,
      age: 0,
      life: 1.6 + this.rng.next() * 1.8,
      size: 1.4 + this.rng.next() * 2.2,
      color: PALETTE.heartMid,
      drag: 0.2,
    });
  }

  // Rotating crystal fragments thrown off a destroyed shard.
  debris(x, y, color, count, baseVx, baseVy) {
    for (let i = 0; i < count; i++) {
      const angle = this.rng.angle();
      const v = 40 + this.rng.next() * 190;
      this.spawn({
        kind: 'debris',
        x, y,
        vx: baseVx * 0.4 + Math.cos(angle) * v,
        vy: baseVy * 0.4 + Math.sin(angle) * v,
        age: 0,
        life: 0.7 + this.rng.next() * 0.9,
        size: 3 + this.rng.next() * 6,
        color,
        drag: 1.1,
        rotation: this.rng.angle(),
        spin: (this.rng.next() - 0.5) * 11,
      });
    }
  }

  // An expanding ring: nova blasts, Heart impacts, wave-clear pulses.
  ring(x, y, color, maxRadius, width, life) {
    this.rings.push({ x, y, color, maxRadius, width, age: 0, life });
  }

  // A floating score or event label that rises and fades.
  text(x, y, value, color, size) {
    this.texts.push({ x, y, value, color, size: size || 17, age: 0, life: 0.95 });
  }

  update(dt) {
    for (const p of this.list) {
      p.age += dt;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'debris') p.rotation += p.spin * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
    for (const t of this.texts) {
      t.age += dt;
      t.y -= 34 * dt;
    }
    this.texts = this.texts.filter((t) => t.age < t.life);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const fade = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      if (p.kind === 'debris') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(-p.size, p.size * 0.6);
        ctx.lineTo(0, -p.size);
        ctx.lineTo(p.size, p.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === 'ember' ? fade : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    for (const r of this.rings) {
      const t = r.age / r.life;
      const radius = r.maxRadius * (1 - Math.pow(1 - t, 3));
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const t of this.texts) {
      const fade = 1 - t.age / t.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size}px 'Segoe UI', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.value, t.x, t.y);
      ctx.restore();
    }
  }
}
