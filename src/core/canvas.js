import { clamp } from './math.js';

/**
 * Sizes the canvas for a cartridge.
 *
 * The sprite scale is always a whole number and the internal resolution grows to fill
 * whatever box the window leaves, so a wide monitor buys more play field rather than
 * bigger pixels. The backing store lands within one scale unit of the device resolution,
 * so nothing resamples.
 *
 * A cartridge declares `resolution` as the *nominal* field plus the bounds it tolerates:
 *   { height, minHeight, maxHeight, minAspect, maxAspect }
 */
export function createViewport(canvas, ctx, resolution) {
  const {
    height: nominalH = 240,
    minHeight = Math.round(nominalH * 0.75),
    maxHeight = Math.round(nominalH * 1.15),
    minAspect = 4 / 3,
    maxAspect = 2.4,
  } = resolution ?? {};

  const view = { w: 0, h: 0, scale: 1 };
  const listeners = new Set();

  function measure(availW, availH) {
    const aspect = clamp(availW / availH, minAspect, maxAspect);
    let boxW = availW;
    let boxH = boxW / aspect;
    if (boxH > availH) {
      boxH = availH;
      boxW = boxH * aspect;
    }
    return { boxW, boxH };
  }

  function apply(availW, availH) {
    if (!availW || !availH) return false;

    const { boxW, boxH } = measure(availW, availH);
    const host = canvas.parentElement;
    if (host) {
      host.style.width = `${boxW}px`;
      host.style.height = `${boxH}px`;
    }

    const dpr = window.devicePixelRatio || 1;
    const devH = boxH * dpr;

    let scale = Math.max(1, Math.ceil(devH / maxHeight));
    while (scale > 1 && Math.floor(devH / scale) < minHeight) scale--;

    const h = Math.max(minHeight, Math.floor(devH / scale));
    const w = Math.floor((boxW * dpr) / scale);
    const changed = w !== view.w || h !== view.h || scale !== view.scale;

    view.w = w;
    view.h = h;
    view.scale = scale;

    canvas.width = w * scale;
    canvas.height = h * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    if (changed) for (const fn of listeners) fn(view);
    return changed;
  }

  const refresh = () => apply(window.innerWidth, window.innerHeight);

  const observer = new ResizeObserver(refresh);
  observer.observe(document.body);
  window.addEventListener('resize', refresh);
  window.addEventListener('orientationchange', refresh);

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
    destroy() {
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      listeners.clear();
    },
  };
}
