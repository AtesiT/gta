// Dev-only: nearest-neighbour zoom + crop of a rendered PNG.
// Usage: node tools/zoompng.mjs in.png out.png x y w h scale
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
const [inp, outp, x, y, w, h, s] = process.argv.slice(2);
const img = await loadImage(inp);
const c = createCanvas(Number(w) * Number(s), Number(h) * Number(s));
const ctx = c.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.drawImage(img, Number(x), Number(y), Number(w), Number(h), 0, 0, c.width, c.height);
writeFileSync(outp, c.toBuffer('image/png'));
console.log('ok', outp);
