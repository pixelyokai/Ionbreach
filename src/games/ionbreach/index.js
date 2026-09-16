import { RESOLUTION, VIEW_W, VIEW_H, syncView } from './config.js';
import { attach, detach } from './runtime.js';
import { levelAt, LEVEL_COUNT } from './data/levels.js';
import { createBackground } from './render/background.js';
import { resetSpawner } from './spawner.js';
import { damageBoss } from './entities/boss.js';
import { loadSprites } from './render/sprites.js';
import { drawText } from './render/hud.js';
import {
  SCREEN, createGame, updateGame, drawGame, startRun, togglePause, loadBest, clearBest,
  toTitle, toScreen,
} from './state.js';
import { DIFFICULTIES, difficulty, difficultyById, setDifficulty } from './data/difficulty.js';
import { formatDuration } from '../../ui/panels/RunLog.jsx';
import coverUrl from './assets/sprites/ship.png';

const audioUrl = (f) => new URL(`./assets/audio/${f}`, import.meta.url).href;

const AUDIO = {
  sfx: {
    shoot: { src: audioUrl('shoot.ogg'), volume: 0.22, voices: 4, cooldown: 0.05 },
    enemyShoot: { src: audioUrl('enemy-shoot.ogg'), volume: 0.16, voices: 3, cooldown: 0.06 },
    explode: { src: audioUrl('explode.ogg'), volume: 0.35, voices: 4, cooldown: 0.03 },
    explodeBig: { src: audioUrl('explode-big.ogg'), volume: 0.45, voices: 3, cooldown: 0.05 },
    hit: { src: audioUrl('hit.ogg'), volume: 0.2, voices: 4, cooldown: 0.03 },
    pickup: { src: audioUrl('pickup.ogg'), volume: 0.4, voices: 2, cooldown: 0.05 },
    shield: { src: audioUrl('shield.ogg'), volume: 0.4, voices: 2, cooldown: 0.05 },
    playerDeath: { src: audioUrl('player-death.ogg'), volume: 0.5, voices: 1, cooldown: 0.2 },
  },
  music: { src: audioUrl('music.ogg'), fallback: audioUrl('music.mp3'), volume: 0.32 },
};

const BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  fire: ['Space'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'Space'],
};

let ctx;
let services;
let game;
let unsubscribeResize;
let currentPanel = null;

function showTitle() {
  show('title', {
    tagline: 'Dodge. Shoot. Survive. Repeat.',
    difficultyName: difficulty.name,
    hints: services.input.state.usingTouch
      ? ['Drag anywhere to fly', 'Fire is automatic']
      : ['Arrow keys / WASD to move', 'Fire is automatic · P to pause'],
    onStart: () => {
      services.unlockAudio();
      begin();
    },
    onDifficulty: () => toScreen(game, SCREEN.DIFFICULTY),
    onScores: () => toScreen(game, SCREEN.SCORES),
  });
}

/** The multipliers, written out, so the choice is made on numbers rather than adjectives. */
const difficultyStats = (d) =>
  `Speed ×${d.enemySpeed} · Lives ${d.lives} · Score ×${d.scoreScale}`;

function showDifficulty() {
  show('difficulty', {
    selected: difficulty.id,
    options: DIFFICULTIES.map((d) => ({
      id: d.id,
      name: d.name,
      blurb: d.blurb,
      stats: difficultyStats(d),
    })),
    onConfirm: (id) => {
      setDifficulty(id);
      toTitle(game);
    },
    onBack: () => toTitle(game),
  });
}

function showScores() {
  const runs = services.runlog.top('higher');
  show('scores', {
    runs,
    best: game.best || null,
    latestAt: services.runlog.recent(1)[0]?.at ?? null,
    onBack: () => toTitle(game),
    onReset: () => {
      services.runlog.clear();
      clearBest();
      game.best = 0;
      showScores();
    },
  });
}

function begin() {
  startRun(game);
}

function showPause() {
  show('pause', {
    onResume: () => togglePause(game),
    onRestart: () => begin(),
    onExit: () => toTitle(game),
  });
}

function showResult(won) {
  const s = game.session;
  const previousBest = game.best;
  services.runlog.record({
    score: game.lastScore,
    durationMs: Math.round(s.elapsed * 1000),
    meta: { won, sector: s.level + 1, difficulty: s.difficulty },
  });
  game.best = Math.max(previousBest, game.lastScore);

  show('result', {
    title: won ? 'MISSION COMPLETE' : 'GAME OVER',
    subtitle: won ? 'All sectors cleared.' : `Lost in ${levelAt(s.level).name}.`,
    score: game.lastScore,
    best: previousBest || null,
    newBest: game.lastScore > previousBest,
    tone: won ? 'default' : 'destructive',
    stats: won
      ? [
          { label: 'SECTORS CLEARED', value: `${LEVEL_COUNT} / ${LEVEL_COUNT}` },
          { label: 'BOSSES DEFEATED', value: `${s.bossKills} / ${LEVEL_COUNT}` },
          { label: 'ENEMIES DOWNED', value: String(s.kills) },
          { label: 'TIME', value: formatDuration(s.elapsed * 1000) },
          { label: 'DIFFICULTY', value: difficultyById(s.difficulty).name },
        ]
      : [
          { label: 'SECTOR REACHED', value: `${s.level + 1} / ${LEVEL_COUNT}` },
          { label: 'ENEMIES DOWNED', value: String(s.kills) },
          { label: 'TIME', value: formatDuration(s.elapsed * 1000) },
          { label: 'DIFFICULTY', value: difficultyById(s.difficulty).name },
        ],
    actionLabel: won ? 'PLAY AGAIN' : 'RETRY',
    onAction: () => begin(),
    onExit: () => toTitle(game),
    onShare: share,
    shareLabel: 'SHARE ON X (TWITTER)',
  });
}

// The menu shouts its labels; a sentence should not.
const titleCase = (w) => w.charAt(0) + w.slice(1).toLowerCase();

/**
 * Shares the run to X.
 *
 * The link points at /s rather than at the game, because that route renders this run's own
 * card: X reads a URL's meta tags server-side and never runs the page, so a per-run image
 * has to come from a per-run URL. Anyone following the link is sent straight on to the
 * game.
 */
function share() {
  const s = game.session;
  const won = s.outcome === 'won';
  const base = location.href.split('#')[0];

  const params = new URLSearchParams({
    o: won ? 'won' : 'lost',
    s: String(game.lastScore),
    k: String(s.level + 1),
    d: s.difficulty,
    b: String(game.best),
  });
  const url = new URL(`s?${params}`, base).href;

  const outcome = won ? 'MISSION COMPLETE' : 'GAME OVER';
  const sector = won ? LEVEL_COUNT : s.level + 1;
  const text =
    `Ionbreach — ${outcome}
` +
    `Score: ${game.lastScore.toLocaleString('en-US')} · ` +
    `Sector ${sector}/${LEVEL_COUNT} · ${titleCase(difficultyById(s.difficulty).name)}

` +
    'Can you beat it?';

  const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  // noopener so the composer cannot reach back through window.opener.
  window.open(intent, '_blank', 'noopener,noreferrer');
}

/**
 * One screen, one panel. The panel is rebuilt whenever the screen changes, and also on
 * demand when a panel needs to re-read state it does not own (the score list after a
 * reset), which is why `show` records what is up rather than the callers doing it.
 */
function show(panel, props) {
  currentPanel = panel;
  services.ui.show(panel, props);
}

const PANEL_FOR = {
  [SCREEN.TITLE]: showTitle,
  [SCREEN.DIFFICULTY]: showDifficulty,
  [SCREEN.SCORES]: showScores,
  [SCREEN.PAUSED]: showPause,
  [SCREEN.OVER]: () => showResult(false),
  [SCREEN.VICTORY]: () => showResult(true),
};

function syncPanel() {
  const open = PANEL_FOR[game.screen];
  if (!open) {
    if (currentPanel !== null) {
      services.ui.hide();
      currentPanel = null;
    }
    return;
  }
  const wanted = game.screen === SCREEN.OVER || game.screen === SCREEN.VICTORY ? 'result' : game.screen;
  if (currentPanel !== wanted) open();
}

export default {
  id: 'ionbreach',
  title: 'Ionbreach',
  blurb: 'Three sectors, three bosses. Hold the left third and keep moving.',
  cover: coverUrl,

  resolution: RESOLUTION,
  supportsTouch: true,
  desktopOnly: false,

  scoreLabel: 'Score',
  scoreFormat: 'number',
  scoreDirection: 'higher',

  bindings: BINDINGS,
  particleCapacity: 300,
  audio: AUDIO,

  async init(s) {
    services = s;
    ctx = s.ctx;
    attach(s);

    syncView(s.view.w, s.view.h);
    unsubscribeResize = s.viewport.onResize((v) => syncView(v.w, v.h));

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'LOADING', VIEW_W / 2, VIEW_H / 2 - 4, '#9a8c88', 'center');

    await loadSprites();

    game = createGame();
    game.best = loadBest();
    game.onScreenChange = () => syncPanel();
  },

  start() {
    syncPanel();
    services.loop.start();
    services.audio.startMusic();

    // Dev-only handles for tools/smoke.mjs. Stripped from production builds.
    if (import.meta.env?.DEV) {
      window.__ionbreach = {
        get game() {
          return game;
        },
        begin,
        // Jump to a sector so a later level can be tested without clearing the earlier ones.
        gotoLevel: (i) => {
          const s2 = game.session;
          s2.level = Math.max(0, Math.min(i, LEVEL_COUNT - 1));
          s2.background = createBackground(levelAt(s2.level));
          s2.bossActive = false;
          s2.boss = null;
          s2.enemies.length = 0;
          resetSpawner(s2.spawner);
          s2.waveNumber = 1;
        },
        skipToBoss: () => {
          const s2 = game.session;
          s2.spawner.wave = levelAt(s2.level).waves.length - 1;
          s2.spawner.next = Number.MAX_SAFE_INTEGER;
          s2.enemies.length = 0;
        },
        // Ends a boss fight outright, so sector hand-off can be tested in seconds.
        killBoss: () => {
          const b = game.session.boss;
          if (b) damageBoss(b, b.health);
          return Boolean(b);
        },
        // Ends a run the losing way, so the game-over panel is reachable in a test.
        die: () => { game.session.player.lives = 0; },
        probe: () => ({
          screen: game.screen,
          level: game.session.level,
          levelName: levelAt(game.session.level).name,
          wave: game.session.waveNumber,
          score: game.session.score,
          lives: game.session.player.lives,
          enemies: game.session.enemies.length,
          bossHealth: game.session.boss ? Math.round(game.session.boss.health) : null,
          bossId: game.session.boss?.id ?? null,
          outcome: game.session.outcome ?? null,
        }),
      };
    }
  },

  update(dt) {
    const input = services.input;
    if (input.consumePress('pause') && (game.screen === SCREEN.PLAYING || game.screen === SCREEN.PAUSED)) {
      togglePause(game);
    }
    updateGame(game, dt, input);
  },

  render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawGame(ctx, game);
  },

  pause() {
    if (game.screen === SCREEN.PLAYING) togglePause(game);
  },

  resume() {
    if (game.screen === SCREEN.PAUSED) togglePause(game);
  },

  stop() {
    services.loop.stop();
  },

  destroy() {
    unsubscribeResize?.();
    unsubscribeResize = null;
    detach();
    services = null;
    game = null;
    ctx = null;
    currentPanel = null;
  },
};
