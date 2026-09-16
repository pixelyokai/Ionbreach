/**
 * Inlines the card font into api/_font.js.
 *
 * The share-card function embeds its font instead of reading it from disk, so it has no
 * file to locate at runtime. Satori reads TTF, OTF and WOFF but not WOFF2, which is why
 * this is a separate file from the WOFF2 the game itself uses.
 *
 *   node tools/build-font-module.cjs
 */
const fs = require('fs');

const SRC = 'tools/fonts/press-start-2p.ttf';
const OUT = 'api/_font.js';

const b64 = fs.readFileSync(SRC).toString('base64');

fs.writeFileSync(
  OUT,
  `/**
 * Press Start 2P (SIL Open Font License 1.1), inlined as base64.
 *
 * Embedded rather than read from disk so the card function has no file to locate at
 * runtime: no path resolution, no import.meta, nothing for the bundler to miss.
 *
 * Generated from ${SRC} by tools/build-font-module.cjs.
 */
export const FONT = Buffer.from(
  '${b64}',
  'base64',
);
`,
);

console.log(`${OUT}  ${Math.round(fs.statSync(OUT).size / 1024)} kB`);
