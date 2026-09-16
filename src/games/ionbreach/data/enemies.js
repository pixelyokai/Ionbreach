/**
 * Archetype stats. Each archetype is a movement pattern plus a fire pattern; enemy.js
 * is one class that reads these, so adding a variant is a data change.
 */
export const ARCHETYPES = {
  // Straight line, no fire. Filler that teaches the player to shoot.
  drifter: {
    sheet: 'enemySmall',
    w: 13, h: 13,
    health: 1,
    speed: 74,
    score: 100,
    movement: 'straight',
    fire: null,
  },

  // Sine wave vertical movement, occasional single shot.
  weaver: {
    sheet: 'enemySmall',
    w: 13, h: 13,
    health: 2,
    speed: 62,
    score: 150,
    movement: 'sine',
    amplitude: 34,
    frequency: 1.9,
    fire: { interval: 2.1, jitter: 0.9, speed: 150, aimed: false },
  },

  // Enters high or low, then angles toward the player's Y and commits.
  diver: {
    sheet: 'enemyMedium',
    w: 13, h: 26,
    health: 2,
    speed: 96,
    score: 200,
    movement: 'dive',
    diveAt: 0.55,
    diveSpeed: 130,
    fire: null,
  },

  // Slow, high health, fires aimed bursts.
  turret: {
    sheet: 'enemyBig',
    w: 26, h: 26,
    health: 6,
    speed: 30,
    score: 350,
    movement: 'drift',
    fire: { interval: 2.4, jitter: 0.4, speed: 135, aimed: true, burst: 3, burstGap: 0.16 },
  },

  // Unaimed hazard. Cannot be reasoned with, only avoided or destroyed.
  asteroid: {
    sheet: 'enemyBig',
    w: 25, h: 25,
    health: 4,
    speed: 58,
    score: 75,
    movement: 'tumble',
    fire: null,
    tint: true,
  },
};

export const archetypeNames = Object.keys(ARCHETYPES);
