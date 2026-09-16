import { createSession, resetSession, updateSession, drawSession } from './world.js';
import { drawBackground, updateBackground } from './render/background.js';
import { rt } from './runtime.js';
import { read, write, remove } from '../../core/storage.js';

export const SCREEN = {
  TITLE: 'title',
  DIFFICULTY: 'difficulty',
  SCORES: 'scores',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
  VICTORY: 'victory',
};

/** The screens that sit over the attract loop rather than over a live run. */
const ATTRACT = new Set([SCREEN.TITLE, SCREEN.DIFFICULTY, SCREEN.SCORES, SCREEN.OVER, SCREEN.VICTORY]);

const BEST_KEY = 'best';

export const loadBest = () => Number(read(BEST_KEY, 0)) || 0;
const saveBest = (score) => write(BEST_KEY, score);
export const clearBest = () => remove(BEST_KEY);

export function createGame() {
  return {
    screen: SCREEN.TITLE,
    session: createSession(),
    best: loadBest(),
    lastScore: 0,
    onScreenChange: () => {},
  };
}

function setScreen(game, screen) {
  if (game.screen === screen) return;
  game.screen = screen;
  game.onScreenChange(screen);
}

export function startRun(game) {
  resetSession(game.session);
  // Already running from the menu; this only matters after a mute/unmute round trip.
  rt.audio.startMusic();
  setScreen(game, SCREEN.PLAYING);
}

export function togglePause(game) {
  if (game.screen === SCREEN.PLAYING) setScreen(game, SCREEN.PAUSED);
  else if (game.screen === SCREEN.PAUSED) setScreen(game, SCREEN.PLAYING);
}

export function toTitle(game) {
  setScreen(game, SCREEN.TITLE);
}

export function toScreen(game, screen) {
  setScreen(game, screen);
}

function endRun(game, outcome) {
  game.lastScore = game.session.score;
  if (game.lastScore > game.best) {
    game.best = game.lastScore;
    saveBest(game.best);
  }
  setScreen(game, outcome === 'won' ? SCREEN.VICTORY : SCREEN.OVER);
}

export function updateGame(game, dt, input) {
  switch (game.screen) {
    case SCREEN.PLAYING: {
      const outcome = updateSession(game.session, dt, input);
      if (outcome) endRun(game, outcome);
      break;
    }
    case SCREEN.PAUSED:
      break;
    default:
      // The attract screens keep the parallax alive behind the menu overlay.
      if (ATTRACT.has(game.screen)) updateBackground(game.session.background, dt);
  }
}

export function drawGame(ctx, game) {
  if (game.screen === SCREEN.PLAYING || game.screen === SCREEN.PAUSED) {
    drawSession(ctx, game.session);
  } else {
    drawBackground(ctx, game.session.background);
  }
}
