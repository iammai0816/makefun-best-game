// Star Salvage: game loop and state machine (title / playing / paused / gameover).
// Owns the world state, collisions, waves, combo, particles and the ?shot= scenes.

import { createInput, createRng, isDown, wasPressed, endFrame, GAME_WIDTH, GAME_HEIGHT } from './input.js';
import { createAudio } from './audio.js';
import { createShip, updateShip, fireShip, damageShip, drawShip } from './ship.js';
import { createField, startWave, updateAsteroids, drawAsteroids, splitAsteroid } from './asteroids.js';
import { createCargo, spawnPod, updateCargo, drawCargo, podScore, POD_FUEL, POD_REPAIR } from './cargo.js';
import { createStars, drawBackground, drawHUD, drawTitle, drawPaused, drawGameOver } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const audio = createAudio();

const WAVE_SECONDS = 30;
const COMBO_SECONDS = 4;

const state = {
  mode: 'title', // 'title' | 'playing' | 'paused' | 'gameover'
  score: 0,
  best: 0,
  wave: 1,
  combo: 0,
  bestCombo: 0,
  comboTimer: 0,
  waveTimer: WAVE_SECONDS,
  banner: 0,
  podsCollected: 0,
  rocksBlasted: 0,
  time: 0,
  shake: 0,
  frozen: false, // ?shot= scenes render one fixed frame
  ship: null,
  field: null,
  cargo: null,
  stars: null,
  particles: [],
  rng: createRng(1),
};

try {
  state.best = Number(localStorage.getItem('star-salvage-best') || 0) || 0;
} catch {
  state.best = 0;
}

function saveBest() {
  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('star-salvage-best', String(state.best)); } catch { /* storage unavailable */ }
  }
}

function resetWorld(rng) {
  state.ship = createShip(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
  state.field = createField();
  state.cargo = createCargo();
  state.particles = [];
  state.score = 0;
  state.wave = 1;
  state.combo = 0;
  state.bestCombo = 0;
  state.comboTimer = 0;
  state.waveTimer = WAVE_SECONDS;
  state.banner = 0;
  state.podsCollected = 0;
  state.rocksBlasted = 0;
  state.shake = 0;
  startWave(state.field, rng, 1);
  spawnPod(state.cargo, rng, GAME_WIDTH / 2 - 260, GAME_HEIGHT / 2 - 80, 'score');
  spawnPod(state.cargo, rng, GAME_WIDTH / 2 + 280, GAME_HEIGHT / 2 + 40, 'fuel');
  spawnPod(state.cargo, rng, GAME_WIDTH / 2 + 120, GAME_HEIGHT / 2 - 160, 'score');
}

function startGame() {
  audio.ensure();
  audio.startMusic();
  resetWorld(createRng((Math.random() * 1e9) | 0));
  state.mode = 'playing';
  state.banner = 2.5;
  setStatus('Playing. Collect cargo pods, dodge or blast the asteroids.');
}

function endGame() {
  state.mode = 'gameover';
  saveBest();
  audio.gameOver();
  audio.stopMusic();
  setStatus(`Game over. Final score ${state.score}. Press Enter to fly again.`);
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 220;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  state.shake = Math.min(14, state.shake + 6);
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.2, dt);
    p.vy *= Math.pow(0.2, dt);
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function collectPod(pod) {
  state.podsCollected += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.comboTimer = COMBO_SECONDS;
  const gained = podScore(pod, state.combo);
  state.score += gained;
  if (pod.kind === 'fuel') state.ship.fuel = Math.min(state.ship.maxFuel, state.ship.fuel + POD_FUEL);
  if (pod.kind === 'repair') state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + POD_REPAIR);
  spawnExplosion(pod.x, pod.y, pod.kind === 'score' ? '#ffd166' : pod.kind === 'fuel' ? '#4ade80' : '#f472b6', 10);
  audio.pickup(state.combo);
}

function checkCollisions() {
  const ship = state.ship;
  // Bullets vs asteroids.
  for (const bullet of ship.bullets) {
    for (const rock of state.field.list) {
      const dx = bullet.x - rock.x;
      const dy = bullet.y - rock.y;
      if (dx * dx + dy * dy < (rock.r + 5) * (rock.r + 5)) {
        bullet.life = 0;
        rock.hp -= 1;
        spawnExplosion(bullet.x, bullet.y, '#b8fff4', 4);
        if (rock.hp <= 0) {
          rock.dead = true;
          state.rocksBlasted += 1;
          state.score += Math.round(25 * (rock.r / 20));
          spawnExplosion(rock.x, rock.y, '#8b7fb8', 18);
          audio.explosion();
          splitAsteroid(state.field, state.rng, state.wave, rock);
          // A blasted rock sometimes leaves salvage behind.
          if (Math.random() < 0.35) spawnPod(state.cargo, state.rng, rock.x, rock.y);
        }
        break;
      }
    }
  }
  state.field.list = state.field.list.filter((rock) => !rock.dead);

  // Ship vs asteroids.
  for (const rock of state.field.list) {
    const dx = ship.x - rock.x;
    const dy = ship.y - rock.y;
    const dist = Math.hypot(dx, dy);
    if (dist < rock.r * 0.85 + 14) {
      if (damageShip(ship, 20)) {
        spawnExplosion(ship.x, ship.y, '#ff7a6b', 16);
        audio.hit();
        // The rock bounces off the ship instead of sticking to it.
        const push = dist > 0.01 ? 1 : 0;
        rock.vx = (dx / (dist || 1)) * 120 * push + rock.vx * -0.4;
        rock.vy = (dy / (dist || 1)) * 120 * push + rock.vy * -0.4;
        ship.vx += (dx / (dist || 1)) * 140;
        ship.vy += (dy / (dist || 1)) * 140;
      }
    }
  }

  // Ship vs cargo pods.
  for (const pod of state.cargo.list) {
    const dx = ship.x - pod.x;
    const dy = ship.y - pod.y;
    if (dx * dx + dy * dy < (pod.r + 18) * (pod.r + 18)) {
      pod.dead = true;
      collectPod(pod);
    }
  }
  state.cargo.list = state.cargo.list.filter((pod) => !pod.dead);
}

function updatePlaying(dt) {
  const ship = state.ship;
  updateShip(ship, input, dt);
  if (isDown(input, ' ') || input.mouse.down) fireShip(ship, input, audio);

  updateAsteroids(state.field, state.rng, state.wave, dt);
  updateCargo(state.cargo, state.rng, dt);
  checkCollisions();
  updateParticles(dt);

  // Combo decays if no pod is collected in time.
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  // A new wave every WAVE_SECONDS: harder rocks, a banner, a fanfare.
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    state.wave += 1;
    state.waveTimer = WAVE_SECONDS;
    state.banner = 2.5;
    startWave(state.field, state.rng, state.wave);
    audio.wave();
  }
  if (state.banner > 0) state.banner -= dt;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

  if (ship.hull <= 0) endGame();
}

function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground(ctx, state.stars, state.mode === 'playing' && !state.frozen ? 1 / 60 : 0, state.time);

  if (state.mode === 'title') {
    drawTitle(ctx, state);
  } else {
    drawAsteroids(ctx, state.field);
    drawCargo(ctx, state.cargo);
    if (state.mode !== 'gameover') drawShip(ctx, state.ship);
    // Particles.
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    drawHUD(ctx, state);
    if (state.mode === 'paused') drawPaused(ctx, state);
    if (state.mode === 'gameover') drawGameOver(ctx, state);
  }
  ctx.restore();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.033, (now - (frame.last || now)) / 1000 || 0.016);
  frame.last = now;
  state.time += dt;

  if (!state.frozen) {
    if (state.mode === 'title' && (wasPressed(input, 'Enter', 'mouse') || wasPressed(input, ' '))) startGame();
    else if (state.mode === 'playing' && wasPressed(input, 'p', 'P')) {
      state.mode = 'paused';
      setStatus('Paused. Press P to keep flying.');
    } else if (state.mode === 'paused' && (wasPressed(input, 'p', 'P') || wasPressed(input, 'mouse'))) {
      state.mode = 'playing';
      setStatus('Playing.');
    } else if (state.mode === 'gameover' && (wasPressed(input, 'Enter', 'mouse') || wasPressed(input, ' '))) {
      startGame();
    }

    if (wasPressed(input, 'm', 'M')) audio.muted = !audio.muted;
    if (state.mode === 'playing') updatePlaying(dt);
  }
  draw();
  endFrame(input);
}

// Deterministic screenshot scenes: ?shot=start|play|end&seed=N renders one fixed
// frame of the game's own states, so the dossier screenshots show the real game.
function setupShot(shot, seed) {
  const rng = createRng(seed);
  state.rng = rng;
  state.stars = createStars(rng, 130);
  state.frozen = true;
  if (shot === 'play') {
    resetWorld(rng);
    // The wave spawns rocks just off-screen; pull the first few into view so
    // the frozen frame shows the field the player actually fights in.
    state.field.list.forEach((rock, i) => {
      if (i < 6) {
        rock.x = 120 + rng() * 1040;
        rock.y = 110 + rng() * 460;
      }
    });
    state.mode = 'playing';
    state.score = 2450;
    state.best = 12450;
    state.wave = 3;
    state.combo = 4;
    state.comboTimer = 2.6;
    state.banner = 0;
    state.podsCollected = 11;
    state.rocksBlasted = 9;
    state.ship.hull = 72;
    state.ship.fuel = 58;
    state.ship.x = 640;
    state.ship.y = 380;
    state.ship.angle = -0.6;
    state.ship.bullets = [
      { x: 700, y: 330, vx: 640, vy: -120, life: 1 },
      { x: 760, y: 300, vx: 640, vy: -120, life: 1 },
    ];
  } else if (shot === 'end') {
    resetWorld(rng);
    state.mode = 'gameover';
    state.score = 12450;
    state.best = 12450;
    state.wave = 6;
    state.combo = 0;
    state.podsCollected = 34;
    state.rocksBlasted = 41;
    state.bestCombo = 9;
    state.ship.hull = 0;
  } else {
    state.mode = 'title';
    state.best = 12450;
    state.ship = createShip(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
    state.field = createField();
    state.cargo = createCargo();
  }
  draw();
}

function init() {
  // A read-only handle for automated play-testing (mode, score, ship, hull).
  window.__starSalvage = state;
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 1) || 1;
  state.stars = createStars(createRng(7), 130);
  if (shot === 'start' || shot === 'play' || shot === 'end') {
    setupShot(shot, seed);
    requestAnimationFrame(frame);
    return;
  }
  state.rng = createRng((Math.random() * 1e9) | 0);
  resetWorld(state.rng);
  state.mode = 'title';
  setStatus('Star Salvage title screen. Press Enter or click to launch.');
  requestAnimationFrame(frame);
}

init();
