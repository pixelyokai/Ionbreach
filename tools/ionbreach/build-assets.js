/**
 * One-off asset build. Reads the CC0 source packs from assets-src/_extract/ and writes the
 * game-ready spritesheets into assets/. Run with: npm run assets
 *
 * The source art is drawn for a vertical scroller, so ships are rotated a quarter
 * turn here rather than at runtime: rotating in the build keeps the render path to
 * a single drawImage per sprite and keeps the pixels exact.
 */
const fs = require('fs');
const path = require('path');
const L = require('../imglib');

const SRC = 'assets-src/_extract/Spaceship-shooter-gamekit/Spaceship-shooter-gamekit/Assets';
const SHEETS = SRC + '/spritesheets';
const WARPED = 'assets-src/_extract/Legacy Collection/Legacy Collection/Assets/Warped/';
const OUT = 'src/games/ionbreach/assets/sprites';
const AUDIO_OUT = 'src/games/ionbreach/assets/audio';
const KENNEY = 'assets-src/_extract/kenney_sci-fi-sounds/Audio';
const MUSIC = 'assets-src/_extract/spaceship shooter music/spaceship shooter music';

const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const write = (name, img) => { L.encode(path.join(OUT, name), img); console.log('  ' + name + '  ' + img.width + 'x' + img.height); };

function rotateSheet(file, fw, fh, dir, cols) {
  const frames = L.slice(L.decode(file), fw, fh).map(dir === 'cw' ? L.rotCW : L.rotCCW);
  return L.pack(frames, cols);
}

function buildSprites() {
  console.log('sprites:');
  mkdir(OUT);

  // Player: 16x24 source frames, 5 tilt columns x 2 thruster rows. Rotated clockwise
  // so the nose points right; tilt then reads as pitch up/down.
  write('ship.png', rotateSheet(SHEETS + '/ship.png', 16, 24, 'cw', 5));

  // Enemies face left, so they rotate the other way.
  write('enemy-small.png', rotateSheet(SHEETS + '/enemy-small.png', 16, 16, 'ccw', 2));
  write('enemy-medium.png', rotateSheet(SHEETS + '/enemy-medium.png', 32, 16, 'ccw', 2));
  write('enemy-big.png', rotateSheet(SHEETS + '/enemy-big.png', 32, 32, 'ccw', 2));

  // Explosions are radial, no rotation needed.
  write('explosion.png', L.decode(SHEETS + '/explosion.png'));

  // laser-bolts.png is 2x2: row 0 is the small pink bolt, row 1 the blue tailed one.
  const bolts = L.slice(L.decode(SHEETS + '/laser-bolts.png'), 16, 16);
  write('bolt-player.png', L.pack([bolts[2], bolts[3]].map(L.rotCW), 2));
  write('bolt-enemy.png', L.pack([bolts[0], bolts[1]].map(L.rotCCW), 2));

  // Power-ups: one 2-frame pickup recoloured into the four drop types.
  // Order matches POWERUP_TYPES in src/data/powerups.js.
  const pu = L.slice(L.decode(SHEETS + '/power-up.png'), 16, 16).slice(0, 2);
  const tints = [
    { hue: 0.08, sat: 1.15 },  // spread  - orange
    { hue: 0.14, sat: 1.2 },   // rapid   - yellow
    { hue: 0.52, sat: 1.1 },   // shield  - cyan
    { hue: 0.33, sat: 1.1 },   // life    - green
  ];
  write('powerup.png', L.pack(tints.flatMap((t) => pu.map((f) => L.recolour(f, t))), 2));

  // The terrain plate keeps its original orientation - it is drawn to be read with the
  // light coming from the top, and rotating it to make it loop horizontally made the rock
  // read sideways. background.js mirror-tiles it instead, which loops seamlessly along the
  // scroll axis without touching the art.
  write('bg-far.png', L.decode(SRC + '/Desert/backgrounds/desert-backgorund.png'));
  write('bg-clouds.png', L.decode(SRC + '/Desert/backgrounds/clouds-transparent.png'));

  // A second terrain plate for the second sector. Like the desert it only tiles
  // vertically, so background.js mirror-tiles it the same way.
  write('bg-river.png', L.decode(SRC + '/River/PNG/background.png'));

  // Sector 3's plate. It tiles vertically on its own with no visible seam, so it needs no
  // mirroring help and almost no scrim - it is already dark enough for sprites to read.
  write('bg-nebula.png', L.decode(WARPED + 'Environments/top-down-space-environment/PNG/layers/stage-back.png'));
}

/**
 * Boss pipeline (PRD 9a): no new art. Composite stock enemies, upscale with
 * nearest-neighbour, palette-swap for identity, then derive the damage states
 * mechanically from the same base.
 */
/**
 * Boss pipeline (PRD 9a): no new art. Each boss is a different composite of the same stock
 * enemies, upscaled with nearest-neighbour and palette-swapped for its own identity, with
 * the damage states derived mechanically from the same base.
 *
 * Silhouette carries more than colour at this size, so the three differ in how they are
 * assembled - a wide mothership, a squat twin-hull, a tall spire - and only then in hue.
 */
const BOSS_DEFS = [
  {
    id: 'boss-01',
    // Deep violet: distinct from the wave enemies, still inside the pack's palette logic.
    hue: 0.78,
    sat: 1.15,
    light: -0.04,
    scale: 2,
    size: [64, 54],
    build: (c, { big, med, small }, phase, CW) => {
      // A wing bar built from two mirrored medium hulls, sitting behind the main hull.
      L.blit(c, med[phase], 0, 26);
      L.blit(c, med[phase], CW - med[phase].width, 26);
      L.blit(c, small[phase], 4, 36);
      L.blit(c, small[phase], CW - 20, 36);
      L.blit(c, big[phase], (CW - 32) >> 1, 0);
    },
  },
  {
    id: 'boss-02',
    // River teal, to sit against the green plate rather than on top of it.
    hue: 0.47,
    sat: 1.2,
    light: 0.02,
    scale: 2,
    size: [72, 48],
    build: (c, { big, med, small }, phase, CW) => {
      // Twin hulls yoked by a spine: wider and flatter than boss-01, so it reads as a
      // different machine before its colour registers.
      L.blit(c, big[phase], 2, 10);
      L.blit(c, big[phase], CW - 34, 10);
      L.blit(c, med[phase], (CW - 32) >> 1, 4);
      L.blit(c, med[phase], (CW - 32) >> 1, 22);
      L.blit(c, small[phase], (CW - 16) >> 1, 32);
    },
  },
  {
    id: 'boss-03',
    // Ember orange against the blue nebula - the one place a warm boss reads loudest.
    hue: 0.045,
    sat: 1.35,
    light: -0.02,
    scale: 2,
    size: [56, 72],
    build: (c, { big, med, small }, phase, CW) => {
      // A spire: stacked hulls with staggered pods, tall rather than wide, so after
      // rotation it is the longest boss on screen.
      L.blit(c, big[phase], (CW - 32) >> 1, 0);
      L.blit(c, big[phase], (CW - 32) >> 1, 24);
      L.blit(c, med[phase], (CW - 32) >> 1, 48);
      L.blit(c, small[phase], 2, 18);
      L.blit(c, small[phase], CW - 18, 18);
      L.blit(c, small[phase], 6, 44);
      L.blit(c, small[phase], CW - 22, 44);
    },
  },
];

function buildBoss() {
  console.log('bosses:');
  mkdir(OUT + '/bosses');

  const parts = {
    big: L.slice(L.decode(SHEETS + '/enemy-big.png'), 32, 32),
    med: L.slice(L.decode(SHEETS + '/enemy-medium.png'), 32, 16),
    small: L.slice(L.decode(SHEETS + '/enemy-small.png'), 16, 16),
  };

  for (const def of BOSS_DEFS) {
    const [CW, CH] = def.size;
    // Composite at 1x in the source's nose-up space, then rotate and scale once.
    const compose = (phase) => {
      const c = L.blank(CW, CH);
      def.build(c, parts, phase, CW, CH);
      return c;
    };

    const identity = (img) => L.recolour(img, { hue: def.hue, sat: def.sat, light: def.light });
    const base = [0, 1].map((p2) => L.scale(L.rotCCW(identity(compose(p2))), def.scale));

    const damaged = base.map((f) => L.recolour(f, { hue: 0.02, sat: 1.3, light: -0.08, keepDark: 0.12 }));
    // Critical: the same art cracked open along a few seams, not dissolved into noise.
    const critical = damaged.map((f) => L.mapPixels(f, (c, x, y) => {
      const seam = Math.abs(Math.sin(y * 0.11 + Math.cos(x * 0.045) * 1.7));
      if (seam < 0.05) return [0, 0, 0, 0];
      if (seam < 0.12) return [40, 16, 18, c[3]];
      return c;
    }));
    const flash = base.map((f) => L.mapPixels(f, (c) => [255, 255, 255, c[3]]));

    const frames = [...base, ...damaged, ...critical, ...flash];
    const sheet = L.pack(frames, 2);
    L.encode(OUT + '/bosses/' + def.id + '.png', sheet);

    const fw = frames[0].width, fh = frames[0].height;
    fs.writeFileSync(
      OUT + '/bosses/' + def.id + '.json',
      JSON.stringify({
        image: def.id + '.png',
        frameWidth: fw,
        frameHeight: fh,
        columns: 2,
        states: { normal: [0, 1], damaged: [2, 3], critical: [4, 5], flash: [6, 7] },
      }, null, 2) + '\n',
    );
    console.log('  ' + def.id + '.png  ' + sheet.width + 'x' + sheet.height + '  (frame ' + fw + 'x' + fh + ')');
  }
}

function buildAudio() {
  console.log('audio:');
  mkdir(AUDIO_OUT);
  const copy = (from, to) => { fs.copyFileSync(from, path.join(AUDIO_OUT, to)); console.log('  ' + to); };
  copy(KENNEY + '/laserSmall_000.ogg', 'shoot.ogg');
  copy(KENNEY + '/laserRetro_001.ogg', 'enemy-shoot.ogg');
  copy(KENNEY + '/explosionCrunch_000.ogg', 'explode.ogg');
  copy(KENNEY + '/lowFrequency_explosion_000.ogg', 'explode-big.ogg');
  copy(KENNEY + '/impactMetal_003.ogg', 'hit.ogg');
  copy(KENNEY + '/forceField_000.ogg', 'pickup.ogg');
  copy(KENNEY + '/forceField_004.ogg', 'shield.ogg');
  copy(KENNEY + '/lowFrequency_explosion_001.ogg', 'player-death.ogg');
  copy(MUSIC + '/spaceship shooter .ogg', 'music.ogg');
  copy(MUSIC + '/spaceship shooter .mp3', 'music.mp3');
}

buildSprites();
buildBoss();
buildAudio();
console.log('done.');
