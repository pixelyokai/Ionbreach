import { Pool } from '../../../core/pool.js';
import { offscreen } from '../../../core/collision.js';
import { VIEW_W, VIEW_H } from '../config.js';

const CAPACITY = 220;

const makeBullet = () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  w: 10, h: 6,
  friendly: true,
  damage: 1,
  anim: 0,
});

export const bullets = new Pool(CAPACITY, makeBullet);

export function fireBullet(x, y, vx, vy, friendly, damage = 1) {
  const b = bullets.spawn();
  if (!b) return null;
  b.x = x; b.y = y; b.vx = vx; b.vy = vy;
  b.friendly = friendly;
  b.damage = damage;
  b.anim = 0;
  b.w = friendly ? 10 : 8;
  b.h = 6;
  return b;
}

export function updateBullets(dt) {
  for (let i = 0; i < bullets.alive; i++) {
    const b = bullets.items[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.anim += dt;
    if (offscreen(b, VIEW_W, VIEW_H, 24)) i = bullets.releaseAt(i);
  }
}
