const MAX_FRAME = 0.25;

/**
 * Fixed-timestep runner. Accumulated time is capped so a backgrounded tab does not
 * return and simulate a hundred steps at once.
 */
export function createLoop({ step = 1 / 60, update, render }) {
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;

  const frame = (now) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    acc += dt;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render(acc / step);
  };

  return {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}
