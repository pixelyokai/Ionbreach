import { createLoop } from './loop.js';
import { createInput } from './input.js';
import { createViewport } from './canvas.js';
import { createSpriteStore } from './sprites.js';
import { createParticles } from './particles.js';
import { createMixer, unlock as unlockAudio, setMuted, isMuted, onMuteChange } from './audio.js';
import { scopedTo } from './runlog.js';

const REQUIRED = ['id', 'title', 'init', 'start', 'stop', 'destroy'];

function assertContract(cart) {
  const missing = REQUIRED.filter((k) => cart?.[k] == null);
  if (missing.length) {
    throw new Error(`cartridge "${cart?.id ?? '?'}" is missing: ${missing.join(', ')}`);
  }
}

/**
 * Builds the services a cartridge receives, runs its lifecycle, and guarantees teardown.
 *
 * Everything the console allocates on a cartridge's behalf is tracked here and released in
 * `destroy()`. A cartridge that forgets to clean up its own listeners is still a bug, but
 * it cannot leak anything the console handed it.
 */
export async function mountCartridge(cart, { canvas, ctx, ui, exit }) {
  assertContract(cart);

  const viewport = createViewport(canvas, ctx, cart.resolution);
  const input = createInput(canvas, viewport.toView, {
    bindings: cart.bindings ?? {},
    bufferTime: cart.inputBuffer,
  });
  const sprites = createSpriteStore();
  const particles = createParticles(cart.particleCapacity);
  const audio = createMixer(cart.audio);
  const disposers = [];

  const loop = createLoop({
    step: cart.step ?? 1 / 60,
    update: (dt) => {
      cart.update?.(dt);
      input.endStep(dt);
    },
    render: (alpha) => cart.render?.(alpha),
  });

  const services = {
    canvas,
    ctx,
    view: viewport.view,
    viewport,
    loop,
    input,
    sprites,
    particles,
    audio,
    createMixer,
    unlockAudio,
    setMuted,
    isMuted,
    onMuteChange,
    runlog: scopedTo(cart.id),
    ui,
    exit,
    /** Register anything else that must be released on teardown. */
    onDestroy(fn) {
      disposers.push(fn);
    },
  };

  await cart.init(services);

  let destroyed = false;
  return {
    cart,
    services,
    start: () => cart.start(),
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      try {
        await cart.stop?.();
        await cart.destroy?.();
      } catch (err) {
        console.error(`cartridge "${cart.id}" teardown threw`, err);
      }
      for (const fn of disposers.reverse()) {
        try {
          fn();
        } catch (err) {
          console.error('disposer threw', err);
        }
      }
      audio.destroy();
      input.destroy();
      viewport.destroy();
      sprites.destroy();
      particles.clear();
      ui.hide();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
