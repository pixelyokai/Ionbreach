/**
 * Ionbreach tuning. VIEW_W and VIEW_H are live bindings kept in step with the console's
 * viewport, so the play field grows with the window rather than being letterboxed.
 */
export let VIEW_W = 480;
export let VIEW_H = 260;

// The player is confined to the left part of the field. Wide enough to actually
// manoeuvre, short of the right edge where enemies enter.
export const PLAYER_ZONE_FRACTION = 0.6;
export let PLAYER_ZONE_W = Math.round(VIEW_W * PLAYER_ZONE_FRACTION);

// The CRT mask curves inwards at the corners, which is exactly where a HUD wants to sit.
// Anything drawn into the canvas that must stay readable keeps inside this inset.
export let SAFE_X = 0;
export let SAFE_Y = 0;

// The terrain plate is 272px tall, so the field must not exceed it.
export const RESOLUTION = {
  height: 260,
  minHeight: 180,
  maxHeight: 272,
  minAspect: 4 / 3,
  maxAspect: 2.4,
};

export function syncView(w, h) {
  VIEW_W = w;
  VIEW_H = h;
  PLAYER_ZONE_W = Math.round(VIEW_W * PLAYER_ZONE_FRACTION);
  SAFE_X = Math.round(VIEW_W * 0.05);
  SAFE_Y = Math.round(VIEW_H * 0.055);
}

// Fixed timestep for the simulation, so a 120Hz display plays at the same speed as 60Hz.
export const STEP = 1 / 60;

export const PLAYER = {
  speed: 132,
  accel: 1100,
  friction: 1600,
  fireInterval: 0.18,
  rapidFireInterval: 0.09,
  bulletSpeed: 320,
  lives: 3,
  invulnTime: 1.6,
  hitbox: { w: 10, h: 8 },
};

export const POWERUP = {
  dropChance: 0.14,
  duration: 9,
  lifetime: 8,
  blinkAt: 2.5,
  speed: 34,
};

export const SCORE = {
  waveClear: 250,
  bossKill: 5000,
  comboWindow: 1.6,
  maxCombo: 8,
};
