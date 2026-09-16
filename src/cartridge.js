/**
 * The one cartridge. `load` is a dynamic import so Vite code-splits the game into its own
 * chunk: the shell paints before a game's worth of sprites is on the wire.
 */
export const CARTRIDGE = {
  id: 'ionbreach',
  title: 'Ionbreach',
  load: () => import('./games/ionbreach/index.js'),
};
