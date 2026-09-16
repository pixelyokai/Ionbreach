/**
 * Renders both share cards by calling the real endpoints, so what lands in shots/ is
 * byte-for-byte what a deploy would serve.
 *
 *   node tools/preview-card.mjs [outDir]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { GET as og } from '../api/og.js';
import { GET as page } from '../api/s.js';

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
  console.log(`${png ? 'ok  ' : 'FAIL'}  /api/og  ${name}  ${res.status}  ${Math.round(body.length / 1024)} kB`);

  const html = await (await page(new Request(`${ORIGIN}/s?${query}`))).text();
  const image = html.match(/og:image" content="([^"]*)"/)?.[1] ?? '';
  const pointsAtCard = image.startsWith(`${ORIGIN}/api/og?`);
  if (!pointsAtCard) failed = true;
  console.log(`${pointsAtCard ? 'ok  ' : 'FAIL'}  /s       ${name}  og:image -> ${image}`);
}

process.exit(failed ? 1 : 0);
