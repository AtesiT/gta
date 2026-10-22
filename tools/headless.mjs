// Dev-only harness: runs the real game loop against a stubbed DOM and writes frames.
// Usage: node tools/headless.mjs [frames]
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';

globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));

const frameCount = Number(process.argv[2] || 90);
const gameCanvas = createCanvas(640, 400);
gameCanvas.addEventListener = () => {};
gameCanvas.style = {};
gameCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 400 });

const fakeEl = () => ({
  classList: { add() {}, remove() {}, contains: () => false },
  style: {},
  textContent: '',
  appendChild() {},
  addEventListener() {},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 400 }),
});

const handlers = {};
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: (t, f) => { (handlers[t] ||= []).push(f); },
  requestAnimationFrame: () => {},
};
globalThis.document = {
  getElementById: (id) => (id === 'game' ? gameCanvas : fakeEl()),
  addEventListener: () => {},
  createElement: (tag) => {
    if (tag === 'canvas') return createCanvas(8, 8);
    return fakeEl();
  },
};
globalThis.performance = { now: () => t };
globalThis.requestAnimationFrame = (f) => { nextFrame = f; };
globalThis.setTimeout = (f) => { f(); return 0; };
globalThis.clearTimeout = () => {};

let t = 0;
let nextFrame = null;

await import('../js/main.js');

// run the deferred world build
await new Promise((r) => process.nextTick(r));

const press = (code) => handlers.keydown && handlers.keydown.forEach((f) => f({ code, preventDefault() {} }));
const release = (code) => handlers.keyup && handlers.keyup.forEach((f) => f({ code, preventDefault() {} }));
press('Enter');

mkdirSync('tools/out', { recursive: true });
// walk right for a bit, then down
for (let i = 0; i < frameCount; i++) {
  if (i === 10) press('KeyD');
  if (i === 50) { release('KeyD'); press('KeyS'); }
  if (i === 80) { release('KeyS'); }
  t += 16.7;
  if (!nextFrame) { console.error('no frame scheduled at', i); break; }
  const f = nextFrame;
  nextFrame = null;
  f(t);
  if (i === 24 || i === 60 || i === frameCount - 1) {
    writeFileSync(`tools/out/frame-${i}.png`, gameCanvas.toBuffer('image/png'));
    globalThis.__dbg && globalThis.__dbg();
    const data = gameCanvas.toBuffer('image/png');
    writeFileSync(`tools/out/frame-${i}-b.png`, data);
  }
}
console.log('frames rendered:', frameCount);

const mod = await import('../js/main.js');
const gameCanvas2 = gameCanvas;
const gctx = gameCanvas2.getContext('2d');
globalThis.__dbg && globalThis.__dbg();
