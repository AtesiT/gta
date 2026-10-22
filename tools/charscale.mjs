// Dev-only: how the characters actually look on screen — 1x, 2.5x (in-game) and 4x.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));
const { makeCharacterSheet, CHAR, PALETTES } = await import('../js/art/characters.js');

const names = (process.argv[2] || 'player,npc1,npc2,npc3').split(',');
const SCALES = [1, 2.5, 4];
const sheetW = CHAR.cellW * 3; // three side/front frames
const pad = 10;
const rows = [];
let W = pad, H = pad;
for (const s of SCALES) { W = Math.max(W, pad + charWidth(s)); }
function charWidth(s) { return CHAR.cellW * 3 * s; }
const colW = (s) => CHAR.cellW * 3 * s;
let x = pad, y = pad;
const layouts = [];
let curY = pad, maxW = 0;
for (const s of SCALES) {
  const rowH = CHAR.cellH * s;
  layouts.push({ s, y: curY });
  curY += rowH + pad;
  maxW = Math.max(maxW, colW(s));
}
const brandW = maxW + pad * 2;
curY = pad;
const blocks = [];
for (const name of names) {
  const sheet = makeCharacterSheet(PALETTES[name]);
  blocks.push({ name, sheet, y: curY });
  curY += layouts.reduce((a, l) => a + CHAR.cellH * l.s + pad, 0) + pad;
}
const out = createCanvas(Math.max(brandW, 900), curY);
const ctx = out.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#2a2634';
ctx.fillRect(0, 0, out.width, out.height);
// a bit of the pavement so the colours read like in game
const g = ctx.createLinearGradient(0, 0, 0, out.height);
g.addColorStop(0, '#413c4c'); g.addColorStop(1, '#2b2734');
ctx.fillStyle = g; ctx.fillRect(0, 0, out.width, out.height);

for (const b of blocks) {
  let yy = b.y;
  for (const { s, } of layouts) {
    const h = CHAR.cellH * s;
    // dirs: down, right, up  (the left view is the mirrored right view)
    const dirs = [0, 2, 3];
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      ctx.drawImage(b.sheet, 0 * CHAR.cellW, d * CHAR.cellH, CHAR.cellW, CHAR.cellH,
        pad + i * CHAR.cellW * s, yy, CHAR.cellW * s, h);
    }
    yy += h + pad;
  }
  ctx.fillStyle = '#c9c2d8';
  ctx.font = '11px sans-serif';
  ctx.fillText(b.name, out.width - 90, b.y + 14);
}
mkdirSync('tools/out', { recursive: true });
writeFileSync('tools/out/char-scale.png', out.toBuffer('image/png'));
console.log('ok', out.width, out.height);
