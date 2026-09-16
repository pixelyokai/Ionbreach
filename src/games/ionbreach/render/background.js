import { VIEW_W, VIEW_H } from '../config.js';
import { sheet } from './sprites.js';

/**
 * Parallax, drawn back to front:
 *
 *   1. the terrain plate, scrolling slowly
 *   2. a scrim that knocks the terrain back
 *   3. two cloud banks at different speeds and opacities, above the scrim
 *
 * The scrim is the important part. The source terrain is high contrast and busy, and
 * without it the enemies disappear into the rock - a shmup where you cannot find the
 * bullets is not a shmup. Knocking the plate back also gives the clouds something to
 * read against, which is where the depth actually comes from.
 */
const TERRAIN_SPEED = 13;

const CLOUDS = [
  { sheet: 'bgClouds', speed: 30, y: -12, alpha: 0.3 },
  { sheet: 'bgClouds', speed: 58, yFromBottom: 92, alpha: 0.22 },
];

const DEFAULT_SCRIM = 'rgba(20, 12, 16, 0.46)';

export function createBackground(level) {
  return {
    terrain: 0,
    clouds: CLOUDS.map(() => 0),
    sheet: level?.terrain ?? 'bgFar',
    scrim: level?.scrim ?? DEFAULT_SCRIM,
  };
}

export function updateBackground(bg, dt, speedScale = 1) {
  // The terrain repeats every two tiles because every other tile is mirrored.
  const period = sheet(bg.sheet).fw * 2;
  bg.terrain = (bg.terrain + TERRAIN_SPEED * speedScale * dt) % period;
  for (let i = 0; i < CLOUDS.length; i++) {
    const w = sheet(CLOUDS[i].sheet).fw;
    bg.clouds[i] = (bg.clouds[i] + CLOUDS[i].speed * speedScale * dt) % w;
  }
}

/**
 * The terrain art is drawn to be read with the light from the top, and it only tiles
 * along its vertical axis. Rather than rotate it - which loops fine but leaves the rock
 * lying on its side - every other tile is flipped horizontally. A mirrored seam matches
 * its neighbour exactly, so the plate loops along the scroll axis with the art the right
 * way up.
 */
function tileTerrain(ctx, name, offset) {
  const s = sheet(name);
  const w = s.fw;
  const start = Math.floor(offset / w);
  const shift = offset - start * w;

  for (let i = 0, x = -shift; x < VIEW_W; i++, x += w) {
    const mirrored = (start + i) % 2 !== 0;
    if (mirrored) {
      ctx.save();
      ctx.translate(Math.round(x) + w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(s.img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(s.img, Math.round(x), 0);
    }
  }
}

function tileClouds(ctx, name, offset, y) {
  const s = sheet(name);
  for (let x = -Math.round(offset); x < VIEW_W; x += s.fw) {
    ctx.drawImage(s.img, x, y);
  }
}

export function drawBackground(ctx, bg) {
  ctx.fillStyle = '#2b1b16';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  tileTerrain(ctx, bg.sheet, bg.terrain);

  ctx.fillStyle = bg.scrim;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  for (let i = 0; i < CLOUDS.length; i++) {
    const layer = CLOUDS[i];
    const y = layer.yFromBottom !== undefined ? VIEW_H - layer.yFromBottom : layer.y;
    ctx.globalAlpha = layer.alpha;
    tileClouds(ctx, layer.sheet, bg.clouds[i], y);
  }
  ctx.globalAlpha = 1;
}
