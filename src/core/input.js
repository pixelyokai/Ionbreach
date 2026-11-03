/**
 * Keyboard and pointer normalised to one interface.
 *
 * Cartridges declare named actions mapped to key codes. The layer exposes a held set,
 * edge-triggered presses, and a short buffer per action so a press during the last frames
 * of an animation queues instead of being dropped.
 */
const DEFAULT_BUFFER = 0.12;

// A little over 1:1, so a short thumb stroke crosses the field without running off the glass.
const TOUCH_SENSITIVITY = 1.3;

export function createInput(canvas, viewport, { bindings = {}, bufferTime = DEFAULT_BUFFER } = {}) {
  const keyToActions = new Map();
  for (const [action, keys] of Object.entries(bindings)) {
    for (const key of keys) {
      if (!keyToActions.has(key)) keyToActions.set(key, []);
      keyToActions.get(key).push(action);
    }
  }

  const held = new Set();
  const pressed = new Set();
  const buffered = new Map();

  /**
   * Touch is relative, like a trackpad: a drag moves the ship by the finger's travel, from
   * wherever the finger went down. An absolute target parks the ship under the thumb,
   * which is exactly where the player cannot see it. `dx`/`dy` accumulate in view units
   * until the cartridge takes them with `consumeDrag`.
   */
  const pointer = { active: false, id: null, dx: 0, dy: 0, lastX: 0, lastY: 0 };
  const state = { held, pointer, usingTouch: false, axis: { x: 0, y: 0 } };

  const refreshAxis = () => {
    state.axis.x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    state.axis.y = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  };

  const onKeyDown = (e) => {
    const actions = keyToActions.get(e.code);
    if (!actions) return;
    e.preventDefault();
    state.usingTouch = false;
    if (e.repeat) return;
    for (const a of actions) {
      held.add(a);
      pressed.add(a);
      buffered.set(a, bufferTime);
    }
    refreshAxis();
  };

  const onKeyUp = (e) => {
    const actions = keyToActions.get(e.code);
    if (!actions) return;
    for (const a of actions) held.delete(a);
    refreshAxis();
  };

  const releaseAll = () => {
    held.clear();
    pressed.clear();
    buffered.clear();
    refreshAxis();
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse') return;
    // A second finger is ignored rather than taking over, so a resting thumb cannot steal
    // the ship mid-dodge.
    if (pointer.active) return;
    pointer.id = e.pointerId;
    pointer.active = true;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    state.usingTouch = true;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (e.pointerId !== pointer.id) return;
    const k = viewport.unitsPerPixel() * TOUCH_SENSITIVITY;
    pointer.dx += (e.clientX - pointer.lastX) * k;
    pointer.dy += (e.clientY - pointer.lastY) * k;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    e.preventDefault();
  };

  const onPointerEnd = (e) => {
    if (e.pointerId !== pointer.id) return;
    pointer.id = null;
    pointer.active = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseAll);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerEnd);
  canvas.addEventListener('pointercancel', onPointerEnd);

  return {
    state,
    isHeld: (action) => held.has(action),

    consumePress(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      buffered.delete(action);
      return true;
    },

    consumeBuffered(action) {
      if (!buffered.has(action)) return false;
      buffered.delete(action);
      pressed.delete(action);
      return true;
    },

    /** The finger's travel since the last call, in view units. */
    consumeDrag() {
      const d = { x: pointer.dx, y: pointer.dy };
      pointer.dx = 0;
      pointer.dy = 0;
      return d;
    },

    /** Ages the buffer and clears one-frame presses. Call at the end of each step. */
    endStep(dt) {
      pressed.clear();
      // Travel nobody took this step (a menu, a pause) is dropped, or the ship would jump
      // by all of it on resume.
      pointer.dx = 0;
      pointer.dy = 0;
      for (const [action, t] of buffered) {
        const next = t - dt;
        if (next <= 0) buffered.delete(action);
        else buffered.set(action, next);
      }
    },

    clear() {
      releaseAll();
      pointer.dx = 0;
      pointer.dy = 0;
      pointer.active = false;
      pointer.id = null;
    },

    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      releaseAll();
    },
  };
}
