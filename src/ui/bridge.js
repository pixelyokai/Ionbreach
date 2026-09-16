/**
 * The only channel between a canvas game and the React overlay.
 *
 * Deliberately narrow: "show this panel with these props", "hide". Games never touch
 * React state and React never reads game internals.
 */
export function createUiBridge() {
  const listeners = new Set();
  let state = { panel: null, props: {} };

  const emit = () => {
    for (const fn of listeners) fn(state);
  };

  return {
    show(panel, props = {}) {
      state = { panel, props };
      emit();
    },
    hide() {
      if (!state.panel) return;
      state = { panel: null, props: {} };
      emit();
    },
    get current() {
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
    destroy() {
      listeners.clear();
      state = { panel: null, props: {} };
    },
  };
}
