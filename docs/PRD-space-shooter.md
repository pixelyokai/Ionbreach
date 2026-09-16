# PRD — Web Space Shooter (working title: *Nullpoint*)

**Owner:** Aditya
**Status:** Draft v1
**Type:** Side project, web only
**Reference:** Nokia Space Impact (1999) — horizontal side scrolling shmup

---

## 1. Summary

A browser based horizontal shoot em up. The player pilots a ship along the left side of the screen, dodging and destroying waves of enemies that scroll in from the right. Runs are short, arcade paced, and end in a score. Built to be finished, not to be endless in scope.

The Nokia original is the reference for *feel*, not for content. Name, art, and enemy design are our own. "Space Impact" is a Nokia trademark and is not used anywhere in the product, repo, or marketing.

---

## 2. Goals

**Primary**
- A polished, complete arcade loop that is fun within ten seconds of loading
- Runs on every modern browser, desktop and mobile, no install
- Ships in a small number of focused sessions, not an open ended build

**Secondary**
- A shareable score, so a run has a reason to be posted
- Clean enough entity code to reuse for future canvas games

**Non goals**
- Steam or native release
- Accounts, backend, or server side leaderboards
- Procedural content, story mode, meta progression, unlockable ship roster

---

## 3. Success criteria

| Criterion | Target |
| --- | --- |
| Time to first input after page load | Under 3 seconds on 4G |
| Frame rate | Stable 60fps on a mid range phone |
| First run length | 60 to 120 seconds |
| Total bundle size | Under 5 MB including audio |
| Browser support | Chrome, Safari, Firefox, Edge — desktop and mobile |

---

## 4. Core gameplay

### Loop
Fly, shoot, dodge, clear the wave, get harder, reach the boss, die or win, see score, replay.

### Player
- Ship occupies the left third of the screen, free movement on both axes
- Movement is clamped to the viewport
- Fire is held or auto, one bullet stream at base level
- Three lives (or a small health pool). Contact with an enemy or enemy bullet costs one
- Brief invulnerability and a blink state after taking a hit

### Enemies
Four archetypes, each defined by a movement pattern and a fire pattern:

1. **Drifter** — straight line, no fire. Filler, teaches the player to shoot.
2. **Weaver** — sine wave vertical movement, occasional single shot.
3. **Diver** — enters high, then angles toward the player's current Y.
4. **Turret** — slow, high health, fires aimed bursts.

Asteroids are used as unaimed hazards that cannot be reasoned with, only avoided or destroyed.

### Waves
- Waves are hand authored as a data file, not randomly generated. A wave is a list of `{ enemyType, spawnTime, spawnY, pattern }`.
- Difficulty ramps by mixing archetypes, increasing spawn density, and shortening gaps between waves.
- Five waves, then a boss. That is the whole game in v1.

### Boss
- One boss. Large sprite, multiple hit zones or a single health bar.
- Two or three attack phases that change as its health drops.
- Defeating it is the win state.

### Power ups
Dropped occasionally by destroyed enemies, expire if not collected:
- **Spread** — three way fire, time limited
- **Rapid** — increased fire rate, time limited
- **Shield** — absorbs one hit
- **Extra life** — rare

### Scoring
- Points per enemy type, higher for the harder archetypes
- Combo multiplier for kills in quick succession, resets on taking damage
- Wave clear bonus
- Score is what the player shares

---

## 5. Feel and polish

These are not optional. They are the difference between a tech demo and a game.

- Parallax background: at least two layers moving at different speeds, plus the cloud layer from the asset pack for depth
- Screen shake on player death and boss hits, subtle and short
- Particles on every explosion, plus small sparks on bullet impact
- Hit flash on damaged enemies
- Muzzle flash on the player ship when firing
- Bullets and enemies leave the pool cleanly, nothing accumulates off screen
- Audio ducking is unnecessary, but SFX must not clip when many fire at once

---

## 5a. Presentation shell

The game does not sit in a plain rectangle. Two small pieces of art direction frame it. Both are deliberately minor — a mask and a grain layer, not a system. If either starts growing, cut it.

### CRT screen mask

The canvas is clipped to a subtly barrel-curved rectangle: the silhouette of a CRT screen, floating on the page. No monitor shell, no bezel, no plastic, no buttons, no stand.

- Implemented as an **SVG clip-path or mask** applied to the canvas container
- The four edges are shallow arcs rather than straight lines. Corners are rounded generously. The bulge should be felt more than noticed — if it reads as a novelty filter it has gone too far.
- **The contents are not distorted.** This is the shape only, not a CRT simulation. No barrel shader, no scanlines, no phosphor glow, no vignette. The pixel art stays flat and crisp, which is the whole reason for choosing a mask over a shader pass.
- Aspect ratio is 4:3, which suits the tighter arcade play field better than a wide letterbox
- Scales cleanly at any size, since it is vector

### Animated grain

A single noise layer over the **entire page**, not just the game. This ties the canvas and the surrounding page together and is what stops the masked shape reading as a div.

- Noise generated once into a small offscreen canvas (around 128×128), tiled, with its offset shifted periodically. Do not regenerate noise per frame.
- Alternatively a pre-rendered noise PNG stepped through positions with a CSS animation, if that proves simpler
- Opacity 3 to 6 percent. Felt, not seen.
- Animate at roughly 12 to 15fps, not 60. Slower reads more filmic and costs less.
- `pointer-events: none` so it never intercepts input
- Sits above everything including the HUD

### Mobile

The mask is a desktop and tablet treatment. On narrow viewports the play area matters more than the framing.

- Below the mobile breakpoint, drop the CRT mask and let the canvas fill the available space
- Keep the grain — it is cheap and carries the identity on its own

---

## 6. Controls

**Desktop**
- Arrow keys or WASD to move
- Space to fire, or auto fire with the option to toggle
- P or Esc to pause

**Mobile**
- Touch and drag anywhere to move the ship. The ship follows the finger with a small offset so the thumb does not cover it.
- Auto fire on mobile. No fire button.
- Pause button in a corner, large enough to hit.

Mobile input is designed in from the start, not bolted on. It changes the input layer and the HUD layout.

---

## 7. Screens

1. **Title** — game name, Start, brief control hint. Doubles as the audio unlock gate (mobile browsers block audio until a user gesture).
2. **Game** — canvas plus a thin HUD: score, lives, wave number.
3. **Pause** — resume, restart, mute.
4. **Game over** — final score, best score, Retry, Share.
5. **Victory** — same as game over with different framing, after the boss.

---

## 8. Technical

**Stack**
- Vite for dev server and build
- Vanilla JavaScript, no framework
- Canvas 2D API for all rendering
- Plain CSS for HUD and menu overlays, layered above the canvas
- Web Audio via HTML5 `Audio` elements or a thin wrapper, `.ogg` with `.mp3` fallback for Safari
- `localStorage` for best score only. No backend.

**Why not an engine:** Phaser and friends are more capable than this needs and add weight and opinion. A shmup is a loop, an entity array, and AABB collision. Canvas 2D is universally supported and fast enough at this sprite count.

**Architecture**
```
src/
  main.js           entry, canvas setup, resize handling
  game/
    loop.js         requestAnimationFrame, fixed timestep, delta
    state.js        title / playing / paused / over
    input.js        keyboard and touch, normalised to one interface
    collision.js    AABB checks
    spawner.js      reads wave data, spawns on a timer
  entities/
    player.js
    enemy.js        archetypes as config, one class
    bullet.js
    boss.js
    powerup.js
    particle.js
  data/
    waves.js        hand authored wave definitions
    enemies.js      archetype stats
  render/
    sprites.js      spritesheet loading and frame slicing
    background.js   parallax layers
    hud.js
  shell/
    crt-mask.svg    curved screen clip path
    grain.js        tiled noise layer, page wide
  audio/
    sfx.js
assets/
  sprites/
  audio/
```

**Rendering notes**
- `imageRendering: pixelated` on the canvas, and `ctx.imageSmoothingEnabled = false`, or the pixel art will blur
- Render at a fixed low internal resolution and scale up with integer scaling where possible, to keep pixels crisp and consistent across screen sizes
- Fixed timestep for physics, interpolated or capped render, so gameplay does not change speed on a 120Hz display
- The CRT mask clips but does not resample. Choosing a mask over a barrel distortion shader is what keeps the pixel art crisp — do not later "upgrade" the mask into a shader without accepting that trade.

**Performance**
- Object pooling for bullets and particles, these are the only high churn entities
- One spritesheet draw path, no per frame canvas allocations
- Cap particle count

---

## 9. Assets

**Art and music** — Ansimuz, *Spaceship Shooter Environment*, CC0
https://ansimuz.itch.io/spaceship-shooter-environment
Includes player ship, enemy ships, explosions, lasers and bolts, power ups, looped background, cloud layers, and a music loop in wav, ogg and mp3. Layered PSD included if anything needs recolouring.

**SFX** — Kenney, *Sci-Fi Sounds*, CC0
https://kenney.nl/assets/sci-fi-sounds
The Ansimuz pack ships music but not discrete sound effects. This covers laser fire, explosions, impacts, and pickups.

Both are CC0. Attribution is not required but will be included in the credits regardless.

**Boss sprites:** built from these same assets rather than sourced separately. See section 9a.

---

## 9a. Boss construction pipeline

No separate boss pack. Bosses are derived from the existing enemy spritesheets and the layered PSD, using image processing rather than new art. This keeps the whole game visually sourced from one pack and one palette, and it costs nothing.

**Process, per boss:**
1. Select a base enemy from the pack's spritesheet, or a composite of two
2. Slice the relevant layers from the PSD rather than working from the flattened PNG, so parts stay clean
3. Scale up with nearest-neighbour (never bilinear/bicubic) to preserve hard pixel edges. Target roughly 3 to 4 times a mid-size enemy, tuned to what still reads clearly at the boss's screen position
4. Recolour via palette swap to give the boss its own identity distinct from the regular wave enemies, while staying inside the pack's existing colour logic
5. Composite as needed: mirror a wing, duplicate a gun mount, stack two hulls, to build a silhouette larger and more distinct than a single stock enemy
6. Generate damage states as mechanical variants of the same base art: a darker/reddened palette for damaged, a masked or cracked-open version for critical, a flash-white frame for the hit moment
7. Pack the results into a properly gridded spritesheet with a JSON atlas, same pipeline as the regular enemy sprites

**What this buys:** the v1 boss at zero additional cost, visually consistent with the rest of the game because it is built from the same source. If a second boss is ever added for a future version, the same pipeline covers it without new asset spend.

**What this does not buy:** hand-authored detail at boss scale. Upscaling a small sprite exposes how little detail was in the original — the result will read as a large version of a small enemy, not as art drawn at that size. This is an acceptable trade for v1. If a boss looks unconvincing once built, the fallback is a small manual pass in Aseprite or Photoshop to add detail the upscale can't invent, not switching to a different asset source.

**Tooling:** Python with Pillow, or ImageMagick, run as a one-off build script rather than a runtime process. Output is static files checked into `assets/sprites/bosses/`.

---

## 10. Scope and phasing

**Phase 1 — Playable core**
Canvas and loop, player movement, firing, one enemy type, collision, scrolling background, score. The test: is moving and shooting already satisfying with placeholder feel? If not, fix it here before adding anything.

**Phase 2 — Game**
All four enemy archetypes, wave data and spawner, lives and death, power ups, title and game over screens.

**Phase 3 — Boss and polish**
Build the boss sprite via the pipeline in section 9a before wiring up the fight. Boss with phases, particles, screen shake, hit flash, audio, mobile touch controls, HUD. Presentation shell: CRT mask and page grain. The shell is a short task, not a phase of its own — if it takes more than an afternoon, simplify it.

**Phase 4 — Ship**
Best score in localStorage, share link, deploy to Vercel as a static build, test on real iOS and Android devices.

---

## 11. Open decisions

- **Name.** *Nullpoint* is a placeholder. Needs deciding before the repo and the deploy.
- **Lives vs health bar.** Lives are more arcade honest, health is more forgiving. Pick one early, it affects the HUD and the damage feel.
- **Auto fire on desktop too, or hold to fire.** Auto fire removes a button and lets the player think about movement. Worth trying auto first.
- **Share format.** Score plus a link, or a seed URL so someone can play the same wave layout. Seed is more interesting but only matters if waves ever become randomised.

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Scope creep into a full shmup with multiple bosses and levels | Five waves and one boss is the whole product. Anything else is v2. |
| Mobile audio blocked until user gesture | Title screen is the unlock gate, by design |
| Pixel art blurs on high DPI screens | Integer scaling and smoothing disabled, tested early |
| Frame rate varies across refresh rates | Fixed timestep from the first commit, not retrofitted |
| Trademark exposure | Original name and art throughout. No Nokia references in product or copy. |
| Presentation shell grows into a full CRT simulation | Mask and grain only. Scanlines, glow and barrel distortion are explicitly out of scope. |
| Derived boss sprite looks like a stretched enemy rather than a real boss | Build it early, in Phase 3 before the fight logic, so there is time to add a manual detail pass if the upscale reads as thin |
