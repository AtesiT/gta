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
  // stoop: a stone landing with two steps and low railings, blending with the kerb
  const sw = dw + 14;
  const sx = x + Math.floor((w - sw) / 2);
  const sy = (opts.baseY ?? (y + h)) - 12;
  const stepsH = 12;
  px(ctx, sx - 2, sy, sw + 4, stepsH + 2, '#2f2b38');
  px(ctx, sx, sy, sw, 3, '#7a7488');
  px(ctx, sx, sy, sw, 1, '#948ea2');
  px(ctx, sx + 1, sy + 3, sw - 2, 3, '#6b6679');
  px(ctx, sx + 2, sy + 6, sw - 4, 3, '#5a5568');
  px(ctx, sx, sy + 2, sw, 1, 'rgba(20,16,26,0.35)');
  px(ctx, sx, sy + 5, sw, 1, 'rgba(20,16,26,0.35)');
  px(ctx, sx + 2, sy + stepsH, sw - 4, 1, 'rgba(12,10,16,0.5)');
  // kerb shadow to the sides of the stoop
  px(ctx, sx - 2, sy + 2, 2, stepsH, '#3b3746');
  px(ctx, sx + sw, sy + 2, 2, stepsH, '#3b3746');
  // railings: posts + handrail, dark metal with a lit edge
  for (const rx of [sx + 3, sx + sw - 5]) {
    px(ctx, rx, sy - 14, 2, 14 + stepsH, '#23202b');
    px(ctx, rx, sy - 14, 1, 14 + stepsH, '#3a3644');
    px(ctx, rx - 1, sy - 15, 4, 2, '#2e2a36');
    for (let i = 0; i < 3; i++) px(ctx, rx, sy - 7 + i * 4, 2, 1, '#302c38');
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
      drawStoreWindow(ctx, sx, awnY + awH + 5, sw, H - (awnY + awH) - 16, rng, bay.interior || 'shop', bay.warm !== false);
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
      drawDoorBay(ctx, bx, groundTop + 46, bw, H - groundTop - 74, rng, { ...bay, baseY: H });
    } else if (bay.type === 'plain') {
      px(ctx, bx + 10, H - 12 - 40, Math.min(26, bw - 18), 40, '#261d20');
      px(ctx, bx + 12, H - 12 - 38, Math.min(22, bw - 22), 36, '#33272a');
      for (let i = 0; i < 5; i++) px(ctx, bx + 14 + i * 2, H - 12 - 32, 1, 1, '#4a3a3c');
      px(ctx, bx + Math.round(bw / 2) - 6, H - 12 - 18, 12, 14, rgba('#0e0c10', 0.3));
    }
    px(ctx, bx + bw - 3, groundTop, 2, FACADE.groundH, rgba('#2a1c1e', 0.3));
    bx += bw;
  }

  // posters / graffiti pasted on the wall above the plinth
  for (let i = 0; i < width / 90; i++) {
    const gx = rng.int(4, Math.max(5, width - 14));
    const gy = rng.int(groundTop + 40, H - 34);
    // don't paste over a door bay
    const overDoor = bays.some((bay, idx) => {
      let acc = 0;
      for (let k = 0; k < idx; k++) acc += bays[k].w;
      const bx0 = Math.round((acc * width) / totalW);
      const bw = Math.round((bay.w * width) / totalW);
      return bay.type === 'door' && gx > bx0 + bw * 0.25 && gx < bx0 + bw * 0.75;
    });
    if (overDoor) continue;
    const shade2 = box => box;
    const y = Math.min(H - 22, gy);
    if (rng.chance(0.55)) {
      // torn poster: paper with a print block and a couple of text lines
      const pw = rng.int(7, 9), ph = rng.int(9, 12);
      px(ctx, gx + 1, y + 1, pw, ph, 'rgba(14,10,16,0.45)');
      px(ctx, gx, y, pw, ph, rng.pick(['#a89f8c', '#8a7a5e', '#b3ac9a']));
      px(ctx, gx, y, pw, 1, 'rgba(240,236,222,0.25)');
      px(ctx, gx + 1, y + 1, pw - 2, Math.max(2, Math.round(ph * 0.45)), 'rgba(52,44,48,0.7)');
      for (let l = 0; l < 2; l++) px(ctx, gx + 1, y + ph - 4 + l * 2, pw - 2, 1, 'rgba(70,62,58,0.6)');
      // peeling corner
      px(ctx, gx + pw - 2, y + ph - 2, 2, 2, 'rgba(20,16,22,0.5)');
    } else {
      // spray-paint tag
      ctx.fillStyle = rgba(rng.pick(['#7a4a8a', '#3a6a8a', '#8a4a3a', '#4a7a5a']), 0.4);
      for (let l = 0; l < 9; l++) ctx.fillRect(gx + Math.floor(Math.sin(l * 0.9) * 3) + 3, y + l, rng.int(2, 5), 1);
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

