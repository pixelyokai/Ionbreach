/**
 * Headless pass over Ionbreach. Run the dev server first:
 *   npm run dev
 *   node tools/smoke.mjs [screenshot-dir]
 *
 * Covers what is tedious to check by hand: that the game mounts and plays, that the menus
 * route through the shared UI layer and actually change the simulation, that a campaign
 * hands off between sectors, and - the defect this architecture is most prone to - that
 * mounting and unmounting repeatedly leaks no listeners, animation frames or audio.
 */
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const URL = 'http://localhost:5173/';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome' });

async function newPage(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, ...opts });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });

  // Count listeners and live frames so teardown is measured, not assumed.
  await page.addInitScript(() => {
    // The annotation toolbar registers its own listeners and its own "Start feedback mode"
    // control. What is measured should be the app, not the tooling.
    window.__noDevTools = true;

    window.__probe = { listeners: 0, rafs: new Set() };
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (...args) {
      window.__probe.listeners++;
      return add.apply(this, args);
    };
    EventTarget.prototype.removeEventListener = function (...args) {
      window.__probe.listeners--;
      return remove.apply(this, args);
    };
    const raf = window.requestAnimationFrame;
    const caf = window.cancelAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      const id = raf.call(window, (t) => { window.__probe.rafs.delete(id); cb(t); });
      window.__probe.rafs.add(id);
      return id;
    };
    window.cancelAnimationFrame = function (id) {
      window.__probe.rafs.delete(id);
      return caf.call(window, id);
    };
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__ionbreach), null, { timeout: 20000 });
  await page.waitForTimeout(800);
  return { page, errors };
}

const probe = (page) =>
  page.evaluate(() => ({ listeners: window.__probe.listeners, rafs: window.__probe.rafs.size }));

const row = (page, name) => page.getByRole('button', { name, exact: true });
const press = async (page, name) => {
  await row(page, name).click();
  await page.waitForTimeout(500);
};

// --- 1. The title screen ---------------------------------------------------------
{
  const { page, errors } = await newPage();
  await page.screenshot({ path: `${OUT}/menu.png` });

  check('the game is the landing screen', await row(page, 'START').isVisible());

  const rows = await Promise.all(
    ['DIFFICULTY NORMAL', 'SOUND OFF', 'YOUR SCORES'].map((n) => row(page, n).count()),
  );
  check('the menu offers every setting', rows.every((n) => n === 1), rows.join('/'));

  // A page that starts making noise on load is a tab people close.
  check('sound is off until asked for', await page.evaluate(() => window.__console.isMuted()));
  await press(page, 'SOUND OFF');
  check('the sound row toggles', (await row(page, 'SOUND ON').count()) === 1);

  const author = page.getByRole('link', { name: '@pixelyokai' });
  check(
    'the credit links out',
    (await author.getAttribute('href')) === 'https://x.com/pixelyokai' &&
      (await author.getAttribute('rel'))?.includes('noopener'),
  );

  // Press Start 2P has no lowercase and stops resolving below 13px.
  const smallest = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#overlay *')].filter((e) => e.textContent?.trim());
    return Math.min(...els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  });
  check('no text below 13px', smallest >= 13, `${smallest}px`);
  check('no console errors (title)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// --- 2. Dead routes --------------------------------------------------------------
{
  const { page, errors } = await newPage();

  await page.evaluate(() => { location.hash = '#/nowhere'; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/not-found.png` });

  check(
    'an unknown route shows the 404 rather than redirecting',
    (await page.getByRole('heading', { name: 'OFF THE MAP' }).count()) === 1 &&
      (await page.evaluate(() => location.hash)) === '#/nowhere',
  );
  check('the 404 names the path that was asked for', await page.getByText('/nowhere').isVisible());

  await page.evaluate(() => { location.hash = '#/play/not-a-game'; });
  await page.waitForTimeout(1000);
  check(
    'an unknown cartridge 404s too',
    (await page.getByRole('heading', { name: 'OFF THE MAP' }).count()) === 1,
  );

  await press(page, 'RETURN TO BASE');
  await page.waitForTimeout(1800);
  check('the way back works', await row(page, 'START').isVisible());
  check('no console errors (404)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// --- 3. The menus change the run -------------------------------------------------
{
  const { page, errors } = await newPage();

  await press(page, 'DIFFICULTY NORMAL');
  check('difficulty opens', await row(page, 'CONFIRM').isVisible());
  await page.screenshot({ path: `${OUT}/difficulty.png` });

  await page.getByRole('radio', { name: /HARD/ }).click();
  await press(page, 'CONFIRM');
  check('the choice comes back to the menu', (await row(page, 'DIFFICULTY HARD').count()) === 1);

  await press(page, 'START');
  await page.waitForTimeout(1500);
  const hard = await page.evaluate(() => {
    const s = window.__ionbreach.game.session;
    return { difficulty: s.difficulty, lives: s.player.lives, scale: s.enemies[0]?.speedScale ?? null };
  });
  check(
    'difficulty reaches the simulation',
    hard.difficulty === 'hard' && hard.lives === 2 && hard.scale === 1.5,
    JSON.stringify(hard),
  );

  check('no console errors (menus)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// --- 4. Playing ------------------------------------------------------------------
{
  const { page, errors } = await newPage();
  await press(page, 'START');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/playing.png` });

  const contrast = await page.evaluate(() => {
    const c = document.getElementById('stage');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, Math.min(200, c.width), Math.min(200, c.height)).data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      min = Math.min(min, d[i]);
      max = Math.max(max, d[i]);
    }
    return max - min;
  });
  check('game renders to the canvas', contrast > 30, `contrast ${contrast}`);

  await page.keyboard.press('KeyP');
  await page.waitForTimeout(400);
  check('pause routes through the shared UI layer', await page.getByRole('alertdialog').isVisible());
  await page.screenshot({ path: `${OUT}/paused.png` });

  await press(page, 'QUIT TO MENU');
  check('quitting returns to the title screen', await row(page, 'START').isVisible());
  check('no console errors (play)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// --- 5. The campaign -------------------------------------------------------------
// Every sector has to load its own terrain plate and its own boss, and beating a boss has
// to hand off to the next sector rather than ending the run. That is twenty minutes of
// play to reach by hand, so it is driven through the dev hooks.
{
  const { page, errors } = await newPage();
  await page.evaluate(() => window.__ionbreach.begin());

  const count = await page.evaluate(async () => (await import('/src/games/ionbreach/data/levels.js')).LEVEL_COUNT);
  check('campaign has more than one sector', count >= 3, `${count} sectors`);

  const plates = new Set();
  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => window.__ionbreach.gotoLevel(n), i);
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => window.__ionbreach.probe());

    // A signature of the terrain, so two sectors sharing a plate would be caught.
    const plate = await page.evaluate(() => {
      const c = document.getElementById('stage');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, Math.min(64, c.height)).data;
      let r = 0, gr = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      return [Math.round(r / n), Math.round(gr / n), Math.round(b / n)].join(',');
    });
    plates.add(plate);

    await page.evaluate(() => window.__ionbreach.skipToBoss());
    await page.waitForFunction(() => window.__ionbreach.probe().bossHealth !== null, { timeout: 15000 });
    const fight = await page.evaluate(() => window.__ionbreach.probe());
    await page.screenshot({ path: `${OUT}/sector-${i + 1}.png` });

    check(
      `sector ${i + 1} loads its own boss`,
      fight.bossId !== null && fight.bossHealth > 0,
      `${before.levelName} -> ${fight.bossId} ${fight.bossHealth}hp`,
    );

    await page.evaluate(() => window.__ionbreach.killBoss());
    const last = i === count - 1;
    // The kill resolves over a beat of explosion, so wait on the state, not a timeout.
    await page
      .waitForFunction(
        (n) => {
          const p = window.__ionbreach.probe();
          return n === null ? p.screen === 'victory' : p.level === n && p.bossHealth === null;
        },
        last ? null : i + 1,
        { timeout: 10000 },
      )
      .catch(() => {});
    const after = await page.evaluate(() => window.__ionbreach.probe());
    check(
      last ? 'the last boss ends the run' : `sector ${i + 1} hands off to sector ${i + 2}`,
      last ? after.outcome === 'won' && after.screen === 'victory' : after.level === i + 1 && after.bossHealth === null,
      last ? `outcome ${after.outcome}` : `now ${after.levelName}`,
    );
    if (last) break;
  }

  await page.screenshot({ path: `${OUT}/victory.png` });
  check('every sector draws a distinct terrain plate', plates.size === count, `${plates.size}/${count} distinct`);
  check('no console errors (campaign)', errors.length === 0, errors.join(' | '));
  await page.close();
}

// --- 6. Teardown -----------------------------------------------------------------
{
  const { page, errors } = await newPage();

  // "/play/<id>" is an alias for "/", so hopping between them is a real unmount/remount.
  const cycle = async () => {
    await page.evaluate(() => { location.hash = '#/play/ionbreach'; });
    await page.waitForTimeout(1400);
    await page.evaluate(() => { location.hash = '#/'; });
    await page.waitForTimeout(900);
  };

  await cycle();
  const baseline = await probe(page);
  for (let i = 0; i < 4; i++) await cycle();
  await page.waitForTimeout(500);
  const after = await probe(page);

  check(
    'no listeners leaked over 4 more cycles',
    after.listeners - baseline.listeners <= 0,
    `${baseline.listeners} -> ${after.listeners}`,
  );
  check('no animation frames accumulating', after.rafs <= baseline.rafs, `${baseline.rafs} -> ${after.rafs}`);

  // new Audio() elements never enter the DOM, so a querySelector check here would pass
  // whatever happened. The mixer registry is the real signal.
  await page.evaluate(() => window.__console.unmount());
  await page.waitForTimeout(700);
  const torn = await probe(page);
  const mixers = await page.evaluate(() => window.__console.liveMixers());
  check('no audio mixers left alive after teardown', mixers === 0, `${mixers} alive`);
  check('nothing still animating once unmounted', torn.rafs === 0, `${torn.rafs} frames`);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__ionbreach), null, { timeout: 20000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__ionbreach.begin());
  await page.waitForTimeout(1200);
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else res(Math.round(n / ((performance.now() - t0) / 1000)));
    };
    requestAnimationFrame(tick);
  }));
  check('frame rate healthy after 5 mounts', fps >= 55, `${fps}fps`);
  check('no console errors (teardown)', errors.length === 0, errors.join(' | '));
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
