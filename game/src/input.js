// Keyboard + mouse input for Star Salvage.
// Tracks held keys, edge-triggered presses, and the mouse position in canvas
// coordinates (the canvas is a fixed 1280x720 logical space, scaled by CSS).

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

const PREVENTED = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 - 160, down: false, active: false },
  };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * GAME_WIDTH,
      y: ((clientY - rect.top) / rect.height) * GAME_HEIGHT,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (PREVENTED.has(event.key)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    input.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event.clientX, event.clientY);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.active = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    const point = canvasPoint(event.clientX, event.clientY);
    input.mouse.x = point.x;
    input.mouse.y = point.y;
    input.mouse.active = true;
    input.mouse.down = true;
    input.pressed.add('mouse');
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });

  return input;
}

// True while any of the given keys is held down.
export function isDown(input, ...names) {
  return names.some((name) => input.keys.has(name));
}

// True only on the frame the key was first pressed; consumed by endFrame.
export function wasPressed(input, ...names) {
  return names.some((name) => input.pressed.has(name));
}

// Clear edge-triggered presses at the end of each frame.
export function endFrame(input) {
  input.pressed.clear();
}

// Deterministic seeded random generator (mulberry32) so the ?shot= scenes
// render the same layout every time for a given seed.
export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
