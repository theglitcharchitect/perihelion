// Everything the player sees is drawn here: the starfield and nebulae, the
// Heart, the skiff, the falling shards, bolts and cells, the HUD, and the
// title, pause and end screens. The simulation never draws; this never
// simulates.

import { COMBO, PALETTE, VIEW } from './config.js';

// A stable pseudo-random shape per shard, derived from its seed so the same
// crystal keeps its silhouette every frame.
function shardPoints(shard) {
  const points = [];
  const count = shard.kind === 'dart' ? 5 : 7;
  let s = Math.floor(shard.seed * 1e9) + 7;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const factor = 0.72 + (s / 0x7fffffff) * 0.45;
    const angle = (i / count) * Math.PI * 2;
    points.push({ x: Math.cos(angle) * shard.radius * factor, y: Math.sin(angle) * shard.radius * factor });
  }
  return points;
}

export function makeBackground(rng) {
  const stars = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = [110, 70, 36][layer];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rng.range(0, VIEW.width),
        y: rng.range(0, VIEW.height),
        size: [0.8, 1.4, 2.2][layer] * rng.range(0.7, 1.3),
        layer,
        twinkle: rng.angle(),
        twinkleRate: rng.range(0.6, 2.2),
      });
    }
  }
  const blobs = [
    { x: 240, y: 150, r: 340, color: PALETTE.nebulaViolet, drift: 0.011 },
    { x: 1080, y: 620, r: 380, color: PALETTE.nebulaTeal, drift: -0.008 },
    { x: 1020, y: 120, r: 260, color: PALETTE.nebulaRose, drift: 0.006 },
    { x: 180, y: 660, r: 280, color: PALETTE.nebulaTeal, drift: -0.005 },
  ];
  return { stars, blobs };
}

function drawBackground(ctx, bg, time, ship) {
  ctx.fillStyle = PALETTE.voidDeep;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const parX = ship ? (ship.x - VIEW.width / 2) : 0;
  const parY = ship ? (ship.y - VIEW.height / 2) : 0;

  for (const blob of bg.blobs) {
    const bx = blob.x + Math.cos(time * blob.drift * 6) * 26 - parX * 0.012;
    const by = blob.y + Math.sin(time * blob.drift * 6) * 20 - parY * 0.012;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r);
    grad.addColorStop(0, blob.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(bx - blob.r, by - blob.r, blob.r * 2, blob.r * 2);
  }

  for (const star of bg.stars) {
    const depth = (star.layer + 1) / 3;
    const x = star.x - parX * 0.03 * depth;
    const y = star.y - parY * 0.03 * depth;
    const tw = 0.55 + 0.45 * Math.sin(time * star.twinkleRate + star.twinkle);
    ctx.globalAlpha = 0.35 + 0.6 * tw * depth;
    ctx.fillStyle = star.layer === 2 ? PALETTE.starBright : PALETTE.starDim;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, game) {
  const { coreX: x, coreY: y, coreRadius: r } = VIEW;
  const integrity = game.heart / 100;
  const pulse = 1 + Math.sin(game.time * 2.1) * 0.045;
  const glowR = r * (3.1 + Math.sin(game.time * 1.4) * 0.25) * (0.55 + integrity * 0.45);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, glowR);
  glow.addColorStop(0, PALETTE.heartGlow);
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.globalAlpha = 0.5 + integrity * 0.5;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * pulse);
  body.addColorStop(0, PALETTE.heartCore);
  body.addColorStop(0.55, PALETTE.heartMid);
  body.addColorStop(1, PALETTE.heartEdge);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Slow bright currents turning on the surface.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,200,0.5)';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    const a = game.time * (0.24 + i * 0.07) + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(x, y, r * (0.45 + i * 0.2), a, a + 1.5);
    ctx.stroke();
  }
  // Damage shows as dark ash patches eating into the light.
  if (integrity < 0.99) {
    ctx.fillStyle = `rgba(20,8,10,${(1 - integrity) * 0.75})`;
    const patches = [[-0.4, -0.2, 0.5], [0.45, 0.3, 0.42], [0.05, -0.55, 0.34], [-0.2, 0.5, 0.3]];
    for (const [px, py, pr] of patches) {
      ctx.beginPath();
      ctx.arc(x + px * r, y + py * r, pr * r * (1.05 - integrity * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,190,90,0.65)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r * pulse + 5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawShip(ctx, ship, time) {
  if (!ship.alive) return;
  if (ship.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) return; // damage blink
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (ship.thrusting) {
    const flame = 13 + Math.sin(time * 42) * 4 + Math.random() * 3;
    const grad = ctx.createLinearGradient(-10, 0, -10 - flame, 0);
    grad.addColorStop(0, 'rgba(255,220,150,0.95)');
    grad.addColorStop(0.4, 'rgba(255,150,60,0.7)');
    grad.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-9, -4.4);
    ctx.lineTo(-10 - flame, 0);
    ctx.lineTo(-9, 4.4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowColor = PALETTE.shipAccent;
  ctx.shadowBlur = 13;
  const body = ctx.createLinearGradient(-12, 0, 16, 0);
  body.addColorStop(0, '#7d8aa8');
  body.addColorStop(0.55, PALETTE.shipBody);
  body.addColorStop(1, '#ffffff');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(-4, -5.4);
  ctx.lineTo(-11, -11.5);
  ctx.lineTo(-8, -2.6);
  ctx.lineTo(-8, 2.6);
  ctx.lineTo(-11, 11.5);
  ctx.lineTo(-4, 5.4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = PALETTE.shipAccent;
  ctx.beginPath();
  ctx.arc(4.5, 0, 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShard(ctx, shard) {
  const points = shardPoints(shard);
  ctx.save();
  ctx.translate(shard.x, shard.y);
  ctx.rotate(shard.rotation);
  const isBrute = shard.kind === 'brute';
  ctx.shadowColor = isBrute ? PALETTE.brute : PALETTE.shard;
  ctx.shadowBlur = 12;
  ctx.fillStyle = shard.flash > 0.3 ? '#ffffff' : isBrute ? PALETTE.bruteDark : PALETTE.shardDark;
  ctx.strokeStyle = shard.flash > 0 ? '#ffffff' : isBrute ? PALETTE.brute : PALETTE.shard;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = isBrute ? 'rgba(220,150,255,0.85)' : 'rgba(255,170,205,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, shard.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Brutes wear their damage as an arc of missing light.
  if (isBrute && shard.hp < shard.maxHp) {
    ctx.save();
    ctx.strokeStyle = 'rgba(230,180,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y, shard.radius + 7, -Math.PI / 2, -Math.PI / 2 + (shard.hp / shard.maxHp) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBolt(ctx, bolt) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = PALETTE.bolt;
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.shadowColor = PALETTE.bolt;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.moveTo(bolt.x - bolt.vx * 0.016, bolt.y - bolt.vy * 0.016);
  ctx.lineTo(bolt.x, bolt.y);
  ctx.stroke();
  ctx.fillStyle = PALETTE.boltCore;
  ctx.beginPath();
  ctx.arc(bolt.x, bolt.y, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCell(ctx, cell, time) {
  const pulse = 1 + Math.sin(time * 5 + cell.pulse) * 0.18;
  ctx.save();
  ctx.translate(cell.x, cell.y);
  ctx.rotate(Math.PI / 4 + Math.sin(time * 2 + cell.pulse) * 0.3);
  ctx.shadowColor = PALETTE.cell;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.cell;
  const s = cell.radius * pulse;
  ctx.fillRect(-s / 1.6, -s / 1.6, s * 1.25, s * 1.25);
  ctx.restore();
}

function bar(ctx, x, y, w, h, fraction, color, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
}

function drawHud(ctx, game) {
  const ship = game.ship;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Score and combo, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('SCORE', 26, 34);
  ctx.fillStyle = PALETTE.textMain;
  ctx.font = "800 30px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(String(game.score).padStart(6, '0'), 24, 66);
  if (game.combo >= 2) {
    const mult = game.multiplier();
    ctx.fillStyle = mult > 1 ? PALETTE.heartMid : PALETTE.textDim;
    ctx.font = "700 16px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`COMBO x${mult}  (${game.combo} chain)`, 26, 92);
    bar(ctx, 26, 99, 110, 4, game.comboTimer / COMBO.window, PALETTE.heartMid, 'rgba(255,255,255,0.14)');
  }

  // Wave, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('WAVE', VIEW.width / 2, 34);
  ctx.fillStyle = PALETTE.textMain;
  ctx.font = "800 26px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`${Math.max(1, game.director.wave)} / ${game.director.totalWaves}`, VIEW.width / 2, 64);

  // Nova charges, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('NOVA  [SPACE]', VIEW.width - 26, 34);
  for (let i = 0; i < game.novaMax; i++) {
    const cx = VIEW.width - 40 - i * 30;
    ctx.beginPath();
    ctx.arc(cx, 56, 9, 0, Math.PI * 2);
    if (i < game.novaCharges) {
      ctx.fillStyle = PALETTE.nova;
      ctx.shadowColor = PALETTE.nova;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(160,220,255,0.4)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }
  // Plasma progress toward the next charge.
  bar(ctx, VIEW.width - 136, 76, 110, 4, game.cellProgress, PALETTE.cell, 'rgba(255,255,255,0.14)');

  // Hull, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('HULL', 26, VIEW.height - 44);
  for (let i = 0; i < 3; i++) {
    const x = 26 + i * 26;
    ctx.save();
    ctx.translate(x + 8, VIEW.height - 26);
    ctx.rotate(Math.PI / 4);
    if (i < ship.hull) {
      ctx.fillStyle = PALETTE.shipAccent;
      ctx.fillRect(-6, -6, 12, 12);
    } else {
      ctx.strokeStyle = 'rgba(150,170,220,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-6, -6, 12, 12);
    }
    ctx.restore();
  }

  // The Heart's integrity, bottom centre: the number that ends the game.
  const heartFrac = game.heart / 100;
  ctx.textAlign = 'center';
  ctx.fillStyle = heartFrac < 0.3 && Math.floor(game.time * 3) % 2 === 0 ? PALETTE.danger : PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('HEART INTEGRITY', VIEW.width / 2, VIEW.height - 44);
  bar(ctx, VIEW.width / 2 - 180, VIEW.height - 38, 360, 10, heartFrac,
    heartFrac < 0.3 ? PALETTE.danger : PALETTE.heartMid, 'rgba(255,255,255,0.13)');
  ctx.restore();

  // Aim reticle, on the player's mouse or the autopilot's aim in shot scenes.
  if (game.state === 'playing') {
    ctx.save();
    ctx.strokeStyle = 'rgba(160,240,255,0.75)';
    ctx.lineWidth = 1.4;
    const aim = game.autopilot || game.input;
    const mx = aim.mouseX;
    const my = aim.mouseY;
    ctx.beginPath();
    ctx.arc(mx, my, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - 14, my); ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 14, my);
    ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 14);
    ctx.stroke();
    ctx.restore();
  }
}

function centredText(ctx, text, y, font, color, glow) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = font;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 26;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW.width / 2, y);
  ctx.restore();
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(4,4,14,0.42)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  centredText(ctx, 'PERIHELION', 252, "800 92px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain, PALETTE.shipAccent);
  centredText(ctx, 'a gravity-well defense', 292, "italic 600 21px 'Segoe UI', system-ui, sans-serif", PALETTE.heartMid);
  centredText(ctx, 'The Heart is falling dark. Shards ride its gravity down to crack it open.', 356, "400 18px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain);
  centredText(ctx, 'Hold the orbit for eight waves. Let nothing reach the light.', 382, "400 18px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = "500 16.5px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'WASD or arrows — thrust        Mouse — aim        Hold click or F — fire',
    'Space, E or right-click — nova shockwave        P — pause',
    'Shatter shards for plasma: it feeds your nova and mends the Heart.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 448 + i * 27));
  ctx.restore();

  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centredText(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 586, "800 24px 'Segoe UI', system-ui, sans-serif", PALETTE.shipAccent, PALETTE.shipAccent);
  ctx.restore();
}

function statsLines(game) {
  const minutes = Math.floor(game.elapsed / 60);
  const seconds = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
  return [
    ['FINAL SCORE', String(game.score)],
    ['SHARDS SHATTERED', String(game.kills)],
    ['BEST COMBO', `x${game.bestMultiplier}`],
    ['TIME IN THE ORBIT', `${minutes}:${seconds}`],
    ['WAVE REACHED', `${Math.max(1, game.director.wave)} of ${game.director.totalWaves}`],
  ];
}

function drawStats(ctx, game, top) {
  ctx.save();
  ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
  statsLines(game).forEach(([label, value], i) => {
    const y = top + i * 33;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(label, VIEW.width / 2 - 18, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.textMain;
    ctx.fillText(value, VIEW.width / 2 + 18, y);
  });
  ctx.restore();
}

function drawEnd(ctx, game) {
  ctx.fillStyle = 'rgba(4,4,14,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // A panel behind the stats, so the Heart's glow never fights the numbers.
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,20,0.66)';
  ctx.strokeStyle = 'rgba(110,130,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(VIEW.width / 2 - 252, 308, 504, 196, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (game.state === 'won') {
    centredText(ctx, 'DAWN', 218, "800 96px 'Segoe UI', system-ui, sans-serif", PALETTE.heartCore, PALETTE.heartGlow);
    centredText(ctx, 'Eight waves broken. The Heart still burns, and the dark keeps its distance.', 268, "italic 500 19px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain);
  } else {
    const title = game.lostReason === 'heart' ? 'THE HEART HAS GONE DARK' : 'THE SKIFF IS LOST';
    centredText(ctx, title, 218, "800 54px 'Segoe UI', system-ui, sans-serif", PALETTE.danger, PALETTE.danger);
    const why = game.lostReason === 'heart'
      ? 'Too many shards reached the light. What falls next, falls on ash.'
      : 'Your hull gave out among the falling shards. The Heart dims behind you.';
    centredText(ctx, why, 268, "italic 500 19px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain);
  }
  drawStats(ctx, game, 348);
  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centredText(ctx, 'PRESS R OR CLICK TO FLY AGAIN', 580, "800 22px 'Segoe UI', system-ui, sans-serif", PALETTE.shipAccent, PALETTE.shipAccent);
  ctx.restore();
  if (game.bestScore > 0) {
    centredText(ctx, `Best score so far: ${game.bestScore}`, 622, "500 15px 'Segoe UI', system-ui, sans-serif", PALETTE.textDim);
  }
}

function drawBanner(ctx, game) {
  if (!game.bannerText || game.bannerT <= 0) return;
  const t = game.bannerT;
  const alpha = Math.min(1, t / 0.5, (2.2 - t) / 0.5 + 0.4);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  centredText(ctx, game.bannerText, 168, "800 44px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain, PALETTE.shipAccent);
  if (game.bannerSub) {
    centredText(ctx, game.bannerSub, 204, "600 18px 'Segoe UI', system-ui, sans-serif", PALETTE.heartMid);
  }
  ctx.restore();
}

export function drawGame(ctx, game) {
  drawBackground(ctx, game.background, game.time, game.ship);
  drawHeart(ctx, game);
  for (const cell of game.cells) drawCell(ctx, cell, game.time);
  for (const shard of game.shards) drawShard(ctx, shard);
  for (const bolt of game.bolts) drawBolt(ctx, bolt);
  if (game.state !== 'title') drawShip(ctx, game.ship, game.time);
  game.particles.draw(ctx);

  if (game.state !== 'title') drawHud(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'won' || game.state === 'lost') drawEnd(ctx, game);
  if (game.state === 'paused') {
    ctx.fillStyle = 'rgba(4,4,14,0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    centredText(ctx, 'PAUSED', 380, "800 52px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain, PALETTE.shipAccent);
    centredText(ctx, 'Press P to return to the orbit', 428, "500 18px 'Segoe UI', system-ui, sans-serif", PALETTE.textDim);
  }
  drawBanner(ctx, game);

  // Damage vignette: a red edge-flash that decays in main.js.
  if (game.damageFlash > 0) {
    const grad = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.36, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.78);
    grad.addColorStop(0, 'rgba(255,40,70,0)');
    grad.addColorStop(1, `rgba(255,40,70,${0.5 * game.damageFlash})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  // A soft permanent vignette for depth.
  const vig = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.45, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
