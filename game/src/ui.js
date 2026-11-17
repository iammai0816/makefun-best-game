// All screens and the HUD for Star Salvage: title, pause and game-over screens,
// the in-game HUD (score, hull, fuel, wave, combo), and the starfield backdrop.

import { GAME_WIDTH, GAME_HEIGHT } from './input.js';

const PALETTE = {
  bg: '#05070f',
  panel: 'rgba(8, 14, 32, 0.82)',
  cyan: '#37e6c8',
  gold: '#ffd166',
  pink: '#f472b6',
  white: '#eef6ff',
  dim: '#8b9bb8',
  red: '#ff7a6b',
};

export function createStars(rng, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * GAME_WIDTH,
      y: rng() * GAME_HEIGHT,
      r: 0.6 + rng() * 1.8,
      twinkle: rng() * Math.PI * 2,
      speed: 6 + rng() * 18, // slow downward drift
    });
  }
  return stars;
}

export function drawBackground(ctx, stars, dt, time) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  // Two soft nebula glows for depth.
  const nebula = (x, y, radius, color) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(5, 7, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  nebula(240, 150, 320, 'rgba(55, 230, 200, 0.10)');
  nebula(1060, 560, 380, 'rgba(244, 114, 182, 0.08)');
  nebula(900, 120, 260, 'rgba(125, 211, 252, 0.07)');
  // Twinkling, drifting stars.
  for (const star of stars) {
    star.y += star.speed * dt;
    if (star.y > GAME_HEIGHT + 4) { star.y = -4; star.x = Math.random() * GAME_WIDTH; }
    const alpha = 0.45 + 0.4 * Math.sin(time * 2 + star.twinkle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#dbeafe';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bar(ctx, x, y, width, height, fraction, fill, label) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, fraction)), height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  ctx.fillStyle = PALETTE.white;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - 11);
}

export function drawHUD(ctx, state) {
  const ship = state.ship;
  // Top bar: score left, wave and combo centre, hull and fuel right.
  ctx.fillStyle = 'rgba(5, 7, 15, 0.55)';
  ctx.fillRect(0, 0, GAME_WIDTH, 64);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 20, 30);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`BEST ${state.best.toLocaleString('en-US')}`, 20, 52);

  ctx.fillStyle = PALETTE.white;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${state.wave}`, GAME_WIDTH / 2, 30);
  if (state.combo > 1) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`COMBO x${(1 + Math.min(state.combo - 1, 8) * 0.25).toFixed(2)}  (${state.combo})`, GAME_WIDTH / 2, 54);
  } else {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('collect pods fast to build a combo', GAME_WIDTH / 2, 54);
  }

  bar(ctx, GAME_WIDTH - 420, 22, 180, 12, ship.hull / ship.maxHull, ship.hull > 30 ? PALETTE.cyan : PALETTE.red, 'HULL');
  bar(ctx, GAME_WIDTH - 220, 22, 180, 12, ship.fuel / ship.maxFuel, '#4ade80', 'FUEL');

  // Wave banner fades in the middle of the screen for a couple of seconds.
  if (state.banner > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.banner);
    ctx.fillStyle = PALETTE.cyan;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${state.wave}`, GAME_WIDTH / 2, 190);
    ctx.fillStyle = PALETTE.white;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('more rocks, faster rocks — keep the cargo coming', GAME_WIDTH / 2, 222);
    ctx.restore();
  }

  // Combo timer: a thin gold line draining under the combo label.
  if (state.combo > 1 && state.comboTimer > 0) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(GAME_WIDTH / 2 - 60, 60, 120 * (state.comboTimer / 4), 3);
  }

  // Low-fuel and low-hull warnings, only while actually flying.
  if (state.mode !== 'playing') return;
  if (ship.fuel <= 0) {
    ctx.fillStyle = PALETTE.red;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OUT OF FUEL — engines idle, grab a green pod', GAME_WIDTH / 2, GAME_HEIGHT - 24);
  } else if (ship.hull <= 30) {
    ctx.fillStyle = PALETTE.red;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HULL CRITICAL — grab a pink pod', GAME_WIDTH / 2, GAME_HEIGHT - 24);
  }
}

function panel(ctx, x, y, width, height) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = 'rgba(55, 230, 200, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();
}

function titleText(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold' : ''} ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, GAME_WIDTH / 2, y);
}

export function drawTitle(ctx, state) {
  panel(ctx, 290, 92, 700, 500);
  titleText(ctx, 'STAR SALVAGE', 178, 64, PALETTE.cyan);
  titleText(ctx, 'a salvage run through the rocks', 214, 19, PALETTE.dim, false);
  titleText(ctx, 'Pilot your tug through the asteroid field.', 268, 20, PALETTE.white, false);
  titleText(ctx, 'Haul cargo pods for points. Blast the rocks.', 296, 20, PALETTE.white, false);
  titleText(ctx, 'Watch your hull — and your fuel.', 324, 20, PALETTE.white, false);

  ctx.textAlign = 'left';
  ctx.font = '17px system-ui, sans-serif';
  const rows = [
    ['W A S D / arrows', 'fly the ship'],
    ['Mouse / Space', 'aim and shoot'],
    ['P', 'pause'],
  ];
  let y = 372;
  for (const [key, meaning] of rows) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(key, 380, y);
    ctx.fillStyle = PALETTE.white;
    ctx.fillText(meaning, 620, y);
    y += 30;
  }
  titleText(ctx, 'Gold pod +100 pts   ·   Green pod +fuel   ·   Pink pod +hull', 478, 17, PALETTE.white, false);

  if (state.best > 0) titleText(ctx, `BEST SCORE  ${state.best.toLocaleString('en-US')}`, 512, 18, PALETTE.gold);
  titleText(ctx, 'PRESS ENTER OR CLICK TO LAUNCH', 552, 22, PALETTE.cyan);
}

export function drawPaused(ctx, state) {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  panel(ctx, 440, 250, 400, 200);
  titleText(ctx, 'PAUSED', 322, 44, PALETTE.cyan);
  titleText(ctx, `Score ${state.score.toLocaleString('en-US')}  ·  Wave ${state.wave}`, 366, 18, PALETTE.white, false);
  titleText(ctx, 'Press P or click to keep flying', 410, 17, PALETTE.dim, false);
}

export function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(5, 7, 15, 0.62)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  panel(ctx, 340, 130, 600, 440);
  titleText(ctx, 'SHIP LOST', 212, 56, PALETTE.red);
  titleText(ctx, 'the field keeps your cargo', 248, 18, PALETTE.dim, false);
  titleText(ctx, `${state.score.toLocaleString('en-US')}`, 358, 58, PALETTE.gold);
  titleText(ctx, 'FINAL SCORE', 290, 16, PALETTE.dim, false);
  const stats = [
    `Waves survived: ${state.wave}`,
    `Cargo hauled: ${state.podsCollected}`,
    `Asteroids blasted: ${state.rocksBlasted}`,
    `Best combo: x${(1 + Math.min(Math.max(state.bestCombo - 1, 0), 8) * 0.25).toFixed(2)}`,
  ];
  let y = 392;
  ctx.font = '19px system-ui, sans-serif';
  for (const line of stats) {
    ctx.fillStyle = PALETTE.white;
    ctx.textAlign = 'center';
    ctx.fillText(line, GAME_WIDTH / 2, y);
    y += 30;
  }
  if (state.score > 0 && state.score >= state.best) {
    titleText(ctx, '★ NEW BEST SCORE ★', 516, 20, PALETTE.gold);
  }
  titleText(ctx, 'PRESS ENTER OR CLICK TO FLY AGAIN', 548, 20, PALETTE.cyan);
}
