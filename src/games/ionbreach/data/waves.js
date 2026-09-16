/**
 * Hand authored waves, grouped by the level they belong to.
 *
 * A wave is a list of { type, at, y } where `at` is seconds from the start of that wave
 * and `y` is a fraction of the play field height. Difficulty ramps by mixing archetypes,
 * tightening spawn density, and shortening the gap between waves - not by scaling numbers.
 *
 * To add a level: write its waves here as a new export, then reference it from
 * data/levels.js. Nothing else needs to change.
 */
const w = (type, at, y, opts) => ({ type, at, y, ...opts });

/** Level 1 - the desert. Teaches every archetype in turn. */
export const SECTOR_1 = [
  {
    // 1: nothing but drifters. Teach the trigger.
    gapAfter: 1.6,
    spawns: [
      w('drifter', 0.4, 0.5),
      w('drifter', 1.1, 0.35),
      w('drifter', 1.8, 0.65),
      w('drifter', 2.9, 0.25),
      w('drifter', 3.3, 0.5),
      w('drifter', 3.7, 0.75),
      w('drifter', 5.0, 0.45),
      w('drifter', 5.4, 0.55),
    ],
  },
  {
    // 2: weavers introduce return fire, drifters keep the field busy.
    gapAfter: 1.5,
    spawns: [
      w('weaver', 0.3, 0.3),
      w('weaver', 0.9, 0.7),
      w('drifter', 2.0, 0.5),
      w('drifter', 2.3, 0.2),
      w('drifter', 2.6, 0.8),
      w('weaver', 4.0, 0.5),
      w('weaver', 4.6, 0.25),
      w('weaver', 5.2, 0.75),
      w('asteroid', 6.4, 0.55),
    ],
  },
  {
    // 3: divers force the player to keep moving vertically.
    gapAfter: 1.4,
    spawns: [
      w('diver', 0.4, 0.15),
      w('diver', 1.4, 0.85),
      w('drifter', 2.2, 0.5),
      w('drifter', 2.5, 0.4),
      w('drifter', 2.8, 0.6),
      w('diver', 4.0, 0.2),
      w('diver', 4.4, 0.8),
      w('weaver', 5.6, 0.5),
      w('asteroid', 6.6, 0.3),
      w('asteroid', 7.0, 0.7),
    ],
  },
  {
    // 4: the turret arrives - a wall that shoots back while everything else swarms.
    gapAfter: 1.2,
    spawns: [
      w('turret', 0.5, 0.5),
      w('drifter', 1.6, 0.2),
      w('drifter', 1.9, 0.8),
      w('weaver', 3.0, 0.35),
      w('weaver', 3.4, 0.65),
      w('diver', 5.0, 0.15),
      w('diver', 5.4, 0.85),
      w('turret', 6.6, 0.25),
      w('turret', 7.0, 0.75),
      w('asteroid', 8.4, 0.5),
    ],
  },
  {
    // 5: everything at once, tight gaps. The last exhale before the boss.
    gapAfter: 2.4,
    spawns: [
      w('weaver', 0.2, 0.2),
      w('weaver', 0.5, 0.5),
      w('weaver', 0.8, 0.8),
      w('diver', 1.8, 0.1),
      w('diver', 2.1, 0.9),
      w('turret', 2.6, 0.5),
      w('drifter', 3.4, 0.3),
      w('drifter', 3.6, 0.45),
      w('drifter', 3.8, 0.6),
      w('drifter', 4.0, 0.75),
      w('asteroid', 5.0, 0.25),
      w('asteroid', 5.3, 0.7),
      w('turret', 6.2, 0.2),
      w('turret', 6.6, 0.8),
      w('diver', 7.8, 0.5),
      w('weaver', 8.4, 0.35),
      w('weaver', 8.7, 0.65),
    ],
  },
];

/**
 * Level 2 - the river. The player already knows every archetype, so this stops teaching
 * and starts pressing: tighter spacing, divers in pairs, and turrets that have to be
 * worked around rather than waited out.
 */
export const SECTOR_2 = [
  {
    // 1: weavers set the tempo, drifters fill the lanes between them.
    gapAfter: 1.3,
    spawns: [
      w('weaver', 0.2, 0.25),
      w('weaver', 0.5, 0.75),
      w('drifter', 1.4, 0.5),
      w('drifter', 1.7, 0.3),
      w('drifter', 2.0, 0.7),
      w('weaver', 3.0, 0.4),
      w('weaver', 3.3, 0.6),
      w('drifter', 4.4, 0.15),
      w('drifter', 4.7, 0.85),
      w('asteroid', 5.6, 0.5),
    ],
  },
  {
    // 2: divers arrive in pairs, so dodging one puts you in front of the other.
    gapAfter: 1.3,
    spawns: [
      w('diver', 0.3, 0.2),
      w('diver', 0.6, 0.8),
      w('weaver', 1.8, 0.5),
      w('drifter', 2.4, 0.35),
      w('drifter', 2.6, 0.65),
      w('diver', 3.8, 0.15),
      w('diver', 4.0, 0.5),
      w('diver', 4.2, 0.85),
      w('asteroid', 5.4, 0.3),
      w('asteroid', 5.7, 0.7),
    ],
  },
  {
    // 3: a turret wall. The weavers make standing still to trade shots expensive.
    gapAfter: 1.2,
    spawns: [
      w('turret', 0.4, 0.3),
      w('turret', 0.8, 0.7),
      w('weaver', 2.0, 0.5),
      w('weaver', 2.3, 0.2),
      w('weaver', 2.6, 0.8),
      w('drifter', 4.0, 0.45),
      w('drifter', 4.2, 0.55),
      w('turret', 5.2, 0.5),
      w('diver', 6.4, 0.25),
      w('diver', 6.7, 0.75),
    ],
  },
  {
    // 4: turrets behind divers - the pressure comes from two ranges at once.
    gapAfter: 1.1,
    spawns: [
      w('turret', 0.3, 0.5),
      w('diver', 1.2, 0.15),
      w('diver', 1.5, 0.85),
      w('weaver', 2.6, 0.3),
      w('weaver', 2.9, 0.7),
      w('asteroid', 4.0, 0.5),
      w('turret', 4.8, 0.2),
      w('turret', 5.1, 0.8),
      w('diver', 6.2, 0.4),
      w('diver', 6.5, 0.6),
      w('drifter', 7.6, 0.5),
    ],
  },
  {
    // 5: everything, close together. The last exhale before the twin-hull.
    gapAfter: 2.2,
    spawns: [
      w('weaver', 0.2, 0.2),
      w('weaver', 0.4, 0.5),
      w('weaver', 0.6, 0.8),
      w('diver', 1.6, 0.1),
      w('diver', 1.8, 0.9),
      w('turret', 2.4, 0.35),
      w('turret', 2.7, 0.65),
      w('asteroid', 3.8, 0.25),
      w('asteroid', 4.1, 0.75),
      w('drifter', 5.0, 0.3),
      w('drifter', 5.2, 0.45),
      w('drifter', 5.4, 0.6),
      w('drifter', 5.6, 0.75),
      w('diver', 6.6, 0.5),
      w('turret', 7.4, 0.5),
      w('weaver', 8.2, 0.3),
      w('weaver', 8.5, 0.7),
    ],
  },
];

/**
 * Level 3 - the nebula. Asteroids stop being an occasional hazard and become the terrain:
 * they cannot be reasoned with, only avoided or destroyed, and every wave here uses them
 * to take space away from the player rather than to deal damage directly.
 */
export const SECTOR_3 = [
  {
    // 1: the rock field. Establishes that space itself is now in the way.
    gapAfter: 1.2,
    spawns: [
      w('asteroid', 0.3, 0.3),
      w('asteroid', 0.6, 0.7),
      w('weaver', 1.6, 0.5),
      w('asteroid', 2.4, 0.15),
      w('asteroid', 2.7, 0.5),
      w('asteroid', 3.0, 0.85),
      w('weaver', 4.2, 0.25),
      w('weaver', 4.5, 0.75),
      w('asteroid', 5.6, 0.4),
      w('asteroid', 5.9, 0.6),
    ],
  },
  {
    // 2: turrets behind cover. The rocks protect them from a straight line of fire.
    gapAfter: 1.2,
    spawns: [
      w('turret', 0.3, 0.3),
      w('turret', 0.6, 0.7),
      w('asteroid', 1.6, 0.5),
      w('diver', 2.6, 0.2),
      w('diver', 2.9, 0.8),
      w('asteroid', 4.0, 0.25),
      w('asteroid', 4.3, 0.75),
      w('weaver', 5.4, 0.5),
      w('turret', 6.2, 0.5),
      w('diver', 7.2, 0.35),
      w('diver', 7.5, 0.65),
    ],
  },
  {
    // 3: a diving swarm through a narrowing field.
    gapAfter: 1.1,
    spawns: [
      w('diver', 0.2, 0.15),
      w('diver', 0.5, 0.5),
      w('diver', 0.8, 0.85),
      w('asteroid', 1.8, 0.3),
      w('asteroid', 2.1, 0.7),
      w('weaver', 3.0, 0.2),
      w('weaver', 3.3, 0.8),
      w('diver', 4.4, 0.25),
      w('diver', 4.7, 0.75),
      w('asteroid', 5.8, 0.5),
      w('turret', 6.6, 0.4),
      w('turret', 6.9, 0.6),
    ],
  },
  {
    // 4: turret battery. Three at once, with rocks denying the safe lanes.
    gapAfter: 1.0,
    spawns: [
      w('turret', 0.3, 0.2),
      w('turret', 0.6, 0.5),
      w('turret', 0.9, 0.8),
      w('asteroid', 2.0, 0.35),
      w('asteroid', 2.3, 0.65),
      w('weaver', 3.4, 0.15),
      w('weaver', 3.7, 0.85),
      w('diver', 4.8, 0.5),
      w('asteroid', 5.6, 0.2),
      w('asteroid', 5.9, 0.8),
      w('drifter', 6.8, 0.3),
      w('drifter', 7.0, 0.7),
      w('turret', 7.8, 0.5),
    ],
  },
  {
    // 5: no gaps. Everything the sector has taught, on top of each other.
    gapAfter: 1.0,
    spawns: [
      w('weaver', 0.2, 0.2),
      w('weaver', 0.4, 0.8),
      w('diver', 1.0, 0.15),
      w('diver', 1.2, 0.85),
      w('turret', 1.8, 0.5),
      w('asteroid', 2.6, 0.25),
      w('asteroid', 2.8, 0.75),
      w('diver', 3.6, 0.35),
      w('diver', 3.8, 0.65),
      w('turret', 4.6, 0.2),
      w('turret', 4.9, 0.8),
      w('weaver', 5.8, 0.5),
      w('asteroid', 6.4, 0.4),
      w('asteroid', 6.7, 0.6),
      w('diver', 7.6, 0.5),
      w('drifter', 8.2, 0.3),
      w('drifter', 8.4, 0.7),
    ],
  },
  {
    // 6: the approach. Dense and unbroken, straight into the spire.
    gapAfter: 2.6,
    spawns: [
      w('turret', 0.2, 0.25),
      w('turret', 0.5, 0.75),
      w('diver', 1.2, 0.1),
      w('diver', 1.4, 0.5),
      w('diver', 1.6, 0.9),
      w('asteroid', 2.4, 0.3),
      w('asteroid', 2.6, 0.7),
      w('weaver', 3.4, 0.2),
      w('weaver', 3.6, 0.5),
      w('weaver', 3.8, 0.8),
      w('turret', 4.8, 0.4),
      w('turret', 5.1, 0.6),
      w('asteroid', 6.0, 0.15),
      w('asteroid', 6.2, 0.5),
      w('asteroid', 6.4, 0.85),
      w('diver', 7.4, 0.3),
      w('diver', 7.6, 0.7),
      w('turret', 8.4, 0.5),
    ],
  },
];
