import { VIEW_W, VIEW_H, SCORE } from './config.js';
import { hits } from '../../core/collision.js';
import { createSpawner, resetSpawner, updateSpawner, currentWaveNumber } from './spawner.js';
import {
  createPlayer, updatePlayer, drawPlayer, damagePlayer, grantPowerup, resetPlayerPosition,
} from './entities/player.js';
import { updateEnemy, drawEnemy, enemyOffscreen } from './entities/enemy.js';
import { bullets, updateBullets } from './entities/bullet.js';
import { sparkBurst, explosionBurst } from './entities/particle.js';
import { powerups, updatePowerups, drawPowerups, clearPowerups, maybeDrop } from './entities/powerup.js';
import { createBoss, updateBoss, drawBoss, drawBossHealth, damageBoss } from './entities/boss.js';
import { createBackground, updateBackground, drawBackground } from './render/background.js';
import { levelAt, isFinalLevel, LEVEL_COUNT } from './data/levels.js';
import { drawFrame } from './render/sprites.js';
import { drawHud, drawBanner } from './render/hud.js';
import { rt, play } from './runtime.js';
import { rand } from '../../core/math.js';
import { difficulty, difficultyById } from './data/difficulty.js';

const DEATH_PAUSE = 1.3;
const VICTORY_PAUSE = 2.6;

/**
 * The playing simulation: everything that exists only while a run is in progress.
 * The screen state machine in state.js owns when this runs.
 */
export function createSession() {
  return {
    player: createPlayer(),
    enemies: [],
    explosions: [],
    spawner: createSpawner(),
    level: 0,
    background: createBackground(levelAt(0)),
    boss: null,
    bossActive: false,
    score: 0,
    combo: 1,
    comboTimer: 0,
    waveNumber: 1,
    kills: 0,
    bossKills: 0,
    elapsed: 0,
    difficulty: difficulty.id,
    shake: 0,
    banner: null,
    bannerTimer: 0,
    outcome: null,    // 'dead' | 'won' once the run has resolved
    resolveTimer: 0,
  };
}

export function resetSession(s) {
  s.player = createPlayer();
  s.enemies.length = 0;
  s.explosions.length = 0;
  resetSpawner(s.spawner);
  s.level = 0;
  s.background = createBackground(levelAt(0));
  s.boss = null;
  s.bossActive = false;
  s.score = 0;
  s.combo = 1;
  s.comboTimer = 0;
  s.waveNumber = 1;
  s.kills = 0;
  s.bossKills = 0;
  s.elapsed = 0;
  // Locked in at the start, so the panel reports the run that was actually played even if
  // the setting is changed before it is read.
  s.difficulty = difficulty.id;
  s.shake = 0;
  s.banner = null;
  s.bannerTimer = 0;
  s.outcome = null;
  s.resolveTimer = 0;
  bullets.clear();
  rt.particles.clear();
  clearPowerups();
}

/** Clears the field and rebuilds the session against the next level's data. */
function advanceLevel(s) {
  s.level++;
  const next = levelAt(s.level);
  s.bossActive = false;
  s.enemies.length = 0;
  bullets.clear();
  clearPowerups();
  resetSpawner(s.spawner);
  s.background = createBackground(next);
  s.waveNumber = 1;
  banner(s, `SECTOR ${s.level + 1}  ${next.name.toUpperCase()}`, 2.6);
}

const addShake = (s, amount) => { s.shake = Math.min(6, s.shake + amount); };

function banner(s, text, time = 1.6) {
  s.banner = text;
  s.bannerTimer = time;
}

function addExplosion(s, x, y, scale = 1) {
  s.explosions.push({ x, y, t: 0, scale });
  explosionBurst(x, y, scale);
}

/**
 * The single place points are awarded. The difficulty multiplier is applied here rather
 * than at each call site, so a new scoring event cannot silently skip it.
 */
function award(s, points) {
  s.score += Math.round(points * difficultyScale(s));
}

const difficultyScale = (s) => difficultyById(s.difficulty).scoreScale;

function addScore(s, base) {
  award(s, base * s.combo);
  s.combo = Math.min(SCORE.maxCombo, s.combo + 1);
  s.comboTimer = SCORE.comboWindow;
}

// Returns the run outcome once it has resolved, otherwise null.
export function updateSession(s, dt, input) {
  const p = s.player;

  if (!s.outcome) s.elapsed += dt;
  updateBackground(s.background, dt, s.bossActive ? 0.35 : 1);
  s.shake = Math.max(0, s.shake - dt * 14);
  if (s.bannerTimer > 0) s.bannerTimer -= dt;

  s.comboTimer -= dt;
  if (s.comboTimer <= 0 && s.combo > 1) s.combo = 1;

  // A resolved run keeps simulating for a beat, so the last explosion is seen before
  // the screen changes.
  if (s.outcome) {
    s.resolveTimer -= dt;
    updateBullets(dt);
    rt.particles.update(dt);
    updateExplosions(s, dt);
    return s.resolveTimer <= 0 ? s.outcome : null;
  }

  updatePlayer(p, dt, input, () => play('shoot'));

  const level = levelAt(s.level);
  const event = s.bossActive ? null : updateSpawner(s.spawner, dt, s.enemies, level.waves);
  s.waveNumber = currentWaveNumber(s.spawner, level.waves);
  if (event === 'waveClear') {
    award(s, SCORE.waveClear);
    banner(s, 'WAVE CLEAR');
  } else if (event === 'boss') {
    s.bossActive = true;
    s.boss = createBoss(level.boss);
    banner(s, 'WARNING', 2.2);
  }

  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    updateEnemy(e, dt, p, () => play('enemyShoot'));
    if (enemyOffscreen(e)) s.enemies.splice(i, 1);
  }

  if (s.boss) {
    updateBoss(s.boss, dt, p, () => play('enemyShoot'), () => {
      play('explodeBig');
      addShake(s, 3);
    });
    if (s.boss.dead) {
      award(s, SCORE.bossKill);
      s.bossKills++;
      s.boss = null;
      addShake(s, 6);
      // The last level's boss ends the run; every other one opens the next sector.
      if (isFinalLevel(s.level)) {
        s.outcome = 'won';
        s.resolveTimer = VICTORY_PAUSE;
        banner(s, 'VICTORY', VICTORY_PAUSE);
      } else {
        advanceLevel(s);
      }
    }
  }

  updateBullets(dt);
  rt.particles.update(dt);
  updatePowerups(dt);
  updateExplosions(s, dt);

  resolveCollisions(s);

  if (p.lives <= 0 && !s.outcome) {
    s.outcome = 'dead';
    s.resolveTimer = DEATH_PAUSE;
  }
  return null;
}

function updateExplosions(s, dt) {
  for (let i = s.explosions.length - 1; i >= 0; i--) {
    const e = s.explosions[i];
    e.t += dt;
    if (e.t > 0.4) s.explosions.splice(i, 1);
  }
}

function hitPlayer(s) {
  const p = s.player;
  if (p.invuln > 0) return;
  if (!damagePlayer(p)) {
    // Absorbed by the shield.
    play('shield');
    addShake(s, 2);
    return;
  }
  play('playerDeath');
  addExplosion(s, p.x, p.y, 1.6);
  addShake(s, 6);
  s.combo = 1;
  if (p.lives > 0) resetPlayerPosition(p);
}

function resolveCollisions(s) {
  const p = s.player;
  const playerAlive = p.lives > 0;

  for (let i = 0; i < bullets.alive; i++) {
    const b = bullets.items[i];

    if (b.friendly) {
      let consumed = false;
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const e = s.enemies[j];
        if (!hits(b, e)) continue;
        e.health -= b.damage;
        e.flash = 0.08;
        sparkBurst(b.x, b.y);
        play('hit');
        if (e.health <= 0) {
          addExplosion(s, e.x, e.y, e.cfg.w > 20 ? 1.4 : 0.9);
          play('explode');
          addScore(s, e.cfg.score);
          s.kills++;
          maybeDrop(e.x, e.y);
          s.enemies.splice(j, 1);
          addShake(s, 0.8);
        }
        consumed = true;
        break;
      }
      if (!consumed && s.boss && !s.boss.entering && s.boss.dying <= 0 && hits(b, s.boss)) {
        sparkBurst(b.x, b.y);
        play('hit');
        if (damageBoss(s.boss, b.damage)) {
          addExplosion(s, s.boss.x, s.boss.y, 2.4);
          play('explodeBig');
        }
        consumed = true;
      }
      if (consumed) i = bullets.releaseAt(i);
      continue;
    }

    if (playerAlive && hits(b, p)) {
      i = bullets.releaseAt(i);
      hitPlayer(s);
    }
  }

  if (!playerAlive) return;

  // Contact damage. Ramming an enemy costs a life and destroys the enemy.
  for (let j = s.enemies.length - 1; j >= 0; j--) {
    const e = s.enemies[j];
    if (!hits(e, p)) continue;
    if (p.invuln <= 0) {
      addExplosion(s, e.x, e.y, 1);
      play('explode');
      s.enemies.splice(j, 1);
    }
    hitPlayer(s);
  }

  if (s.boss && !s.boss.entering && s.boss.dying <= 0 && hits(s.boss, p)) hitPlayer(s);

  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    if (!hits(pu, p)) continue;
    grantPowerup(p, pu.type.id);
    play('pickup');
    award(s, 50);
    banner(s, pu.type.label, 0.9);
    powerups.splice(i, 1);
  }
}

export function drawSession(ctx, s) {
  ctx.save();
  if (s.shake > 0) {
    ctx.translate(Math.round(rand(-s.shake, s.shake)), Math.round(rand(-s.shake, s.shake)));
  }

  drawBackground(ctx, s.background);
  drawPowerups(ctx);

  for (const e of s.enemies) drawEnemy(ctx, e);
  if (s.boss) drawBoss(ctx, s.boss);

  drawBullets(ctx);
  if (s.player.lives > 0 && !s.outcome) drawPlayer(ctx, s.player);

  for (const e of s.explosions) {
    const frame = Math.min(4, Math.floor((e.t / 0.4) * 5));
    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    ctx.scale(e.scale, e.scale);
    drawFrame(ctx, 'explosion', frame, -8, -8);
    ctx.restore();
  }

  rt.particles.draw(ctx);
  ctx.restore();

  drawHud(ctx, s, LEVEL_COUNT);
  if (s.boss) drawBossHealth(ctx, s.boss);
  if (s.bannerTimer > 0 && s.banner) {
    drawBanner(ctx, s.banner, VIEW_H / 2 - 44, s.banner === 'WARNING' ? '#d85a34' : '#fff6ae');
  }
}

function drawBullets(ctx) {
  for (let i = 0; i < bullets.alive; i++) {
    const b = bullets.items[i];
    const frame = Math.floor(b.anim * 16) % 2;
    drawFrame(ctx, b.friendly ? 'boltPlayer' : 'boltEnemy', frame, b.x - 8, b.y - 8);
  }
}

export { VIEW_W, VIEW_H };
