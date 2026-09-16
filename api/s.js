import { readRun, shareCopy } from './_card.js';

/**
 * The page a shared run points at.
 *
 * It exists to carry meta tags: X fetches this URL, reads them, and never runs the script.
 * A person who follows the link is sent on to the game by the script, which a crawler does
 * not execute - so a redirect here would hand the crawler the game's generic card instead
 * of this run's.
 */
export const config = { runtime: 'edge' };

const escape = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export default function handler(request) {
  const url = new URL(request.url);
  const run = readRun(url.searchParams);
  const { title, description } = shareCopy(run);

  const image = `${url.origin}/api/og?${url.searchParams.toString()}`;
  const game = `${url.origin}/`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:image" content="${escape(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escape(url.href)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${escape(image)}" />
    <meta name="twitter:creator" content="@pixelyokai" />

    <link rel="canonical" href="${escape(game)}" />
  </head>
  <body>
    <p><a href="${escape(game)}">Play Ionbreach</a></p>
    <script>location.replace(${JSON.stringify(game)});</script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
