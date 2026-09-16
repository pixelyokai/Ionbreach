# Arcade Hub — Architecture and Claude Code Brief

**Repo:** the existing Ionbreach repo, refactored to host three games
**Games:** *Ionbreach* (space shooter, built), *Undersoil* (top-down dungeon diver), *Riftward* (action platformer)

---

## 1. The mental model

One console, three cartridges.

The **console** is everything that is not specific to a single game: the rounded-frame shell, the shared UI panel system, the game loop, input normalisation, audio, sprite loading, the run log, and the home screen that selects a cartridge. It is built once.

A **cartridge** is a self-contained game that knows nothing about the other games and nothing about the hub's UI. It receives services from the console, runs, and hands back results when it finishes.

The value of this split is that the third game costs meaningfully less to build than the first, and a bug fixed in the loop is fixed everywhere.

---

## 2. Repo structure

```
arcade/
  index.html
  vite.config.js
  package.json
  docs/
    PRD-space-shooter.md
    PRD-topdown-dungeon-diver.md
    PRD-action-platformer.md
    ARCHITECTURE.md
  src/
    main.js                  boots shell, mounts router
    shell/                   the physical console
      frame.css              rounded-rect play area container, persists across nav
      shell.css
    ui/                      the React + 8bitcn overlay layer, sits above the canvas
      root.jsx               mounts once, renders whatever overlay the game state calls for
      panels/                pause, death, shop, run-log — built from 8bitcn components
      bridge.js              narrow event interface between canvas game and this layer
    hub/                     the home screen
      home.js                cartridge select
      home.css
      catalog.js             game registry: metadata + lazy loader
      runlog-panel.js        last 5 runs, shown per game — an 8bitcn panel/card
    core/                    shared services
      router.js              hash routing, mount/unmount lifecycle
      canvas.js              canvas setup, integer scaling, pixelated
      loop.js                fixed timestep, delta, pause
      input.js               keyboard + touch normalised to one interface
      audio.js               sfx + music, mobile unlock gate, mute
      sprites.js             spritesheet loading, atlas slicing
      collision.js           AABB and tile collision helpers
      particles.js           pooled particle system
      storage.js             localStorage adapter, swappable later
      runlog.js              record and read last N runs per game
    games/
      ionbreach/
        index.js             the cartridge export
        assets/              imported through Vite, never in public/
        ...game-specific code
      undersoil/
        index.js
        assets/
        ...
      riftward/
        index.js
        assets/
        ...
```

**Assets live under `src/games/*/assets/` and are imported, not placed in `public/`.** Vite hashes and bundles imported assets; anything in `public/` is served as a browsable directory. Several of the asset licences prohibit redistribution, and a browsable `/assets/undersoil/` folder is effectively redistribution. This is a licensing decision, not a preference.

---

## 3. The cartridge contract

Every game's `index.js` default-exports an object matching this shape. The hub never reaches inside a game; the game never reaches outside its own folder.

```js
export default {
  // Identity, used by the hub and the run log
  id: 'undersoil',
  title: 'Undersoil',
  blurb: 'Farm above. Descend below. Do not get greedy.',
  cover: coverImageUrl,          // imported asset

  // Presentation requirements
  resolution: { width: 320, height: 240 },
  aspect: '4:3',
  supportsTouch: true,           // riftward sets false
  desktopOnly: false,            // riftward sets true

  // How the run log should render this game's results
  scoreLabel: 'Depth',           // 'Score' for ionbreach, 'Time' for riftward
  scoreFormat: 'number',         // 'number' | 'time' | 'depth'
  scoreDirection: 'higher',      // 'higher' | 'lower'  (riftward is 'lower')

  // Lifecycle
  async init(services) { },      // load assets, build state. May show progress.
  start() { },                   // begin the loop
  pause() { },
  resume() { },
  stop() { },                    // stop the loop, keep state
  destroy() { },                 // release everything: listeners, audio, refs
}
```

`services` is what the console hands in:

```js
{
  canvas,        // HTMLCanvasElement, already sized and scaled
  ctx,           // 2D context, smoothing already disabled
  loop,          // fixed timestep runner
  input,         // normalised keyboard + touch
  audio,         // play(), music(), mute state
  sprites,       // load(), sheet(), frame()
  particles,     // pooled emitter
  runlog,        // record() — scoped to this game's id automatically
  ui,            // show(panelType, props), hide() — talks to the 8bitcn overlay layer, see 6a
  exit,          // call to return to the hub
}
```

A cartridge never renders its own pause or game-over markup. It calls `ui.show('pause', { onResume, onRestart })` or similar, and the shared React/8bitcn layer renders it. This is what keeps three games' menus looking and behaving identically without three separate implementations.

**Two rules that keep this honest:**

1. A cartridge must never import from another cartridge, or from `hub/`. It may import from `core/` and from its own folder only.
2. `destroy()` must leave no trace. Every event listener removed, every audio node stopped, every `requestAnimationFrame` cancelled, every timer cleared. Navigating hub → game → hub → game five times should not degrade frame rate or leak memory. This is the single most likely defect in a hub of this shape, so it is worth an explicit test.

---

## 4. The run log

Personal, not competitive. Last five runs per game, no ranking against anyone else.

```js
runlog.record({ score, durationMs, meta })   // gameId injected by the console
runlog.recent(gameId, 5)
runlog.best(gameId)
```

Stored via `storage.js` rather than touching `localStorage` directly, so the eventual move to Supabase accounts is a single file change rather than a hunt through three games.

Each game defines how its result reads through `scoreLabel`, `scoreFormat` and `scoreDirection`, so the hub can render an Ionbreach score, a dungeon depth and a platformer completion time through one component without special-casing.

The trend indicator compares against the player's own recent average. No leaderboards, no percentiles, no other players.

---

## 5. Routing

Hash-based, no router library.

```
#/            home screen
#/play/<id>   a game
```

The router lazy-loads cartridges via dynamic `import()`, so Vite code-splits each game into its own chunk. The hub's initial load should not pull down three games' worth of sprites.

On navigation away, the router calls `stop()` then `destroy()` before mounting the next cartridge. Browser back from a game returns to the hub and triggers the same teardown.

---

## 6. The shell

**This section has been updated to match what actually shipped in Ionbreach, superseding the barrel-curve CRT mask originally scoped.** The frame is a simple rounded-rectangle container with a uniform, generous corner radius — not a barrel-curved screen shape. No visible grain overlay is present in the current build. This is a real design decision, not an oversight, and Undersoil and Riftward should inherit it as-is rather than each independently reintroducing the curved-CRT idea.

- The play area sits inside a rounded-rectangle frame, consistent corner radius on all four sides, no bulge, no distortion of the contents
- This shape lives at the console level and persists across navigation — the home screen and every game sit inside the same frame. Do not re-mount it per game.
- If a grain or texture layer is reintroduced later, it should go back through the same "shape only, no simulation creep" discipline the original CRT section argued for — but as of this writing it is not part of the shipped look, and the PRDs should not assume it exists.
- Below the mobile breakpoint the frame's radius can soften or the frame can drop entirely to maximise play area — same reasoning as before, just applied to a rounded-rect rather than a curved mask.

`shell/` should be renamed in spirit even if not in code yet: it now owns the rounded-frame container and whatever chrome persists across cartridges, not a CRT simulation.

---

## 6a. UI design system

Ionbreach's menus are built with **8bitcn** (https://www.8bitcn.com) — a retro 8-bit component library on top of shadcn/ui, Tailwind CSS and Radix UI. All overlay UI across the hub should stay on this library rather than hand-rolling equivalent components, so the pause, game-over, shop and run-log screens across all three games come from the same source and stay visually and behaviourally consistent for free.

**This has one real architectural consequence, stated plainly rather than glossed over:** 8bitcn is a React library. The rule elsewhere in this document that the hub is "vanilla JavaScript, no React" refers to the *game layer* — the canvas, the loop, entities, collision, everything gameplay. It does not apply to the *UI chrome layer* — menus, dialogs, HUD panels, buttons — which is where 8bitcn lives. Ionbreach already proves this split works: a vanilla JS/Canvas game running underneath, with a thin React root mounted alongside it purely for overlay UI. Every cartridge inherits this same split. **Do not** attempt to port gameplay logic into React, and do not avoid 8bitcn for UI chrome on the theory that "no React" forbids it — it's scoped to the wrong layer if that objection comes up.

**Practically, this means:**

- A small React root (call it `ui/`, sibling to `core/`, `shell/` and `games/`) mounts once, sits visually above the canvas, and renders whatever overlay the current game state calls for — title, pause, death/game-over, shop, run log
- The canvas and the React UI root communicate through a small, explicit interface (a plain event emitter or a tiny shared state object) rather than the game reaching into React state or React reaching into game internals. Keep the boundary narrow: "show pause with these stats," "player clicked resume," and little else.
- 8bitcn components used across the hub: **Card** for the panel frame, **Button** (primary/secondary variants) for actions, **Alert Dialog** for pause/game-over/victory modals, **Badge** for HUD readouts like wave count or depth, and **Label**/pixel typography for score numerals. Pull the actual component list from whichever ones Ionbreach already uses — extend that set rather than introducing new 8bitcn components ad hoc per game.
- Undersoil's shop, pause and death screens; Riftward's pause and victory screens — all route through the same 8bitcn-based components Ionbreach already has, extended with new content/props rather than restyled or reimplemented
- Tailwind CSS is now a project dependency, installed once at the hub level, not per game
- Component installation goes through whatever CLI/registry flow 8bitcn documents on its own site — check `8bitcn.com`'s current install instructions rather than assuming a specific command, since registry tooling changes

---

## 7. Migration order

The refactor comes before the new games. Building Undersoil against a not-yet-extracted core means writing the loop twice.

**Step 1 — Extract.** Move Ionbreach's generic systems into `core/`: loop, input, audio, sprites, collision, particles, canvas setup. Move the rounded-frame shell into `shell/`, and Ionbreach's existing 8bitcn-based menu/overlay components into `ui/`, generalised to accept any cartridge's content rather than Ionbreach's specifically. What remains in `games/ionbreach/` should be only entities, wave data, boss logic and its own rendering.

**Step 2 — Wrap.** Make Ionbreach conform to the cartridge contract. It should run identically to before, but now mounted by a router rather than by `main.js` directly. This is the checkpoint: if Ionbreach still plays exactly as it did, the extraction was clean.

**Step 3 — Hub.** Home screen, catalog, router, run log. At this point there is one cartridge and a hub that can select it. Ship this state before writing a second game.

**Step 4 — Undersoil.** Per its PRD, phased as written there.

**Step 5 — Riftward.** Per its PRD, phased as written there.

Steps 1–3 are worth doing as their own piece of work with its own review. A rushed extraction poisons both games that follow.

---

## 8. What not to over-abstract

The temptation with a structure like this is to build an engine. Resist it.

- Do **not** build a generic entity-component system. Three games with different needs do not justify it.
- Do **not** build a shared scene graph or a generic tilemap that handles both top-down and side-scrolling. Undersoil's tilemap and Riftward's tilemap have different needs; two focused files beat one configurable one.
- Do **not** put game-specific concepts into `core/`. If only one game needs it, it belongs to that game.
- Something belongs in `core/` when the **second** game needs it, not when you predict the second game might.

The shared layer should stay small. Loop, input, audio, sprites, storage, run log, collision maths. That is close to the whole list.

---

## 9. Claude Code brief

Paste the following as-is.

---

**Context**

This repo contains Ionbreach, a finished browser space shooter built with Vite, vanilla JavaScript and the Canvas 2D API, no game engine. I am turning it into an arcade hub containing three games that share one console layer and one home screen.

Read these before writing any code:
- `docs/ARCHITECTURE.md` — the structure, cartridge contract and migration order. This is authoritative.
- `docs/PRD-space-shooter.md` — Ionbreach, the existing game
- `docs/PRD-topdown-dungeon-diver.md` — *Undersoil*, to be built
- `docs/PRD-action-platformer.md` — *Riftward*, to be built

**Rules**

- Vanilla JavaScript, Canvas 2D, Vite for the **game layer**: loop, entities, collision, rendering. No game engine, no router library, no state management library in this layer.
- The **UI chrome layer** (menus, dialogs, HUD panels) uses **React + 8bitcn + Tailwind**, matching what Ionbreach already has, per `ARCHITECTURE.md` section 6a. This is a deliberate, scoped exception — do not extend React into gameplay code, and do not avoid 8bitcn for menus on the mistaken theory that the "no React" rule applies here too.
- Assets under `src/games/*/assets/`, imported through Vite. Never in `public/`. This is a licensing requirement.
- Pixel art must stay crisp: `imageSmoothingEnabled = false`, `imageRendering: pixelated`, integer scaling from a fixed internal resolution.
- Fixed timestep for simulation from the first commit, not retrofitted.
- Every cartridge's `destroy()` must fully clean up. No leaked listeners, timers, audio nodes or animation frames.
- Do not over-abstract. Something moves into `core/` when a second game actually needs it, not speculatively. No ECS, no generic scene graph.
- Do not modify the PRDs. If a PRD conflicts with reality, stop and tell me rather than silently deviating.

**Work in phases. Stop after each phase and report before continuing.**

**Phase 1 — Extract the console.**
Move generic systems out of Ionbreach into `core/` and `shell/` per the architecture doc. Do not change any gameplay behaviour. The game must play identically when you are done. Report what moved, what stayed, and anything that resisted a clean split.

**Phase 2 — Cartridge contract.**
Define the contract in `core/`, and make Ionbreach conform to it. Add `router.js` with hash routing and full mount/unmount lifecycle. The game now loads via `#/play/<id>` instead of directly from `main.js`. Verify: navigating away and back repeatedly must not degrade performance or leak. Report how you verified this.

**Phase 3 — Hub.**
Build the home screen, the catalog registry, and the run log (`storage.js` + `runlog.js` + the hub run-log panel). Last five runs per game, personal only, no leaderboards, no comparison to other players. The run log must render score, depth and completion time through one 8bitcn-based component driven by each cartridge's metadata, per section 6a. Wire Ionbreach to record its runs. The rounded-frame shell persists across hub and game. Generalise Ionbreach's existing 8bitcn menu/overlay components into the shared `ui/` layer and re-point Ionbreach's own pause/game-over screens at the generalised version, so there is exactly one implementation before Undersoil or Riftward add a second and third.

Stop here. I will review and play before you start a new game.

**Phase 4 — Undersoil.** Follow its PRD's own phasing.

**Phase 5 — Riftward.** Follow its PRD's own phasing.

---

## 10. Open items before starting

- **Internal resolution per game.** Ionbreach is 4:3. Undersoil and Riftward may want different internal resolutions. `canvas.js` should take resolution from cartridge metadata rather than hardcoding one value.
- **Hub aesthetic.** The home screen sits inside the same rounded-frame shell too. Worth deciding whether it reads as a console boot menu, a shelf of cartridges, or something quieter — using the same panel/button language as the pause and game-over screens.
