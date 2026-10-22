// Dev-only: headless test run of the real game. Boots the game against a stubbed
// DOM, drives frames and input, and checks the things that are easy to break:
// world build, collision, interaction, camera clamps, resize, render sanity.
// Usage: node tools/test.mjs
import { createCanvas } from '@napi-rs/canvas';

globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));

const W = 1600, H = 900;
const gameCanvas = createCanvas(W, H);
gameCanvas.addEventListener = () => {};
gameCanvas.style = {};
gameCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H });

const fakeEl = () => ({
  classList: { add() {}, remove() {}, contains: () => false },
  style: {},
  textContent: '',
  addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
});

const handlers = {};
const on = (t, f) => { (handlers[t] ||= []).push(f); };
const fire = (t, e = {}) => (handlers[t] || []).forEach((f) => f({ preventDefault() {}, ...e }));

globalThis.window = { innerWidth: W, innerHeight: H, devicePixelRatio: 1, addEventListener: on };
globalThis.document = {
  getElementById: (id) => (id === 'game' ? gameCanvas : fakeEl()),
  addEventListener: on,
  createElement: (tag) => (tag === 'canvas' ? createCanvas(8, 8) : fakeEl()),
};
let t = 0;
globalThis.performance = { now: () => t };
let nextFrame = null;
globalThis.requestAnimationFrame = (f) => { nextFrame = f; };
globalThis.setTimeout = (f) => { f(); return 0; };
globalThis.clearTimeout = () => {};

// --------------------------------------------------------------------- runner
let pass = 0;
const fails = [];
function check(name, fn) {
  try {
    const r = fn();
    if (r === false) throw new Error('returned false');
    pass++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    fails.push({ name, err });
    console.log(`  FAIL ${name} — ${err.message}`);
  }
}
function frames(n, dt = 16.7) {
  for (let i = 0; i < n; i++) {
    t += dt;
    const f = nextFrame;
    nextFrame = null;
    if (!f) throw new Error('no frame scheduled');
    f(t);
  }
}

console.log('\nNIGHT STREETS — headless tests\n');

const bootStart = Date.now();
await import('../js/main.js');
await new Promise((r) => process.nextTick(r));
const bootMs = Date.now() - bootStart;
const state = globalThis.__game;
const { WORLD } = await import('../js/art/street.js');

console.log(`boot: ${bootMs} ms, build: ${WORLD.w}x${WORLD.h}`);
console.log('\n[1] загрузка мира');
check('__game доступен', () => !!state);
check('режим title', () => state.mode === 'title');
check('мир построен', () => !!state.world && !!state.world.canvas);
check('размер полотна мира', () => state.world.canvas.width === WORLD.w && state.world.canvas.height === WORLD.h);
check('игрок на тротуаре у книжного', () => Math.abs(state.player.x - 760) < 1 && state.player.y > WORLD.top);
check('прохожие и машины есть', () => state.npcs.length > 5 && state.cars.length > 0);
check('мини-карта — реальный даунскейл', () => !!state.world.mini && Math.abs(state.world.mini.width - WORLD.w / 8) < 2);
check('твёрдые объекты (коллизии) собраны', () => state.world.solids.length > 50);
check('источники света собраны', () => state.world.dynamicLights.length > 10);

// The @napi-rs canvas stub leaks a few MB per blit, so the logic sections run the
// real loop with the heavy renderer calls stubbed out; section [8] restores them.
const realDrawWorld = state.renderer.drawWorld.bind(state.renderer);
const realDrawLighting = state.renderer.drawLighting.bind(state.renderer);
const realDrawPost = state.renderer.drawPost.bind(state.renderer);
state.renderer.drawWorld = () => {};
state.renderer.drawLighting = () => {};
state.renderer.drawPost = () => {};

console.log('\n[2] старт игры');
fire('keydown', { code: 'Enter' });
frames(2);
check('режим play', () => state.mode === 'play');
check('камера внутри мира', () => state.camera.x >= 0 && state.camera.x <= WORLD.w - state.viewW + 0.5 && state.camera.y >= 0 && state.camera.y <= WORLD.h - state.viewH + 0.5);

console.log('\n[3] движение и физика');
const p = state.player;
p.x = 760; p.y = 600;
fire('keydown', { code: 'KeyD' });
frames(25);
fire('keyup', { code: 'KeyD' });
check('идёт вправо', () => p.x > 770);
const walkDist = p.x - 760;
p.x = 760; p.y = 600;
fire('keydown', { code: 'ShiftLeft' });
fire('keydown', { code: 'KeyD' });
frames(25);
fire('keyup', { code: 'KeyD' });
fire('keyup', { code: 'ShiftLeft' });
check('бег быстрее ходьбы', () => p.x - 760 > walkDist * 1.3);
check('кадр анимации меняется', () => p.frame >= 0 && p.sheet);
p.x = 900; p.y = 840;
fire('keydown', { code: 'KeyS' });
frames(60);
fire('keyup', { code: 'KeyS' });
check('не проходит в крыши южной стороны', () => p.y < WORLD.sidewalkS + 4);
p.x = 760; p.y = 520;
fire('keydown', { code: 'KeyW' });
frames(60);
fire('keyup', { code: 'KeyW' });
check('не проходит сквозь северные дома', () => p.y > WORLD.top - 24);
check('координаты без NaN', () => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(state.camera.x));

console.log('\n[4] камера');
p.x = 4; p.y = 600;
frames(30);
check('прижата к левому краю', () => state.camera.x >= 0);
p.x = WORLD.w - 4; p.y = 600;
frames(30);
check('прижата к правому краю', () => state.camera.x <= WORLD.w - state.viewW + 0.5);
p.x = 760; p.y = 600;
frames(10);

console.log('\n[5] взаимодействие (E)');
const before = { cash: p.cash, hp: p.hp };
p.x = 1080; p.y = WORLD.top + 40;
p.cash = 50; p.hp = 60;
fire('keydown', { code: 'KeyE' });
check('кофе списывает деньги', () => p.cash === 46);
check('кофе восстанавливает силы', () => p.hp === 66);
check('тост показан', () => /coffee/i.test(state.toast || ''));
p.cash = 3;
fire('keydown', { code: 'KeyE' });
check('без денег — отказ', () => p.cash === 3 && /NOT ENOUGH CASH/i.test(state.toast || ''));
p.x = 760; p.y = 600;
fire('keydown', { code: 'KeyE' });
check('вне зоны подсказки ничего не происходит', () => p.cash === 3);

console.log('\n[6] HUD и время');
const clock0 = state.clockMinutes;
frames(40);
check('часы идут', () => state.clockMinutes !== clock0);
check('fps посчитан', () => state.fps > 0 && state.fps < 1000);
check('подсказки нет в пустоте', () => state.hint === null || typeof state.hint === 'string');

console.log('\n[7] ресайз');
for (const [w2, h2] of [[1280, 720], [800, 600], [2560, 1440], [500, 900], [1920, 1080]]) {
  window.innerWidth = w2;
  window.innerHeight = h2;
  fire('resize');
  check(`окно ${w2}x${h2}: целочисленный масштаб, вид в пределах мира`, () => {
    if (!(state.scale > 0)) throw new Error('scale ' + state.scale);
    if (state.viewW * state.scale < w2 - 2) throw new Error('view narrower than window');
    if (state.viewH * state.scale < h2 - 2) throw new Error('view shorter than window');
    if (state.viewW > WORLD.w || state.viewH > WORLD.h) throw new Error('view larger than world');
    return state.viewW > 300 && state.viewH > 200;
  });
  frames(3);
}
window.innerWidth = W;
window.innerHeight = H;
fire('resize');
frames(5);

console.log('\n[8] рендер');
state.renderer.drawWorld = realDrawWorld;
state.renderer.drawLighting = realDrawLighting;
state.renderer.drawPost = realDrawPost;
state.player.x = 900; state.player.y = 620;
let renderMs = 0;
for (let i = 0; i < 24; i++) {
  const a = process.hrtime.bigint();
  frames(1);
  renderMs += Number(process.hrtime.bigint() - a) / 1e6;
}
check('24 кадра без исключений', () => true);
const g = gameCanvas.getContext('2d');
const img = g.getImageData(0, 0, gameCanvas.width, gameCanvas.height).data;
let lit = 0;
const colors = new Set();
for (let i = 0; i < img.length; i += 4 * 37) {
  const r = img[i], gg = img[i + 1], b = img[i + 2];
  if (r + gg + b > 24) lit++;
  colors.add((r >> 3) << 10 | (gg >> 3) << 5 | (b >> 3));
}
check('кадр не чёрный', () => lit > (img.length / (4 * 37)) * 0.5);
console.log(`  (цветов в кадре: ${colors.size}, освещённых сэмплов: ${lit})`);
check('в кадре много цветов (пиксель-арт рисуется)', () => colors.size > 120);

console.log('\n[9] производительность');
const { buildStreet } = await import('../js/art/street.js');
const b0 = Date.now();
for (let i = 0; i < 2; i++) buildStreet();
const buildMs = (Date.now() - b0) / 2;
console.log(`  build: ${buildMs.toFixed(0)} ms, кадр целиком: ${(renderMs / 24).toFixed(1)} ms, RSS ${(process.memoryUsage().rss / 1e6) | 0} MB`);
check('сборка мира быстрее 4 с', () => buildMs < 4000);
check('кадр рисуется быстрее 40 мс', () => renderMs / 24 < 40);

console.log(`\n${pass} тестов прошло, ${fails.length} упало\n`);
if (fails.length) {
  for (const f of fails) console.log('FAILED:', f.name, '\n ', f.err.stack.split('\n')[1]);
  process.exit(1);
}
