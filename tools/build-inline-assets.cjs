/**
 * Inlines the binary files the share-card function needs into plain JS modules.
 *
 * The function never reads a file at runtime. Vercel's bundler decides what to ship by
 * reading the code, and it misses files loaded by path: satori's yoga.wasm was left out of
 * the first deploy, and the card failed with ENOENT inside the WASM loader. A base64 string
 * inside an imported module cannot be left behind.
 *
 * yoga.wasm has to match the satori JavaScript that loads it, so satori is pinned to an
 * exact version in package.json. Re-run this after changing that version.
 *
 *   node tools/build-inline-assets.cjs
 */
const fs = require('fs');

const satoriVersion = require('satori/package.json').version;

const ASSETS = [
  {
    out: 'api/_font.js',
    src: 'tools/fonts/press-start-2p.ttf',
    name: 'FONT',
    about: 'Press Start 2P (SIL Open Font License 1.1). Satori reads TTF but not WOFF2.',
  },
  {
    out: 'api/_yoga.js',
    src: require.resolve('satori/yoga.wasm'),
    name: 'YOGA_WASM',
    about: `The yoga layout engine that satori ${satoriVersion} runs on.`,
    label: `satori@${satoriVersion}/yoga.wasm`,
  },
];

for (const { out, src, name, about, label } of ASSETS) {
  const b64 = fs.readFileSync(src).toString('base64');
  fs.writeFileSync(
    out,
    `/**
 * ${about}
 *
 * Inlined as base64 so the function has no file to find at runtime.
 * Generated from ${label ?? src} by tools/build-inline-assets.cjs.
 */
export const ${name} = Buffer.from(
  '${b64}',
  'base64',
);
`,
  );
  console.log(`${out}  ${Math.round(fs.statSync(out).size / 1024)} kB`);
}
