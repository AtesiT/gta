import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
globalThis.__createCanvas = (w,h)=>createCanvas(Math.ceil(w),Math.ceil(h));
const { makeCharacterSheet, CHAR, PALETTES } = await import('../js/art/characters.js');
const sheet = makeCharacterSheet(PALETTES.player);
const S = 22;
const out = createCanvas(CHAR.cellW*2*S, CHAR.cellH*S);
const ctx = out.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#3a3542'; ctx.fillRect(0,0,out.width,out.height);
// side frame 0 and side frame 2
ctx.drawImage(sheet, 0*CHAR.cellW, 2*CHAR.cellH, CHAR.cellW, CHAR.cellH, 0, 0, CHAR.cellW*S, CHAR.cellH*S);
ctx.drawImage(sheet, 2*CHAR.cellW, 2*CHAR.cellH, CHAR.cellW, CHAR.cellH, CHAR.cellW*S, 0, CHAR.cellW*S, CHAR.cellH*S);
mkdirSync('tools/out',{recursive:true});
writeFileSync('tools/out/side-zoom.png', out.toBuffer('image/png'));
console.log('ok');
