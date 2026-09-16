/**
 * SFX and music over HTML5 Audio.
 *
 * Each effect keeps a small ring of clones so several can overlap without cutting each
 * other off, and a per-sound cooldown stops a dense frame from stacking copies into a
 * clipping mess. Mute is global and persists across cartridges.
 */
const MUTE_KEY = 'ionbreach.muted';

let globallyMuted = readMuted();
let unlocked = false;
const mixers = new Set();
const muteListeners = new Set();

/** Muted unless the player has said otherwise - an unvisited profile stays silent. */
function readMuted() {
  try {
    const stored = localStorage.getItem(MUTE_KEY);
    return stored == null ? true : stored === '1';
  } catch {
    return true;
  }
}

export function isMuted() {
  return globallyMuted;
}

export function setMuted(value) {
  globallyMuted = Boolean(value);
  try {
    localStorage.setItem(MUTE_KEY, globallyMuted ? '1' : '0');
  } catch {
    /* storage unavailable; the setting just does not persist */
  }
  for (const m of mixers) m.applyMute();
  for (const fn of muteListeners) fn(globallyMuted);
}

export function onMuteChange(fn) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

/** Mobile browsers block audio until a user gesture; the title screen is the gate. */
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  for (const m of mixers) m.primeVoices();
}

export function isUnlocked() {
  return unlocked;
}

/** Live mixers, so teardown can be asserted rather than assumed. */
export const liveMixers = () => mixers.size;

/**
 * @param {object} manifest  { sfx: { name: { src, volume, voices, cooldown } }, music: { src, fallback, volume } }
 */
export function createMixer(manifest = {}) {
  const voices = new Map();
  const lastPlayed = new Map();
  let music = null;
  let musicWanted = false;
  let destroyed = false;

  for (const [name, def] of Object.entries(manifest.sfx ?? {})) {
    const { src, volume = 0.35, voices: count = 3, cooldown = 0.04 } = def;
    voices.set(name, {
      index: 0,
      volume,
      cooldown,
      els: Array.from({ length: count }, () => {
        const a = new Audio(src);
        a.preload = unlocked ? 'auto' : 'none';
        a.volume = volume;
        return a;
      }),
    });
    lastPlayed.set(name, 0);
  }

  let onMusicError = null;
  if (manifest.music) {
    const { src, fallback, volume = 0.32 } = manifest.music;
    music = new Audio(src);
    music.loop = true;
    music.volume = volume;
    // The track is by far the heaviest asset in the build - an order of magnitude past
    // every sprite sheet put together. It is fetched when the run actually starts, not
    // when the cartridge mounts, so a visitor who reads the title screen and leaves never
    // pays for it. Unlocking audio is not the gate: any gesture does that, including the
    // click that opened the cartridge.
    music.preload = 'none';
    if (fallback) {
      // Safari will not take the ogg. { once: true } is not enough on its own: if the
      // error never fires the listener outlives the mixer, which leaks one per mount.
      onMusicError = () => { music.src = fallback; };
      music.addEventListener('error', onMusicError, { once: true });
    }
  }

  const mixer = {
    get musicPlaying() {
      return Boolean(music && !music.paused && !music.ended);
    },

    play(name) {
      if (destroyed || globallyMuted || !unlocked) return;
      const v = voices.get(name);
      if (!v) return;
      const now = performance.now() / 1000;
      if (now - lastPlayed.get(name) < v.cooldown) return;
      lastPlayed.set(name, now);
      const el = v.els[v.index];
      v.index = (v.index + 1) % v.els.length;
      el.currentTime = 0;
      el.play().catch(() => {});
    },

    startMusic() {
      musicWanted = true;
      if (destroyed || globallyMuted || !unlocked || !music) return;
      music.preload = 'auto';
      music.play().catch(() => {});
    },

    stopMusic() {
      musicWanted = false;
      music?.pause();
    },

    applyMute() {
      if (!music) return;
      music.muted = globallyMuted;
      if (globallyMuted) music.pause();
      else if (musicWanted && unlocked) music.play().catch(() => {});
    },

    primeVoices() {
      for (const v of voices.values()) {
        for (const el of v.els) {
          el.preload = 'auto';
          el.play().then(() => { el.pause(); el.currentTime = 0; }).catch(() => {});
        }
      }
      if (musicWanted) mixer.startMusic();
    },

    destroy() {
      destroyed = true;
      mixers.delete(mixer);
      for (const v of voices.values()) {
        for (const el of v.els) {
          el.pause();
          el.removeAttribute('src');
          el.load();
        }
      }
      voices.clear();
      if (music) {
        if (onMusicError) music.removeEventListener('error', onMusicError);
        music.pause();
        music.removeAttribute('src');
        music.load();
        music = null;
      }
    },
  };

  mixers.add(mixer);
  mixer.applyMute();
  if (unlocked) mixer.primeVoices();
  return mixer;
}
