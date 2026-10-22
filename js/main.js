// Entry point: boot, input, camera, loop, HUD wiring.
import { createCanvas, ctx2d, clamp, lerp, drawText, drawTextCentered, textWidth, px, rgba, makeRng } from './util.js';
import { WORLD, buildStreet } from './art/street.js';
import { Player, Npc, spawnNpcs, spawnCars, sheetFor } from './entities.js';
import { Renderer } from './game.js';
import { Hud } from './hud.js';
import { C } from './palette.js';

const canvas = document.getElementById('game');
// NOTE: re-acquired after every resize (some canvas implementations detach the
// previous 2d context when width/height change).
let ctx = canvas.getContext('2d');

const state = {
  mode: 'title', // title | play
  time: 0,
  scale: 3,
  viewW: 480,
  viewH: 300,
  camera: { x: 0, y: 0 },
  cameraTarget: { x: 0, y: 0 },
  hint: null,
  toast: null,
  toastTimer: 0,
  showHelp: true,
  fps: 60,
  clockMinutes: 22 * 60 + 40,
  world: null,
  player: null,
  npcs: [],
  cars: [],
  hud: null,
  renderer: null,
  titlePan: 0,
};

const input = {
  up: false, down: false, left: false, right: false, run: false,
  touch: { active: false, dx: 0, dy: 0 },
};

// ------------------------------------------------------------------ scaling
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  // Pick an upscale in half steps: a slightly wider view than before (about
  // 640x360 art pixels) so more of the block fits on screen, while pixels stay
  // crisp and evenly sized.
  let scale = Math.min(cw / 640, ch / 360);
  scale = Math.max(1.5, Math.min(6, Math.round(scale * 2) / 2));
  // never let the view grow larger than the block itself
  scale = Math.max(scale, Math.ceil(cw / 2300), Math.ceil(ch / 1180));
  const viewW = Math.ceil(cw / scale);
  const viewH = Math.ceil(ch / scale);
  state.scale = scale;
  state.viewW = viewW;
  state.viewH = viewH;
  canvas.width = viewW;
  canvas.height = viewH;
  canvas.style.width = viewW * scale + 'px';
  canvas.style.height = viewH * scale + 'px';
  canvas.style.imageRendering = 'pixelated';
  ctx = canvas.getContext('2d');
  if (state.hud) state.hud.resize(viewW, viewH);
  if (state.renderer) state.renderer.resize(viewW, viewH);
  ctx.imageSmoothingEnabled = false;
}

// ------------------------------------------------------------------- input
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};

const startBtn = document.getElementById('start');
if (startBtn) startBtn.addEventListener('click', (e) => { e.preventDefault(); startGame(); });
const introEl = document.getElementById('intro');
if (introEl) introEl.addEventListener('click', (e) => { if (e.target === introEl) startGame(); });
document.addEventListener('keydown', (e) => {
  if (KEYS[e.code]) { input[KEYS[e.code]] = true; e.preventDefault(); }
  if (e.code === 'KeyH') state.showHelp = !state.showHelp;
  if (e.code === 'KeyE') interact();
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state.mode === 'title') startGame();
  }
  if (e.code === 'Escape' && state.mode === 'play') state.showHelp = false;
});
document.addEventListener('keyup', (e) => {
  if (KEYS[e.code]) { input[KEYS[e.code]] = false; e.preventDefault(); }
});
window.addEventListener('blur', () => {
  input.up = input.down = input.left = input.right = input.run = false;
});

// touch / click: a floating virtual stick on the left half
let touchStart = null;
canvas.addEventListener('pointerdown', (e) => {
  if (state.mode === 'title') { startGame(); return; }
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x < rect.width * 0.5) {
    touchStart = { x: e.clientX, y: e.clientY };
    input.touch.active = true;
  } else {
    interact();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!touchStart) return;
  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;
  const dead = 12;
  input.left = dx < -dead;
  input.right = dx > dead;
  input.up = dy < -dead;
  input.down = dy > dead;
  input.run = Math.hypot(dx, dy) > 70;
});
window.addEventListener('pointerup', () => {
  touchStart = null;
  input.touch.active = false;
  input.up = input.down = input.left = input.right = false;
  input.run = false;
});

// ------------------------------------------------------------------- setup
const hud = new Hud();
state.hud = hud;

function startGame() {
  if (state.mode === 'play') return;
  state.mode = 'play';
  const overlay = document.getElementById('intro');
  if (overlay) overlay.classList.add('hidden');
}

function placePlayer() {
  // start on the north sidewalk in front of the book store
  return new Player(760, WORLD.top + 96);
}

function init() {
  resize();
  state.renderer = new Renderer(state.viewW, state.viewH);
  hud.resize(state.viewW, state.viewH);

  const loading = document.getElementById('loading');
  setTimeout(() => {
    const world = buildStreet();
    state.world = world;
    hud.buildMiniMap(WORLD);
    // use the real downscaled block for the minimap
    if (world.mini) {
      hud.miniMap = world.mini;
      hud.miniScale = world.miniScale;
    }
    state.player = placePlayer();
    state.npcs = spawnNpcs();
    state.cars = spawnCars();
    const p = state.player;
    state.camera.x = clamp(p.x - state.viewW / 2, 0, WORLD.w - state.viewW);
    state.camera.y = clamp(p.y - state.viewH / 2, 0, WORLD.h - state.viewH);
    state.cameraTarget = { ...state.camera };
    if (loading) loading.classList.add('hidden');
    setTimeout(() => toast('WASD — идти, SHIFT — бежать, E — взаимодействие'), 900);
    requestAnimationFrame(loop);
  }, 40);
}

// -------------------------------------------------------------- interaction
const SHOP_PROMPTS = [
  { x: 760, y: WORLD.top + 40, label: 'BOOK STORE', line: 'A dusty paperback about the city. -$12', cash: -12 },
  { x: 1080, y: WORLD.top + 40, label: 'CAFE', line: 'Hot coffee on a cold night. -$4', cash: -4, hp: 6 },
  { x: 1420, y: WORLD.top + 40, label: 'DELI', line: 'You buy a sandwich. -$7', cash: -7, hp: 10 },
  { x: 1750, y: WORLD.top + 40, label: 'LIQUOR', line: 'The clerk says come back later.', cash: 0 },
  { x: 1990, y: WORLD.top + 40, label: 'PIZZA', line: 'A slice to go. -$5', cash: -5, hp: 8 },
  { x: 520, y: WORLD.laneS + 60, label: 'NIGHT STALL', line: 'Noodles from the cart. -$6', cash: -6, hp: 5 },
  { x: 1700, y: WORLD.laneS + 60, label: 'NIGHT STALL', line: 'Soup from the cart. -$5', cash: -5, hp: 5 },
];

function nearestPrompt() {
  if (!state.player) return null;
  const p = state.player;
  let best = null, bestD = 46;
  for (const s of SHOP_PROMPTS) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function interact() {
  if (state.mode !== 'play') { startGame(); return; }
  const s = nearestPrompt();
  if (!s) return;
  const p = state.player;
  if (s.cash < 0 && p.cash < -s.cash) {
    toast('NOT ENOUGH CASH');
    return;
  }
  p.cash += s.cash;
  if (s.hp) p.hp = Math.min(100, p.hp + s.hp);
  toast(s.line);
}

function toast(line) {
  state.toast = line;
  state.toastTimer = 3.2;
  const el = document.getElementById('toast');
  if (el) {
    el.textContent = line;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 3000);
  }
}

// ----------------------------------------------------------------- lighting
function collectLights(time) {
  const lights = [];
  const w = state.world;
  for (const l of w.dynamicLights) lights.push(l);
  // traffic lights: grab the sign glow near the crossing
  for (const c of state.cars) {
    // headlights
    const front = c.dir > 0 ? 46 : -46;
    lights.push({
      x: c.x + front,
      y: c.y + 4,
      r: 52,
      color: '#ffe0a8',
      glow: 0.85,
      strength: 0.7,
    });
    lights.push({ x: c.x - c.dir * 40, y: c.y + 2, r: 18, color: '#ff5c46', glow: 0.5, strength: 0.35 });
  }
  return lights;
}

// -------------------------------------------------------------------- loop
let last = performance.now();
let fpsAccum = 0, fpsFrames = 0;

function loop(now) {
  const rawDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = rawDt;
  state.time += dt;
  fpsAccum += rawDt; fpsFrames++;
  if (fpsAccum > 0.5) {
    state.fps = fpsFrames / fpsAccum;
    fpsAccum = 0; fpsFrames = 0;
  }

  const { renderer, world } = state;
  if (!world) { requestAnimationFrame(loop); return; }

  if (state.mode === 'play') {
    const p = state.player;
    p.update(dt, input, world);
    for (const n of state.npcs) n.update(dt, p);
    for (const c of state.cars) c.update(dt, p);
    // cars vs player
    for (const c of state.cars) {
      if (Math.abs(c.y - p.y) < 16 && Math.abs(c.x - p.x) < 30 && p.bumpCooldown <= 0) {
        p.damage(9, c.x, c.y);
        toast('WATCH THE ROAD');
      }
    }
    // camera follows with a small lead in the facing direction
    const lead = 18;
    const lx = p.dir === 'left' ? -lead : p.dir === 'right' ? lead : 0;
    const ly = p.dir === 'up' ? -lead * 0.6 : p.dir === 'down' ? lead * 0.6 : 0;
    state.cameraTarget.x = clamp(p.x + lx - state.viewW / 2, 0, WORLD.w - state.viewW);
    state.cameraTarget.y = clamp(p.y + ly - state.viewH / 2, 20, WORLD.h - state.viewH);
    state.camera.x = lerp(state.camera.x, state.cameraTarget.x, 1 - Math.pow(0.0015, dt));
    state.camera.y = lerp(state.camera.y, state.cameraTarget.y, 1 - Math.pow(0.0015, dt));
    // clock: 1 game hour every 45 seconds
    state.clockMinutes = (state.clockMinutes + dt * (60 / 45)) % (24 * 60);
    const target = nearestPrompt();
    state.hint = target ? `E  ${target.label}` : null;
  } else {
    // title screen: slow drift along the street
    state.titlePan += dt * 8;
    const p = state.player;
    state.camera.x = (WORLD.w - state.viewW) * (0.5 + 0.5 * Math.sin(state.titlePan * 0.0022));
    state.camera.y = clamp(p.y - state.viewH / 2 + 8, 20, WORLD.h - state.viewH);
    for (const n of state.npcs) n.update(dt, p);
    for (const c of state.cars) c.update(dt, p);
  }

  renderer.drawWorld(world, state.camera, [...state.npcs, ...state.cars.map((c) => ({ ...c, type: 'car', x: c.x, y: c.y, sprite: c.sprite, dir: c.dir }))], state.player, state.time);
  ctx.clearRect(0, 0, state.viewW, state.viewH);
  ctx.drawImage(renderer.scene, 0, 0);
  renderer.drawLighting(ctx, world, collectLights(state.time), state.time, state.player);
  renderer.drawPost(ctx, state.viewW, state.viewH, state.time);

  ctx = canvas.getContext('2d');
  const hours = Math.floor(state.clockMinutes / 60);
  const mins = Math.floor(state.clockMinutes % 60);
  const clockString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  const district = state.player.x < 470 && state.player.y < WORLD.sidewalkN ? 'PARK' :
    state.player.x > 1180 && state.player.x < 1330 ? 'CROSSING' : 'DELMAR ST.';

  if (state.mode === 'play') {
    hud.draw(ctx, {
      player: state.player,
      npcs: [...state.npcs, ...state.cars],
      sheet: state.player.sheet,
      time: state.time,
      showHelp: state.showHelp,
      fps: state.fps,
      hint: state.hint,
      clockString,
      district,
    });
  }

  // fade in from black on the first frames
  if (state.time < 1.2) {
    ctx.fillStyle = `rgba(4,3,9,${1 - state.time / 1.2})`;
    ctx.fillRect(0, 0, state.viewW, state.viewH);
  }

  requestAnimationFrame(loop);
}

// handy for debugging from the console
globalThis.__game = state;

window.addEventListener('resize', () => {
  resize();
  if (state.renderer) {
    state.renderer.resize(state.viewW, state.viewH);
    hud.resize(state.viewW, state.viewH);
  }
});
document.addEventListener('visibilitychange', () => { last = performance.now(); });

init();
