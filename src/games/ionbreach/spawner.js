import { createEnemy } from './entities/enemy.js';
import { VIEW_H } from './config.js';

/**
 * Walks one level's wave data on a timer. A wave is finished once every spawn in it has
 * been released and the field is clear; only then does the gap to the next wave start.
 *
 * The spawner holds no level of its own - the caller hands it the wave list, so advancing
 * a level is just resetting it against different data.
 */
export function createSpawner() {
  return { wave: 0, t: 0, next: 0, gap: 0, done: false };
}

export function resetSpawner(s) {
  s.wave = 0;
  s.t = 0;
  s.next = 0;
  s.gap = 0;
  s.done = false;
}

export function updateSpawner(s, dt, enemies, waves) {
  if (s.done) return null;

  if (s.gap > 0) {
    s.gap -= dt;
    if (s.gap <= 0) {
      s.wave++;
      s.t = 0;
      s.next = 0;
      if (s.wave >= waves.length) {
        s.done = true;
        return 'boss';
      }
    }
    return null;
  }

  const wave = waves[s.wave];
  s.t += dt;

  while (s.next < wave.spawns.length && wave.spawns[s.next].at <= s.t) {
    const spec = wave.spawns[s.next++];
    // y is a fraction of the field, kept off the very edge so nothing spawns clipped.
    const y = 20 + spec.y * (VIEW_H - 40);
    enemies.push(createEnemy(spec.type, y));
  }

  const released = s.next >= wave.spawns.length;
  if (released && enemies.length === 0) {
    s.gap = wave.gapAfter;
    return 'waveClear';
  }
  return null;
}

export const currentWaveNumber = (s, waves) => Math.min(s.wave + 1, waves.length);
