/**
 * The services the console hands this cartridge, kept in one place so the game's modules
 * can reach them without every function taking a services argument.
 *
 * Set once in init, cleared in destroy. Nothing here survives teardown.
 */
export const rt = {
  sprites: null,
  particles: null,
  audio: null,
  view: null,
};

export function attach(services) {
  rt.sprites = services.sprites;
  rt.particles = services.particles;
  rt.audio = services.audio;
  rt.view = services.view;
}

export function detach() {
  rt.sprites = null;
  rt.particles = null;
  rt.audio = null;
  rt.view = null;
}

export const play = (name) => rt.audio?.play(name);
