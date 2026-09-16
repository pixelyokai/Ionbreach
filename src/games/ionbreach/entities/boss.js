import { VIEW_W, VIEW_H, SAFE_X, SAFE_Y } from '../config.js';
import { fireBullet } from './bullet.js';
import { drawFrame, frameSize, bossAtlas } from '../render/sprites.js';
import { explosionBurst } from './particle.js';
import { rand, clamp } from '../../../core/math.js';

/**
 * A boss is three phases. Each is a health threshold plus an attack script, and the art
 * state (normal / damaged / critical) tracks the same thresholds, so what the player sees
 * and what the boss is doing change together.
 *
 * A level names its boss; the sheet, atlas and health all follow from that, so a second
 * boss is a new atlas plus an entry in BOSSES.
 */
const FLASH_TIME = 0.07;

const DEFAULT_PHASES = [
  // 1: wide sweeping spreads while it patrols slowly. Readable, forgiving.
  { at: 1.0, patrolSpeed: 26, attack: 'sweep', interval: 1.5 },
  // 2: aimed bursts from both gun pods, faster patrol.
  { at: 0.6, patrolSpeed: 44, attack: 'burst', interval: 1.15 },
  // 3: both, plus a wall of unaimed fire. The push to finish it.
  { at: 0.28, patrolSpeed: 62, attack: 'desperate', interval: 0.75 },
];

/**
 * Each boss is told apart by what it does, not by how much health it has. The twin-hull
 * leans on aimed bursts so standing still is punished; the spire leans on walls of
 * unaimed fire so bad positioning is. Health rises only enough to keep the fights a
 * similar length as the player gets better.
 */
export const BOSSES = {
  'boss-01': { health: 120, phases: DEFAULT_PHASES },

  'boss-02': {
    health: 165,
    phases: [
      // Opens with aimed pressure rather than a readable sweep.
      { at: 1.0, patrolSpeed: 38, attack: 'burst', interval: 1.35 },
      { at: 0.62, patrolSpeed: 56, attack: 'sweep', interval: 1.0 },
      { at: 0.3, patrolSpeed: 74, attack: 'desperate', interval: 0.7 },
    ],
  },

  'boss-03': {
    health: 215,
    phases: [
      // Walls from the first phase; the room to dodge is what it takes away.
      { at: 1.0, patrolSpeed: 30, attack: 'sweep', interval: 1.15 },
      { at: 0.7, patrolSpeed: 52, attack: 'desperate', interval: 0.95 },
      { at: 0.35, patrolSpeed: 78, attack: 'desperate', interval: 0.62 },
    ],
  },
};

export function createBoss(id) {
  const cfg = BOSSES[id] ?? BOSSES['boss-01'];
  const sheetName = `boss:${id}`;
  const s = frameSize(sheetName);
  return {
    id,
    sheet: sheetName,
    atlas: bossAtlas(id),
    phases: cfg.phases,
    x: VIEW_W + s.fw,
    y: VIEW_H / 2,
    w: s.fw * 0.62,
    h: s.fh * 0.7,
    health: cfg.health,
    maxHealth: cfg.health,
    phase: 0,
    entering: true,
    anim: 0,
    flash: 0,
    fireTimer: 2,
    burstLeft: 0,
    burstTimer: 0,
    patrolDir: 1,
    dying: 0,
    dead: false,
  };
}

export const bossHealthFraction = (b) => b.health / b.maxHealth;

export function updateBoss(b, dt, player, onFire, onExplode) {
  b.anim += dt;
  b.flash = Math.max(0, b.flash - dt);

  if (b.dying > 0) {
    b.dying -= dt;
    // Death throes: explosions walk across the hull before it goes.
    if (Math.random() < 0.5) {
      explosionBurst(b.x + rand(-b.w / 2, b.w / 2), b.y + rand(-b.h / 2, b.h / 2), 1.2);
      onExplode();
    }
    if (b.dying <= 0) b.dead = true;
    return;
  }

  // Parked far enough in that the wings clear the curved edge of the CRT mask.
  const anchorX = VIEW_W - frameSize(b.sheet).fw / 2 - SAFE_X - 6;
  if (b.entering) {
    b.x -= 46 * dt;
    if (b.x <= anchorX) { b.x = anchorX; b.entering = false; }
    return;
  }

  // Phase is derived from health, so it can only ever move one way.
  let phase = 0;
  const frac = bossHealthFraction(b);
  for (let i = 0; i < b.phases.length; i++) if (frac <= b.phases[i].at) phase = i;
  b.phase = phase;
  const cfg = b.phases[phase];

  // The boss is over half the height of the field, so its patrol is clamped to keep the
  // whole sprite inside the mask - a gun pod the player cannot see is a gun pod they
  // cannot dodge. On a field too short to hold it, it just holds the centre line.
  const half = frameSize(b.sheet).fh / 2;
  let top = half + SAFE_Y * 0.5;
  let bottom = VIEW_H - half - SAFE_Y * 0.5;
  if (top >= bottom) top = bottom = VIEW_H / 2;
  b.y += cfg.patrolSpeed * b.patrolDir * dt;
  if (b.y <= top) { b.y = top; b.patrolDir = 1; }
  if (b.y >= bottom) { b.y = bottom; b.patrolDir = -1; }

  if (b.burstLeft > 0) {
    b.burstTimer -= dt;
    if (b.burstTimer <= 0) {
      b.burstTimer = 0.14;
      b.burstLeft--;
      aimedShot(b, player);
      onFire();
    }
    return;
  }

  b.fireTimer -= dt;
  if (b.fireTimer > 0) return;
  b.fireTimer = cfg.interval;

  if (cfg.attack === 'sweep') sweep(b);
  else if (cfg.attack === 'burst') b.burstLeft = 4;
  else { sweep(b); b.burstLeft = 5; }
  onFire();
}

const muzzles = (b) => [
  { x: b.x - b.w / 2, y: b.y - b.h * 0.3 },
  { x: b.x - b.w / 2, y: b.y + b.h * 0.3 },
];

function sweep(b) {
  for (const m of muzzles(b)) {
    for (let i = -2; i <= 2; i++) {
      fireBullet(m.x, m.y, -128, i * 34, false);
    }
  }
}

function aimedShot(b, player) {
  for (const m of muzzles(b)) {
    const dx = player.x - m.x, dy = player.y - m.y;
    const len = Math.hypot(dx, dy) || 1;
    fireBullet(m.x, m.y, (dx / len) * 165, (dy / len) * 165, false);
  }
}

export function damageBoss(b, amount) {
  if (b.dying > 0) return false;
  b.health = Math.max(0, b.health - amount);
  b.flash = FLASH_TIME;
  if (b.health === 0) {
    b.dying = 1.9;
    return true;
  }
  return false;
}

export function drawBoss(ctx, b) {
  const frac = bossHealthFraction(b);
  const state = frac <= 0.28 ? 'critical' : frac <= 0.6 ? 'damaged' : 'normal';
  const s = frameSize(b.sheet);
  const shake = b.dying > 0 ? rand(-2, 2) : 0;
  const x = b.x - s.fw / 2 + shake;
  const y = b.y - s.fh / 2;

  const pick = (name) => {
    const frames = b.atlas.states[name];
    return frames[Math.floor(b.anim * 5) % frames.length];
  };

  drawFrame(ctx, b.sheet, pick(state), x, y);

  // The white frame goes over the art at partial alpha rather than replacing it. Under a
  // continuous bullet stream a full swap leaves the boss a featureless white blob, which
  // hides both its damage state and where its guns are.
  if (b.flash > 0) {
    ctx.globalAlpha = Math.min(0.55, (b.flash / FLASH_TIME) * 0.55);
    drawFrame(ctx, b.sheet, pick('flash'), x, y);
    ctx.globalAlpha = 1;
  }
}

export function drawBossHealth(ctx, b) {
  if (b.entering || b.dying > 0) return;
  const x = SAFE_X + 20, w = VIEW_W - x * 2, y = VIEW_H - SAFE_Y - 4;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x - 1, y - 1, w + 2, 5);
  ctx.fillStyle = b.phase === 2 ? '#d85a34' : b.phase === 1 ? '#f19152' : '#c67ee0';
  ctx.fillRect(x, y, Math.round(w * clamp(bossHealthFraction(b), 0, 1)), 3);
}
