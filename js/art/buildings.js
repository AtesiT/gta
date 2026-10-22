// Original procedural night-city pixel art: brick facades, shop fronts, fire escapes,
// rooftops and water towers.
import { createCanvas, ctx2d, makeRng, px, line, circle, drawText, textWidth, shade, mix, rgba, speckle } from '../util.js';
import { C } from '../palette.js';

// World layout shared by the street builder and the renderer. Units are art pixels;
// the whole thing is drawn at 1x into a low-res canvas and upscaled by the engine.
export const WORLD = {
  w: 2400,
  h: 1220,
  top: 440,          // wall base of the north block
  sidewalkN: 570,    // north sidewalk ends / curb starts
  laneN: 578,
  roadS: 768,
  laneS: 776,
  sidewalkS: 890,    // south sidewalk ends / rooftops begin
  roofDepth: 330,
};

// --------------------------------------------------------------------- walls
function brickWall(ctx, x, y, w, h, rng, colors = C.brick, mortar = C.brickMortar) {
  px(ctx, x, y, w, h, mortar);
  const BW = 13, BH = 6;
  let row = 0;
  for (let by = y; by < y + h; by += BH) {
    const off = row % 2 ? -7 : 0;
    for (let bx = x + off; bx < x + w; bx += BW) {
      const x0 = Math.max(bx, x);
      const x1 = Math.min(bx + BW - 1, x + w);
      if (x1 <= x0) continue;
      let col = rng.pick(colors);
      if (rng.chance(0.1)) col = shade(col, -9);
      else if (rng.chance(0.08)) col = shade(col, 7);
      px(ctx, x0, by, x1 - x0, BH - 1, col);
      if (rng.chance(0.2)) px(ctx, x0, by, x1 - x0, 1, shade(col, 9));
    }
    row++;
  }
  // grime streaks
  for (let i = 0; i < w / 18; i++) {
    const sx = x + rng.int(0, w - 1);
    const sy = y + rng.int(0, Math.floor(h * 0.4));
    const len = rng.int(20, Math.max(24, Math.floor(h * 0.55)));
    for (let yy = sy; yy < Math.min(y + h, sy + len); yy++) {
      if (rng.chance(0.5)) ctx.fillStyle = rgba('#180d11', rng.range(0.04, 0.14)), ctx.fillRect(sx, yy, 1, 1);
    }
  }
}

function stoneBand(ctx, x, y, w, h, light = false) {
  px(ctx, x, y, w, h, light ? C.stoneLight : C.stone);
  px(ctx, x, y, w, 1, light ? '#a9a4b8' : C.stoneLight);
  px(ctx, x, y + h - 1, w, 1, C.stoneDark);
  for (let bx = x + 14; bx < x + w; bx += 28) px(ctx, bx, y + 1, 1, h - 1, rgba('#3b3748', 0.45));
}

function drawWindow(ctx, x, y, w, h, rng, opts = {}) {
  const lit = opts.lit ?? rng.chance(0.4);
  const frame = opts.frame || '#2b2633';
  const trim = opts.trim || C.stone;
  // lintel + sill
  px(ctx, x - 2, y - 3, w + 4, 3, trim);
  px(ctx, x - 2, y - 3, w + 4, 1, shade(trim, 14));
  px(ctx, x - 3, y + h, w + 6, 3, shade(trim, 5));
  px(ctx, x - 3, y + h + 3, w + 6, 1, rgba('#1a1620', 0.5));
  // frame
  px(ctx, x, y, w, h, frame);
  const gx = x + 2, gy = y + 2, gw = w - 4, gh = h - 4;
  if (lit) {
    const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
    g.addColorStop(0, opts.litTop || C.lit);
    g.addColorStop(0.55, opts.litMid || C.litWarm);
    g.addColorStop(1, C.litDeep);
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, gw, gh);
    if (rng.chance(0.45)) {
      const cw = rng.int(2, 5);
      px(ctx, gx, gy, cw, gh, rgba('#9c6438', 0.45));
      px(ctx, gx + gw - cw, gy, cw, gh, rgba('#9c6438', 0.4));
    }
    if (rng.chance(0.35)) {
      const sx = gx + rng.int(2, Math.max(3, gw - 6));
      px(ctx, sx, gy + gh - 11, 3, 6, rgba('#6b4526', 0.5));
      px(ctx, sx, gy + gh - 14, 2, 3, rgba('#6b4526', 0.5));
    }
    if (opts.blind) for (let yy = gy + 2; yy < gy + gh * 0.45; yy += 2) px(ctx, gx, yy, gw, 1, rgba('#8a5a34', 0.35));
  } else {
    const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
    g.addColorStop(0, C.glassLight);
    g.addColorStop(0.6, C.glass);
    g.addColorStop(1, C.glassDark);
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, gw, gh);
    if (rng.chance(0.5)) {
      ctx.fillStyle = rgba('#5c6d8f', 0.14);
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      ctx.lineTo(gx + gw * 0.5, gy);
      ctx.lineTo(gx + gw * 0.75, gy);
      ctx.lineTo(gx + gw * 0.25, gy + gh);
      ctx.closePath();
      ctx.fill();
    }
    if (rng.chance(0.3)) for (let yy = gy + 1; yy < gy + gh * 0.5; yy += 2) px(ctx, gx, yy, gw, 1, rgba('#0d1220', 0.45));
    if (rng.chance(0.2)) px(ctx, gx, gy + gh - 3, gw, 2, rgba(C.litDeep, 0.3));
  }
  // mullions
  px(ctx, x + Math.floor(w / 2), gy, 1, gh, frame);
  px(ctx, gx, gy + Math.floor(gh / 2), gw, 1, frame);
  // glass shine
  px(ctx, gx + 1, gy + 1, 1, Math.max(2, gh - 4), rgba('#dfe8ff', 0.09));
  px(ctx, gx, gy, gw, 1, rgba('#0e0c14', 0.45));
}

function drawSconce(ctx, x, y) {
  px(ctx, x - 1, y, 3, 2, C.metalDark);
  px(ctx, x - 2, y + 2, 5, 2, '#3a3040');
  px(ctx, x - 1, y + 3, 3, 1, '#fff1c8');
  const g = ctx.createRadialGradient(x, y + 3, 0, x, y + 3, 11);
  g.addColorStop(0, rgba(C.lit, 0.30));
  g.addColorStop(1, rgba(C.lit, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 11, y - 8, 22, 22);
}

function drawAwning(ctx, x, y, w, h, color) {
  const stripe = 6;
  for (let sx = 0; sx < w; sx += stripe * 2) {
    px(ctx, x + sx, y, Math.min(stripe, w - sx), h, color);
    px(ctx, x + sx + stripe, y, Math.min(stripe, w - sx - stripe), h, C.cream);
  }
  px(ctx, x - 1, y - 1, w + 2, 1, C.metalDark);
  px(ctx, x, y + h - 3, w, 3, 'rgba(24,16,20,0.18)');
  for (let sx = 0; sx < w; sx += 12) {
    px(ctx, x + sx, y + h, Math.min(12, w - sx), 2, Math.floor(sx / 12) % 2 === 0 ? color : C.cream);
  }
  px(ctx, x + 1, y + h + 2, w - 2, 1, 'rgba(20,14,18,0.35)');
}

function drawStoreWindow(ctx, x, y, w, h, rng, kind, warm = true) {
  px(ctx, x, y, w, h, '#252230');
  px(ctx, x + 2, y + 2, w - 4, h - 4, warm ? '#241c22' : '#141c28');
  const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 7;
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, warm ? '#8d5c33' : '#28364c');
  g.addColorStop(0.55, warm ? '#5d3a24' : '#1a2436');
  g.addColorStop(1, warm ? '#3c251a' : '#111926');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  if (warm) {
    for (let lx = ix + 9; lx < ix + iw - 4; lx += 20) {
      const lg = ctx.createRadialGradient(lx, iy + 6, 0, lx, iy + 6, 13);
      lg.addColorStop(0, rgba('#ffdca0', 0.5));
      lg.addColorStop(1, rgba('#ffdca0', 0));
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 13, iy - 7, 26, 26);
      px(ctx, lx, iy + 5, 3, 1, '#ffe9bb');
    }
  }
  if (kind === 'books') {
    for (let sy = iy + 10; sy < iy + ih - 3; sy += 10) {
      px(ctx, ix + 3, sy, iw - 6, 1, '#3b2a1f');
      let bx = ix + 4;
      while (bx < ix + iw - 6) {
        const bw = rng.int(1, 3), bh = rng.int(4, 7);
        px(ctx, bx, sy - bh, bw, bh, rng.pick(['#a84b3f', '#3f6b8a', '#8d7b3c', '#5c4c7a', '#4f7a55', '#b07a4a']));
        bx += bw + 1;
      }
    }
  } else if (kind === 'cafe') {
    px(ctx, ix + 4, iy + ih - 13, iw - 12, 3, '#5a3a24');
    px(ctx, ix + 6, iy + ih - 10, 2, 6, '#3d2818');
    px(ctx, ix + iw - 14, iy + ih - 10, 2, 6, '#3d2818');
    for (let cx2 = ix + 7; cx2 < ix + iw - 8; cx2 += 9) px(ctx, cx2, iy + ih - 15, 2, 1, '#d8c5a8');
  } else {
    px(ctx, ix + 4, iy + 12, iw * 0.45, 2, rgba('#f0d7a6', 0.22));
    px(ctx, ix + 4, iy + 18, iw * 0.3, 2, rgba('#f0d7a6', 0.16));
    px(ctx, ix + 4, iy + ih - 8, iw - 8, 4, rgba('#2b1d16', 0.6));
  }
  // reflections
  ctx.fillStyle = rgba('#b9d4ff', 0.07);
  ctx.beginPath();
  ctx.moveTo(ix, iy + ih);
  ctx.lineTo(ix + iw * 0.35, iy);
  ctx.lineTo(ix + iw * 0.5, iy);
  ctx.lineTo(ix + iw * 0.15, iy + ih);
  ctx.closePath();
  ctx.fill();
  for (let bx = ix + 14; bx < ix + iw; bx += 24) px(ctx, bx, iy, 1, ih, '#2b2733');
  px(ctx, ix, iy + Math.floor(ih / 2), iw, 1, '#2b2733');
  px(ctx, x + 2, y + 2, w - 4, 2, rgba('#0c0a10', 0.5));
  px(ctx, ix, iy + ih - 4, iw, 4, rgba('#0c0a10', 0.3));
}

function drawDoorBay(ctx, x, y, w, h, rng, opts = {}) {
  const dw = Math.min(52, w - 26);
  const dx = x + Math.floor((w - dw) / 2);
  const dy = y;
  px(ctx, dx - 5, dy - 7, dw + 10, h + 7, C.stone);
  px(ctx, dx - 5, dy - 7, dw + 10, 1, C.stoneLight);
  px(ctx, dx - 7, dy - 9, dw + 14, 3, shade(C.stone, -10));
  px(ctx, dx - 2, dy, dw + 4, h, '#1a1418');
  const door = opts.doorColor || C.woodDark;
  px(ctx, dx, dy, dw, h - 2, door);
  const half = Math.floor(dw / 2);
  for (const ox of [0, half]) {
    const px0 = dx + ox + 2;
    const pw = half - 4;
    px(ctx, px0, dy + 6, pw, 18, shade(door, 8));
    px(ctx, px0, dy + 28, pw, h - 40, shade(door, -4));
    px(ctx, px0, dy + 6, pw, 1, shade(door, 20));
    px(ctx, px0 + 1, dy + 8, pw - 2, 14, shade(door, -10));
    px(ctx, px0 + 1, dy + 30, pw - 2, h - 44, shade(door, -12));
  }
  px(ctx, dx + half, dy, 1, h - 2, '#120d10');
  px(ctx, dx + half - 3, dy + Math.floor(h * 0.52), 2, 3, '#c9a55a');
  px(ctx, dx + half + 2, dy + Math.floor(h * 0.52), 2, 3, '#c9a55a');
  px(ctx, dx, dy + 2, dw, 3, rgba(C.lit, 0.5));
  // steps
  const sw = dw + 16;
  const sx = x + Math.floor((w - sw) / 2);
  px(ctx, sx, y + h, sw, 3, C.stoneLight);
  px(ctx, sx + 2, y + h + 3, sw - 4, 3, C.stone);
  px(ctx, sx + 4, y + h + 6, sw - 8, 3, shade(C.stone, -6));
  px(ctx, sx, y + h + 9, sw - 6, 1, rgba('#1a1620', 0.45));
  for (const rx of [sx + 5, sx + sw - 8]) {
    px(ctx, rx, y + h - 16, 2, 25, C.metalDark);
    px(ctx, rx + 2, y + h - 16, 5, 2, C.metalDark);
    for (let i = 0; i < 3; i++) px(ctx, rx, y + h - 5 + i * 4, 2, 2, C.metal);
  }
  drawSconce(ctx, dx - 10, y + 4);
  drawSconce(ctx, dx + dw + 9, y + 4);
}

function drawFireEscape(ctx, x0, x1, floors, groundTop, rng) {
  const w = x1 - x0;
  for (let f = 0; f < floors; f++) {
    const py = groundTop - f * FACADE.floorH - 8;
    px(ctx, x0, py, w, 6, '#22202a');
    px(ctx, x0, py, w, 1, '#4a4656');
    px(ctx, x0 - 1, py + 6, w + 2, 2, rgba('#0e0d13', 0.45));
    px(ctx, x0, py - 14, w, 2, '#3c3948');
    px(ctx, x0, py - 9, w, 1, '#332f3d');
    for (let bx = x0; bx < x0 + w; bx += 4) px(ctx, bx, py - 14, 1, 14, '#353242');
    for (let bx = x0; bx < x0 + w; bx += 16) px(ctx, bx, py - 16, 2, 16, '#413e4e');
    const dir = f % 2 === 0 ? 1 : -1;
    const sx0 = dir > 0 ? x0 + 3 : x0 + w - 4;
    const sx1 = dir > 0 ? x0 + w - 4 : x0 + 3;
    line(ctx, sx0, py + 6, sx1, py + FACADE.floorH - 8, '#474353');
    line(ctx, sx0 + 1, py + 6, sx1 + 1, py + FACADE.floorH - 8, '#4b4757');
    line(ctx, sx0, py + 22, sx1, py + FACADE.floorH + 8, '#302d3a');
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      px(ctx, Math.round(sx0 + (sx1 - sx0) * t), Math.round(py + 6 + (FACADE.floorH - 14) * t), 2, 2, '#2a2733');
    }
  }
  px(ctx, x0 + w - 9, groundTop - 16, 2, 16, '#3c3948');
  px(ctx, x0 + w - 4, groundTop - 16, 2, 16, '#3c3948');
  for (let yy = groundTop - 14; yy < groundTop - 2; yy += 3) px(ctx, x0 + w - 9, yy, 7, 1, '#333040');
}

export const FACADE = { floorH: 106, groundH: 138, parapetH: 26 };

export function makeFacade(opts) {
  const width = Math.round(opts.width);
  const floors = opts.floors ?? 4;
  const rng = makeRng(opts.seed ?? 1);
  const H = FACADE.parapetH + floors * FACADE.floorH + FACADE.groundH + 14;
  const c = createCanvas(width, H);
  const ctx = ctx2d(c);
  const wallColors = opts.brick || C.brick;
  const groundTop = H - FACADE.groundH;

  brickWall(ctx, 0, 0, width, H, rng, wallColors);

  // ---- parapet / cornice
  px(ctx, 0, 0, width, FACADE.parapetH, C.stoneDark);
  px(ctx, 0, 0, width, 4, C.stoneLight);
  px(ctx, 0, 4, width, 1, C.stone);
  for (let x = 4; x < width; x += 16) {
    px(ctx, x, 9, 7, 7, C.stone);
    px(ctx, x, 9, 7, 1, shade(C.stone, 12));
    px(ctx, x, 16, 7, 2, C.stoneDark);
  }
  px(ctx, 0, FACADE.parapetH - 2, width, 2, '#241f2b');
  px(ctx, 0, FACADE.parapetH, width, 4, rgba('#120f16', 0.5));
  for (let i = 0; i < Math.max(1, Math.floor(width / 140)); i++) {
    const vx = rng.int(8, Math.max(10, width - 26));
    px(ctx, vx, rng.int(1, 6), 10, 6, '#1d1a24');
    px(ctx, vx + 2, 0, 7, 2, '#262230');
  }

  // ---- sign painted on the wall
  if (opts.signTop) {
    const sc = opts.signTop.scale || 2;
    const label = opts.signTop.text;
    const tw = textWidth(label, sc);
    const sx = opts.signTop.x ?? Math.round((width - tw) / 2);
    const sy = FACADE.parapetH + 12;
    px(ctx, sx - 5, sy - 4, tw + 10, 7 * sc + 8, rgba('#2a1c1c', 0.45));
    drawText(ctx, label, sx + 1, sy + 1, '#120c0e', sc);
    drawText(ctx, label, sx, sy, opts.signTop.color || C.cream, sc);
    if (opts.signTop.neon) {
      const g = ctx.createRadialGradient(sx + tw / 2, sy + 6, 0, sx + tw / 2, sy + 6, tw * 0.6);
      g.addColorStop(0, rgba(opts.signTop.color, 0.14));
      g.addColorStop(1, rgba(opts.signTop.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(sx - tw * 0.4, sy - 20, tw * 1.8, 60);
    }
  }

  // ---- upper floors
  const cols = Math.max(2, Math.floor((width - 44) / 104));
  const spacing = (width - 44) / cols;
  const winW = 30, winH = 50;
  const winCenters = [];
  for (let i = 0; i < cols; i++) winCenters.push(Math.round(44 + spacing * (i + 0.5)));

  for (let f = 0; f < floors; f++) {
    const floorBottom = groundTop - f * FACADE.floorH;
    const winY = floorBottom - 22 - winH;
    if (f > 0) {
      stoneBand(ctx, 0, floorBottom - 3, width, 4, false);
      px(ctx, 0, floorBottom + 1, width, 1, rgba('#1a1520', 0.35));
    }
    for (let i = 0; i < cols; i++) {
      const wx = winCenters[i] - Math.floor(winW / 2);
      drawWindow(ctx, wx, winY, winW, winH, rng, {
        lit: rng.chance(opts.litChance ?? 0.42),
        blind: rng.chance(0.3),
      });
      if (rng.chance(0.13)) {
        const p = rng.pick(['#3f6d3f', '#54804a', '#2f5836']);
        px(ctx, wx + 2, winY + winH - 2, 5, 3, '#57402f');
        circle(ctx, wx + 4, winY + winH - 4, 2, p);
        circle(ctx, wx + 6, winY + winH - 5, 1, shade(p, 10));
      } else if (rng.chance(0.1)) {
        px(ctx, wx + 3, winY + winH + 3, 15, 7, '#4b4857');
        px(ctx, wx + 3, winY + winH + 3, 15, 1, '#656273');
        for (let bx = wx + 4; bx < wx + 17; bx += 2) px(ctx, bx, winY + winH + 4, 1, 5, '#302d3a');
      }
    }
  }

  // downspouts
  for (const dx of [5, width - 9]) {
    px(ctx, dx, FACADE.parapetH, 4, H - FACADE.parapetH - 8, '#3c3440');
    px(ctx, dx, FACADE.parapetH, 1, H - FACADE.parapetH - 8, '#524854');
    for (let yy = FACADE.parapetH + 30; yy < H - 16; yy += 50) px(ctx, dx - 1, yy, 6, 2, '#2b2530');
  }

  if (opts.fireEscape) {
    const idx = opts.fireEscape.cols || [cols - 2, cols - 1];
    const x0 = winCenters[Math.max(0, idx[0])] - Math.round(spacing / 2) + 4;
    const x1 = winCenters[Math.min(cols - 1, idx[1])] + Math.round(spacing / 2) - 4;
    drawFireEscape(ctx, x0, x1, floors, groundTop, rng);
  }

  // ---- ground floor
  brickWall(ctx, 0, groundTop, width, FACADE.groundH, rng, wallColors.map((c2) => shade(c2, -8)));
  px(ctx, 0, groundTop, width, 3, C.stoneDark);
  px(ctx, 0, H - 16, width, 16, '#3a333f');
  px(ctx, 0, H - 16, width, 3, '#57505f');
  px(ctx, 0, H - 3, width, 3, '#1b1720');

  const bays = opts.bays || [];
  let bx = 0;
  const totalW = bays.reduce((s, b) => s + b.w, 0) || width;
  const scaleBays = width / totalW;
  for (const bay of bays) {
    const bw = Math.round(bay.w * scaleBays);
    px(ctx, bx, groundTop, 3, FACADE.groundH, rgba('#241a1d', 0.5));
    if (bay.type === 'store') {
      const pad = 12;
      const sx = bx + pad;
      const sw = bw - pad * 2;
      px(ctx, sx, groundTop + 8, sw, H - groundTop - 20, '#2e2226');
      const awnY = groundTop + 30;
      const awH = 20;
      drawStoreWindow(ctx, sx, awnY + awH + 5, sw, H - (awnY + awH) - 26, rng, bay.interior || 'shop', bay.warm !== false);
      drawAwning(ctx, sx - 2, awnY, sw + 4, awH, bay.awning || C.teal);
      if (bay.sign) {
        const sc = bay.signScale || 1;
        const tw = textWidth(bay.sign, sc);
        const sy = awnY - 7 * sc - 6;
        px(ctx, sx + Math.round((sw - tw) / 2) - 4, sy - 4, tw + 8, 7 * sc + 7, '#1a1418');
        px(ctx, sx + Math.round((sw - tw) / 2) - 4, sy - 4, tw + 8, 1, '#4f4650');
        drawText(ctx, bay.sign, sx + Math.round((sw - tw) / 2), sy, bay.signColor || C.cream, sc);
      }
      const dw = 26;
      const dx = sx + (bay.doorSide === 'left' ? 10 : bay.doorSide === 'right' ? sw - dw - 10 : Math.round((sw - dw) / 2));
      px(ctx, dx, H - 12 - 64, dw, 64, '#171319');
      px(ctx, dx + 2, H - 12 - 62, dw - 4, 60, '#2b2027');
      px(ctx, dx + 4, H - 12 - 58, dw - 8, 26, rgba(C.lit, 0.22));
      px(ctx, dx + dw + 2, H - 12 - 40, 2, 63, C.stoneDark);
      px(ctx, sx - 1, H - 2, sw + 2, 2, C.stoneDark);
      if (bay.plant) {
        px(ctx, sx + 3, H - 22, 6, 5, '#5a3f2f');
        circle(ctx, sx + 6, H - 25, 4, '#2f5836');
      }
    } else if (bay.type === 'door') {
      drawDoorBay(ctx, bx, groundTop + 46, bw, H - groundTop - 60, rng, bay);
    } else if (bay.type === 'plain') {
      px(ctx, bx + 10, H - 12 - 40, Math.min(26, bw - 18), 40, '#261d20');
      px(ctx, bx + 12, H - 12 - 38, Math.min(22, bw - 22), 36, '#33272a');
      for (let i = 0; i < 5; i++) px(ctx, bx + 14 + i * 2, H - 12 - 32, 1, 1, '#4a3a3c');
      px(ctx, bx + Math.round(bw / 2) - 6, H - 12 - 18, 12, 14, rgba('#0e0c10', 0.3));
    }
    px(ctx, bx + bw - 3, groundTop, 2, FACADE.groundH, rgba('#2a1c1e', 0.3));
    bx += bw;
  }

  // posters / graffiti on the plinth
  for (let i = 0; i < width / 90; i++) {
    const gx = rng.int(4, Math.max(5, width - 18));
    const gy = rng.int(H - 30, H - 16);
    if (rng.chance(0.5)) {
      px(ctx, gx, gy, 9, 12, rng.pick(['#b8b0a0', '#8d6c4a']));
      px(ctx, gx + 1, gy + 1, 7, 5, rgba('#3a3038', 0.7));
      for (let l = 0; l < 3; l++) px(ctx, gx + 1, gy + 8 + l * 1, 7, 1, rgba('#4a4048', 0.7));
    } else {
      ctx.fillStyle = rgba(rng.pick(['#7a4a8a', '#3a6a8a', '#8a4a3a']), 0.45);
      for (let l = 0; l < 10; l++) ctx.fillRect(gx + Math.floor(Math.sin(l * 0.9) * 4) + 4, gy + l, rng.int(2, 5), 1);
    }
  }
  if (opts.sconces) for (let x = 70; x < width; x += 190) drawSconce(ctx, x, groundTop + 14);

  // global light shaping
  ctx.globalCompositeOperation = 'source-atop';
  const topShade = ctx.createLinearGradient(0, 0, 0, H);
  topShade.addColorStop(0, rgba('#0d0a16', 0.4));
  topShade.addColorStop(0.45, rgba('#151122', 0.12));
  topShade.addColorStop(0.85, rgba('#2a1a1e', 0.02));
  topShade.addColorStop(1, rgba('#ffb066', 0.10));
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, width, H);
  ctx.globalCompositeOperation = 'source-over';

  return { canvas: c, width, height: H, groundTop };
}

// ---------------------------------------------------------------------- roof
export function makeRoof(opts) {
  const w = Math.round(opts.width);
  const d = Math.round(opts.depth);
  const rng = makeRng(opts.seed ?? 7);
  const c = createCanvas(w, d);
  const ctx = ctx2d(c);

  px(ctx, 0, 0, w, d, '#302d3a');
  px(ctx, 0, 6, w, d - 6, '#363240');
  speckle(ctx, 0, 6, w, d - 6, ['#3c3847', '#2e2a37', '#423e4d', '#2a2633', '#484454'], Math.floor(w * d * 0.035), rng, 1);
  for (let y = 22; y < d; y += 34) {
    px(ctx, 0, y, w, 1, rgba('#1b1922', 0.4));
    px(ctx, 0, y + 1, w, 1, rgba('#4a4658', 0.28));
  }
  for (let i = 0; i < w / 100; i++) {
    const yy = rng.int(14, d - 20);
    px(ctx, rng.int(0, w), yy, rng.int(20, 60), 1, rgba('#15131b', 0.4));
  }
  for (let i = 0; i < w / 100; i++) {
    px(ctx, rng.int(6, w - 50), rng.int(14, d - 34), rng.int(20, 50), rng.int(14, 28), rgba('#28242f', 0.5));
  }

  // front parapet (street facing, at the top edge)
  px(ctx, 0, 0, w, 8, C.stoneDark);
  px(ctx, 0, 0, w, 2, C.stoneLight);
  px(ctx, 0, 2, w, 1, C.stone);
  for (let x = 4; x < w; x += 16) px(ctx, x, 3, 9, 2, shade(C.stone, -12));
  px(ctx, 0, 8, w, 6, rgba('#0e0c12', 0.3));
  px(ctx, 0, 14, w, 3, rgba('#0e0c12', 0.14));
  px(ctx, 0, 0, 6, d, C.stoneDark);
  px(ctx, 0, 0, 2, d, C.stone);
  px(ctx, w - 6, 0, 6, d, C.stoneDark);
  px(ctx, w - 2, 0, 2, d, rgba('#6b6577', 0.55));

  // graffiti on the parapet
  for (let i = 0; i < Math.max(1, w / 380); i++) {
    const gx = rng.int(30, Math.max(40, w - 120));
    const col = rng.pick(['#6a4a8a', '#3a7a7a', '#8a4a4a', '#4a6a8a']);
    for (let l = 0; l < 6; l++) px(ctx, gx + Math.floor(Math.sin(l * 0.8) * 5) + 8, 1 + l, rng.int(2, 9), 1, rgba(col, 0.5));
  }

  // rooftop equipment
  const nUnits = Math.max(2, Math.floor(w / 110));
  for (let i = 0; i < nUnits; i++) {
    const ax = 30 + i * Math.floor((w - 70) / Math.max(1, nUnits)) + rng.int(0, 24);
    const ay = rng.int(34, Math.max(40, d - 80));
    const kind = rng.pick(['ac', 'vent', 'skylight', 'dish', 'chimney', 'ac', 'vent', 'duct']);
    if (kind === 'ac') {
      const aw = rng.int(20, 30), ah = rng.int(14, 20);
      px(ctx, ax, ay + ah - 4, aw, 4, rgba('#0d0c12', 0.45));
      px(ctx, ax, ay, aw, ah, '#4c4a57');
      px(ctx, ax, ay, aw, 2, '#615e6d');
      px(ctx, ax + 2, ay + 3, aw - 4, ah - 6, '#3a3845');
      circle(ctx, ax + aw / 2, ay + ah / 2, Math.min(aw, ah) / 3, '#2b2934');
      for (let b = 0; b < 4; b++) px(ctx, ax + 2, ay + 4 + b * 2, aw - 4, 1, '#565362');
    } else if (kind === 'vent') {
      px(ctx, ax, ay, 14, 9, '#3b3946');
      px(ctx, ax, ay, 14, 1, '#565362');
      for (let b = 0; b < 3; b++) px(ctx, ax + 2, ay + 3 + b * 2, 10, 1, '#211f28');
      px(ctx, ax + 4, ay - 3, 5, 3, '#2c2a35');
    } else if (kind === 'skylight') {
      const sw = rng.int(22, 40), sh = rng.int(14, 22);
      px(ctx, ax - 2, ay - 2, sw + 4, sh + 4, '#15131b');
      const g = ctx.createLinearGradient(0, ay, 0, ay + sh);
      g.addColorStop(0, '#2c3a52');
      g.addColorStop(1, '#151d2b');
      ctx.fillStyle = g;
      ctx.fillRect(ax, ay, sw, sh);
      px(ctx, ax, ay, sw, 1, '#5b6d8a');
      for (let i = 0; i < sw; i += 8) px(ctx, ax + i, ay, 1, sh, '#1b2433');
      if (rng.chance(0.5)) {
        px(ctx, ax + 2, ay + 3, sw * 0.35, 2, rgba(C.lit, 0.3));
        px(ctx, ax + 6, ay + 6, sw * 0.2, 1, rgba(C.lit, 0.18));
      }
    } else if (kind === 'chimney') {
      px(ctx, ax, ay + 6, 3, 10, '#1f1c26');
      px(ctx, ax + 10, ay + 6, 3, 10, '#1f1c26');
      px(ctx, ax - 1, ay, 16, 8, '#4a3a38');
      px(ctx, ax, ay + 1, 14, 5, '#5c4842');
      px(ctx, ax - 2, ay - 2, 18, 3, '#38312f');
      px(ctx, ax, ay - 4, 14, 2, '#2b2624');
      for (let i = 0; i < 4; i++) px(ctx, ax + 1 + i * 4, ay + 1, 1, 5, '#453330');
    } else if (kind === 'duct') {
      px(ctx, ax - 2, ay - 2, 30, 14, '#3c3947');
      px(ctx, ax, ay, 26, 10, '#4b4857');
      px(ctx, ax, ay, 26, 2, '#5d5a6b');
      for (let i = 0; i < 4; i++) px(ctx, ax + 2 + i * 6, ay + 2, 2, 8, '#34313e');
      px(ctx, ax + 4, ay + 12, 12, 3, '#2c2a35');
    } else if (kind === 'dish') {
      px(ctx, ax + 4, ay + 7, 2, 8, '#3f3c4a');
      circle(ctx, ax + 5, ay + 5, 6, '#5b5867');
      circle(ctx, ax + 5, ay + 5, 4, '#7b7788');
      circle(ctx, ax + 5, ay + 5, 2, '#494656');
    }
  }

  // caged service bulbs along the parapet
  for (let x = 60; x < w - 30; x += 150) {
    const by = 20;
    px(ctx, x, by, 2, 3, '#2a2733');
    px(ctx, x - 3, by + 3, 8, 2, '#38343f');
    px(ctx, x - 2, by + 5, 6, 3, '#ffce8a');
    px(ctx, x - 1, by + 6, 4, 1, '#fff0cc');
    const bg = ctx.createRadialGradient(x + 1, by + 6, 0, x + 1, by + 6, 26);
    bg.addColorStop(0, 'rgba(255,200,130,0.26)');
    bg.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(x - 26, by - 20, 54, 54);
  }

  if (opts.waterTower) {
    const tw = 52, th = 40;
    const tx = opts.waterTower.x ?? Math.round(w * 0.7);
    const ty = opts.waterTower.y ?? Math.round(d * 0.5);
    for (const lx of [tx + 4, tx + tw - 10]) {
      line(ctx, lx, ty + th, lx - 5, ty + th + 26, '#37333f');
      line(ctx, lx + 2, ty + th, lx + 5, ty + th + 26, '#37333f');
    }
    line(ctx, tx + 6, ty + th + 3, tx + tw - 8, ty + th + 22, '#2e2b36');
    line(ctx, tx + tw - 8, ty + th + 3, tx + 6, ty + th + 22, '#2e2b36');
    ctx.fillStyle = rgba('#0b0a10', 0.38);
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2 + 4, ty + th + 28, tw * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, tx, ty + 8, tw, th - 8, '#5a4038');
    px(ctx, tx + 2, ty + 11, tw - 4, th - 14, '#6b4c40');
    for (let yy = ty + 14; yy < ty + th; yy += 6) px(ctx, tx + 2, yy, tw - 4, 1, '#4d332c');
    for (const yy of [ty + 12, ty + 24, ty + 34]) px(ctx, tx - 1, yy, tw + 2, 2, '#43302b');
    for (let i = 0; i < 14; i++) {
      const ww = Math.round(tw * (i / 14));
      px(ctx, tx + Math.round((tw - ww) / 2), ty + 8 - i, ww, 1, i % 3 === 0 ? '#3c383f' : '#4a454d');
    }
    px(ctx, tx + Math.round(tw / 2) - 1, ty - 8, 2, 6, '#57515a');
    for (let yy = ty + 10; yy < ty + th + 24; yy += 3) px(ctx, tx + tw - 5, yy, 4, 1, '#2f2b35');
    px(ctx, tx + tw - 6, ty + 10, 1, th + 14, '#3b3640');
    px(ctx, tx + tw - 1, ty + 10, 1, th + 14, '#3b3640');
  }

  // stair bulkhead / penthouse block, the kind that always sits mid-roof
  if (opts.penthouse) {
    const pw = rng.int(90, 130), ph = rng.int(58, 80);
    const px0 = (opts.penthouse.x ?? Math.round(w * 0.45));
    const py0 = (opts.penthouse.y ?? Math.round(d * 0.45));
    ctx.fillStyle = rgba('#0b0a10', 0.35);
    ctx.fillRect(px0 + 6, py0 + 8, pw, ph);
    // brick body
    px(ctx, px0, py0, pw, ph, '#3a2b2a');
    for (let by = py0 + 2; by < py0 + ph; by += 4) {
      for (let bx = px0 + (Math.floor(by / 4) % 2 ? 0 : 4); bx < px0 + pw; bx += 8) {
        px(ctx, bx, by, 7, 3, rng.pick(['#4a3532', '#523a35', '#43302e', '#573d38']));
      }
    }
    // roof cap with a slight overhang
    px(ctx, px0 - 3, py0 - 4, pw + 6, 6, '#514a5a');
    px(ctx, px0 - 3, py0 - 4, pw + 6, 1, '#6b6479');
    px(ctx, px0 - 1, py0 + 2, pw + 2, 2, 'rgba(10,8,14,0.45)');
    // little lit windows facing the street (north side)
    for (let wx = px0 + 12; wx < px0 + pw - 14; wx += 26) {
      px(ctx, wx, py0 + 12, 14, 12, '#221c22');
      px(ctx, wx + 1, py0 + 13, 12, 10, rng.chance(0.5) ? '#ffca85' : '#2d3a52');
      if (rng.chance(0.5)) px(ctx, wx + 1, py0 + 13, 12, 1, '#ffe9c2');
      px(ctx, wx + 6, py0 + 13, 1, 10, '#221c22');
    }
    // door + step on the street side
    px(ctx, px0 + Math.round(pw / 2) - 8, py0 + ph - 26, 16, 26, '#1c1519');
    px(ctx, px0 + Math.round(pw / 2) - 7, py0 + ph - 25, 14, 24, '#3a2a28');
    px(ctx, px0 + Math.round(pw / 2) + 3, py0 + ph - 14, 2, 3, '#c9a55a');
    px(ctx, px0 + Math.round(pw / 2) - 11, py0 + ph, 22, 4, '#5a5666');
    // wall lamp over the door
    px(ctx, px0 + Math.round(pw / 2) - 11, py0 + ph - 34, 3, 3, '#ffd79b');
    const dg = ctx.createRadialGradient(px0 + Math.round(pw / 2) - 10, py0 + ph - 32, 0, px0 + Math.round(pw / 2) - 10, py0 + ph - 32, 22);
    dg.addColorStop(0, 'rgba(255,205,140,0.3)');
    dg.addColorStop(1, 'rgba(255,205,140,0)');
    ctx.fillStyle = dg;
    ctx.fillRect(px0 + Math.round(pw / 2) - 34, py0 + ph - 56, 48, 48);
    // vent fan on the cap
    px(ctx, px0 + pw - 30, py0 - 10, 18, 8, '#454152');
    px(ctx, px0 + pw - 29, py0 - 9, 16, 6, '#2c2934');
    px(ctx, px0 + pw - 24, py0 - 8, 6, 4, '#4f4b5c');
  }

  // long pipes crossing the roof
  for (let i = 0; i < Math.max(1, Math.floor(w / 260)); i++) {
    const py0 = rng.int(60, d - 60);
    const px0 = rng.int(0, 40);
    const len = rng.int(80, 180);
    px(ctx, px0, py0, len, 6, '#3a3744');
    px(ctx, px0, py0, len, 2, '#524e60');
    px(ctx, px0, py0 + 5, len, 1, '#232029');
    for (let bx = px0 + 10; bx < px0 + len; bx += 34) px(ctx, bx, py0 - 2, 4, 9, '#4a4656');
  }

  // rain puddles on the tar paper
  for (let i = 0; i < Math.max(1, Math.floor(w / 240)); i++) {
    const px0 = rng.int(30, w - 80), py0 = rng.int(40, d - 50);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(px0, py0, rng.int(18, 34), rng.int(7, 13), 0, 0, Math.PI * 2);
    ctx.clip();
    const pg = ctx.createLinearGradient(px0, py0 - 14, px0, py0 + 14);
    pg.addColorStop(0, '#3d4a63');
    pg.addColorStop(0.5, '#232b3c');
    pg.addColorStop(1, '#161b26');
    ctx.fillStyle = pg;
    ctx.fillRect(px0 - 40, py0 - 20, 80, 40);
    px(ctx, px0 - 14, py0 - 6, 10, 1, 'rgba(255,205,140,0.22)');
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,95,120,0.5)';
    ctx.beginPath();
    ctx.ellipse(px0, py0, 24, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (opts.shed) {
    const sw = 50, sh = 34;
    const sx = opts.shed.x ?? Math.round(w * 0.14);
    const sy = opts.shed.y ?? Math.round(d * 0.4);
    ctx.fillStyle = rgba('#0b0a10', 0.38);
    ctx.fillRect(sx + 5, sy + 6, sw, sh);
    px(ctx, sx, sy, sw, sh, '#3b3642');
    px(ctx, sx, sy, sw, 4, '#4c4754');
    px(ctx, sx + 3, sy + 6, sw - 6, sh - 9, '#33303b');
    px(ctx, sx + 9, sy + 14, 20, sh - 17, '#272430');
    px(ctx, sx + 33, sy + 14, 8, sh - 17, '#272430');
    px(ctx, sx + 3, sy + sh - 3, sw - 6, 3, '#1c1a23');
  }

  if (opts.sign) {
    const label = opts.sign.text;
    const sc = opts.sign.scale || 2;
    const tw = textWidth(label, sc);
    const sx = Math.round((w - tw) / 2);
    const sy = 14;
    px(ctx, sx - 8, sy - 6, tw + 16, 7 * sc + 12, '#17131b');
    px(ctx, sx - 7, sy - 5, tw + 14, 7 * sc + 10, '#231c24');
    px(ctx, sx - 7, sy - 5, tw + 14, 1, '#4a3f48');
    drawText(ctx, label, sx, sy, opts.sign.color || C.neonPink, sc);
    const g = ctx.createRadialGradient(sx + tw / 2, sy + 5, 0, sx + tw / 2, sy + 5, tw * 0.8);
    g.addColorStop(0, rgba(opts.sign.color || C.neonPink, 0.2));
    g.addColorStop(1, rgba(opts.sign.color || C.neonPink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - tw, sy - 40, tw * 3, 100);
  }

  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, 0, d);
  g.addColorStop(0, rgba('#0c0a12', 0.22));
  g.addColorStop(0.25, rgba('#0c0a12', 0.02));
  g.addColorStop(1, rgba('#0c0a12', 0.2));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, d);
  // cool moonlight rim along the top edge of the tar paper
  const rim = ctx.createLinearGradient(0, 14, 0, 44);
  rim.addColorStop(0, 'rgba(150,160,205,0.14)');
  rim.addColorStop(1, 'rgba(150,160,205,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 14, w, 30);
  ctx.globalCompositeOperation = 'source-over';

  return { canvas: c, width: w, height: d };
}
