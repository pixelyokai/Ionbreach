import { PLAYER, PLAYER_ZONE_W, VIEW_H, POWERUP } from '../config.js';
import { difficulty } from '../data/difficulty.js';
import { clamp, approach } from '../../../core/math.js';
import { fireBullet } from './bullet.js';
import { thrustPuff } from './particle.js';
import { drawFrame } from '../render/sprites.js';

const SHIP_W = 24, SHIP_H = 16;
const MARGIN = 4;

export function createPlayer() {
  return {
    x: 46, y: VIEW_H / 2,
    vx: 0, vy: 0,
    w: PLAYER.hitbox.w, h: PLAYER.hitbox.h,
    lives: difficulty.lives,
    invuln: 0,
    fireCooldown: 0,
    thrustAnim: 0,
    muzzle: 0,
    alive: true,
    deathTimer: 0,
    // Timed pickups; shield is a one-hit absorb rather than a timer.
    spread: 0,
    rapid: 0,
    shield: false,
  };
}

export function resetPlayerPosition(p) {
  p.x = 46;
  p.y = VIEW_H / 2;
  p.vx = 0;
  p.vy = 0;
}

export function grantPowerup(p, type) {
  if (type === 'spread') p.spread = POWERUP.duration;
  else if (type === 'rapid') p.rapid = POWERUP.duration;
  else if (type === 'shield') p.shield = true;
  else if (type === 'life') p.lives = Math.min(9, p.lives + 1);
}

export function updatePlayer(p, dt, input, onShoot) {
  p.invuln = Math.max(0, p.invuln - dt);
  p.spread = Math.max(0, p.spread - dt);
  p.rapid = Math.max(0, p.rapid - dt);
  p.muzzle = Math.max(0, p.muzzle - dt);
  p.thrustAnim += dt;

  const { axis, pointer, usingTouch } = input.state;

  if (usingTouch && pointer.set) {
    // Touch: the ship eases toward the latched target rather than snapping, which keeps
    // the movement readable and stops jitter from becoming input.
    const tx = clamp(pointer.x, MARGIN + SHIP_W / 2, PLAYER_ZONE_W);
    const ty = clamp(pointer.y, MARGIN + SHIP_H / 2, VIEW_H - MARGIN - SHIP_H / 2);
    const k = 1 - Math.pow(0.0008, dt);
    p.vx = (tx - p.x) * 12;
    p.vy = (ty - p.y) * 12;
    p.x += (tx - p.x) * k;
    p.y += (ty - p.y) * k;
  } else {
    const ax = axis.x * PLAYER.accel;
    const ay = axis.y * PLAYER.accel;
    p.vx = axis.x ? clamp(p.vx + ax * dt, -PLAYER.speed, PLAYER.speed) : approach(p.vx, 0, PLAYER.friction * dt);
    p.vy = axis.y ? clamp(p.vy + ay * dt, -PLAYER.speed, PLAYER.speed) : approach(p.vy, 0, PLAYER.friction * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  // Clamped to the viewport, and to the left third of it horizontally.
  p.x = clamp(p.x, MARGIN + SHIP_W / 2, PLAYER_ZONE_W);
  p.y = clamp(p.y, MARGIN + SHIP_H / 2, VIEW_H - MARGIN - SHIP_H / 2);

  if (Math.random() < 0.6) thrustPuff(p.x - SHIP_W / 2 + 1, p.y + (Math.random() < 0.5 ? -1 : 1));

  // Auto fire. Holding the fire key does the same thing, so the button is optional.
  p.fireCooldown -= dt;
  if (p.fireCooldown <= 0) {
    p.fireCooldown = p.rapid > 0 ? PLAYER.rapidFireInterval : PLAYER.fireInterval;
    shoot(p);
    onShoot();
  }
}

function shoot(p) {
  const nose = p.x + SHIP_W / 2 - 2;
  const s = PLAYER.bulletSpeed;
  fireBullet(nose, p.y, s, 0, true);
  if (p.spread > 0) {
    fireBullet(nose - 2, p.y - 2, s * 0.96, -88, true);
    fireBullet(nose - 2, p.y + 2, s * 0.96, 88, true);
  }
  p.muzzle = 0.06;
}

// Returns true if the hit landed (i.e. cost a life).
export function damagePlayer(p) {
  if (p.invuln > 0) return false;
  if (p.shield) {
    p.shield = false;
    p.invuln = PLAYER.invulnTime * 0.5;
    return false;
  }
  p.lives--;
  p.invuln = PLAYER.invulnTime;
  p.spread = 0;
  p.rapid = 0;
  return true;
}

export function drawPlayer(ctx, p) {
  // Blink while invulnerable so the state is legible without a HUD element.
  if (p.invuln > 0 && Math.floor(p.invuln * 16) % 2 === 0) return;

  // Vertical velocity picks the tilt frame; the source art's five banking columns map
  // straight onto pitch once rotated.
  const t = clamp(p.vy / PLAYER.speed, -1, 1);
  const tilt = 2 + Math.round(t * 2);
  const thrust = Math.floor(p.thrustAnim * 14) % 2;
  drawFrame(ctx, 'ship', thrust * 5 + tilt, p.x - SHIP_W / 2, p.y - SHIP_H / 2);

  if (p.muzzle > 0) {
    ctx.fillStyle = '#fff6ae';
    ctx.fillRect(Math.round(p.x + SHIP_W / 2 - 2), Math.round(p.y - 1), 3, 2);
  }

  if (p.shield) {
    ctx.strokeStyle = 'rgba(133,182,223,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(Math.round(p.x), Math.round(p.y), 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}
