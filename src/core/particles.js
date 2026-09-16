import { Pool } from './pool.js';
import { rand } from './math.js';

const DEFAULT_CAPACITY = 300;

const makeParticle = () => ({
  x: 0, y: 0, vx: 0, vy: 0,
  life: 0, maxLife: 1,
  size: 1, drag: 0, gravity: 0,
  colour: '#fff',
});

/**
 * Pooled particles. Capped hard: particles are decoration and must never be the reason a
 * frame is missed.
 */
export function createParticles(capacity = DEFAULT_CAPACITY) {
  const pool = new Pool(capacity, makeParticle);

  const emit = (opts) => {
    const p = pool.spawn();
    if (!p) return null;
    p.x = opts.x;
    p.y = opts.y;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.life = p.maxLife = opts.life ?? 0.4;
    p.size = opts.size ?? 1;
    p.drag = opts.drag ?? 0;
    p.gravity = opts.gravity ?? 0;
    p.colour = opts.colour ?? '#fff';
    return p;
  };

  return {
    pool,
    emit,

    /** Radial burst; `spread` narrows it to a cone around `angle`. */
    burst(x, y, { count = 8, speed = [30, 140], life = [0.2, 0.6], size = 1, colours = ['#fff'], drag = 2, gravity = 0, angle = 0, spread = Math.PI } = {}) {
      for (let i = 0; i < count; i++) {
        const a = angle + rand(-spread, spread);
        const sp = rand(speed[0], speed[1]);
        emit({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: rand(life[0], life[1]),
          size: Array.isArray(size) ? (rand(size[0], size[1]) | 0) || 1 : size,
          colour: colours[(Math.random() * colours.length) | 0],
          drag, gravity,
        });
      }
    },

    update(dt) {
      for (let i = 0; i < pool.alive; i++) {
        const p = pool.items[i];
        p.life -= dt;
        if (p.life <= 0) {
          i = pool.releaseAt(i);
          continue;
        }
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy = p.vy * d + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },

    draw(ctx) {
      for (let i = 0; i < pool.alive; i++) {
        const p = pool.items[i];
        ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.6);
        ctx.fillStyle = p.colour;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
    },

    clear: () => pool.clear(),
  };
}
