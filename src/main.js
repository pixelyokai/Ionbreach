import './ui/theme.css';
import './shell/shell.css';

import { createRouter } from './core/router.js';
import { mountCartridge } from './core/cartridge.js';
import { unlock as unlockAudio, liveMixers, isMuted } from './core/audio.js';
import { startGrain } from './shell/grain.js';
import { createUiBridge } from './ui/bridge.js';
import { mountUi } from './ui/root.jsx';
import { CARTRIDGE } from './cartridge.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const ui = createUiBridge();
mountUi(document.getElementById('overlay'), ui);
startGrain(document.getElementById('grain'));

// Any gesture is a valid audio unlock gate, not just a specific button.
const onFirstGesture = () => unlockAudio();
window.addEventListener('pointerdown', onFirstGesture, { once: true });
window.addEventListener('keydown', onFirstGesture, { once: true });

/**
 * There is one cartridge, and its own title screen is the landing screen, so "/" mounts
 * the game rather than a shelf with a single item on it. The router stays because the
 * mount/unmount lifecycle it enforces is what keeps teardown honest; "/play/<id>" is kept
 * as an alias so an old link still lands somewhere sensible.
 */
/** Nothing is mounted for a dead route; the panel is the whole page. */
function routes404(path) {
  ui.show('notFound', { path, onHome: () => router.navigate('#/') });
  return { destroy: () => ui.hide() };
}

async function mount() {
  ui.show('loading', { title: CARTRIDGE.title });
  const module = await CARTRIDGE.load();
  const mounted = await mountCartridge(module.default, {
    canvas,
    ctx,
    ui,
    exit: () => router.navigate('#/'),
  });
  mounted.start();
  return mounted;
}

const router = createRouter({
  routes: {
    home: mount,

    play({ id }) {
      if (id !== CARTRIDGE.id) return routes404(`/play/${id}`);
      return mount();
    },

    notFound: ({ id }) => routes404(id),

    error(err) {
      console.error(err);
      ui.show('error', { message: 'The game failed to load.', onBack: () => location.reload() });
    },
  },
});

router.start();

// Dev-only. Both branches are statically false in a build, so neither the handle nor the
// annotation toolbar's module reaches the production graph.
if (import.meta.env?.DEV) {
  // `unmount` exists so the teardown test can assert against nothing being mounted. With
  // one route that falls back to itself, there is otherwise no way to reach that state,
  // and an assertion that cannot reach zero is an assertion that proves nothing.
  window.__console = { liveMixers, isMuted, unmount: () => router.destroy() };
  import('./ui/devtools.jsx').then((m) => m.mountDevTools());
}
