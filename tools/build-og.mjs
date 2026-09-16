/**
 * The Open Graph card, rendered in a real browser so it uses the game's actual font and
 * the theme tokens rather than an approximation of them.
 *
 * Everything is inlined as a data URI: the page never hits the network, so the output is
 * the same whether or not a font CDN is reachable, and the script needs no dev server.
 *
 *   node tools/build-og.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;
const OUT = 'public/og.png';

const dataUri = (file, mime) => `data:${mime};base64,${readFileSync(file).toString('base64')}`;

const font = dataUri('src/assets/fonts/press-start-2p-latin.woff2', 'font/woff2');
const plate = dataUri('src/games/ionbreach/assets/sprites/bg-far.png', 'image/png');
const ship = dataUri('src/games/ionbreach/assets/sprites/ship.png', 'image/png');

// The sheet is 5 columns x 2 rows of 24x16; the card wants the neutral frame.
const SHIP_SCALE = 10;

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Press Start 2P';
    src: url('${font}') format('woff2');
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden; position: relative;
    background: oklch(0.15 0.02 40);
    font-family: 'Press Start 2P', monospace;
    color: oklch(0.92 0.03 55);
  }
  /* Mirror-tiled, the way background.js tiles it in game: a straight repeat puts a hard
     vertical seam at 768px, straight through the card. */
  .plate { position: absolute; inset: 0; display: flex; }
  .plate span {
    flex: 0 0 ${256 * 3}px; height: 100%;
    background-image: url('${plate}');
    background-repeat: repeat-y;
    background-size: ${256 * 3}px ${272 * 3}px;
    image-rendering: pixelated;
  }
  .plate span:nth-child(even) { transform: scaleX(-1); }
  /* The plate is busy mid-tone art; the card is type, so it gets knocked back hard. */
  .scrim {
    position: absolute; inset: 0;
    background:
      radial-gradient(120% 90% at 50% 45%, oklch(0.15 0.02 40 / 0.55) 0%, oklch(0.12 0.02 40 / 0.9) 70%),
      linear-gradient(180deg, oklch(0.12 0.02 40 / 0.55), oklch(0.12 0.02 40 / 0.85));
  }
  .frame {
    position: absolute; inset: 40px;
    border-top: 12px solid oklch(0.7 0.15 55);
    border-bottom: 12px solid oklch(0.7 0.15 55);
  }
  .frame::after {
    content: ''; position: absolute; inset: 0; margin: 0 -12px;
    border-left: 12px solid oklch(0.7 0.15 55);
    border-right: 12px solid oklch(0.7 0.15 55);
  }
  .stack {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 30px; padding: 0 90px; text-align: center;
  }
  h1 {
    font-size: 78px; letter-spacing: 6px; line-height: 1.2;
    color: oklch(0.82 0.16 62);
    text-shadow: 7px 7px 0 oklch(0.3 0.09 40);
  }
  p {
    font-size: 19px; letter-spacing: 2px; line-height: 1.6;
    color: oklch(0.74 0.04 50); max-width: 860px;
  }
  .ship {
    width: ${24 * SHIP_SCALE}px; height: ${16 * SHIP_SCALE}px;
    background-image: url('${ship}');
    background-size: ${120 * SHIP_SCALE}px ${32 * SHIP_SCALE}px;
    background-position: 0 0;
    image-rendering: pixelated;
  }
  .tag {
    font-size: 20px; letter-spacing: 3px; color: oklch(0.7 0.15 55);
  }
</style>
<div class="plate"><span></span><span></span></div>
<div class="scrim"></div>
<div class="stack">
  <div class="ship"></div>
  <h1>IONBREACH</h1>
  <p>Three sectors. Three bosses. No continues.</p>
  <div class="tag">DODGE &middot; SHOOT &middot; SURVIVE</div>
</div>
<div class="frame"></div>
`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(150);

mkdirSync('public', { recursive: true });
await page.screenshot({ path: OUT });
await browser.close();

console.log(`${OUT}  ${W}x${H}`);
