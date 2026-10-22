// Dev-only: contact sheet of the character sheet, 8x zoom.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));
const { makeCharacterSheet, CHAR, PALETTES } = await import('../js/art/characters.js');
const who = process.argv[2] || 'player';
const sheet = makeCharacterSheet(PALETTES[who]);
const S = 9;
const out = createCanvas(CHAR.cellW * CHAR.frames * S, CHAR.cellH * CHAR.dirs.length * S);
const ctx = out.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#3a3542';
ctx.fillRect(0, 0, out.width, out.height);
for (let d = 0; d < CHAR.dirs.length; d++) {
  for (let f = 0; f < CHAR.frames; f++) {
    ctx.drawImage(sheet, f * CHAR.cellW, d * CHAR.cellH, CHAR.cellW, CHAR.cellH,
      f * CHAR.cellW * S, d * CHAR.cellH * S, CHAR.cellW * S, CHAR.cellH * S);
  }
}
mkdirSync('tools/out', { recursive: true });
writeFileSync(`tools/out/char-${who}.png`, out.toBuffer('image/png'));
console.log('ok');
