import { ImageResponse } from '@vercel/og';
import { card, readRun, WIDTH, HEIGHT } from './_card.js';

/**
 * The share card, rendered per run.
 *
 * X reads the meta tags of a shared URL server-side and does not run JavaScript, so a card
 * carrying this run's score cannot come from a static file - it has to be rendered on
 * request. Everything the card shows arrives in the query string and is clamped in
 * `readRun`, so a crafted URL produces a boring card rather than a forged one.
 */
export const config = { runtime: 'edge' };

// The font is fetched from the deployment's own origin and held for the life of the
// isolate, so a warm instance renders without a round trip.
let fontData;

async function font(origin) {
  if (!fontData) {
    const res = await fetch(new URL('/press-start-2p.ttf', origin));
    if (!res.ok) throw new Error(`font ${res.status}`);
    fontData = await res.arrayBuffer();
  }
  return fontData;
}

export default async function handler(request) {
  const url = new URL(request.url);

  try {
    return new ImageResponse(card(readRun(url.searchParams)), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Press Start 2P', data: await font(url.origin), weight: 400, style: 'normal' }],
      headers: {
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
