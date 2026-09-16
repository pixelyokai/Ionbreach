import { createRoot } from 'react-dom/client';

/**
 * The Agentation annotation toolbar, for leaving visual feedback on the running game.
 *
 * Loaded through a dynamic import from an `import.meta.env.DEV` branch in `main.js`, so
 * the module never enters the production graph - not a conditional render of a statically
 * imported component, which would still ship the bytes and have to be argued away.
 *
 * It gets its own React root rather than a slot in the overlay tree: the overlay is
 * mounted and unmounted by the router around cartridges, and a dev tool has no business
 * being part of that lifecycle. The container stays empty and unstyled because the toolbar
 * portals its own fixed-position chrome onto the body; it clears the CRT stack, whose
 * topmost layer is the grain at z-index 101.
 */
const HOST_ID = 'devtools';

export async function mountDevTools() {
  // The headless suite opts out: the toolbar registers its own listeners and its own
  // "Start feedback mode" control, which would both skew the teardown probes and collide
  // with the game's own buttons. What is measured should be the app, not the tooling.
  if (window.__noDevTools || document.getElementById(HOST_ID)) return null;

  let Agentation;
  try {
    ({ Agentation } = await import('agentation'));
  } catch (err) {
    console.warn('annotation toolbar unavailable', err);
    return null;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.append(host);

  const root = createRoot(host);
  root.render(<Agentation />);

  return () => {
    root.unmount();
    host.remove();
  };
}
