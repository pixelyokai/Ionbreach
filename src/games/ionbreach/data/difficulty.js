import { read, write } from '../../../core/storage.js';

/**
 * Difficulty is data, and every multiplier is expressed against Normal so the tuning in
 * config.js stays the single source of the base numbers.
 *
 * `enemyFire` scales the interval rather than the rate, so a value above 1 means the
 * enemy waits longer between shots - easier. It reads backwards from the others on
 * purpose: the field it multiplies is an interval.
 */
export const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'EASY',
    blurb: 'For new pilots. Slower, more lives.',
    enemySpeed: 0.7,
    enemyFire: 1.4,
    lives: 5,
    scoreScale: 0.5,
  },
  {
    id: 'normal',
    name: 'NORMAL',
    blurb: 'The run as tuned. Balanced and fair.',
    enemySpeed: 1,
    enemyFire: 1,
    lives: 3,
    scoreScale: 1,
  },
  {
    id: 'hard',
    name: 'HARD',
    blurb: 'For veterans. Faster, and no mercy.',
    enemySpeed: 1.5,
    enemyFire: 0.7,
    lives: 2,
    scoreScale: 2,
  },
];

const KEY = 'difficulty';
const DEFAULT_ID = 'normal';

export const difficultyById = (id) =>
  DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES.find((d) => d.id === DEFAULT_ID);

/**
 * A live binding rather than a value threaded through every call site: enemies, the
 * player and the scorer all read it at the moment they need it, and a run is locked to
 * whatever it held when the run started.
 */
export let difficulty = difficultyById(read(KEY, DEFAULT_ID));

export function setDifficulty(id) {
  difficulty = difficultyById(id);
  write(KEY, difficulty.id);
  return difficulty;
}
