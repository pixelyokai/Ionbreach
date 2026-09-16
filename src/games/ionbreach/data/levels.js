import { SECTOR_1, SECTOR_2, SECTOR_3 } from './waves.js';

/**
 * The campaign. A level is its wave list, the plate it is flown over, and the boss that
 * ends it. Beating the last level's boss wins the run; beating any other one flies on to
 * the next sector without interrupting the score.
 *
 * Adding a level is three steps and no code:
 *
 *   1. Author its waves in data/waves.js as a new export.
 *   2. Emit its terrain plate in tools/ionbreach/build-assets.js and declare it in
 *      render/sprites.js.
 *   3. Append an entry below.
 *
 * The spawner, the background, the HUD and the boss all read from this list.
 *
 * `scrim` is the veil drawn over the plate so sprites stay legible; a darker plate wants a
 * weaker one, which is why the nebula barely has one. `boss` is an atlas id under
 * assets/sprites/bosses, with its health and phases in BOSSES in entities/boss.js.
 */
export const LEVELS = [
  {
    id: 'sector-1',
    name: 'Dust Line',
    terrain: 'bgFar',
    scrim: 'rgba(20, 12, 16, 0.46)',
    waves: SECTOR_1,
    boss: 'boss-01',
  },
  {
    id: 'sector-2',
    name: 'Riverrun',
    terrain: 'bgRiver',
    scrim: 'rgba(10, 20, 26, 0.42)',
    waves: SECTOR_2,
    boss: 'boss-02',
  },
  {
    id: 'sector-3',
    name: 'Nebula',
    terrain: 'bgNebula',
    // The plate is already dark, so the scrim only knocks back the brightest stars.
    scrim: 'rgba(8, 10, 22, 0.22)',
    waves: SECTOR_3,
    boss: 'boss-03',
  },
];

export const LEVEL_COUNT = LEVELS.length;
export const levelAt = (i) => LEVELS[Math.min(i, LEVELS.length - 1)];
export const isFinalLevel = (i) => i >= LEVELS.length - 1;
