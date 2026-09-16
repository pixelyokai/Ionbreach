import { rt } from '../runtime.js';
import { LEVELS } from '../data/levels.js';

// Static prefixes so the bundler resolves every asset at build time.
const spriteUrl = (f) => new URL(`../assets/sprites/${f}`, import.meta.url).href;
const bossUrl = (f) => new URL(`../assets/sprites/bosses/${f}`, import.meta.url).href;

const SHEET_DEFS = {
  ship: { src: spriteUrl('ship.png'), fw: 24, fh: 16, cols: 5 },
  enemySmall: { src: spriteUrl('enemy-small.png'), fw: 16, fh: 16, cols: 2 },
  enemyMedium: { src: spriteUrl('enemy-medium.png'), fw: 16, fh: 32, cols: 2 },
  enemyBig: { src: spriteUrl('enemy-big.png'), fw: 32, fh: 32, cols: 2 },
  explosion: { src: spriteUrl('explosion.png'), fw: 16, fh: 16, cols: 5 },
  boltPlayer: { src: spriteUrl('bolt-player.png'), fw: 16, fh: 16, cols: 2 },
  boltEnemy: { src: spriteUrl('bolt-enemy.png'), fw: 16, fh: 16, cols: 2 },
  powerup: { src: spriteUrl('powerup.png'), fw: 16, fh: 16, cols: 2 },
  bgFar: { src: spriteUrl('bg-far.png'), fw: 256, fh: 272, cols: 1 },
  bgRiver: { src: spriteUrl('bg-river.png'), fw: 256, fh: 320, cols: 1 },
  bgNebula: { src: spriteUrl('bg-nebula.png'), fw: 256, fh: 320, cols: 1 },
  bgClouds: { src: spriteUrl('bg-clouds.png'), fw: 256, fh: 103, cols: 1 },
};

const FLASH_SHEETS = ['enemySmall', 'enemyMedium', 'enemyBig'];

/** Boss atlases by id, so a level names its boss and the renderer looks it up. */
const bossAtlases = new Map();

export const bossAtlas = (id) => bossAtlases.get(id) ?? null;

export async function loadSprites() {
  const ids = [...new Set(LEVELS.map((l) => l.boss))];
  const atlases = await Promise.all(
    ids.map((id) => fetch(bossUrl(`${id}.json`)).then((r) => r.json())),
  );

  const defs = { ...SHEET_DEFS };
  ids.forEach((id, i) => {
    const atlas = atlases[i];
    bossAtlases.set(id, atlas);
    defs[`boss:${id}`] = {
      src: bossUrl(atlas.image),
      fw: atlas.frameWidth,
      fh: atlas.frameHeight,
      cols: atlas.columns,
    };
  });

  await rt.sprites.load(defs);
  for (const name of FLASH_SHEETS) rt.sprites.addFlashSheet(name);
}

export const frameSize = (name) => rt.sprites.sheet(name);
export const sheet = (name) => rt.sprites.sheet(name);

export function drawFrame(ctx, name, frame, x, y) {
  rt.sprites.draw(ctx, name, frame, x, y);
}
