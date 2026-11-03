import { clamp } from './math.js';

/**
 * The mobile breakpoint, shared with shell.css. A phone held sideways is wider than 720px,
 * so a coarse pointer counts on its own.
 */
export const MOBILE_QUERY = '(max-width: 720px), (pointer: coarse)';

/**
 * Sizes the canvas for a cartridge.
 *
 * The sprite scale is always a whole number and the internal resolution grows to fill
 * whatever box the window leaves, so a wide monitor buys more play field rather than
 * bigger pixels. The backing store lands within one scale unit of the device resolution,
 * so nothing resamples.
 *
 * On desktop the box is the window clamped to the cartridge's aspect. On mobile the box
 * is the whole screen at whatever aspect the phone is held, so a portrait phone gets a
 * tall field rather than a letterboxed one.
 *
 * A cartridge declares `resolution` as the *nominal* field plus the bounds it tolerates:
 *   { height, minHeight, maxHeight, minWidth, minAspect, maxAspect }
 */
export function createViewport(canvas, ctx, resolution) {
  const {
    height: nominalH = 240,
    minHeight = Math.round(nominalH * 0.75),
    maxHeight = Math.round(nominalH * 1.15),
    minAspect = 4 / 3,
    maxAspect = 2.4,
    minWidth = Math.round(minHeight * minAspect),
  } = resolution ?? {};

  const view = { w: 0, h: 0, scale: 1, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
  // Cached: a touch drag asks for it on every pointer move, faster than frames arrive.
  let unitsPerPx = 1;
  const listeners = new Set();
  const host = canvas.parentElement;
  const mobile = window.matchMedia(MOBILE_QUERY);

  function measure(availW, availH) {
    if (mobile.matches) return { boxW: availW, boxH: availH };
    const aspect = clamp(availW / availH, minAspect, maxAspect);
    let boxW = availW;
    let boxH = boxW / aspect;
    if (boxH > availH) {
      boxH = availH;
      boxW = boxH * aspect;
    }
    return { boxW, boxH };
  }

  /** The notch and home bar, in CSS pixels, read back from the env() values shell.css sets. */
  function safeArea() {
    const css = getComputedStyle(document.documentElement);
    const read = (side) => parseFloat(css.getPropertyValue(`--safe-${side}`)) || 0;
    return { top: read('top'), right: read('right'), bottom: read('bottom'), left: read('left') };
  }

  function apply(availW, availH) {
    if (!availW || !availH) return false;

    const { boxW, boxH } = measure(availW, availH);
    if (host) {
      host.style.width = `${boxW}px`;
      host.style.height = `${boxH}px`;
    }

    const dpr = window.devicePixelRatio || 1;
    const devW = boxW * dpr;
    const devH = boxH * dpr;

    let scale = Math.max(1, Math.ceil(devH / maxHeight));
    while (scale > 1 && Math.floor(devH / scale) < minHeight) scale--;
    // A portrait phone: the height alone would leave a field narrower than a boss.
    while (scale > 1 && Math.floor(devW / scale) < minWidth) scale--;

    const h = Math.max(minHeight, Math.floor(devH / scale));
    const w = Math.floor(devW / scale);

    const safe = safeArea();
    const unit = (px) => Math.ceil((px * dpr) / scale);
    const inset = {
      top: unit(safe.top),
      right: unit(safe.right),
      bottom: unit(safe.bottom),
      left: unit(safe.left),
    };

    const changed =
      w !== view.w || h !== view.h || scale !== view.scale ||
      inset.top !== view.inset.top || inset.right !== view.inset.right ||
      inset.bottom !== view.inset.bottom || inset.left !== view.inset.left;

    view.w = w;
    view.h = h;
    view.scale = scale;
    view.inset = inset;

    canvas.width = w * scale;
    canvas.height = h * scale;
    unitsPerPx = w / boxW;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (changed) for (const fn of listeners) fn(view);
    return changed;
  }

  // innerHeight rather than 100vh: on a phone it excludes whatever browser chrome is up.
  const refresh = () => apply(window.innerWidth, window.innerHeight);

  const observer = new ResizeObserver(refresh);
  observer.observe(document.body);
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);
  window.visualViewport?.addEventListener('resize', refresh);
  mobile.addEventListener('change', refresh);

  refresh();

  return {
    view,
    refresh,
    onResize(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Client coordinates to view units, for pointer input. */
    toView(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * view.w,
        y: ((clientY - r.top) / r.height) * view.h,
      };
    },
    /** View units per CSS pixel, so a finger's travel can be converted without an origin. */
    unitsPerPixel() {
      return unitsPerPx;
    },
    destroy() {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      window.visualViewport?.removeEventListener('resize', refresh);
      mobile.removeEventListener('change', refresh);
      listeners.clear();
    },
  };
}
