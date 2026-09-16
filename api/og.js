import Module, { createRequire } from 'node:module';
import { FONT } from './_font.js';
import { HB_WASM } from './_harfbuzz.js';
import { YOGA_WASM } from './_yoga.js';
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
 * satori needs two WASM modules, and both normally find their .wasm file on disk by path,
 * which Vercel's bundler cannot see and so does not ship. Both are handed their bytes
 * instead: yoga through satori's standalone build, HarfBuzz through `seedHarfBuzz`.
 *
 * Both renderers are imported inside the handler rather than at the top of the file. A
 * native binary or WASM module that fails to load at the top level kills the function
 * before any code runs, and the only thing anyone sees is a bare 500. Loaded here, the
 * failure is caught: the share still gets the static card, and the reason travels back in
 * a header.
 */
let renderers;
let stage = 'start';

/** Records the step about to run, so a failure reports where it happened, not just what. */
const step = (name, work) => {
  stage = name;
  return work();
};

const require = createRequire(import.meta.url);

/**
 * satori imports `harfbuzzjs`, whose entry point starts HarfBuzz with no options and so
 * reads hb.wasm from its own folder. There is no hook to pass the bytes through satori.
 *
 * Node checks its module cache before loading a CommonJS file, including when an ES module
 * imports it. So the entry point's cache slot is filled first with the same promise it
 * would have exported, built from the inlined WASM, and satori picks that up instead.
 */
function seedHarfBuzz() {
  const entry = require.resolve('harfbuzzjs');
  if (require.cache[entry]) return;

  const createHarfBuzz = require('harfbuzzjs/hb.js');
  const hbjs = require('harfbuzzjs/hbjs.js');

  const mod = new Module(entry);
  mod.filename = entry;
  mod.loaded = true;
  mod.exports = createHarfBuzz({ wasmBinary: HB_WASM }).then(hbjs);
  require.cache[entry] = mod;
}

function load() {
  renderers ??= (async () => {
    step('init harfbuzz', seedHarfBuzz);
    const satori = await step('import satori', () => import('satori/standalone'));
    await step('init yoga', () => satori.init(YOGA_WASM));
    const { Resvg } = await step('import resvg', () => import('@resvg/resvg-js'));
    return { satori: satori.default, Resvg };
  })();
  return renderers;
}

const SLASH = /[\\/]/;
const PATH = /(?:[A-Za-z]:)?(?:[\\/][^\s'"\\/]+)+/g;

/** Enough to diagnose from a curl: file names are kept, the directories above them are not. */
const describe = (err) =>
  `[${stage}] ${err?.code ?? err?.name ?? 'Error'}: ${err?.message ?? ''}`
    .replace(PATH, (p) => `.../${p.split(SLASH).pop()}`)
    .replace(/[^\x20-\x7e]/g, ' ')
    .slice(0, 200);

export async function GET(request) {
  const url = new URL(request.url);

  try {
    const { satori, Resvg } = await load();

    const svg = await step('layout', () =>
      satori(card(readRun(url.searchParams)), {
        width: WIDTH,
        height: HEIGHT,
        fonts: [{ name: 'Press Start 2P', data: FONT, weight: 400, style: 'normal' }],
      }),
    );
    const png = step('rasterise', () =>
      new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng(),
    );

    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        // The same parameters always produce the same card, so it can be cached hard.
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    // A failed load leaves rejected promises behind; drop them so the next request retries.
    renderers = undefined;
    delete require.cache[require.resolve('harfbuzzjs')];
    console.error('card render failed', err);

    // A share that cannot render its card should still share something. The redirect is
    // not cached, so a fixed deploy is picked up on the next request.
    return new Response(null, {
      status: 302,
      headers: {
        location: new URL('/og.png', url.origin).href,
        'cache-control': 'no-store',
        'x-card-error': describe(err),
      },
    });
  }
}
