/**
 * Renders both share cards by calling the real endpoints, so what lands in shots/ is
 * byte-for-byte what a deploy would serve.
 *
 *   node tools/preview-card.mjs [outDir]
 */
import fs, { writeFileSync, mkdirSync } from 'node:fs';

/**
 * Vercel's bundler ships only the files it can see the code load, and it never saw the
 * .wasm files satori and HarfBuzz read by path - the first two deploys failed on exactly
 * that, while this script passed because the files were sitting in node_modules. So every
 * .wasm read is made to fail here, the way it would in a deployed function.
 */
const noWasm = (name) =>
  Object.assign(new Error(`ENOENT: no such file or directory, open '${name}'`), { code: 'ENOENT' });
const isWasm = (p) => String(p).endsWith('.wasm');
for (const [obj, key, async] of [
  [fs, 'readFileSync', false],
  [fs, 'readFile', 'callback'],
  [fs.promises, 'readFile', 'promise'],
]) {
  const real = obj[key];
  obj[key] = function (p, ...rest) {
    if (!isWasm(p)) return real.call(this, p, ...rest);
    if (async === 'promise') return Promise.reject(noWasm(p));
    if (async === 'callback') return void rest.at(-1)(noWasm(p));
    throw noWasm(p);
  };
}

const { GET: og } = await import('../api/og.js');
const { GET: page } = await import('../api/s.js');

const OUT = process.argv[2] ?? './shots';
mkdirSync(OUT, { recursive: true });

const ORIGIN = 'https://ionbreach.test';
const CASES = [
  ['card-win', 'o=won&s=47250&d=hard&b=47250'],
  ['card-loss', 'o=lost&s=12750&k=2&d=hard&b=29475'],
];

let failed = false;

for (const [name, query] of CASES) {
  const res = await og(new Request(`${ORIGIN}/api/og?${query}`));
  const body = Buffer.from(await res.arrayBuffer());
  const png = res.status === 200 && body.subarray(1, 4).toString() === 'PNG';
  if (png) writeFileSync(`${OUT}/${name}.png`, body);
  else failed = true;
  const why = res.headers.get('x-card-error');
  console.log(`${png ? 'ok  ' : 'FAIL'}  /api/og  ${name}  ${res.status}  ${Math.round(body.length / 1024)} kB${why ? '  ' + why : ''}`);

  const html = await (await page(new Request(`${ORIGIN}/s?${query}`))).text();
  const image = html.match(/og:image" content="([^"]*)"/)?.[1] ?? '';
  const pointsAtCard = image.startsWith(`${ORIGIN}/api/og?`);
  if (!pointsAtCard) failed = true;
  console.log(`${pointsAtCard ? 'ok  ' : 'FAIL'}  /s       ${name}  og:image -> ${image}`);
}

process.exit(failed ? 1 : 0);
