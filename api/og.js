import { readFile } from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { card, readRun, WIDTH, HEIGHT } from './_card.js';

/**
 * The share card, rendered per run.
 *
 * X reads the meta tags of a shared URL server-side and does not run JavaScript, so a card
 * carrying this run's score cannot come from a static file - it has to be rendered on
 * request. Everything the card shows arrives in the query string and is clamped in
 * `readRun`, so a crafted URL produces a boring card rather than a forged one.
 *
 * Node runtime, with satori and resvg called directly. @vercel/og wraps the same two
 * libraries, but outside Next.js it resolves to a build that the Edge runtime rejects and
 * that fails to load under Node as well.
 *
 * The font is read from disk rather than fetched from the site. A fetch back to the
 * deployment's own origin goes through Vercel Authentication on preview deployments and
 * would come back as a login page.
 */
const FONT_URL = new URL('./_fonts/press-start-2p.ttf', import.meta.url);

// Held for the life of the instance, so a warm function renders without touching disk.
let fontData;

async function font() {
  fontData ??= await readFile(FONT_URL);
  return fontData;
}

export async function GET(request) {
  const url = new URL(request.url);

  try {
    const svg = await satori(card(readRun(url.searchParams)), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Press Start 2P', data: await font(), weight: 400, style: 'normal' }],
    });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();

    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // The same parameters always produce the same card, so it can be cached hard.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('card render failed', err);
    // A share that cannot render its card should still share something.
    return Response.redirect(new URL('/og.png', url.origin), 302);
  }
}
