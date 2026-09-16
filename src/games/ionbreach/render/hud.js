import { VIEW_W, SAFE_X, SAFE_Y } from '../config.js';
import { drawFrame } from './sprites.js';

/**
 * The HUD is drawn into the canvas rather than laid over it in CSS, so it scales with
 * the pixel grid and never lands on a fractional position. Menus stay in CSS.
 */
const FONT = '8px "Press Start 2P", monospace';

export function drawText(ctx, text, x, y, colour = '#edeef2', align = 'left') {
  ctx.font = FONT;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

export function drawHud(ctx, session, levelCount = 1) {
  drawText(ctx, String(session.score).padStart(6, '0'), SAFE_X, SAFE_Y);

  // Lives as ship pips. The pitch clears the 24px sprite so they read as separate ships
  // rather than one train, and the row is capped so a lucky run cannot overrun the HUD.
  const shown = Math.min(session.player.lives, 4);
  for (let i = 0; i < shown; i++) {
    ctx.globalAlpha = 0.9;
    drawFrame(ctx, 'ship', 2, SAFE_X - 2 + i * 26, SAFE_Y + 10);
    ctx.globalAlpha = 1;
  }
  if (session.player.lives > 4) drawText(ctx, '+' + (session.player.lives - 4), SAFE_X + 4 * 26, SAFE_Y + 14);

  // With one level the sector number is noise; with more it is the run’s shape.
  const label = session.bossActive ? 'BOSS' : 'WAVE ' + session.waveNumber;
  const prefix = levelCount > 1 ? 'S' + (session.level + 1) + '·' : '';
  drawText(ctx, prefix + label, VIEW_W - SAFE_X, SAFE_Y, '#f19152', 'right');

  if (session.combo > 1) {
    drawText(ctx, 'x' + session.combo, VIEW_W - SAFE_X, SAFE_Y + 12, '#fff6ae', 'right');
  }

  // Active pickup timers, so a expiring power-up is never a surprise.
  let ty = SAFE_Y + 24;
  const p = session.player;
  if (p.spread > 0) { drawText(ctx, 'SPREAD ' + p.spread.toFixed(1), VIEW_W - SAFE_X, ty, '#f19152', 'right'); ty += 10; }
  if (p.rapid > 0) { drawText(ctx, 'RAPID ' + p.rapid.toFixed(1), VIEW_W - SAFE_X, ty, '#fff6ae', 'right'); ty += 10; }
  if (p.shield) drawText(ctx, 'SHIELD', VIEW_W - SAFE_X, ty, '#85b6df', 'right');
}

export function drawBanner(ctx, text, y, colour = '#edeef2') {
  drawText(ctx, text, VIEW_W / 2, y, colour, 'center');
}
