// The player's salvage ship: thrust movement, aiming, shooting, hull and fuel.

import { GAME_WIDTH, GAME_HEIGHT, isDown } from './input.js';

const THRUST = 520; // px/s^2
const MAX_SPEED = 430; // px/s
const SHOT_COOLDOWN = 0.16; // seconds between shots
const BULLET_SPEED = 640; // px/s

export function createShip(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    angle: -Math.PI / 2, // nose points up
    hull: 100,
    maxHull: 100,
    fuel: 100,
    maxFuel: 100,
    invuln: 0, // seconds of post-hit protection
    cooldown: 0,
    thrusting: false,
    bullets: [],
  };
}

export function updateShip(ship, input, dt) {
  let ax = 0;
  let ay = 0;
  if (isDown(input, 'w', 'ArrowUp')) ay -= 1;
  if (isDown(input, 's', 'ArrowDown')) ay += 1;
  if (isDown(input, 'a', 'ArrowLeft')) ax -= 1;
  if (isDown(input, 'd', 'ArrowRight')) ax += 1;

  ship.thrusting = false;
  if ((ax !== 0 || ay !== 0) && ship.fuel > 0) {
    const len = Math.hypot(ax, ay);
    ship.vx += (ax / len) * THRUST * dt;
    ship.vy += (ay / len) * THRUST * dt;
    ship.fuel = Math.max(0, ship.fuel - 13 * dt);
    ship.thrusting = true;
    ship.angle = Math.atan2(ay, ax) + Math.PI / 2;
  } else {
    // Fuel trickles back while the engines are idle.
    ship.fuel = Math.min(ship.maxFuel, ship.fuel + 7 * dt);
  }

  // Aim at the mouse when it has been used; otherwise face the direction of travel.
  if (input.mouse.active) {
    ship.angle = Math.atan2(input.mouse.y - ship.y, input.mouse.x - ship.x) + Math.PI / 2;
  } else if (Math.hypot(ship.vx, ship.vy) > 40) {
    ship.angle = Math.atan2(ship.vy, ship.vx) + Math.PI / 2;
  }

  // Drag and speed cap, then move and bounce softly off the field edges.
  ship.vx *= Math.pow(0.35, dt);
  ship.vy *= Math.pow(0.35, dt);
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > MAX_SPEED) {
    ship.vx = (ship.vx / speed) * MAX_SPEED;
    ship.vy = (ship.vy / speed) * MAX_SPEED;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  const margin = 22;
  if (ship.x < margin) { ship.x = margin; ship.vx = Math.abs(ship.vx) * 0.5; }
  if (ship.x > GAME_WIDTH - margin) { ship.x = GAME_WIDTH - margin; ship.vx = -Math.abs(ship.vx) * 0.5; }
  if (ship.y < margin) { ship.y = margin; ship.vy = Math.abs(ship.vy) * 0.5; }
  if (ship.y > GAME_HEIGHT - margin) { ship.y = GAME_HEIGHT - margin; ship.vy = -Math.abs(ship.vy) * 0.5; }

  if (ship.invuln > 0) ship.invuln -= dt;
  if (ship.cooldown > 0) ship.cooldown -= dt;

  // Bullets fly straight and die at the edge of the field.
  for (const bullet of ship.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }
  ship.bullets = ship.bullets.filter(
    (b) => b.life > 0 && b.x > -20 && b.x < GAME_WIDTH + 20 && b.y > -20 && b.y < GAME_HEIGHT + 20,
  );
}

// Fire one bolt toward the aim point (mouse, or straight ahead of the nose).
export function fireShip(ship, input, audio) {
  if (ship.cooldown > 0) return false;
  ship.cooldown = SHOT_COOLDOWN;
  const aimX = input.mouse.active ? input.mouse.x : ship.x + Math.sin(ship.angle) * 100;
  const aimY = input.mouse.active ? input.mouse.y : ship.y - Math.cos(ship.angle) * 100;
  const dir = Math.atan2(aimY - ship.y, aimX - ship.x);
  const noseX = ship.x + Math.sin(ship.angle) * 20;
  const noseY = ship.y - Math.cos(ship.angle) * 20;
  ship.bullets.push({
    x: noseX, y: noseY,
    vx: Math.cos(dir) * BULLET_SPEED + ship.vx * 0.4,
    vy: Math.sin(dir) * BULLET_SPEED + ship.vy * 0.4,
    life: 1.1,
  });
  if (audio) audio.shoot();
  return true;
}

export function damageShip(ship, amount) {
  if (ship.invuln > 0) return false;
  ship.hull = Math.max(0, ship.hull - amount);
  ship.invuln = 1.2;
  return true;
}

export function drawShip(ctx, ship) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  // Engine flame while thrusting.
  if (ship.thrusting) {
    const flicker = 14 + Math.random() * 10;
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.moveTo(-7, 14);
    ctx.lineTo(0, 14 + flicker);
    ctx.lineTo(7, 14);
    ctx.closePath();
    ctx.fill();
  }

  // Hull: a neon salvage tug with a cargo claw at the nose.
  ctx.fillStyle = '#37e6c8';
  ctx.strokeStyle = '#a7fff2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(14, 12);
  ctx.lineTo(6, 8);
  ctx.lineTo(0, 14);
  ctx.lineTo(-6, 8);
  ctx.lineTo(-14, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Cargo claw.
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.lineTo(-11, -27);
  ctx.moveTo(6, -20);
  ctx.lineTo(11, -27);
  ctx.stroke();
  ctx.restore();

  // Shield shimmer while invulnerable after a hit.
  if (ship.invuln > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(ship.invuln * 20);
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Bullets: bright cyan bolts with a glow.
  ctx.save();
  ctx.fillStyle = '#b8fff4';
  ctx.shadowColor = '#37e6c8';
  ctx.shadowBlur = 10;
  for (const bullet of ship.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
