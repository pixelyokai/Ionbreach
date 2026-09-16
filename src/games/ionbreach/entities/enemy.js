import { ARCHETYPES } from '../data/enemies.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { fireBullet } from './bullet.js';
import { drawFrame, frameSize } from '../render/sprites.js';
import { rand } from '../../../core/math.js';
import { difficulty } from '../data/difficulty.js';

/**
 * One enemy class; the archetype config supplies movement and fire behaviour. Enemies
 * are held in a plain array rather than a pool - there are at most a few dozen and they
 * are not high churn.
 */
export function createEnemy(type, y) {
  const cfg = ARCHETYPES[type];
  // Read once, at spawn: changing difficulty mid-run would otherwise retune enemies that
  // are already on screen.
  const d = difficulty;
  return {
    type,
    cfg,
    speedScale: d.enemySpeed,
    x: VIEW_W + 24,
    y,
    vx: -cfg.speed * d.enemySpeed,
    vy: 0,
    w: cfg.w,
    h: cfg.h,
    health: cfg.health,
    maxHealth: cfg.health,
    age: 0,
    baseY: y,
    anim: rand(0, 1),
    flash: 0,
    fireScale: d.enemyFire,
    fireTimer: cfg.fire ? cfg.fire.interval * d.enemyFire * rand(0.4, 1) : 0,
    burstLeft: 0,
    burstTimer: 0,
    diving: false,
    spin: rand(-1, 1),
    dead: false,
  };
}

export function updateEnemy(e, dt, player, onFire) {
  e.age += dt;
  e.anim += dt;
  e.flash = Math.max(0, e.flash - dt);

  switch (e.cfg.movement) {
    case 'straight':
      break;
    case 'sine':
      e.y = e.baseY + Math.sin(e.age * e.cfg.frequency) * e.cfg.amplitude;
      break;
    case 'dive':
      // Enters flat, then commits to the player's Y at the moment of the dive and
      // holds that line - a diver the player can read is a diver they can dodge.
      if (!e.diving && e.x < VIEW_W * e.cfg.diveAt) {
        e.diving = true;
        const dy = player.y - e.y;
        const dx = -Math.abs(e.x + 40);
        const len = Math.hypot(dx, dy) || 1;
        const dive = e.cfg.diveSpeed * e.speedScale;
        e.vx = (dx / len) * dive;
        e.vy = (dy / len) * dive;
      }
      break;
    case 'drift':
      e.y = e.baseY + Math.sin(e.age * 0.7) * 12;
      break;
    case 'tumble':
      e.y = e.baseY + Math.sin(e.age * 0.9 + e.spin) * 20;
      break;
  }

  e.x += e.vx * dt;
  if (e.cfg.movement === 'dive' || e.cfg.movement === 'straight') e.y += e.vy * dt;

  if (e.cfg.fire && e.x < VIEW_W + 4) {
    updateFire(e, dt, player, onFire);
  }
}

function updateFire(e, dt, player, onFire) {
  const f = e.cfg.fire;

  if (e.burstLeft > 0) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      e.burstTimer = f.burstGap;
      e.burstLeft--;
      shoot(e, f, player);
      onFire();
    }
    return;
  }

  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  e.fireTimer = (f.interval + rand(-f.jitter, f.jitter)) * e.fireScale;
  if (f.burst) {
    e.burstLeft = f.burst;
    e.burstTimer = 0;
  } else {
    shoot(e, f, player);
    onFire();
  }
}

function shoot(e, f, player) {
  const x = e.x - e.w / 2;
  if (f.aimed) {
    const dx = player.x - x, dy = player.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    fireBullet(x, e.y, (dx / len) * f.speed, (dy / len) * f.speed, false);
  } else {
    fireBullet(x, e.y, -f.speed, 0, false);
  }
}

export function drawEnemy(ctx, e) {
  const frame = Math.floor(e.anim * 8) % 2;
  const sheet = e.flash > 0 ? e.cfg.sheet + 'Flash' : e.cfg.sheet;
  const s = frameSize(e.cfg.sheet);
  drawFrame(ctx, sheet, frame, e.x - s.fw / 2, e.y - s.fh / 2);
}

export const enemyOffscreen = (e) => e.x < -60 || e.y < -80 || e.y > VIEW_H + 80;
