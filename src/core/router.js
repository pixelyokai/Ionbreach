/**
 * Hash routing with a strict mount/unmount lifecycle.
 *
 *   #/            home
 *   #/play/<id>   a cartridge
 *
 * Only one route is ever mounted. A navigation that arrives mid-mount is queued rather
 * than racing, so a fast back/forward cannot leave two cartridges alive at once - which
 * is the failure mode that leaks listeners and animation frames.
 */
export function createRouter({ routes }) {
  let current = null;
  let mounting = null;
  let pending = null;
  let destroyed = false;

  function parse(hash) {
    const path = (hash || '').replace(/^#/, '') || '/';
    const play = path.match(/^\/play\/([\w-]+)$/);
    if (play) return { name: 'play', id: play[1] };
    if (path === '/') return { name: 'home' };
    // An unknown hash resolves to a real route rather than being bounced silently to "/",
    // which hides a broken link instead of reporting it. The path is carried through so
    // the page can say what was asked for.
    return { name: 'notFound', id: path };
  }

  const same = (a, b) => a && b && a.name === b.name && a.id === b.id;

  async function unmountCurrent() {
    if (!current) return;
    const { handle } = current;
    current = null;
    try {
      await handle?.destroy?.();
    } catch (err) {
      console.error('route teardown failed', err);
    }
  }

  async function go(route) {
    if (destroyed) return;
    if (mounting) {
      pending = route;
      return;
    }
    if (same(current?.route, route)) return;

    mounting = route;
    await unmountCurrent();

    try {
      const handle = await routes[route.name](route);
      if (destroyed) {
        await handle?.destroy?.();
      } else if (pending) {
        await handle?.destroy?.();
      } else {
        current = { route, handle };
      }
    } catch (err) {
      console.error(`failed to mount ${route.name}`, err);
      routes.error?.(err, route);
    } finally {
      mounting = null;
      const next = pending;
      pending = null;
      if (next) await go(next);
    }
  }

  const onHashChange = () => {
    void go(parse(location.hash));
  };

  return {
    start() {
      window.addEventListener('hashchange', onHashChange);
      onHashChange();
    },
    navigate(hash) {
      if (location.hash === hash) onHashChange();
      else location.hash = hash;
    },
    get route() {
      return current?.route ?? null;
    },
    async destroy() {
      destroyed = true;
      window.removeEventListener('hashchange', onHashChange);
      await unmountCurrent();
    },
  };
}
