/**
 * The Open Graph card for the homepage: a real frame of the first sector with the title
 * wordmark and tagline over it. The frame comes from the running game rather than a
 * mock-up, so the card shows what the link actually opens.
 *
 * Needs the dev server:
 *   npm run dev
 *   node tools/build-og.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;
const OUT = 'public/og.png';
const URL = 'http://localhost:5173/';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
// Keeps the dev-only annotation toolbar out of the shot.
await page.addInitScript(() => { window.__noDevTools = true; });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__ionbreach), null, { timeout: 20000 });
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'START', exact: true }).click();
// Long enough for the first wave to be on screen, short enough that nothing has died yet.
await page.waitForTimeout(3200);
// The title sits on a layer of its own above everything, the CRT stack included.
// The bezel's rounded corners are for a screen, not a full-bleed card, so the vignette goes.
await page.evaluate(() => {
  document.querySelector('.vignette').style.display = 'none';

  const layer = document.createElement('div');
  layer.style.cssText =
    'position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:36px;pointer-events:none;' +
    'background:radial-gradient(70% 60% at 50% 50%, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.1))';

  const title = document.createElement('div');
  title.className = 'retro title-plate';
  title.textContent = 'IONBREACH';
  title.style.cssText = 'font-size:92px;line-height:1;letter-spacing:4px;margin:0';

  const tag = document.createElement('div');
  tag.className = 'retro';
  tag.textContent = 'DODGE. SHOOT. SURVIVE. REPEAT.';
  tag.style.cssText =
    'font-size:26px;letter-spacing:2px;color:#f4ecdc;text-shadow:3px 3px 0 rgb(0 0 0 / 0.85)';

  layer.append(title, tag);
  document.body.append(layer);
});
await page.waitForTimeout(300);

mkdirSync('public', { recursive: true });
await page.screenshot({ path: OUT });
await browser.close();

console.log(`${OUT}  ${W}x${H}`);
