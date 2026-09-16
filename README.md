# Ionbreach

A side-scrolling shooter that runs in the browser. Three sectors, a boss at the end of
each, no continues. It takes about ten minutes to finish if you are good at it.

Play it: hold the left third of the screen, keep moving, shoot everything.

![The title screen](docs/screenshots/menu.png)

## Running it

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static files into dist/
npm run test    # headless test pass, dev server must be running
```

## What is in it

Three sectors, each with its own terrain and its own boss: Dust Line, Riverrun, Nebula.
Beat a boss and you fly straight into the next sector with your score intact. Beat the
last one and you win.

Three difficulty settings. They are not cosmetic:

| | Enemy speed | Enemy fire rate | Lives | Score |
| --- | --- | --- | --- | --- |
| Easy | ×0.7 | slower | 5 | ×0.5 |
| Normal | ×1 | normal | 3 | ×1 |
| Hard | ×1.5 | faster | 2 | ×2 |

An enemy reads the setting when it spawns, not every frame. Changing difficulty in the
middle of a run would otherwise retune ships that are already on screen. A run also
records the difficulty it started on, so you cannot finish on Easy and have it scored as
Hard.

![Difficulty screen](docs/screenshots/difficulty.png)

Your last ten runs are kept, ranked by score, with a reset button. Everything is in your
own browser. There is no account and no leaderboard.

## How it is built

The game is plain JavaScript drawing to a Canvas 2D context. No engine, no framework, no
game loop library. The menus are React, and that is the only thing React does here. The
two sides talk through one small file (`src/ui/bridge.js`) that can say "show this panel"
and "hide it". The game never touches React state and React never reads the game.

Menus use [8bitcn](https://www.8bitcn.com/) on its dungeon torch theme. The component set
is copied into `src/ui/components.jsx` rather than installed, which is how shadcn-style
libraries are meant to be used. Type never goes below 13px. Press Start 2P has no
lowercase and a tall x-height, and below 13px the glyph edges stop landing on whole
pixels.

The play field resizes with the window instead of sitting at a fixed 320x240. The sprite
scale is locked to a whole number, so a wider monitor gives you more field rather than
bigger pixels, and nothing ever gets resampled. The field is capped at 272px tall because
that is how tall the terrain art is.

Over the top of all that is a CRT effect: scanlines, a rolling bar, a soft bloom, and
animated grain. It is all CSS layers above the canvas, so none of it touches the pixels
the game draws.

![Playing](docs/screenshots/playing.png)

## Layout

```
api/            two serverless functions, for share cards
docs/           the original spec and screenshots
public/         favicons and the default OG image
tools/          asset builds and the test runner
src/
  main.js       boots the shell and the router
  core/         loop, input, canvas, audio, sprites, particles, collision,
                pooling, storage, run log, router, cartridge contract
  shell/        the CRT layers
  ui/           React menus
  games/ionbreach/  the game itself
```

Game art is imported through Vite and never put in `public/`. Some of the source packs do
not allow you to redistribute the raw files, and a browsable asset folder is exactly that.
The favicons and the default OG image are the exception, because a browser or a crawler
has to be able to fetch them at a fixed path.

## Adding a sector

Sectors are data. `src/games/ionbreach/data/levels.js` holds the list, and the spawner,
background, HUD and boss all read from it.

```js
{ id, name, terrain, scrim, waves, boss }
```

1. Write the waves in `data/waves.js`. A wave is `{ gapAfter, spawns: [{ type, at, y }] }`,
   where `at` is seconds into the wave and `y` is a fraction of the field height. Make it
   harder by mixing enemy types and tightening the spacing, not by scaling numbers up.
2. Add a terrain plate in `tools/ionbreach/build-assets.js` and declare it in
   `render/sprites.js`. Plates only need to tile vertically. The background mirror-tiles
   them sideways, so the art keeps the orientation it was drawn in.
3. Add a boss to `BOSS_DEFS` in the same build script. It composites stock parts into a
   silhouette, scales it up, recolours it and works out the damage states from there. Then
   give it health and attack phases in `BOSSES` in `entities/boss.js`.

Bosses should read apart by shape first and colour second. Three orange blobs of different
sizes is not three bosses.

## Asset builds

These are one-off. The output is committed, so you do not need to run them to work on the
game.

```bash
npm run assets:ionbreach     # sprites, terrain, bosses, audio
npm run assets:shell         # the CRT corner frame
npm run assets:brand         # favicons, the default OG image, inlined card assets
node tools/preview-card.mjs  # renders both share cards into shots/
```

The default OG image is a real frame of the first sector with the title on top, so
`assets:brand` needs the dev server running. If you change the image, bump the `?v=` on
its URL in `index.html`. X caches images by URL and will keep showing the old one
otherwise.

The favicon is the ship's 16x16 hull, not the whole 24x16 sprite. The sprite includes a
thruster flame that turns into a smudge at 32px. Everything is built at a 16px base and
scaled by whole numbers, so no icon is ever resampled.

## Sharing a run

The share button posts to X with a card showing that run's score, sector and difficulty.

![A share card](docs/screenshots/share-card.png)

This needs a server. X fetches whatever URL you share, reads the meta tags, and does not
run any JavaScript, so a card with your score on it cannot come from a static file. Two
small functions handle it:

- `/s?o=won&s=47250&k=3&d=hard&b=47250` is the page X reads. Meta tags, then a script that
  sends a person on to the game.
- `/api/og?...` draws the card. `satori` lays it out as SVG and `@resvg/resvg-js` turns
  that into a PNG.

`/s` forwards people with a script instead of an HTTP redirect on purpose. A crawler does
not run scripts, so a redirect would hand it the game's generic card instead of your run.

Both run on Vercel's Node runtime. I started with `@vercel/og`, which wraps the same two
libraries, but outside Next.js it resolves to a build the Edge runtime refuses to deploy,
and that same build fails to load under plain Node too. Calling satori and resvg directly
is less code and has nothing to go wrong in between.

The function never reads a file at runtime. Vercel decides what to ship by reading the
code, and it misses anything loaded by path. Satori needs two WASM files that it normally
loads that way, `yoga.wasm` for layout and HarfBuzz's `hb.wasm` for text, and both were
left out of early deploys. So the font and both WASM files are inlined as base64 in
`api/_font.js`, `api/_yoga.js` and `api/_harfbuzz.js`, generated by
`tools/build-inline-assets.cjs`.

Yoga takes its bytes through satori's standalone build. HarfBuzz has no such option, so the
endpoint builds it from the inlined bytes and places it in Node's module cache before
satori asks for it.

`satori` is pinned to an exact version because the inlined WASM has to match its
JavaScript. Re-run the script after upgrading it. `node tools/preview-card.mjs` makes every
`.wasm` read fail on purpose, the way it would on Vercel, so a file that slips back to
being loaded from disk shows up locally.

If a card ever fails to render, the endpoint redirects to the static `og.png` so the share
still has an image, and puts the reason in an `x-card-error` response header.

The card layout is in `api/_card.js`. `node tools/preview-card.mjs` calls both endpoints
directly and writes the cards to `shots/`, so what you look at locally is exactly what a
deploy serves. A card you can only see after deploying is a card nobody looks at.

Satori is not a browser. It does flexbox and text: no filters, no `background-clip`, no
pseudo-elements, and anything with more than one child needs `display: flex` spelled out.

Anyone can call these endpoints with anything, so every parameter is clamped or mapped to a
known value. The worst a hand-written URL gets you is a dull card.

## Saved data

Scores live in `localStorage` under the `ionbreach.` prefix: `best`, `runlog.ionbreach`,
`difficulty`, `muted`. No cookies, nothing sent anywhere, nothing shared between devices.
Your Scores has a reset button, so clearing it does not mean opening devtools.

Sound starts off. A page that makes noise the moment it loads is a page people close.

## Security

Everything is same-origin. The font is self-hosted, every asset is bundled, and the page
makes no outside requests. The built HTML carries a content security policy whose default
is `none`, generated in `vite.config.js`. It is applied to the build only, because the dev
server needs inline scripts and a websocket for hot reload, and a policy you have to loosen
for dev is not the policy you want to ship.

`frame-ancestors` is ignored inside a meta tag, so `vercel.json` sends it as a header along
with `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`.

There is no server, no account and no score submission, so the only attack surface is your
own browser storage. `localStorage` is editable by anyone sitting at the machine, so the
run log is treated as untrusted input. `core/runlog.js` shape-checks and clamps everything
it reads back and `RunLog` clamps how wide a score can render. Editing a score by hand
changes your own personal best and nothing else.

`satori` depends on an older `fflate` with a known bug. `package.json` overrides it to a
fixed version, so `npm audit` comes back clean.

## Size

| | transferred |
| --- | --- |
| Title screen, sound off | 229 kB |
| Once you turn sound on | 1.8 MB |

The music track is nearly all of that second number. It has `preload="none"` until it is
both wanted and unmuted, so someone who never turns sound on never downloads it.

The built app is about 3.2 MB, and 2.4 MB of that is the music in two formats. The mp3 is
a Safari fallback that no other browser fetches.

![Scores](docs/screenshots/scores.png)

## Credits

- Art and music by [Ansimuz](https://ansimuz.itch.io/spaceship-shooter-environment), CC0
- Sound effects by [Kenney](https://kenney.nl/assets/sci-fi-sounds), CC0
- UI components and the dungeon torch theme from [8bitcn](https://www.8bitcn.com/), MIT
- Press Start 2P by CodeMan38, SIL Open Font License 1.1

Built by [@pixelyokai](https://x.com/pixelyokai).
