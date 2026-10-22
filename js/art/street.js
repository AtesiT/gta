// Builds the static city block: buildings, park, sidewalk, road, rooftops.
import { createCanvas, ctx2d, makeRng, px, line, circle, drawText, drawTextCentered, textWidth, shade, mix, rgba, speckle } from '../util.js';
import { C } from '../palette.js';
import { makeFacade, FACADE, WORLD } from './buildings.js';
import { makeRoof } from './roofs.js';
import { getProp } from './props.js';

export { WORLD };

const PARK = { x0: 180, x1: 470, gate0: 318, gate1: 380 };

// ------------------------------------------------------------------ surfaces
function pavement(ctx, x0, y0, w, h, rng) {
  px(ctx, x0, y0, w, h, C.paveDark);
  const tw = 46, th = 26;
  let row = 0;
  for (let y = y0; y < y0 + h; y += th) {
    const off = row % 2 ? -tw / 2 : 0;
    for (let x = x0 + off; x < x0 + w; x += tw) {
      const tx = Math.max(x, x0);
      const txx = Math.min(x + tw - 1, x0 + w);
      if (txx - tx <= 0) continue;
      const v = rng.range(-7, 7);
      px(ctx, tx, y, txx - tx, Math.min(th - 1, y0 + h - y), mix(C.pave, rng.chance(0.5) ? C.paveLight : C.paveDark, rng() * 0.5));
      px(ctx, tx, y, txx - tx, 1, rgba('#8b8698', 0.10 + Math.max(0, v) / 90));
      px(ctx, tx, y + Math.min(th - 1, y0 + h - y) - 1, txx - tx, 1, rgba('#393444', 0.45));
      if (rng.chance(0.14)) {
        // cracked or stained paver
        for (let i = 0; i < 12; i++) px(ctx, tx + rng.int(2, tw - 3), y + rng.int(2, th - 3), rng.int(1, 4), 1, rgba('#3c3748', 0.4));
      }
    }
    row++;
  }
  // seams
  for (let x = x0; x < x0 + w; x += tw) px(ctx, x, y0, 1, h, 'rgba(62,58,74,0.35)');
  // dirt along the wall side + speckles
  for (let i = 0; i < (w * h) / 900; i++) px(ctx, x0 + rng.int(0, w), y0 + rng.int(0, h), 1, 1, rng.pick(['#79758a', '#5f5b6d', '#8b8798', '#4e4a5c']));
  // gum spots
  for (let i = 0; i < (w * h) / 9000; i++) px(ctx, x0 + rng.int(0, w), y0 + rng.int(0, h), 2, 1, rgba('#2f2b36', 0.7));
}

function curb(ctx, x0, y, w, dir) {
  // dir 1: curb on the north side of the road (light strip faces south)
  px(ctx, x0, y, w, 8, C.curb);
  px(ctx, x0, y, w, 2, '#a09bab');
  px(ctx, x0, y + 5, w, 3, C.curbDark);
  px(ctx, x0, y + 8, w, 4, rgba('#0c0a10', 0.45));
  // seams
  for (let x = x0 + 30; x < x0 + w; x += 60) px(ctx, x, y, 1, 8, rgba('#4a4656', 0.8));
  // drain grates periodically
  for (let x = x0 + 260; x < x0 + w; x += 620) {
    px(ctx, x, y + 1, 26, 6, '#1b1922');
    for (let i = 0; i < 6; i++) px(ctx, x + 2 + i * 4, y + 2, 2, 4, '#3a3746');
  }
}

function asphalt(ctx, x0, y0, w, h, rng) {
  px(ctx, x0, y0, w, h, C.asphalt);
  // subtle large-scale mottling
  for (let i = 0; i < (w * h) / 380; i++) {
    const s = rng.int(2, 7);
    px(ctx, x0 + rng.int(0, w), y0 + rng.int(0, h), s, 1, rgba(rng.chance(0.5) ? '#34323f' : '#262430', 0.5));
  }
  for (let i = 0; i < (w * h) / 5200; i++) {
    const px0 = x0 + rng.int(0, w - 60), py0 = y0 + rng.int(0, h - 20);
    const pw = rng.int(20, 70), ph = rng.int(8, 26);
    px(ctx, px0, py0, pw, ph, rgba(rng.chance(0.6) ? '#22202b' : '#33313e', 0.45));
  }
  // tar snakes
  for (let i = 0; i < w / 40; i++) {
    let cx = x0 + rng.int(0, w), cy = y0 + rng.int(0, h);
    for (let s = 0; s < rng.int(6, 26); s++) {
      px(ctx, cx, cy, 1, 1, rgba('#16141c', 0.65));
      cx += rng.int(-3, 4);
      cy += rng.chance(0.5) ? 1 : 0;
      if (cy > y0 + h) break;
    }
  }
  // oil stains
  for (let i = 0; i < w / 260; i++) {
    const sx = x0 + rng.int(20, w - 20), sy = y0 + rng.int(10, h - 10);
    const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, rng.int(8, 18));
    g.addColorStop(0, rgba('#14121a', 0.5));
    g.addColorStop(1, rgba('#14121a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - 20, sy - 20, 40, 40);
  }
  // worn wheel tracks
  for (const ty of [y0 + 40, y0 + 62, y0 + 128, y0 + 150]) {
    px(ctx, x0, ty, w, 14, rgba('#24222d', 0.25));
  }
}

function puddle(ctx, x, y, rx, ry, rng) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
  g.addColorStop(0, '#2b3248');
  g.addColorStop(0.6, '#1b2130');
  g.addColorStop(1, '#12161f');
  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  // reflected neon streaks
  for (let i = 0; i < 4; i++) {
    const sx = x - rx + rng.int(0, rx * 2);
    px(ctx, sx, y - ry * 0.4 + rng.int(0, ry * 0.6), rng.int(2, 8), 1, rgba(rng.pick([C.neonAmber, C.neonPink, C.neonTeal, '#ffffff']), 0.25));
  }
  ctx.strokeStyle = rgba('#5c6480', 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rx - 0.5, ry - 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function manhole(ctx, x, y) {
  circle(ctx, x, y, 13, '#191720');
  circle(ctx, x, y, 12, '#2e2b36');
  circle(ctx, x, y, 10, '#26232d');
  for (let i = -8; i <= 8; i += 4) {
    px(ctx, x + i, y - 7, 1, 14, '#1c1a22');
    px(ctx, x - 7, y + i, 14, 1, '#1c1a22');
  }
  px(ctx, x - 12, y - 1, 24, 2, rgba('#4a4656', 0.4));
}

function grass(ctx, x0, y0, w, h, rng) {
  px(ctx, x0, y0, w, h, '#1d3124');
  for (let i = 0; i < (w * h) / 90; i++) {
    px(ctx, x0 + rng.int(0, w), y0 + rng.int(0, h), 1, 1, rng.pick(['#243b28', '#2b4830', '#1a2b20', '#345236', '#3d5c3c']));
  }
  // dirt patches
  for (let i = 0; i < 7; i++) {
    const sx = x0 + rng.int(10, w - 40), sy = y0 + rng.int(60, h - 30);
    for (let j = 0; j < 40; j++) px(ctx, sx + rng.int(-16, 16), sy + rng.int(-9, 9), 2, 1, rgba('#4a3a2c', 0.3));
  }
  // flower beds
  for (let i = 0; i < 4; i++) {
    const bx = x0 + 30 + rng.int(0, w - 90), by = y0 + rng.int(80, h - 80);
    const bw = rng.int(30, 60), bh = rng.int(14, 24);
    px(ctx, bx - 2, by - 2, bw + 4, bh + 4, '#3a2f28');
    px(ctx, bx, by, bw, bh, '#2e2a24');
    for (let j = 0; j < 90; j++) {
      const fx = bx + rng.int(0, bw), fy = by + rng.int(0, bh);
      px(ctx, fx, fy, 1, 1, rng.pick(['#6b4d7a', '#b0563f', '#c9a44a', '#7a8ab0', '#cfc0a0']));
    }
  }
  // worn path
  const pathX = (PARK.gate0 + PARK.gate1) / 2;
  for (let y = y0 + h - 4; y > y0 + 30; y -= 1) {
    const wob = Math.sin(y * 0.05) * 5;
    for (let i = -16; i < 16; i++) {
      if (rng.chance(0.72)) px(ctx, pathX + wob + i + rng.int(-2, 2), y, 1, 1, rgba(rng.chance(0.4) ? '#5b4a38' : '#3f352a', 0.55));
    }
  }
  // park lamp warm patch
  for (let i = 0; i < 2; i++) {
    const lx = x0 + 100 + i * 160, ly = y0 + 150;
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 70);
    g.addColorStop(0, rgba('#ffcf8a', 0.16));
    g.addColorStop(1, rgba('#ffcf8a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(lx - 70, ly - 70, 140, 140);
  }
}

function parkFence(ctx, x0, x1, y, gate0, gate1, drawGround = true) {
  // brick base
  const segs = [[x0, gate0], [gate1, x1]];
  for (const [sx, ex] of segs) {
    if (ex - sx < 4) continue;
    px(ctx, sx, y, ex - sx, 7, '#4a3a34');
    for (let x = sx + 1; x < ex - 1; x += 9) px(ctx, x, y, 1, 7, '#382b27');
    px(ctx, sx, y, ex - sx, 1, '#6b5850');
    px(ctx, sx, y + 7, ex - sx, 2, rgba('#0c0a10', 0.4));
    // iron pickets
    px(ctx, sx, y - 22, 2, 22, '#1e1c26');
    px(ctx, sx + 2, y - 24, 3, 3, '#2a2733');
    px(ctx, sx, y - 18, ex - sx, 2, '#26232e');
    px(ctx, sx, y - 8, ex - sx, 2, '#26232e');
    for (let x = sx + 4; x < ex - 3; x += 7) {
      px(ctx, x, y - 22, 1, 22, '#26232e');
      px(ctx, x, y - 24, 1, 2, '#3a3746');
    }
  }
  // gate posts
  for (const gx of [gate0, gate1]) {
    px(ctx, gx - 3, y - 30, 8, 37, '#2a2733');
    px(ctx, gx - 3, y - 30, 2, 37, '#454150');
    px(ctx, gx - 5, y - 34, 12, 4, '#3a3746');
    circle(ctx, gx + 1, y - 36, 4, '#3a3746');
  }
  // gate open leaves
  px(ctx, gate0 - 16, y - 24, 16, 2, '#26232e');
  px(ctx, gate0 - 17, y - 24, 2, 20, '#26232e');
  px(ctx, gate1 - 1, y - 24, 16, 2, '#26232e');
  px(ctx, gate1 + 14, y - 24, 2, 20, '#26232e');
  for (let i = 0; i < 4; i++) {
    px(ctx, gate0 - 14 + i * 4, y - 22, 1, 18, '#232028');
    px(ctx, gate1 + 2 + i * 4, y - 22, 1, 18, '#232028');
  }
}

function treeGrate(ctx, x, y) {
  px(ctx, x - 16, y - 10, 32, 14, '#221f29');
  px(ctx, x - 16, y - 10, 32, 1, '#37333f');
  for (let i = 0; i < 4; i++) px(ctx, x - 12 + i * 7, y - 8, 2, 10, '#2b2833');
}

// ------------------------------------------------------------------ lighting
// Static lamps are baked once into a world-sized darkness map (with holes) and a
// warm additive glow map, so the per-frame lighting only has to handle the player
// and moving traffic.
function bakeLighting(W, H, lamps) {
  const lightBase = createCanvas(W, H);
  const lctx = ctx2d(lightBase);
  lctx.fillStyle = 'rgba(10,9,24,0.50)';
  lctx.fillRect(0, 0, W, H);
  const g = lctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(7,6,18,0.26)');
  g.addColorStop(0.5, 'rgba(9,8,20,0)');
  g.addColorStop(1, 'rgba(5,4,12,0.22)');
  lctx.fillStyle = g;
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  for (const l of lamps) {
    const st = l.strength ?? 1;
    const r = l.r;
    const rg = lctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    rg.addColorStop(0, `rgba(0,0,0,${0.98 * st})`);
    rg.addColorStop(0.45, `rgba(0,0,0,${0.68 * st})`);
    rg.addColorStop(0.78, `rgba(0,0,0,${0.24 * st})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = rg;
    lctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
  }
  lctx.globalCompositeOperation = 'source-over';

  const glowBase = createCanvas(W, H);
  const gctx = ctx2d(glowBase);
  gctx.globalCompositeOperation = 'lighter';
  for (const l of lamps) {
    const r = l.r * 0.9;
    const col = l.color || C.neonAmber;
    const gl = (l.glow ?? 1) * 0.26;
    const rg = gctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    rg.addColorStop(0, rgba(col, gl));
    rg.addColorStop(0.45, rgba(col, gl * 0.35));
    rg.addColorStop(1, rgba(col, 0));
    gctx.fillStyle = rg;
    gctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
  }
  gctx.globalCompositeOperation = 'source-over';
  return { lightBase, glowBase };
}

// ------------------------------------------------------------------ builder
export function buildStreet() {
  const { w: W, h: H } = WORLD;
  const canvas = createCanvas(W, H);
  const ctx = ctx2d(canvas);
  const rng = makeRng(20240613);
  const props = [];
  const lamps = [];
  const solids = []; // static collision rectangles {x,y,w,h}
  const signs = [];

  // base
  px(ctx, 0, 0, W, H, '#191722');

  // ============================================================ north block
  const facades = [
    {
      x: 0, w: 180, floors: 5, seed: 11, brick: ['#4a4552', '#534e5c', '#433e4a', '#5a5564'],
      signTop: { text: 'BAR', color: '#e8c27a', scale: 2 },
      bays: [{ type: 'store', w: 180, sign: 'BAR', signColor: '#e8c27a', awning: '#5c2f3c', interior: 'shop', doorSide: 'right' }],
      sconces: true,
    },
    // park occupies 180..470
    {
      x: 470, w: 530, floors: 4, seed: 23, brick: C.brick,
      signTop: { text: 'HOTEL', color: '#e5d9bd', scale: 2 },
      bays: [
        { type: 'door', w: 130, doorColor: '#4d3226' },
        { type: 'store', w: 220, sign: 'BOOK STORE', awning: '#2b6674', interior: 'books', signColor: '#bfe6ef' },
        { type: 'door', w: 90 },
        { type: 'plain', w: 90 },
      ],
      fireEscape: { cols: [2, 3] },
      sconces: true,
    },
    {
      x: 1000, w: 240, floors: 4, seed: 31, brick: ['#5f3a2f', '#6b4234', '#573227', '#754a3a'],
      bays: [
        { type: 'store', w: 150, sign: 'CAFE', awning: '#8d3b3b', interior: 'cafe', signColor: '#f0d6a8' },
        { type: 'door', w: 90 },
      ],
      sconces: true,
    },
    {
      x: 1240, w: 320, floors: 5, seed: 43, brick: C.brick,
      signTop: { text: 'APARTMENTS', color: '#cfc4ac', scale: 2 },
      bays: [
        { type: 'door', w: 110 },
        { type: 'store', w: 120, sign: 'DELI', awning: '#3d5c3c', interior: 'shop', signColor: '#e8e0c8' },
        { type: 'plain', w: 90 },
      ],
      fireEscape: { cols: [0, 1] },
    },
    {
      x: 1560, w: 340, floors: 3, seed: 57, brick: ['#4f3a33', '#5b453c', '#453029', '#63493f'],
      bays: [
        { type: 'store', w: 170, sign: 'LIQUOR', awning: '#4a2f52', interior: 'shop', signColor: '#ff9dc0', signScale: 2 },
        { type: 'door', w: 90 },
        { type: 'plain', w: 80 },
      ],
      sconces: true,
    },
    {
      x: 1900, w: 300, floors: 4, seed: 61, brick: C.brick,
      bays: [
        { type: 'store', w: 150, sign: 'PIZZA', awning: '#8d4a2f', interior: 'cafe', signColor: '#ffcf8a' },
        { type: 'door', w: 150 },
      ],
      fireEscape: { cols: [1, 2] },
      sconces: true,
    },
    {
      x: 2200, w: 200, floors: 5, seed: 71, brick: ['#403a4a', '#4a4454', '#37313f', '#514b5c'],
      bays: [
        { type: 'plain', w: 100 },
        { type: 'door', w: 100 },
      ],
      signTop: { text: 'MOTS', color: '#b9b3a0', scale: 2 },
    },
  ];

  const shopLights = [];
  for (const spec of facades) {
    const f = makeFacade({ ...spec, width: spec.w });
    ctx.drawImage(f.canvas, spec.x, WORLD.top - f.height);
    // warm light spilling out of every shop front onto the pavement
    if (spec.bays) {
      let bx = 0;
      const total = spec.bays.reduce((a, b) => a + b.w, 0) || spec.w;
      for (const bay of spec.bays) {
        const bw = Math.round((bay.w * spec.w) / total);
        if (bay.type === 'store') {
          shopLights.push({
            x: spec.x + bx + bw / 2,
            y: WORLD.top + 10,
            r: 84,
            color: bay.signColor && bay.interior === 'cafe' ? '#ffbe72' : '#ffc98a',
            glow: 1.15,
          });
        } else if (bay.type === 'door') {
          shopLights.push({ x: spec.x + bx + bw / 2, y: WORLD.top + 6, r: 46, color: '#ffc07a', glow: 0.8 });
        }
        bx += bw;
      }
    }
    if (spec.signTop) {
      signs.push({ x: spec.x + spec.w / 2, y: WORLD.top - f.height + 40, text: spec.signTop.text, color: spec.signTop.color });
    }
    // wall base shadow + grime onto the sidewalk
    const g = ctx.createLinearGradient(0, WORLD.top, 0, WORLD.top + 26);
    g.addColorStop(0, rgba('#0a0810', 0.55));
    g.addColorStop(1, rgba('#0a0810', 0));
    ctx.fillStyle = g;
    ctx.fillRect(spec.x, WORLD.top, spec.w, 26);
  }

  // side walls between buildings
  for (let i = 0; i < facades.length; i++) {
    const f = facades[i];
    const nx = facades[i + 1];
    if (!nx) continue;
    if (nx.x - (f.x + f.w) > 2) continue;
    px(ctx, f.x + f.w - 4, 0, 4, WORLD.top, '#141119');
    px(ctx, f.x + f.w - 4, 0, 1, WORLD.top, '#2a2530');
  }
  // gap between park buildings
  px(ctx, facades[0].x + facades[0].w - 5, 0, 5, WORLD.top, '#141119');
  px(ctx, 470, 0, 5, WORLD.top, '#141119');

  // ============================================================ the park
  const px0 = PARK.x0, px1 = PARK.x1, pw = px1 - px0;
  px(ctx, px0, 0, pw, WORLD.top, '#17261c');
  grass(ctx, px0, 0, pw, WORLD.top, rng);
  // hedge / rear wall
  for (let x = px0; x < px1; x += 8) {
    circle(ctx, x + 4, 26 + Math.sin(x * 0.09) * 4, rng.int(9, 13), rng.pick(C.foliage.slice(1)));
  }
  for (let x = px0; x < px1; x += 6) circle(ctx, x + 3, 20, rng.int(6, 9), rng.pick(C.foliage));
  px(ctx, px0, 0, pw, 18, '#1a2a1f');
  // far backdrop building silhouette over the hedge
  px(ctx, px0 + 40, 0, 120, 34, '#1c1a24');
  for (let x = px0 + 48; x < px0 + 152; x += 16) px(ctx, x, 10, 7, 9, rgba('#ffca85', 0.35));
  px(ctx, px0 + 230, 0, 90, 24, '#221f2a');
  for (let x = px0 + 238; x < px0 + 312; x += 14) px(ctx, x, 8, 6, 8, rgba('#ffca85', 0.25));

  // ---- plaza with an old fountain in the middle of the park
  const plazaX = Math.round((PARK.gate0 + PARK.gate1) / 2);
  const plazaY = 268;
  const plazaR = 74;
  // paving
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(plazaX, plazaY, plazaR, Math.round(plazaR * 0.62), 0, 0, Math.PI * 2);
  ctx.clip();
  px(ctx, plazaX - plazaR, plazaY - plazaR, plazaR * 2, plazaR * 2, '#6e6a7c');
  for (let y = -plazaR; y < plazaR; y += 12) {
    const off = Math.abs(Math.floor(y / 12) % 2) ? 10 : 0;
    for (let x = -plazaR; x < plazaR; x += 20) {
      px(ctx, plazaX + x + off, plazaY + y, 18, 10, mix(C.pave, rng.chance(0.5) ? C.paveLight : C.paveDark, rng() * 0.6));
      px(ctx, plazaX + x + off, plazaY + y, 18, 1, 'rgba(190,186,205,0.12)');
    }
  }
  speckle(ctx, plazaX - plazaR, plazaY - plazaR, plazaR * 2, plazaR * 2, ['#7d788c', '#615d70', '#8a8598'], 260, rng, 1);
  ctx.restore();
  ctx.strokeStyle = 'rgba(50,46,60,0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(plazaX, plazaY, plazaR, Math.round(plazaR * 0.62), 0, 0, Math.PI * 2);
  ctx.stroke();

  // paths: gate -> plaza and plaza -> left/right
  // gravel-and-paver paths: soft blobby band, then individual stones and dither
  const pathDraw = (x0, y0, x1, y1, wid) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(len * 1.4);
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wobble = Math.sin(t * 9.1) * 2.4 + Math.sin(t * 3.3 + 1) * 1.8;
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      pts.push({
        x: x0 + (x1 - x0) * t + nx * wobble,
        y: y0 + (y1 - y0) * t + ny * wobble,
        r: wid * (0.82 + 0.18 * Math.sin(t * 5.7)),
      });
    }
    // base band
    for (const p of pts) {
      circle(ctx, p.x, p.y, p.r + 1, 'rgba(38,44,32,0.55)');
    }
    for (const p of pts) {
      circle(ctx, p.x, p.y - 0.5, p.r, '#4a4438');
    }
    for (const p of pts) {
      circle(ctx, p.x, p.y - 1, p.r - 2, '#565043');
    }
    // pavers
    for (const p of pts) {
      for (let i = 0; i < 7; i++) {
        const a = rng() * Math.PI * 2, rr = rng() * (p.r - 2);
        px(ctx, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 1.1, rng.int(2, 4), rng.int(1, 2),
          rng.pick(['#6b6353', '#514b3f', '#7a7161', '#433d33']));
      }
      // sparse grass poking through at the edges
      for (let i = 0; i < 2; i++) {
        const a = rng() * Math.PI * 2;
        px(ctx, p.x + Math.cos(a) * (p.r - 1), p.y + Math.sin(a) * (p.r - 1), 1, 1, rng.pick(['#3a5233', '#2f4a30']));
      }
    }
  };
  pathDraw(plazaX, 446, plazaX, plazaY + 30, 12);
  pathDraw(plazaX - 10, plazaY, px0 + 50, plazaY + 46, 7);
  pathDraw(plazaX + 10, plazaY, px1 - 52, plazaY + 14, 7);
  pathDraw(plazaX, plazaY - 10, plazaX + 26, 132, 6);

  const fR = 34;
  const fountainY = plazaY;

  // flower beds along the paths
  const flowerBeds = [[px0 + 86, 352, 62, 22], [px1 - 84, 322, 56, 20], [px0 + 30, 176, 54, 20], [px1 - 70, 178, 44, 18]];
  for (const [bx0, by0, bw, bh] of flowerBeds) {
    px(ctx, bx0 - 3, by0 - 3, bw + 6, bh + 6, '#3a2f28');
    px(ctx, bx0 - 1, by0 - 1, bw + 2, bh + 2, '#5b4031');
    px(ctx, bx0, by0, bw, bh, '#2f3b29');
    speckle(ctx, bx0, by0, bw, bh, ['#37502f', '#455e37', '#2a3b26'], bw * bh / 4, rng, 1);
    for (let i = 0; i < bw * bh / 8; i++) {
      px(ctx, bx0 + rng.int(0, bw - 1), by0 + rng.int(0, bh - 1), 1, 1, rng.pick(['#8d5a8c', '#c9645c', '#e0b45a', '#6d86b8', '#dfd2bb', '#b0563f']));
    }
  }

  parkFence(ctx, px0, px1, 444, PARK.gate0, PARK.gate1);

  // park furniture (props with collision)
  const parkProps = [
    ['tree', 3, px0 + 36, 232, 12],
    ['tree', 5, px0 + 74, 132, 12],
    ['tree', 9, px1 - 44, 132, 12],
    ['tree', 12, px1 - 26, 300, 12],
    ['tree', 14, px0 + 22, 300, 12],
    ['tree', 17, px1 - 96, 392, 12],
    ['bench', 2, plazaX - 84, plazaY + 6, 34],
    ['bench', 4, plazaX + 78, plazaY - 12, 34],
    ['bench', 6, px0 + 46, 398, 34],
    ['lamp', 1, plazaX - 60, plazaY - 46, 7],
    ['lamp', 2, plazaX + 60, plazaY - 46, 7],
    ['lamp', 3, px0 + 24, 392, 7],
    ['trash', 1, plazaX + 96, plazaY + 24, 9],
    ['trash', 2, plazaX - 98, plazaY - 22, 9],
    ['hydrant', 1, px0 + 132, 414, 7],
  ];
  for (const [kind, seed, x, y, solid] of parkProps) {
    const extra = kind === 'lamp' ? { light: { r: 70, color: C.neonAmber } } : {};
    const sprite = getProp(kind, seed);
    props.push({ kind, seed, x, y, solid, sprite, ...extra });
    if (solid) solids.push({ x: x - solid, y: y - 8, w: solid * 2, h: 14 });
  }
  // the fountain is a sorted prop so the player can walk behind it
  {
    const sprite = getProp('fountain', 1);
    props.push({ kind: 'fountain', seed: 1, x: plazaX, y: plazaY + 26, sprite });
    solids.push({ x: plazaX - fR, y: plazaY - Math.round(fR * 0.5), w: fR * 2, h: Math.round(fR * 0.62) });
  }
  // flower beds too
  for (const [bx0, by0, bw, bh] of flowerBeds) solids.push({ x: bx0 - 2, y: by0 - 2, w: bw + 4, h: bh + 4 });
  // fountain light
  lamps.push({ x: plazaX, y: plazaY - 24, r: 96, color: '#9fd4e8', glow: 0.85, flicker: 1.3 });

  // ============================================================ sidewalks
  pavement(ctx, 0, WORLD.top, W, 130, rng);
  // seams + curb line at street edge
  px(ctx, 0, WORLD.sidewalkN - 22, W, 1, rgba('#3e3948', 0.5));
  curb(ctx, 0, WORLD.sidewalkN, W, 1);

  // south sidewalk
  pavement(ctx, 0, WORLD.laneS, W, WORLD.sidewalkS - WORLD.laneS, rng);
  curb(ctx, 0, WORLD.roadS, W, -1);
  px(ctx, 0, WORLD.sidewalkS - 3, W, 3, '#3a3542');

  // ============================================================ road
  asphalt(ctx, 0, WORLD.laneN, W, WORLD.roadS - WORLD.laneN, rng);

  // lane markings
  const cy = (WORLD.laneN + WORLD.roadS) / 2;
  px(ctx, 0, cy - 5, W, 2, rgba(C.paintYellow, 0.85));
  px(ctx, 0, cy + 3, W, 2, rgba(C.paintYellow, 0.85));
  // dashed side lanes
  for (let x = 20; x < W; x += 90) {
    px(ctx, x, WORLD.laneN + 52, 46, 2, rgba(C.paint, 0.6));
    px(ctx, x + 45, WORLD.roadS - 54, 46, 2, rgba(C.paint, 0.6));
  }
  // worn paint
  for (let i = 0; i < W / 6; i++) {
    if (rng.chance(0.55)) px(ctx, rng.int(0, W), cy - 5 + rng.int(0, 10), 1, 1, rgba('#2b2935', 0.6));
  }

  // crosswalk
  const cwX0 = 1170, cwX1 = 1330;
  px(ctx, cwX0 - 6, WORLD.laneN, cwX1 - cwX0 + 12, 2, rgba(C.paint, 0.35));
  for (let x = cwX0; x < cwX1; x += 20) {
    px(ctx, x, WORLD.laneN + 4, 12, WORLD.roadS - WORLD.laneN - 8, rgba('#b9b3a0', 0.78));
    for (let i = 0; i < 30; i++) px(ctx, x + rng.int(0, 11), WORLD.laneN + 4 + rng.int(0, 180), 1, 1, rgba('#2b2935', 0.35));
  }
  // "SLOW" painted on the road, rotated like the reference
  ctx.save();
  ctx.translate(1080, cy);
  ctx.rotate(-Math.PI / 2);
  drawTextCentered(ctx, 'SLOW', 0, -8, rgba('#b9b3a0', 0.55), 2);
  ctx.restore();
  // stop bar
  px(ctx, cwX0 - 26, cy + 12, 8, WORLD.roadS - cy - 24, rgba('#b9b3a0', 0.6));
  px(ctx, cwX1 + 18, WORLD.laneN + 12, 8, cy - WORLD.laneN - 24, rgba('#b9b3a0', 0.6));

  // manholes & puddles
  manhole(ctx, 760, cy + 34);
  manhole(ctx, 1710, cy - 30);
  manhole(ctx, 420, WORLD.sidewalkN + 52);
  manhole(ctx, 2040, WORLD.laneS + 44);
  puddle(ctx, 900, cy + 52, 46, 12, rng);
  puddle(ctx, 1550, cy - 46, 38, 9, rng);
  puddle(ctx, 320, cy + 12, 30, 8, rng);
  puddle(ctx, 2210, cy + 56, 52, 11, rng);
  puddle(ctx, 690, WORLD.laneS + 60, 34, 8, rng);

  // ============================================================ south rooftops
  // Everything below the south sidewalk is a roof seen from above. Only the first
  // ~110 px of a roof are ever on screen (the camera stops at the backs of the
  // buildings), so the props live in that band: bulkheads, water towers, skylights,
  // vents and AC units all cluster along the parapet, the way they do in real life.
  const roofs = [
    {
      x: 0, w: 600, seed: 91, style: 'tar', tint: '#7a5a3c', wallColor: '#4a3a33',
      sign: { text: 'BODEGA', color: C.neonTeal, scale: 2, x: 300 },
      waterTower: { x: 452, y: 150, scale: 1.15 },
      bulkhead: { x: 48, y: 80, w: 82, h: 46, palette: { wall: '#4a3a35', wallDark: '#33272a', cap: '#575063' } },
      chimneys: [{ x: 196, y: 130 }, { x: 524, y: 96 }],
      skylights: [{ x: 300, y: 56, w: 36, h: 22 }, { x: 152, y: 60, w: 26, h: 16, lit: false }],
      acUnits: [{ x: 120, y: 126 }, { x: 352, y: 132 }],
      vents: [{ x: 176, y: 96 }, { x: 508, y: 116 }],
      pigeons: { x: 236, y: 92 },
      cables: true,
    },
    {
      x: 600, w: 600, seed: 92, style: 'ballast', tint: '#5a4a6a', wallColor: '#443c46',
      sign: { text: 'MOTEL', color: C.neonPink, scale: 2 },
      bulkhead: { x: 86, y: 82, w: 76, h: 44, palette: { wall: '#4a4148', wallDark: '#332f36', cap: '#4a4656' } },
      waterTower: { x: 474, y: 148, scale: 0.95 },
      chimneys: [{ x: 258, y: 128 }, { x: 556, y: 88 }],
      skylights: [{ x: 392, y: 54, w: 34, h: 20 }, { x: 160, y: 58, w: 28, h: 16, lit: false }],
      acUnits: [{ x: 340, y: 120 }, { x: 528, y: 132 }],
      vents: [{ x: 36, y: 108 }, { x: 470, y: 96 }],
      cables: true,
    },
    {
      x: 1200, w: 600, seed: 93, style: 'slate', tint: '#3c5a6a', wallColor: '#3f3a44',
      sign: { text: 'DINER', color: C.neonAmber, scale: 2 },
      waterTower: { x: 92, y: 150, scale: 1.05 },
      bulkhead: { x: 344, y: 76, w: 90, h: 50, palette: { wall: '#3d4450', wallDark: '#2b3038', cap: '#414a58' } },
      chimneys: [{ x: 244, y: 130 }, { x: 552, y: 92 }],
      skylights: [{ x: 178, y: 54, w: 40, h: 24 }, { x: 452, y: 60, w: 26, h: 16 }],
      acUnits: [{ x: 300, y: 128 }, { x: 512, y: 130 }],
      vents: [{ x: 158, y: 100 }, { x: 404, y: 104 }],
      garden: { x: 262, y: 108, w: 110, h: 36 },
      antenna: { x: 40, y: 122 },
      cables: true,
    },
    {
      x: 1800, w: 600, seed: 94, style: 'shingle', tint: '#6a5a44', wallColor: '#4a4038',
      sign: { text: 'HOTEL', color: C.neonTeal, scale: 2 },
      bulkhead: { x: 462, y: 80, w: 78, h: 46, palette: { wall: '#46403a', wallDark: '#302b26', cap: '#4c463f' } },
      waterTower: { x: 88, y: 148, scale: 0.95 },
      chimneys: [{ x: 248, y: 126 }, { x: 548, y: 132 }],
      skylights: [{ x: 336, y: 54, w: 36, h: 22 }, { x: 192, y: 58, w: 28, h: 18, lit: false }],
      acUnits: [{ x: 296, y: 122 }, { x: 500, y: 120 }],
      vents: [{ x: 128, y: 98 }, { x: 404, y: 108 }],
      pigeons: { x: 258, y: 90 },
      cables: true,
    },
  ];
  // faint light spill from the street onto the roof edges
  for (const r of roofs) {
    const gl = ctx.createLinearGradient(0, WORLD.sidewalkS, 0, WORLD.sidewalkS + 70);
    gl.addColorStop(0, 'rgba(255,196,132,0.10)');
    gl.addColorStop(1, 'rgba(255,196,132,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(r.x, WORLD.sidewalkS, r.w, 70);
  }
  const roofLights = [];
  for (const r of roofs) {
    const roof = makeRoof({ width: r.w, depth: WORLD.roofDepth, seed: r.seed, ...r });
    // service bulbs along the parapet + the rooftop neon's own glow
    for (let x = 66; x < r.w - 30; x += 150) {
      roofLights.push({ x: r.x + x + 1, y: WORLD.sidewalkS + 13, r: 54, color: '#ffcb84', glow: 0.9, flicker: rng() * 8 });
    }
    if (r.sign) {
      roofLights.push({ x: r.x + (r.sign.x ?? r.w / 2), y: WORLD.sidewalkS + 46, r: 132, color: r.sign.color, glow: 0.8, strength: 0.6, flicker: 2 });
    }
    ctx.drawImage(roof.canvas, r.x, WORLD.sidewalkS);
    // party wall between neighbouring roofs
    px(ctx, r.x - 4, WORLD.sidewalkS, 8, WORLD.roofDepth, '#16131b');
    px(ctx, r.x - 4, WORLD.sidewalkS, 2, WORLD.roofDepth, '#2e2934');
    px(ctx, r.x - 4, WORLD.sidewalkS, 8, 6, '#3a3542');
    if (r.sign) signs.push({ x: r.x + (r.sign.x ?? r.w / 2), y: WORLD.sidewalkS + 40, text: r.sign.text, color: r.sign.color });
  }
  // street-facing shadow of the south parapet
  const sg = ctx.createLinearGradient(0, WORLD.sidewalkS, 0, WORLD.sidewalkS + 22);
  sg.addColorStop(0, rgba('#0a0810', 0.5));
  sg.addColorStop(1, rgba('#0a0810', 0));
  ctx.fillStyle = sg;
  ctx.fillRect(0, WORLD.sidewalkS, W, 22);

  // ============================================================ street furniture
  const add = (kind, x, y, extra = {}) => {
    const seed = extra.seed ?? (Math.round(x / 7) + 3);
    const sprite = getProp(kind, seed, extra.color);
    props.push({ kind, seed, x, y, solid: extra.solid ?? 0, color: extra.color, light: extra.light, sprite });
    if (extra.solid) solids.push({ x: x - extra.solid, y: y - 8, w: extra.solid * 2, h: 14 });
    return sprite;
  };

  const north = WORLD.top;
  // lamps along the north sidewalk
  for (const x of [120, 560, 880, 1420, 1740, 2120, 2340]) {
    add('lamp', x, north + 26, { solid: 7, light: { r: 92, color: C.neonAmber } });
  }
  // trees in grates on the north sidewalk
  const northTrees = [300, 760, 1050, 1600, 1960, 2280];
  northTrees.forEach((x, i) => {
    treeGrate(ctx, x, north + 34);
    add('tree', x, north + 28, { solid: 9, seed: i + 2 });
  });
  // benches against the facades
  [400, 950, 1500, 2020].forEach((x, i) => add('bench', x, north + 56, { solid: 30, seed: i + 1 }));
  // bins, hydrant, post box, news boxes
  add('trash', 700, north + 62, { solid: 9 });
  add('trash', 1690, north + 62, { solid: 9 });
  add('trash', 2190, north + 60, { solid: 9 });
  add('hydrant', 1120, north + 74, { solid: 7 });
  add('mailbox', 1830, north + 66, { solid: 9 });
  add('newsbox', 1320, north + 68, { solid: 9, seed: 1 });
  add('newsbox', 1350, north + 68, { solid: 9, seed: 2 });
  add('planter', 640, north + 48, { solid: 12, seed: 1 });
  add('planter', 2160, north + 48, { solid: 12, seed: 2 });

  // traffic lights + bollards at the crossing
  add('trafficLight', 1152, WORLD.sidewalkN - 8, { solid: 6 });
  add('trafficLight', 1338, WORLD.laneS + 10, { solid: 6 });
  add('bollard', 1120, WORLD.sidewalkN - 16, { solid: 5 });
  add('bollard', 1372, WORLD.sidewalkN - 16, { solid: 5 });
  add('bollard', 1120, WORLD.laneS + 16, { solid: 5 });
  add('bollard', 1372, WORLD.laneS + 16, { solid: 5 });

  // south sidewalk furniture
  add('stall', 520, WORLD.laneS + 54, { solid: 26, light: { r: 66, color: C.neonAmber } });
  add('trash', 640, WORLD.laneS + 74, { solid: 9 });
  add('bench', 760, WORLD.laneS + 74, { solid: 30 });
  add('lamp', 980, WORLD.laneS + 26, { solid: 7, light: { r: 92, color: C.neonAmber } });
  add('lamp', 1520, WORLD.laneS + 26, { solid: 7, light: { r: 92, color: C.neonAmber } });
  add('lamp', 2080, WORLD.laneS + 26, { solid: 7, light: { r: 92, color: C.neonAmber } });
  add('planter', 1005, WORLD.laneS + 56, { solid: 12 });
  add('newsbox', 1880, WORLD.laneS + 66, { solid: 9, seed: 3 });
  add('trash', 1700, WORLD.laneS + 70, { solid: 9 });
  add('cone', 1440, WORLD.laneS + 80);
  add('cone', 1456, WORLD.laneS + 86);
  add('hydrant', 2260, WORLD.laneS + 66, { solid: 7 });
  add('bench', 1415, WORLD.laneS + 78, { solid: 30, seed: 5 });
  add('bench', 1760, WORLD.laneS + 78, { solid: 30, seed: 6 });
  add('trash', 1500, WORLD.laneS + 76, { solid: 9 });
  add('planter', 2000, WORLD.laneS + 56, { solid: 12, seed: 4 });
  add('newsbox', 700, WORLD.laneS + 66, { solid: 9, seed: 4 });
  add('lamp', 640, WORLD.laneS + 26, { solid: 7, light: { r: 92, color: C.neonAmber } });
  add('stall', 1720, WORLD.laneS + 54, { solid: 26, light: { r: 62, color: C.neonAmber } });

  // solid bodies: facades, the park fence, and the rooftops
  for (const spec of facades) solids.push({ x: spec.x, y: 0, w: spec.w, h: WORLD.top + 4 });
  solids.push({ x: 0, y: WORLD.sidewalkS + 2, w: W, h: H - WORLD.sidewalkS });
  solids.push({ x: 0, y: 0, w: PARK.x0, h: WORLD.top + 4 });
  solids.push({ x: PARK.x1, y: 0, w: W - PARK.x1, h: WORLD.top + 4 });
  // park fence (with the gate left open)
  solids.push({ x: PARK.x0, y: 438, w: PARK.gate0 - PARK.x0, h: 16 });
  solids.push({ x: PARK.gate1, y: 438, w: PARK.x1 - PARK.gate1, h: 16 });
  // hedge at the back of the park
  solids.push({ x: PARK.x0, y: 0, w: PARK.x1 - PARK.x0, h: 52 });

  // parked cars along the north curb
  const parked = [
    [340, 'car', '#8d3b34', 21], [880, 'car', '#2f4f7a', 22], [1520, 'van', null, 23],
    [1830, 'car', '#5a5f6b', 24], [2260, 'car', '#38614d', 25], [640, 'car', '#7a6a3a', 26],
  ];
  for (const [x, kind, color, seed] of parked) {
    const sprite = getProp(kind, seed, color || undefined);
    props.push({ kind, seed, x, y: WORLD.laneN + 44, color: color || undefined, sprite });
    solids.push({ x: x - 34, y: WORLD.laneN + 26, w: 68, h: 22 });
  }

  // collect lamp lights (street lamps, park lamps, stall)
  for (const p of props) {
    if (p.light) lamps.push({ x: p.x, y: p.y - 26, r: p.light.r, color: p.light.color, flicker: rng() * 6, glow: 1.2 });
  }
  for (const l of shopLights) lamps.push({ ...l, flicker: l.flicker ?? 0 });
  for (const l of roofLights) lamps.push(l);

  // neon sign glows on the ground
  const neons = [
    { x: 1160, y: 300, color: C.neonTeal, r: 90 },
    { x: 1020, y: 244, color: C.neonPink, r: 80 },
    { x: 250, y: 470, color: C.neonAmber, r: 70 },
    { x: 1750, y: 476, color: C.neonPink, r: 80 },
  ];
  for (const n of neons) lamps.push({ ...n, flicker: rng() * 10, ground: true });

  // Slice the big baked layers into tiles: blitting from modest canvases is much
  // friendlier to canvas backends (and keeps per-frame uploads small).
  const TILE = 1024;
  const slice = (src) => {
    const out = [];
    for (let ty = 0; ty < H; ty += TILE) {
      for (let tx = 0; tx < W; tx += TILE) {
        const tw = Math.min(TILE, W - tx), th = Math.min(TILE, H - ty);
        const t = createCanvas(tw, th);
        ctx2d(t).drawImage(src, tx, ty, tw, th, 0, 0, tw, th);
        out.push({ x: tx, y: ty, canvas: t });
      }
    }
    return out;
  };

  // flickering neon signs stay dynamic so the street feels alive
  const dynamicLights = lamps.filter((l) => l.flicker);
  const staticLamps = lamps.filter((l) => !l.flicker);
  const { lightBase, glowBase } = bakeLighting(W, H, staticLamps);

  const tiles = slice(canvas);
  const lightTiles = slice(lightBase);
  const glowTiles = slice(glowBase);
  // zoomed-out minimap: the whole block scaled down once, no per-frame scaling
  const miniScale = 1 / 8;
  const mini = createCanvas(Math.ceil(W * miniScale), Math.ceil(H * miniScale));
  ctx2d(mini).drawImage(canvas, 0, 0, W, H, 0, 0, mini.width, mini.height);
  lightBase.width = 1;
  lightBase.height = 1;
  glowBase.width = 1;
  glowBase.height = 1;

  return { canvas, tiles, mini, miniScale, props, lamps, dynamicLights, lightTiles, glowTiles, solids, signs, park: PARK };
}
