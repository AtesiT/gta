// Dev-only: renders framed screenshots at chosen camera positions.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));

const W = Number(process.env.SHOT_W || 1600);
const H = Number(process.env.SHOT_H || 900);
const gameCanvas = createCanvas(W, H);
gameCanvas.addEventListener = () => {};
gameCanvas.style = {};

const fakeEl = () => ({ classList: { add() {}, remove() {}, contains: () => false }, style: {}, textContent: '', addEventListener() {} });
const handlers = {};
globalThis.window = {
  innerWidth: W, innerHeight: H, devicePixelRatio: 1,
  addEventListener: (t, f) => { (handlers[t] ||= []).push(f); },
};
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
handlers.keydown.forEach((f) => f({ code: 'Enter', preventDefault() {} }));

mkdirSync('tools/out', { recursive: true });

state.time = 5;
const spots = (process.env.SHOTS || 'park:300:400,hotel:760:520,street:1000:700,south:1500:900').split(',');
for (const spot of spots) {
  const [name, x, y] = spot.split(':');
  state.player.x = Number(x);
  state.player.y = Number(y);
  state.showHelp = false;
  state.camera.x = Math.max(0, Number(x) - state.viewW / 2);
  state.camera.y = Math.max(0, Number(y) - state.viewH * 0.58);
  for (let i = 0; i < 3; i++) {
    t += 16.7;
    const f = nextFrame; nextFrame = null; f(t);
    state.camera.x = Math.max(0, Math.min(2400 - state.viewW, Number(x) - state.viewW / 2));
    state.camera.y = Math.max(20, Math.min(1220 - state.viewH, Number(y) - state.viewH * 0.58));
  }
  writeFileSync(`tools/out/shot-${name}.png`, gameCanvas.toBuffer('image/png'));
  console.log('wrote', name, state.viewW, state.viewH, 'scale', state.scale);
}
