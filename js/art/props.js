// Street furniture and vehicles, drawn once into small offscreen canvases.
import { createCanvas, ctx2d, makeRng, px, line, circle, shade, rgba } from '../util.js';
import { C } from '../palette.js';

function make(w, h, draw) {
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  draw(ctx);
  return c;
}

export function treeSprite(seed = 1, kind = 'round') {
  const rng = makeRng(seed);
  const w = 74, h = 104;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const cx = w / 2;
  // ground shadow
  const sg = ctx.createRadialGradient(cx, h - 12, 2, cx, h - 12, 30);
  sg.addColorStop(0, rgba('#07060c', 0.55));
  sg.addColorStop(1, rgba('#07060c', 0));
  ctx.fillStyle = sg;
  ctx.fillRect(0, h - 42, w, 42);
  // planter / tree grate
  px(ctx, cx - 15, h - 16, 30, 12, '#2a2732');
  px(ctx, cx - 15, h - 16, 30, 2, '#464250');
  for (let i = 0; i < 4; i++) px(ctx, cx - 12 + i * 7, h - 14, 2, 9, '#1c1a22');

  if (kind === 'conifer') {
    px(ctx, cx - 3, h - 40, 6, 26, C.trunk);
    px(ctx, cx - 2, h - 40, 2, 26, '#5a4032');
    const layers = 4;
    for (let l = 0; l < layers; l++) {
      const ly = h - 38 - l * 15;
      const lw = 30 - l * 5;
      for (let y = 0; y < 18; y++) {
        const ww = Math.round((lw * (y + 1)) / 18);
        const col = y < 2 ? '#4d7a3f' : y < 10 ? '#2f5733' : '#24452c';
        px(ctx, cx - ww, ly + y, ww * 2, 1, col);
        // needle texture
        if (y % 3 === 0) {
          px(ctx, cx - ww, ly + y, 1, 1, '#3c6a3c');
          px(ctx, cx + ww - 1, ly + y, 1, 1, '#1c3524');
        }
      }
    }
    px(ctx, cx - 1, h - 100, 2, 8, '#3d5c34');
  } else if (kind === 'bush') {
    for (let i = 0; i < 6; i++) {
      circle(ctx, cx - 12 + i * 5, h - 20 - rng.int(0, 6), rng.int(7, 10), rng.pick(C.foliage));
    }
    for (let i = 0; i < 30; i++) {
      px(ctx, cx - 16 + rng.int(0, 32), h - 30 + rng.int(0, 16), 1, 1, rng.pick(['#4d7f45', '#5d8f4d']));
    }
  } else {
    // trunk with branches
    px(ctx, cx - 3, h - 46, 7, 34, C.trunk);
    px(ctx, cx - 2, h - 46, 2, 34, '#5b4334');
    line(ctx, cx, h - 44, cx - 12, h - 60, C.trunk);
    line(ctx, cx, h - 40, cx + 13, h - 62, C.trunk);
    px(ctx, cx - 9, h - 20, 4, 6, '#3a2a24');
    // canopy blobs
    const blobs = [
      [cx, h - 72, 26], [cx - 18, h - 62, 15], [cx + 19, h - 62, 15],
      [cx - 10, h - 84, 16], [cx + 12, h - 84, 15], [cx, h - 58, 14],
    ];
    for (const [bx, by, br] of blobs) {
      circle(ctx, bx, by, br, C.foliage[0]);
    }
    for (const [bx, by, br] of blobs) {
      circle(ctx, bx - 1, by - 2, br - 3, C.foliage[1]);
    }
    for (const [bx, by, br] of blobs) {
      circle(ctx, bx - 2, by - 4, Math.max(2, br - 8), C.foliage[2]);
    }
    for (let i = 0; i < 110; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 30;
      const bx = cx + Math.cos(a) * r;
      const by = h - 72 + Math.sin(a) * r * 0.8;
      if (r > 26) continue;
      px(ctx, bx, by, 1, 1, rng.pick(['#3f6a3c', '#4d7a44', '#2b4a30', '#5b8b4b']));
    }
    // moonlit rim on the upper left
    for (let i = 0; i < 40; i++) {
      const a = Math.PI * (1.05 + rng() * 0.55);
      const r = 24 + rng() * 4;
      px(ctx, cx + Math.cos(a) * r, h - 74 + Math.sin(a) * r * 0.8, 1, 1, rgba('#9ec97a', 0.5));
    }
  }
  return { canvas: c, w, h, ax: cx, ay: h - 6 };
}

export function lampSprite(seed = 1) {
  const w = 54, h = 132;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const cx = w / 2;
  // shadow
  const sg = ctx.createRadialGradient(cx, h - 4, 1, cx, h - 4, 20);
  sg.addColorStop(0, rgba('#07060c', 0.5));
  sg.addColorStop(1, rgba('#07060c', 0));
  ctx.fillStyle = sg;
  ctx.fillRect(0, h - 18, w, 18);
  // base
  px(ctx, cx - 9, h - 12, 18, 10, '#26232e');
  px(ctx, cx - 7, h - 14, 14, 4, '#33303c');
  px(ctx, cx - 11, h - 5, 22, 3, '#1c1a22');
  // pole
  px(ctx, cx - 3, 30, 6, h - 42, '#2f2c38');
  px(ctx, cx - 3, 30, 2, h - 42, '#4a4656');
  px(ctx, cx + 2, 30, 1, h - 42, '#1e1c25');
  // rings
  for (const yy of [h - 20, h - 46, 62]) px(ctx, cx - 5, yy, 10, 3, '#3a3746');
  // decorative arm curving over the street (to the right)
  const acx = cx + 20, acy = 28;
  for (let a = Math.PI; a >= Math.PI * 0.15; a -= 0.06) {
    const xx = acx + Math.cos(a) * 20;
    const yy = acy + 34 + Math.sin(a) * 34;
    px(ctx, xx, yy, 3, 3, '#33303c');
  }
  // lantern
  const lx = acx + 12, ly = 26;
  px(ctx, lx - 1, ly - 6, 3, 6, '#3a3746');
  px(ctx, lx - 9, ly - 2, 19, 3, '#3a3746');
  px(ctx, lx - 8, ly + 1, 17, 14, '#3f3a46');
  px(ctx, lx - 6, ly + 3, 13, 10, '#ffdf9f');
  px(ctx, lx - 4, ly + 4, 9, 5, '#fff4d2');
  px(ctx, lx - 9, ly + 15, 19, 3, '#2b2833');
  px(ctx, lx - 5, ly + 18, 10, 2, '#221f29');
  // hanging banner on the pole
  px(ctx, cx + 4, 78, 12, 26, '#5c3a3a');
  px(ctx, cx + 4, 78, 12, 2, '#7a4d45');
  for (let i = 0; i < 3; i++) px(ctx, cx + 6, 84 + i * 5, 8, 2, '#c9b48a');
  return { canvas: c, w, h, ax: cx, ay: h - 2 };
}

export function benchSprite(seed = 1) {
  const w = 96, h = 58;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = makeRng(seed);
  // shadow
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(10, h - 8, w - 14, 6);
  // legs
  for (const lx of [8, 40, 72, 86]) px(ctx, lx, h - 22, 4, 18, '#26232c');
  // backrest
  px(ctx, 4, 4, w - 10, 5, '#6b4a34');
  px(ctx, 4, 4, w - 10, 1, '#8d6547');
  for (let x = 6; x < w - 8; x += 9) px(ctx, x, 10, 6, 16, '#5b3d2a');
  px(ctx, 4, 26, w - 10, 3, '#4a3124');
  // seat slats
  px(ctx, 2, 30, w - 4, 6, '#7a5539');
  px(ctx, 2, 30, w - 4, 1, '#986c48');
  px(ctx, 2, 37, w - 4, 6, '#6b4a34');
  px(ctx, 2, 37, w - 4, 1, '#8d6547');
  px(ctx, 2, 44, w - 4, 3, '#3c2820');
  // armrest
  px(ctx, 4, 26, 4, 20, '#2b2733');
  px(ctx, w - 10, 26, 4, 20, '#2b2733');
  // leaves on the seat
  for (let i = 0; i < 4; i++) px(ctx, rng.int(10, w - 16), 36 + rng.int(0, 6), 2, 1, '#5c7a44');
  return { canvas: c, w, h, ax: w / 2, ay: h - 4 };
}

export function trashSprite() {
  const w = 28, h = 40;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(3, h - 5, w - 6, 4);
  px(ctx, 5, 8, 18, 27, '#2b4436');
  px(ctx, 5, 8, 4, 27, '#375444');
  px(ctx, 21, 8, 2, 27, '#1d3128');
  for (let y = 12; y < 34; y += 4) px(ctx, 7, y, 14, 1, '#22392e');
  px(ctx, 3, 4, 22, 5, '#3c5b49');
  px(ctx, 3, 4, 22, 1, '#57765f');
  px(ctx, 10, 1, 8, 3, '#2b4436');
  // litter
  px(ctx, 24, h - 8, 3, 2, '#b9b09a');
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function hydrantSprite() {
  const w = 24, h = 32;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.45);
  ctx.fillRect(4, h - 4, 16, 3);
  px(ctx, 6, h - 10, 12, 8, '#8d2f2c');
  px(ctx, 7, h - 10, 3, 8, '#b0423a');
  px(ctx, 8, 10, 8, 14, '#a3352f');
  px(ctx, 9, 10, 2, 14, '#c4493c');
  px(ctx, 6, 12, 12, 3, '#7c2724');
  px(ctx, 3, 14, 4, 5, '#8d2f2c');
  px(ctx, 17, 14, 4, 5, '#8d2f2c');
  px(ctx, 7, 6, 10, 4, '#8d2f2c');
  circle(ctx, 12, 5, 3, '#b0423a');
  px(ctx, 11, 1, 2, 3, '#7c2724');
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function mailboxSprite() {
  const w = 30, h = 40;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(5, h - 4, 20, 3);
  px(ctx, 8, h - 14, 3, 11, '#26232c');
  px(ctx, 19, h - 14, 3, 11, '#26232c');
  px(ctx, 4, 10, 22, 16, '#2f4a6b');
  px(ctx, 4, 10, 22, 3, '#3f6288');
  px(ctx, 6, 13, 18, 3, '#16283c');
  px(ctx, 8, 20, 14, 3, '#8d9aa8');
  px(ctx, 4, 26, 22, 2, '#1f3149');
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function newsboxSprite(seed = 1) {
  const w = 26, h = 36;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const col = seed % 2 ? '#7a3a34' : '#2f5a6b';
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(4, h - 4, 18, 3);
  px(ctx, 5, h - 12, 3, 9, '#24222b');
  px(ctx, 18, h - 12, 3, 9, '#24222b');
  px(ctx, 3, 4, 20, 24, col);
  px(ctx, 3, 4, 20, 2, shade(col, 22));
  px(ctx, 6, 8, 14, 12, '#1a1c24');
  px(ctx, 7, 9, 12, 4, '#c9c2ae');
  px(ctx, 7, 14, 8, 2, '#8d8676');
  px(ctx, 6, 22, 14, 3, shade(col, -18));
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function coneSprite() {
  const w = 20, h = 22;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(2, h - 3, 16, 2);
  px(ctx, 2, h - 4, 16, 3, '#c4562f');
  px(ctx, 6, 8, 8, 10, '#d4612f');
  px(ctx, 4, 16, 12, 3, '#b8502a');
  px(ctx, 7, 10, 6, 3, '#e8e1cf');
  px(ctx, 8, 2, 4, 7, '#d4612f');
  px(ctx, 9, 0, 2, 3, '#e8e1cf');
  return { canvas: c, w, h, ax: w / 2, ay: h - 1 };
}

export function carSprite(seed = 1, color) {
  const w = 96, h = 46;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = makeRng(seed);
  const body = color || rng.pick(C.carColors);
  const light = shade(body, 26);
  const dark = shade(body, -30);
  // shadow
  ctx.fillStyle = rgba('#05050a', 0.55);
  ctx.beginPath();
  ctx.ellipse(48, h - 5, 43, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  px(ctx, 4, 18, 88, 17, body);
  px(ctx, 4, 18, 88, 4, light);
  px(ctx, 4, 31, 88, 4, dark);
  // hood + trunk slopes
  px(ctx, 2, 22, 4, 9, shade(body, -10));
  px(ctx, 90, 22, 4, 9, shade(body, -10));
  // cabin
  px(ctx, 26, 8, 44, 12, body);
  px(ctx, 26, 8, 44, 3, light);
  // windows
  px(ctx, 29, 10, 18, 8, '#1d2a3a');
  px(ctx, 49, 10, 18, 8, '#1d2a3a');
  px(ctx, 29, 10, 18, 2, '#31465f');
  px(ctx, 49, 10, 18, 2, '#31465f');
  px(ctx, 47, 10, 2, 8, body);
  // door lines
  px(ctx, 47, 18, 1, 13, shade(body, -22));
  px(ctx, 28, 19, 1, 12, shade(body, -18));
  // wheels
  for (const wx of [16, 72]) {
    circle(ctx, wx + 7, 35, 8, '#141218');
    circle(ctx, wx + 7, 35, 5, '#2a2731');
    circle(ctx, wx + 7, 35, 2, '#4a4654');
    px(ctx, wx - 1, 27, 16, 4, '#1c1a22');
  }
  // lights
  px(ctx, 2, 24, 4, 5, '#ffe6b8');
  px(ctx, 90, 24, 4, 5, '#d9534a');
  px(ctx, 2, 24, 4, 1, '#fff6de');
  // bumpers
  px(ctx, 3, 30, 90, 3, '#2a2833');
  // scratches / reflections
  for (let i = 0; i < 5; i++) px(ctx, rng.int(10, 84), 22 + rng.int(0, 8), rng.int(2, 7), 1, rgba('#ffffff', 0.08));
  return { canvas: c, w, h, ax: w / 2, ay: h - 3 };
}

export function vanSprite(seed = 1) {
  const w = 104, h = 54;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const body = '#8d8a90', light = '#a5a2a8', dark = '#5e5b64';
  ctx.fillStyle = rgba('#05050a', 0.55);
  ctx.beginPath();
  ctx.ellipse(52, h - 5, 47, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 4, 12, 84, 28, body);
  px(ctx, 4, 12, 84, 5, light);
  px(ctx, 4, 35, 84, 5, dark);
  // cab front
  px(ctx, 84, 16, 14, 22, light);
  px(ctx, 86, 18, 10, 12, '#1d2a3a');
  px(ctx, 88, 30, 10, 5, shade(body, 6));
  // side panel
  px(ctx, 10, 18, 70, 14, '#6f6c75');
  px(ctx, 10, 18, 70, 2, '#8f8c96');
  px(ctx, 12, 20, 66, 10, '#5c5a64');
  // signage
  px(ctx, 18, 21, 54, 8, '#242630');
  for (let i = 0; i < 22; i++) px(ctx, 21 + i * 2.4, 23 + (i % 2), 1, 4, i % 3 ? '#c8d6e6' : '#7f97b4');
  // wheels
  for (const wx of [18, 78]) {
    circle(ctx, wx + 8, 41, 9, '#141218');
    circle(ctx, wx + 8, 41, 6, '#2a2731');
    circle(ctx, wx + 8, 41, 2, '#4a4654');
    px(ctx, wx - 1, 33, 18, 4, '#1c1a22');
  }
  px(ctx, 3, 24, 3, 6, '#ffe6b8');
  px(ctx, 96, 24, 4, 5, '#d9534a');
  px(ctx, 3, 35, 98, 3, '#2a2833');
  return { canvas: c, w, h, ax: w / 2, ay: h - 3 };
}

export function trafficLightSprite() {
  const w = 30, h = 92;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(8, h - 4, 16, 3);
  px(ctx, 12, 24, 6, h - 28, '#2c2a35');
  px(ctx, 12, 24, 2, h - 28, '#464353');
  px(ctx, 9, 6, 13, 30, '#1f1d26');
  px(ctx, 9, 6, 13, 2, '#3a3746');
  circle(ctx, 15, 12, 4, '#4a1f22');
  circle(ctx, 15, 21, 4, '#4a3d1e');
  circle(ctx, 15, 30, 4, '#3fae5a');
  circle(ctx, 15, 30, 2, '#7de89b');
  px(ctx, 4, 34, 22, 4, '#26232c');
  px(ctx, 4, h - 22, 3, 20, '#26232c');
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function planterSprite(seed = 1) {
  const w = 42, h = 46;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = makeRng(seed);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(4, h - 5, 34, 4);
  px(ctx, 4, h - 18, 34, 15, '#6b5a4a');
  px(ctx, 4, h - 18, 34, 3, '#8a7562');
  px(ctx, 6, h - 15, 30, 10, '#4f4236');
  for (let i = 0; i < 5; i++) {
    circle(ctx, 9 + i * 6, h - 20 - rng.int(0, 6), rng.int(4, 7), rng.pick(C.foliage));
  }
  for (let i = 0; i < 14; i++) px(ctx, 7 + rng.int(0, 28), h - 28 + rng.int(0, 12), 1, 1, '#4d7f45');
  return { canvas: c, w, h, ax: w / 2, ay: h - 2 };
}

export function bollardSprite() {
  const w = 14, h = 24;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.4);
  ctx.fillRect(2, h - 3, 10, 2);
  px(ctx, 4, 6, 7, 16, '#33303c');
  px(ctx, 4, 6, 2, 16, '#4c4959');
  px(ctx, 3, 2, 9, 4, '#413e4c');
  px(ctx, 5, 0, 5, 2, '#4c4959');
  return { canvas: c, w, h, ax: w / 2, ay: h - 1 };
}

export function stallSprite(seed = 1) {
  // little street food cart under a striped canopy
  const w = 78, h = 76;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = rgba('#07060c', 0.45);
  ctx.fillRect(6, h - 6, w - 12, 6);
  px(ctx, 10, h - 30, 58, 24, '#5a4636');
  px(ctx, 10, h - 30, 58, 3, '#7a6248');
  px(ctx, 14, h - 26, 22, 14, '#2b2019');
  px(ctx, 40, h - 26, 22, 12, '#3c2c22');
  for (let i = 0; i < 6; i++) px(ctx, 42 + i * 3, h - 24, 2, 8, '#c9a86a');
  // canopy
  px(ctx, 4, 14, 70, 5, '#3a2c24');
  for (let x = 4; x < 74; x += 10) {
    px(ctx, x, 19, 8, 14, (Math.floor(x / 10) % 2) ? '#b2453d' : '#ded3bd');
  }
  for (let x = 4; x < 74; x += 10) px(ctx, x, 33, 8, 3, (Math.floor(x / 10) % 2) ? '#b2453d' : '#ded3bd');
  px(ctx, 6, 12, 66, 2, '#4a3a30');
  // poles
  px(ctx, 8, 33, 3, h - 63, '#3d3128');
  px(ctx, 67, 33, 3, h - 63, '#3d3128');
  // warm bulb
  px(ctx, 34, 38, 5, 5, '#ffe2a8');
  // steam
  for (let i = 0; i < 8; i++) px(ctx, 20 + (i * 5) % 20, 42 - i * 2, 2, 2, rgba('#cfd6e0', 0.12));
  return { canvas: c, w, h, ax: w / 2, ay: h - 3 };
}

export function fountainSprite(seed = 1) {
  // stone basin, water, pedestal and statue, drawn so the player can walk behind it
  const w = 96, h = 84;
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  const rng = makeRng(seed);
  const cx = w / 2, cy = h - 34;
  // shadow
  const sg = ctx.createRadialGradient(cx + 4, cy + 10, 2, cx + 4, cy + 10, 44);
  sg.addColorStop(0, rgba('#050409', 0.45));
  sg.addColorStop(1, rgba('#050409', 0));
  ctx.fillStyle = sg;
  ctx.fillRect(0, cy - 20, w, 46);
  // basin
  const r = 32, ry = 22;
  ctx.fillStyle = '#3f3b4b';
  ctx.beginPath(); ctx.ellipse(cx, cy, r + 5, ry + 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#736d81';
  ctx.beginPath(); ctx.ellipse(cx, cy - 1, r + 3, ry + 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8b8598';
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, r + 1, ry, 0, 0, Math.PI * 2); ctx.fill();
  // water
  const wg = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  wg.addColorStop(0, '#5f7f92');
  wg.addColorStop(0.55, '#3d5b6d');
  wg.addColorStop(1, '#26343f');
  ctx.fillStyle = wg;
  ctx.beginPath(); ctx.ellipse(cx, cy - 1, r - 2, ry - 2, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, rr = rng() * (r - 5);
    px(ctx, cx + Math.cos(a) * rr, cy - 1 + Math.sin(a) * rr * 0.68, rng.int(2, 6), 1, rgba('#a9d2e8', rng.range(0.2, 0.45)));
  }
  px(ctx, cx - 14, cy - 10, 10, 1, rgba('#ffd6a0', 0.35));
  // rim highlight
  ctx.strokeStyle = 'rgba(215,210,230,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, r + 1, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // pedestal + column
  px(ctx, cx - 9, cy - 26, 18, 22, '#5c5668');
  px(ctx, cx - 9, cy - 26, 18, 2, '#847e92');
  px(ctx, cx - 7, cy - 6, 14, 4, '#4a4656');
  px(ctx, cx - 6, cy - 24, 12, 18, '#6b6479');
  px(ctx, cx - 6, cy - 24, 2, 18, '#847e92');
  // upper bowl
  px(ctx, cx - 12, cy - 32, 24, 5, '#7e788c');
  px(ctx, cx - 12, cy - 32, 24, 1, '#a29bb0');
  px(ctx, cx - 10, cy - 31, 20, 3, '#3d5b6d');
  // statue
  px(ctx, cx - 2, cy - 44, 4, 12, '#6b6479');
  px(ctx, cx - 2, cy - 44, 1, 12, '#8b8598');
  circle(ctx, cx, cy - 48, 4, '#7e788c');
  circle(ctx, cx - 1, cy - 49, 2, '#a29bb0');
  px(ctx, cx - 6, cy - 40, 3, 2, '#7e788c');
  px(ctx, cx + 3, cy - 41, 3, 3, '#7e788c');
  // water streams falling from the top bowl
  for (const dx of [-7, -2, 3, 8]) {
    for (let yy = cy - 28; yy < cy - 8; yy++) {
      if (rng.chance(0.75)) px(ctx, cx + dx, yy, 1, 1, rgba('#b6dcef', 0.35));
    }
  }
  // faint glow from the wet stone
  const gl = ctx.createRadialGradient(cx, cy - 14, 2, cx, cy - 14, 44);
  gl.addColorStop(0, rgba('#a8d6ea', 0.16));
  gl.addColorStop(1, rgba('#a8d6ea', 0));
  ctx.fillStyle = gl;
  ctx.fillRect(cx - 46, cy - 60, 92, 92);
  return { canvas: c, w, h, ax: cx, ay: cy + 24 };
}

export const PROP_MAKERS = {
  tree: treeSprite,
  lamp: lampSprite,
  bench: benchSprite,
  trash: trashSprite,
  hydrant: hydrantSprite,
  mailbox: mailboxSprite,
  newsbox: newsboxSprite,
  cone: coneSprite,
  car: carSprite,
  van: vanSprite,
  trafficLight: trafficLightSprite,
  planter: planterSprite,
  bollard: bollardSprite,
  stall: stallSprite,
  fountain: fountainSprite,
};

const cache = new Map();
export function getProp(kind, seed = 1, arg) {
  const key = `${kind}:${seed}:${arg ?? ''}`;
  if (!cache.has(key)) {
    const maker = PROP_MAKERS[kind];
    if (!maker) throw new Error('unknown prop ' + kind);
    cache.set(key, maker(seed, arg));
  }
  return cache.get(key);
}
