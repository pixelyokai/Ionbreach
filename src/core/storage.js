/**
 * localStorage behind a narrow interface, so moving to accounts later is one file.
 * Every access is guarded: private mode and disabled site data both throw on access,
 * not just on write.
 */
const PREFIX = 'ionbreach.';

function backend() {
  try {
    const probe = `${PREFIX}__probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

const store = backend();
const memory = new Map();

/**
 * One-time rename of the keys written before the project was called Ionbreach.
 * Spelled out as a table rather than derived with a regex: there are three of them, the
 * old scheme namespaced per game and the new one does not, and a wrong guess here loses
 * a player's scores silently.
 */
const LEGACY_KEYS = {
  'retromania.muted': 'ionbreach.muted',
  'retromania.ionbreach.best': 'ionbreach.best',
  'retromania.runlog.ionbreach': 'ionbreach.runlog.ionbreach',
};

function migrateLegacy() {
  if (!store) return;
  for (const [from, to] of Object.entries(LEGACY_KEYS)) {
    try {
      const value = store.getItem(from);
      if (value == null) continue;
      if (store.getItem(to) == null) store.setItem(to, value);
      store.removeItem(from);
    } catch {
      /* a quota or security error just leaves that one key behind */
    }
  }
}

migrateLegacy();

export function read(key, fallback = null) {
  const k = PREFIX + key;
  try {
    const raw = store ? store.getItem(k) : memory.get(k);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  const k = PREFIX + key;
  try {
    const raw = JSON.stringify(value);
    if (store) store.setItem(k, raw);
    else memory.set(k, raw);
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  const k = PREFIX + key;
  try {
    if (store) store.removeItem(k);
    else memory.delete(k);
  } catch {
    /* nothing to do */
  }
}

export const isPersistent = () => store !== null;
