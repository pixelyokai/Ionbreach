/**
 * Favicons, from the game's own ship sprite.
 *
 * The whole sprite is 24x16 including its thruster plume, which at 32px reads as a smear.
 * The icon uses the 16x16 hull instead: square, and the part of the ship anyone would
 * recognise. Everything is composed at that 16px base and then scaled by a whole number,
 * so no output is ever resampled - an icon that blurs is an icon drawn at the wrong size.
 *
 *   node tools/build-brand.js
 */
const fs = require('fs');
const path = require('path');
const { decode, encode, blank, crop, scale, blit, set, get } = require('./imglib');

const SPRITES = 'src/games/ionbreach/assets/sprites';
const OUT = 'public';

// theme.css, dungeon torch (dark): --card, as sRGB.
const CARD = [38, 31, 27, 255];

// The ship points right with its plume trailing left; the hull is the right 16 columns.
const HULL = { x: 8, y: 0, size: 16 };

const SIZES = [
  ['favicon-32.png', 2],
  ['favicon-192.png', 12],
  ['apple-touch-icon.png', 12],
];

/** Composites over the plate, so a transparent icon never shows through as white. */
function flatten(img, bg) {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const [r, g, b, a] = get(img, x, y);
      if (a === 255) continue;
      const t = a / 255;
      set(img, x, y, [
        Math.round(r * t + bg[0] * (1 - t)),
        Math.round(g * t + bg[1] * (1 - t)),
        Math.round(b * t + bg[2] * (1 - t)),
        255,
      ]);
    }
  }
  return img;
}

const sheet = decode(path.join(SPRITES, 'ship.png'));
const base = flatten(crop(sheet, HULL.x, HULL.y, HULL.size, HULL.size), CARD);

fs.mkdirSync(OUT, { recursive: true });

for (const [name, factor] of SIZES) {
  const img = scale(base, factor);
  encode(path.join(OUT, name), img);
  console.log(`${name}  ${img.width}x${img.height}`);
}
