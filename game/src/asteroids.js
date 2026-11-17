// Asteroids: jagged rocks that drift across the field, spawn in waves, and get
// faster and more numerous as the wave number climbs.

import { GAME_WIDTH, GAME_HEIGHT } from './input.js';

// Build one irregular rock with a fixed set of outline vertices.
export function makeAsteroid(rng, x, y, vx, vy, radius) {
  const verts = [];
  const points = 9 + Math.floor(rng() * 3);
  for (let i = 0; i < points; i++) {
    verts.push(0.72 + rng() * 0.5);
  }
  return {
    x, y, vx, vy,
    r: radius,
    rot: rng() * Math.PI * 2,
    vr: (rng() - 0.5) * 1.6,
    verts,
    hp: radius > 42 ? 3 : radius > 26 ? 2 : 1,
    maxHp: radius > 42 ? 3 : radius > 26 ? 2 : 1,
  };
}

export function createField() {
  return { list: [], trickle: 0 };
}

// Spawn one rock just outside a random edge, drifting across the field.
export function spawnAsteroid(field, rng, wave, x, y) {
  const speed = (55 + wave * 9) * (0.7 + rng() * 0.7);
  const edge = Math.floor(rng() * 4);
  let px = x;
  let py = y;
  let vx = 0;
  let vy = 0;
  if (px === undefined) {
    if (edge === 0) { px = -50; py = rng() * GAME_HEIGHT; vx = speed; vy = (rng() - 0.5) * speed; }
    if (edge === 1) { px = GAME_WIDTH + 50; py = rng() * GAME_HEIGHT; vx = -speed; vy = (rng() - 0.5) * speed; }
    if (edge === 2) { px = rng() * GAME_WIDTH; py = -50; vx = (rng() - 0.5) * speed; vy = speed; }
    if (edge === 3) { px = rng() * GAME_WIDTH; py = GAME_HEIGHT + 50; vx = (rng() - 0.5) * speed; vy = -speed; }
  } else {
    const angle = rng() * Math.PI * 2;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }
  const radius = 16 + rng() * 34;
  field.list.push(makeAsteroid(rng, px, py, vx, vy, radius));
  return field.list[field.list.length - 1];
}

// Open a wave: a burst of rocks scaled to the wave number.
export function startWave(field, rng, wave) {
  const count = Math.min(5 + wave * 2, 22);
  for (let i = 0; i < count; i++) spawnAsteroid(field, rng, wave);
}

export function updateAsteroids(field, rng, wave, dt) {
  for (const rock of field.list) {
    rock.x += rock.vx * dt;
    rock.y += rock.vy * dt;
    rock.rot += rock.vr * dt;
  }
  // Rocks that drifted far off the field are gone; a slow trickle keeps pressure on.
  field.list = field.list.filter(
    (rock) => rock.x > -120 && rock.x < GAME_WIDTH + 120 && rock.y > -120 && rock.y < GAME_HEIGHT + 120,
  );
  field.trickle -= dt;
  const cap = Math.min(6 + wave * 2, 24);
  if (field.trickle <= 0 && field.list.length < cap) {
    spawnAsteroid(field, rng, wave);
    field.trickle = Math.max(0.7, 2.6 - wave * 0.18);
  }
}

export function drawAsteroids(ctx, field) {
  for (const rock of field.list) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.fillStyle = '#2a2438';
    ctx.strokeStyle = rock.hp < rock.maxHp ? '#ff7a6b' : '#8b7fb8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = rock.verts.length;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const radius = rock.r * rock.verts[i];
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Crater dots for texture.
    ctx.fillStyle = 'rgba(139, 127, 184, 0.35)';
    ctx.beginPath();
    ctx.arc(-rock.r * 0.3, rock.r * 0.1, rock.r * 0.16, 0, Math.PI * 2);
    ctx.arc(rock.r * 0.35, -rock.r * 0.25, rock.r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Split a big rock into two smaller ones when it is blasted apart.
export function splitAsteroid(field, rng, wave, rock) {
  if (rock.r <= 26) return;
  for (let i = 0; i < 2; i++) {
    const child = makeAsteroid(
      rng,
      rock.x + (rng() - 0.5) * 20,
      rock.y + (rng() - 0.5) * 20,
      rock.vx + (rng() - 0.5) * 90,
      rock.vy + (rng() - 0.5) * 90,
      rock.r * 0.55,
    );
    field.list.push(child);
  }
}
