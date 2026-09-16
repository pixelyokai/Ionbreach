import { FONT } from './_font.js';
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
 * Both renderers are imported inside the handler rather than at the top of the file. A
 * native binary or WASM module that fails to load at the top level kills the function
 * before any code runs, and the only thing anyone sees is a bare 500. Loaded here, the
 * failure is caught: the share still gets the static card, and the reason travels back in
 * a header.
 */
let renderers;

async function load() {
  renderers ??= Promise.all([import('satori'), import('@resvg/resvg-js')]).then(
    ([satori, resvg]) => ({ satori: satori.default, Resvg: resvg.Resvg }),
  );
  return renderers;
}

export async function GET(request) {
  const url = new URL(request.url);

  try {
    const { satori, Resvg } = await load();
    const svg = await satori(card(readRun(url.searchParams)), {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Press Start 2P', data: FONT, weight: 400, style: 'normal' }],
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
    // A failed load leaves a rejected promise behind; drop it so the next request retries.
    renderers = undefined;
    console.error('card render failed', err);

    // A share that cannot render its card should still share something. The redirect is
    // not cached, so a fixed deploy is picked up on the next request.
    // Enough to diagnose from a curl, with server paths stripped out.
    const reason = `${err?.code ?? err?.name ?? 'Error'}: ${err?.message ?? ''}`
      .replace(/(?:[A-Za-z]:)?[\\/][^\s'"]+/g, '<path>')
      .replace(/[^\x20-\x7e]/g, ' ')
      .slice(0, 160);
    return new Response(null, {
      status: 302,
      headers: {
        location: new URL('/og.png', url.origin).href,
        'cache-control': 'no-store',
        'x-card-error': reason,
      },
    });
  }
}
