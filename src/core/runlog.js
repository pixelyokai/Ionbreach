import { read, write } from './storage.js';

/**
 * Personal run history. Last N runs per game, no ranking against anyone else.
 */
const LIMIT = 10;
const MAX_SCORE = Number.MAX_SAFE_INTEGER;
const key = (gameId) => `runlog.${gameId}`;

const num = (v, max = MAX_SCORE) =>
  (Number.isFinite(v) ? Math.min(Math.max(Math.trunc(v), 0), max) : 0);

/**
 * localStorage is user-writable, so an entry read back is untrusted input: anything that
 * is not a finite number or a plain object is replaced rather than rendered.
 */
const sanitise = (e) =>
  e && typeof e === 'object' && !Array.isArray(e)
    ? {
        score: num(e.score),
        durationMs: num(e.durationMs),
        at: num(e.at) || Date.now(),
        meta: e.meta && typeof e.meta === 'object' && !Array.isArray(e.meta) ? e.meta : {},
      }
    : null;

export function record(gameId, { score = 0, durationMs = 0, meta = {} } = {}) {
  const entry = sanitise({ score, durationMs, meta, at: Date.now() });
  const runs = [entry, ...recent(gameId, LIMIT)].slice(0, LIMIT);
  write(key(gameId), runs);
  return entry;
}

export function recent(gameId, limit = LIMIT) {
  const runs = read(key(gameId), []);
  if (!Array.isArray(runs)) return [];
  return runs.slice(0, Math.max(0, Math.min(limit, LIMIT))).map(sanitise).filter(Boolean);
}

export function best(gameId, direction = 'higher') {
  const runs = recent(gameId, LIMIT);
  if (!runs.length) return null;
  return runs.reduce((a, b) =>
    (direction === 'lower' ? b.score < a.score : b.score > a.score) ? b : a);
}

/** Compares the latest run against the average of the ones before it. */
export function trend(gameId, direction = 'higher') {
  const runs = recent(gameId, LIMIT);
  if (runs.length < 2) return 0;
  const [latest, ...rest] = runs;
  const avg = rest.reduce((sum, r) => sum + r.score, 0) / rest.length;
  if (latest.score === avg) return 0;
  const better = direction === 'lower' ? latest.score < avg : latest.score > avg;
  return better ? 1 : -1;
}

/** The log ranked by score rather than by recency - the high-score table's order. */
export function top(gameId, direction = 'higher', limit = LIMIT) {
  const runs = recent(gameId, LIMIT);
  const sorted = [...runs].sort((a, b) => (direction === 'lower' ? a.score - b.score : b.score - a.score));
  return sorted.slice(0, limit);
}

/** Drops a game's history. The caller is expected to have confirmed with the player. */
export function clear(gameId) {
  write(key(gameId), []);
}

/** A scoped facade handed to a cartridge, so it cannot write another game's log. */
export function scopedTo(gameId) {
  return {
    record: (result) => record(gameId, result),
    recent: (limit) => recent(gameId, limit),
    best: (direction) => best(gameId, direction),
    top: (direction, limit) => top(gameId, direction, limit),
    clear: () => clear(gameId),
  };
}
