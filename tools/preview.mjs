// Dev-only: renders the procedural art to PNG files so it can be inspected fast.
// Usage: node tools/preview.mjs
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';

globalThis.__createCanvas = (w, h) => createCanvas(Math.ceil(w), Math.ceil(h));

const { buildStreet, WORLD } = await import('../js/art/street.js');
const { makeCharacterSheet, drawCharacter, PALETTES } = await import('../js/art/characters.js');
const { getProp } = await import('../js/art/props.js');

mkdirSync('tools/out', { recursive: true });

const t0 = Date.now();
const street = buildStreet();
console.log('world built in', Date.now() - t0, 'ms', WORLD.w, WORLD.h);

const sheet = makeCharacterSheet(PALETTES.player);

function view(x, y, w, h, scale, file, withPlayer = true) {
  const c = createCanvas(w * scale, h * scale);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(street.canvas, x, y, w, h, 0, 0, w * scale, h * scale);
  // props sorted by baseline
  const props = street.props.slice().sort((a, b) => a.y - b.y);
  for (const p of props) {
    if (!p.kind) continue;
    const sp = p.sprite || getProp(p.kind || 'tree', p.seed || 1, p.color);
    const dx = (p.x - sp.ax - x) * scale;
    const dy = (p.y - sp.ay - y) * scale;
    ctx.drawImage(sp.canvas, dx, dy, sp.w * scale, sp.h * scale);
  }
  if (withPlayer) {
    const px = Math.round((w / 2) * scale), py = Math.round((h / 2) * scale);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 1 * scale, 8 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    drawCharacter(ctx, sheet, 'down', 0, px, py, scale);
  }
  writeFileSync('tools/out/' + file, c.toBuffer('image/png'));
}

view(0, 0, WORLD.w, WORLD.h, 0.35, 'world.png', false);
view(150, 120, 480, 300, 2, 'view-park.png');
view(700, 120, 480, 300, 2, 'view-hotel.png');
view(900, 500, 480, 300, 2, 'view-street.png');
view(1250, 700, 480, 300, 2, 'view-south.png');
view(400, 560, 480, 300, 2, 'view-cars.png');

const sheetCanvas = createCanvas(sheet.width * 4, sheet.height * 4);
const sctx = sheetCanvas.getContext('2d');
sctx.imageSmoothingEnabled = false;
sctx.drawImage(sheet, 0, 0, sheetCanvas.width, sheetCanvas.height);
writeFileSync('tools/out/character.png', sheetCanvas.toBuffer('image/png'));
console.log('done');
