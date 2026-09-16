import { rand } from '../../../core/math.js';
import { rt } from '../runtime.js';

const SPARK = ['#fff6ae', '#ffa0d8', '#edeef2'];
const DEBRIS = ['#f19152', '#d85a34', '#932419', '#edeef2'];

export const sparkBurst = (x, y) =>
  rt.particles.burst(x, y, {
    count: 5,
    speed: [40, 130],
    life: [0.12, 0.26],
    colours: SPARK,
    drag: 5,
    angle: Math.PI,
    spread: 0.9,
  });

export const explosionBurst = (x, y, scale = 1) =>
  rt.particles.burst(x, y, {
    count: Math.min(26, Math.round(10 * scale)),
    speed: [20 * scale, 150 * scale],
    life: [0.25, 0.7],
    size: [1, 2],
    colours: DEBRIS,
    drag: 2.2,
  });

export const thrustPuff = (x, y) =>
  rt.particles.emit({
    x,
    y,
    vx: rand(-90, -40),
    vy: rand(-12, 12),
    life: rand(0.1, 0.22),
    colour: '#85b6df',
    drag: 3,
  });
