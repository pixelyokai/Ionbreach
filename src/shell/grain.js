/**
 * A single animated noise layer over the whole page, above every other layer including
 * the CRT frame and the HUD, and never intercepting input.
 *
 * The noise is generated once into a small tile; the movement is a CSS keyframe animation
 * jumping the layer between offsets. Nothing here runs per frame - no rAF, no regenerated
 * pixels, just a tiled background moved on the compositor.
 *
 * The speckle is symmetric black and white on a transparent ground, composited normally
 * rather than with an overlay blend. Overlay scales its effect with how bright the
 * backdrop is, and this game is dark: measured over the play field, an overlay layer moved
 * pixels by 0.4/255 on average, which is nothing. Normal blending holds the same amplitude
 * whatever is underneath, which is what grain is supposed to do.
 *
 * Slightly more black than white, because white speckle lifts dark pixels further than
 * black speckle lowers them, and without the bias the whole picture fogs upward.
 */
const TILE = 100;
const DENSITY = 0.9;     // fraction of pixels that carry any speckle at all
const WHITE_SHARE = 0.36; // the rest are black - see the note about fogging above

export function startGrain(el) {
  const tile = document.createElement('canvas');
  tile.width = TILE;
  tile.height = TILE;
  const ctx = tile.getContext('2d');
  const img = ctx.createImageData(TILE, TILE);

  for (let i = 0; i < img.data.length; i += 4) {
    if (Math.random() > DENSITY) continue;   // leave it fully transparent
    const v = Math.random() < WHITE_SHARE ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 255;
  }
  ctx.putImageData(img, 0, 0);

  el.style.backgroundImage = `url(${tile.toDataURL('image/png')})`;
  el.style.backgroundRepeat = 'repeat';
}
