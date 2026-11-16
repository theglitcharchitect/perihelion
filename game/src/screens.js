// PERIHELION's full-screen moments: the title, the pause, the wave banner,
// the boon draft between waves, and the two end screens (dawn, and the dark
// after). Each is drawn over the live world, which keeps falling behind it.

import { PALETTE, VIEW } from './config.js';
import { BOONS, cardRect } from './boons.js';

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

export function drawTitle(ctx, game) {
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
    'Between waves, the Heart offers a gift. Choose with 1, 2, 3 or a click.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 448 + i * 27));
  ctx.restore();

  const pulse = 0.65 + 0.35 * Math.sin(game.time * 3.2);
  ctx.save();
  ctx.globalAlpha = pulse;
  centredText(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 612, "800 24px 'Segoe UI', system-ui, sans-serif", PALETTE.shipAccent, PALETTE.shipAccent);
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

export function drawEnd(ctx, game) {
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

export function drawPause(ctx, game) {
  ctx.fillStyle = 'rgba(4,4,14,0.5)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  centredText(ctx, 'PAUSED', 380, "800 52px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain, PALETTE.shipAccent);
  centredText(ctx, 'Press P to return to the orbit', 428, "500 18px 'Segoe UI', system-ui, sans-serif", PALETTE.textDim);
}

// The boon draft: three cards over the held world. Card geometry comes from
// boons.js, the same numbers the click handler tests against.
export function drawDraft(ctx, game) {
  ctx.fillStyle = 'rgba(4,4,14,0.58)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  centredText(ctx, 'THE HEART OFFERS', 268, "800 40px 'Segoe UI', system-ui, sans-serif", PALETTE.heartCore, PALETTE.heartGlow);
  centredText(ctx, `Wave ${game.director.wave} cleared. Take one gift into the next fall.`, 306, "italic 500 18px 'Segoe UI', system-ui, sans-serif", PALETTE.textMain);

  const aim = game.autopilot || game.input;
  game.draft.forEach((id, i) => {
    const boon = BOONS[id];
    const r = cardRect(i);
    const hover = aim.mouseX >= r.x && aim.mouseX <= r.x + r.w && aim.mouseY >= r.y && aim.mouseY <= r.y + r.h;
    ctx.save();
    ctx.fillStyle = hover ? 'rgba(24,26,54,0.95)' : 'rgba(10,11,28,0.92)';
    ctx.strokeStyle = hover ? PALETTE.heartMid : 'rgba(110,130,220,0.5)';
    ctx.lineWidth = hover ? 2 : 1.2;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.heartMid;
    ctx.font = "800 21px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(boon.name, r.x + r.w / 2, r.y + 46);
    ctx.fillStyle = PALETTE.textMain;
    ctx.font = "500 15px 'Segoe UI', system-ui, sans-serif";
    wrapText(ctx, boon.desc, r.x + r.w / 2, r.y + 76, r.w - 36, 20);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`PRESS ${i + 1}`, r.x + r.w / 2, r.y + r.h - 14);
    ctx.restore();
  });
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
}

export function drawBanner(ctx, game) {
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
