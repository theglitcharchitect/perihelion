// PERIHELION's heads-up display: score and combo, wave, nova charges and
// plasma progress, hull, the Heart's integrity bar, and the aim reticle.
// Pure presentation; the simulation never reads anything drawn here.

import { COMBO, PALETTE, VIEW } from './config.js';

function bar(ctx, x, y, w, h, fraction, color, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
}

export function drawHud(ctx, game) {
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

  // Hull, bottom left: one diamond per point of hull the skiff still has.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = "600 12px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText('HULL', 26, VIEW.height - 44);
  for (let i = 0; i < ship.maxHull; i++) {
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
