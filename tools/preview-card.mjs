/**
 * Renders the share card locally so it can actually be looked at, instead of only existing
 * on a deployed URL.
 *
 * Satori does the layout - the same call the edge function makes - and a headless browser
 * rasterises the SVG it returns. @vercel/og's own Node build cannot be imported here (its
 * bundle dynamic-requires "fs"), but every decision worth reviewing lives in the SVG, so
 * the preview and the deployed card agree on everything except the rasteriser.
 *
 *   node tools/preview-card.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import satori from 'satori';
import { chromium } from 'playwright';
import { card, readRun, WIDTH, HEIGHT } from '../api/_card.js';

const OUT = process.argv[2] ?? './shots';
mkdirSync(OUT, { recursive: true });

const font = readFileSync('public/press-start-2p.ttf');

const CASES = [
  ['card-win', 'o=won&s=47250&d=hard&b=47250'],
  ['card-loss', 'o=lost&s=12750&k=2&d=hard&b=29475'],
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

for (const [name, query] of CASES) {
  const svg = await satori(card(readRun(new URLSearchParams(query))), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: 'Press Start 2P', data: font, weight: 400, style: 'normal' }],
  });
  writeFileSync(`${OUT}/${name}.svg`, svg);
  await page.setContent(
    `<style>*{margin:0}body{width:${WIDTH}px;height:${HEIGHT}px}</style>${svg}`,
    { waitUntil: 'load' },
  );
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png  ${WIDTH}x${HEIGHT}`);
}

await browser.close();
