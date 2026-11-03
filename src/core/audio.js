/**
 * SFX over Web Audio, music over HTML5 Audio.
 *
 * Effects are decoded once into buffers and fired as one-shot sources. They used to be
 * rings of <audio> clones, and on iOS rewinding and replaying a media element several
 * times a second stalls the main thread - the game hitched on every shot. The clones are
 * kept only as a fallback where Web Audio is missing or a file will not decode.
 *
 * Each effect caps how many copies overlap, and a per-sound cooldown stops a dense frame
 * from stacking copies into a clipping mess. Music stays a streamed element: it is a
 * megabyte that would otherwise have to be decoded whole before the first note.
 *
 * Mute is global and persists across cartridges.
 */
const MUTE_KEY = 'ionbreach.muted';

let globallyMuted = readMuted();
let unlocked = false;
let context = null;
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
  applySession();
  for (const m of mixers) m.applyMute();
  for (const fn of muteListeners) fn(globallyMuted);
}

/**
 * iOS files Web Audio under the ringer switch unless the page asks to be a player. Only
 * asked while sound is on, so a muted game never cuts off whatever else the phone plays.
 */
function applySession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = globallyMuted ? 'auto' : 'playback';
  } catch {
    /* not supported; the default session is used */
  }
}

export function onMuteChange(fn) {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

/** Mobile browsers block audio until a user gesture; the title screen is the gate. */
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  try {
    context = Ctx ? new Ctx() : null;
  } catch {
    context = null;
  }
  applySession();
  for (const m of mixers) m.primeVoices();
}

/**
 * Called on every gesture, not just the first. iOS suspends the audio context and pauses
 * media elements on its own - an interruption, a lock, a notification - and neither comes
 * back by itself. A gesture is the only moment a page is allowed to restart them, so each
 * tap (the RESUME button included) puts back whatever should be playing.
 */
export function heal() {
  if (!unlocked) return;
  if (context && context.state !== 'running') context.resume().catch(() => {});
  for (const m of mixers) m.healMusic();
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
      src,
      index: 0,
      volume,
      cooldown,
      count,
      buffer: null,
      loading: false,
      failed: false,
      gain: null,
      live: new Set(),
      // Fallback clones, made only if Web Audio cannot play this sound.
      els: null,
    });
    lastPlayed.set(name, 0);
  }

  /** Fetches and decodes one effect. A failure drops that effect to the element path. */
  function load(v) {
    if (v.loading || v.buffer || v.failed) return;
    if (!context) {
      v.failed = true;
      return;
    }
    v.loading = true;
    fetch(v.src)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        if (destroyed) return;
        v.buffer = buffer;
        v.gain = context.createGain();
        v.gain.gain.value = v.volume;
        v.gain.connect(context.destination);
      })
      .catch(() => {
        v.failed = true;
      })
      .finally(() => {
        v.loading = false;
      });
  }

  function fallbackEls(v) {
    if (!v.els) {
      v.els = Array.from({ length: v.count }, () => {
        const a = new Audio(v.src);
        a.preload = 'auto';
        a.volume = v.volume;
        return a;
      });
    }
    return v.els;
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

      if (v.buffer) {
        if (context.state !== 'running' || v.live.size >= v.count) return;
        const source = context.createBufferSource();
        source.buffer = v.buffer;
        source.connect(v.gain);
        source.onended = () => {
          v.live.delete(source);
          source.disconnect();
        };
        v.live.add(source);
        source.start();
        return;
      }

      // Still decoding: dropping one early shot is better than racing the decoder.
      if (!v.failed) return;
      const els = fallbackEls(v);
      const el = els[v.index];
      v.index = (v.index + 1) % els.length;
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

    /** Restarts the track if the system paused it behind our back. */
    healMusic() {
      if (destroyed || !music || !musicWanted || globallyMuted || !unlocked) return;
      if (music.paused) music.play().catch(() => {});
    },

    primeVoices() {
      for (const v of voices.values()) load(v);
      if (musicWanted) mixer.startMusic();
    },

    destroy() {
      destroyed = true;
      mixers.delete(mixer);
      for (const v of voices.values()) {
        for (const source of v.live) {
          source.onended = null;
          try {
            source.stop();
          } catch {
            /* already finished */
          }
          source.disconnect();
        }
        v.live.clear();
        v.gain?.disconnect();
        for (const el of v.els ?? []) {
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
