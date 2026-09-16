import { POWERUP, VIEW_H } from '../config.js';
import { POWERUP_TYPES, rollPowerupType } from '../data/powerups.js';
import { drawFrame } from '../render/sprites.js';

// Drops are a plain array - a handful at most, and they leave the field quickly.
export const powerups = [];

export function maybeDrop(x, y) {
  if (Math.random() > POWERUP.dropChance) return;
  dropPowerup(x, y, rollPowerupType());
}

export function dropPowerup(x, y, type) {
  powerups.push({
    x, y,
    w: 14, h: 14,
    type,
    life: POWERUP.lifetime,
    anim: 0,
    bob: Math.random() * Math.PI * 2,
  });
}

export function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.life -= dt;
    p.anim += dt;
    p.bob += dt * 3;
    p.x -= POWERUP.speed * dt;
    p.y += Math.sin(p.bob) * 14 * dt;
    if (p.life <= 0 || p.x < -20 || p.y < -20 || p.y > VIEW_H + 20) powerups.splice(i, 1);
  }
}

export function clearPowerups() {
  powerups.length = 0;
}

export function drawPowerups(ctx) {
  for (const p of powerups) {
    // Blink out as it expires, so an uncollected drop never vanishes without warning.
    if (p.life < POWERUP.blinkAt && Math.floor(p.life * 10) % 2 === 0) continue;
    const frame = p.type.row * 2 + (Math.floor(p.anim * 8) % 2);
    drawFrame(ctx, 'powerup', frame, p.x - 8, p.y - 8);
  }
}

export { POWERUP_TYPES };
