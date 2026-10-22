// Dev-only: renders assets/hero.png (a still used as the title-screen backdrop).
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));

const W = 400, H = 225;
const gameCanvas = createCanvas(W, H);
gameCanvas.addEventListener = () => {};
gameCanvas.style = {};
const fakeEl = () => ({ classList: { add() {}, remove() {}, contains: () => false }, style: {}, textContent: '', addEventListener() {} });
const handlers = {};
globalThis.window = { innerWidth: W * 2, innerHeight: H * 2, devicePixelRatio: 1, addEventListener: (t, f) => { (handlers[t] ||= []).push(f); } };
globalThis.document = {
  getElementById: (id) => (id === 'game' ? gameCanvas : fakeEl()),
  addEventListener: (t, f) => { (handlers[t] ||= []).push(f); },
  createElement: (tag) => (tag === 'canvas' ? createCanvas(8, 8) : fakeEl()),
};
let t = 0;
globalThis.performance = { now: () => t };
let nextFrame = null;
globalThis.requestAnimationFrame = (f) => { nextFrame = f; };
globalThis.setTimeout = (f) => { f(); return 0; };
globalThis.clearTimeout = () => {};

await import('../js/main.js');
await new Promise((r) => process.nextTick(r));
const state = globalThis.__game;
(handlers.keydown || []).forEach((f) => f({ code: 'Enter', preventDefault() {} }));
state.player.x = 905;
state.player.y = 512;
state.hud.draw = () => {};
state.player.dir = 'down';
state.time = 6;
state.showHelp = false;
for (let i = 0; i < 4; i++) {
  t += 16.7;
  const f = nextFrame; nextFrame = null; f(t);
  state.camera.x = 905 - W * 0.52;
  state.camera.y = 512 - H * 0.72;
}
// upscale 2x for a crisp 800x450 still
const out = createCanvas(W * 2, H * 2);
const octx = out.getContext('2d');
octx.imageSmoothingEnabled = false;
octx.drawImage(gameCanvas, 0, 0, W * 2, H * 2);
mkdirSync('assets', { recursive: true });
writeFileSync('assets/hero.png', out.toBuffer('image/png'));
console.log('hero written');
