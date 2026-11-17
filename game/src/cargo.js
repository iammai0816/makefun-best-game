// Cargo pods: drifting salvage the ship collects for score, fuel and repairs.
// Collecting pods in quick succession builds a combo multiplier.

import { GAME_WIDTH, GAME_HEIGHT } from './input.js';

export const POD_SCORE = 100;
export const POD_FUEL = 25;
export const POD_REPAIR = 20;

// kind: 'score' (gold, points), 'fuel' (green, refuels), 'repair' (pink, hull).
export function makePod(rng, x, y, kind) {
  const picked = kind || (rng() < 0.6 ? 'score' : rng() < 0.5 ? 'fuel' : 'repair');
  return {
    x, y,
    vx: (rng() - 0.5) * 30,
    vy: (rng() - 0.5) * 30,
    r: 15,
    kind: picked,
    bob: rng() * Math.PI * 2,
    life: 26, // seconds before a pod fades away unclaimed
  };
}

export function createCargo() {
  return { list: [], timer: 1.5 };
}

export function spawnPod(field, rng, x, y, kind) {
  const px = x === undefined ? 60 + rng() * (GAME_WIDTH - 120) : x;
  const py = y === undefined ? 80 + rng() * (GAME_HEIGHT - 160) : y;
  const pod = makePod(rng, px, py, kind);
  field.list.push(pod);
  return pod;
}

export function updateCargo(field, rng, dt) {
  for (const pod of field.list) {
    pod.x += pod.vx * dt;
    pod.y += pod.vy * dt;
    pod.bob += dt * 2.4;
    pod.life -= dt;
    // Gentle bounce off the field edges so pods stay in play.
    if (pod.x < 30 || pod.x > GAME_WIDTH - 30) pod.vx *= -1;
    if (pod.y < 60 || pod.y > GAME_HEIGHT - 30) pod.vy *= -1;
    pod.x = Math.max(30, Math.min(GAME_WIDTH - 30, pod.x));
    pod.y = Math.max(60, Math.min(GAME_HEIGHT - 30, pod.y));
  }
  field.list = field.list.filter((pod) => pod.life > 0);
  // A new pod drifts in every few seconds, up to a small cap.
  field.timer -= dt;
  if (field.timer <= 0 && field.list.length < 7) {
    spawnPod(field, rng);
    field.timer = 2.2 + rng() * 2.0;
  }
}

const POD_COLORS = {
  score: { fill: '#ffd166', glow: '#ff9a3c', label: '$' },
  fuel: { fill: '#4ade80', glow: '#22c55e', label: 'F' },
  repair: { fill: '#f472b6', glow: '#ec4899', label: '+' },
};

export function drawCargo(ctx, field) {
  for (const pod of field.list) {
    const colors = POD_COLORS[pod.kind];
    const pulse = 1 + Math.sin(pod.bob) * 0.12;
    const blink = pod.life < 5 ? (Math.sin(pod.bob * 4) > 0 ? 1 : 0.35) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    ctx.translate(pod.x, pod.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 14;
    // A hexagonal salvage canister.
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = '#0b1020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * pod.r;
      const py = Math.sin(angle) * pod.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colors.label, 0, 1);
    ctx.restore();
  }
}

// Score value of a pod at the current combo (multiplier grows with the streak).
export function podScore(pod, combo) {
  const multiplier = 1 + Math.min(Math.max(combo - 1, 0), 8) * 0.25;
  if (pod.kind === 'score') return Math.round(POD_SCORE * multiplier);
  if (pod.kind === 'fuel') return Math.round(25 * multiplier);
  return Math.round(50 * multiplier);
}
