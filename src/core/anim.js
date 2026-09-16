/**
 * Clip playback over an atlas built by the asset tools.
 *
 * An atlas is `{ frameWidth, frameHeight, columns, origin, clips: { name: { start, count,
 * fps, loop } } }`. The animator holds only a clip name and a clock, so switching
 * animation is a string assignment and nothing allocates per frame.
 */
export function createAnimator(atlas, initial) {
  let name = initial;
  let clip = atlas.clips[initial];
  let time = 0;

  if (!clip) throw new Error(`unknown clip "${initial}"`);

  return {
    get name() {
      return name;
    },

    get finished() {
      return !clip.loop && time * clip.fps >= clip.count;
    },

    /** Normalised progress, 0..1, clamped for non-looping clips. */
    get progress() {
      const p = (time * clip.fps) / clip.count;
      return clip.loop ? p % 1 : Math.min(1, p);
    },

    get frame() {
      const i = Math.floor(time * clip.fps);
      return clip.start + (clip.loop ? i % clip.count : Math.min(i, clip.count - 1));
    },

    /** Returns true if the clip actually changed. */
    play(next, { restart = false } = {}) {
      if (next === name && !restart) return false;
      const found = atlas.clips[next];
      if (!found) {
        console.warn(`unknown clip "${next}"`);
        return false;
      }
      name = next;
      clip = found;
      time = 0;
      return true;
    },

    update(dt) {
      time += dt;
    },
  };
}

/** Draws an atlas frame so the atlas origin lands on (x, y). */
export function drawAnim(ctx, sprites, sheet, atlas, frame, x, y) {
  const ox = atlas.origin?.x ?? atlas.frameWidth / 2;
  const oy = atlas.origin?.y ?? atlas.frameHeight;
  sprites.draw(ctx, sheet, frame, x - ox, y - oy);
}
