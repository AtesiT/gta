// Rooftops for the south side of the street. Seen from above, but painted the same
// way as the facades (a little bit of the front face plus the top surface) so the
// blocks read as real buildings: parapet, gutter, tar paper, water towers, stair
// bulkheads, chimneys, skylights, AC units, antennas, cables and neon signs.
import { createCanvas, ctx2d, makeRng, px, line, circle, drawText, textWidth, shade, mix, rgba, speckle } from '../util.js';
import { C } from '../palette.js';

const STYLES = {
  tar: {
    base: '#2c2936', strip: '#272430', seam: 'rgba(14,12,20,0.55)', seamLight: 'rgba(90,86,110,0.16)',
    gravel: ['#3b3847', '#221f2b', '#454152', '#312e3b', '#4b4759'],
  },
  ballast: {
    base: '#3a3744', strip: '#363340', seam: 'rgba(16,14,22,0.5)', seamLight: 'rgba(120,115,135,0.2)',
    gravel: ['#4d4959', '#2d2a36', '#575367', '#413d4c', '#635e74'],
  },
  shingle: {
    base: '#3c3a3a', strip: '#353333', seam: 'rgba(12,11,14,0.5)', seamLight: 'rgba(110,105,100,0.16)',
    gravel: ['#4a4744', '#2b2a29', '#575450'],
  },
  slate: {
    base: '#34323f', strip: '#2e2c38', seam: 'rgba(12,11,18,0.55)', seamLight: 'rgba(120,116,138,0.18)',
    gravel: ['#413e4e', '#282633', '#4c4959'],
  },
};

// ------------------------------------------------------------------ helpers
function softShadow(ctx, x, y, w, h, ox = 6, oy = 8, alpha = 0.35) {
  ctx.fillStyle = `rgba(8,6,14,${alpha * 0.55})`;
  ctx.fillRect(x + ox, y + oy, w, h);
  ctx.fillStyle = `rgba(8,6,14,${alpha})`;
  ctx.fillRect(x + ox - 1, y + oy - 1, w - 1, h - 2);
}

function ellipseShadow(ctx, cx, cy, rx, ry, alpha = 0.4) {
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, `rgba(6,5,12,${alpha})`);
  g.addColorStop(0.65, `rgba(6,5,12,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(6,5,12,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / Math.max(rx, ry));
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- roof surface
function surface(ctx, w, d, style, rng) {
  const S = STYLES[style] || STYLES.tar;
  px(ctx, 0, 0, w, d, S.base);

  if (style === 'shingle' || style === 'slate') {
    // fine, low-contrast shingles so the surface reads as a roof, not a brick wall
    const th = style === 'shingle' ? 6 : 6;
    const tw = style === 'shingle' ? 20 : 22;
    const tones = style === 'shingle'
      ? ['#3a3835', '#3c3a37', '#393734', '#3b3936', '#3d3b38']
      : ['#353341', '#373543', '#363442', '#343240', '#383646'];
    for (let y = 0, row = 0; y < d; y += th, row++) {
      const off = row % 2 ? -Math.floor(tw / 2) : 0;
      for (let x = off; x < w; x += tw) {
        const col = tones[(rng() * tones.length) | 0];
        const x0 = Math.max(x, 0), x1 = Math.min(x + tw - 1, w);
        if (x1 <= x0) continue;
        px(ctx, x0, y, x1 - x0, th - 1, col);
        px(ctx, x0, y, x1 - x0, 1, shade(col, 4));
        // butt joint between shingles, very low contrast
        px(ctx, x1, y + 1, 1, th - 2, 'rgba(18,16,24,0.22)');
        if (rng.chance(0.03)) px(ctx, x0, y, x1 - x0, th - 1, shade(col, -6));
      }
      px(ctx, 0, y + th - 1, w, 1, 'rgba(16,14,22,0.32)');
    }
    // broad diagonal weathering, so it doesn't tile too obviously
    for (let i = 0; i < (w * d) / 7000; i++) {
      const x0 = rng.int(0, w), y0 = rng.int(0, d);
      const len = rng.int(20, 70);
      ctx.strokeStyle = rgba(rng.chance(0.5) ? '#2a2833' : '#4a4756', 0.16);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + len, y0 - Math.round(len * 0.35));
      ctx.stroke();
    }
    // damp / moss patches
    for (let i = 0; i < (w * d) / 9000; i++) {
      const x0 = rng.int(0, w - 30), y0 = rng.int(0, d - 24);
      ctx.fillStyle = rgba(rng.chance(0.5) ? '#263a2a' : '#1d2226', 0.22);
      ctx.beginPath();
      ctx.ellipse(x0 + 14, y0 + 10, rng.int(8, 18), rng.int(5, 10), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // rolled tar paper / gravel: strips running parallel to the street
    const stripH = 38;
    for (let y = 0, i = 0; y < d; y += stripH, i++) {
      if (i % 2) px(ctx, 0, y, w, stripH, S.strip);
      px(ctx, 0, y, w, 1, S.seam);
      px(ctx, 0, y + 1, w, 1, S.seamLight);
    }
    // aggregate speckle
    speckle(ctx, 0, 0, w, d, S.gravel, Math.floor((w * d) / (style === 'ballast' ? 22 : 60)), rng, 1);
    // broom-drag streaks and seams
    for (let i = 0; i < (w * d) / 5200; i++) {
      const y0 = rng.int(0, d);
      const x0 = rng.int(0, w);
      const len = rng.int(24, 110);
      px(ctx, x0, y0, len, 1, rgba(rng.chance(0.5) ? '#1d1a25' : '#4a4658', 0.2));
    }
    // stains and patched sections
    for (let i = 0; i < (w * d) / 26000; i++) {
      const x0 = rng.int(10, Math.max(12, w - 60));
      const y0 = rng.int(24, Math.max(28, d - 36));
      const rx = rng.int(14, 40), ry = rng.int(7, 18);
      const tone = rng.chance(0.5) ? '#1e1c27' : '#3c3848';
      const gg = ctx.createRadialGradient(x0, y0, 1, x0, y0, Math.max(rx, ry));
      gg.addColorStop(0, rgba(tone, 0.35));
      gg.addColorStop(0.7, rgba(tone, 0.18));
      gg.addColorStop(1, rgba(tone, 0));
      ctx.fillStyle = gg;
      ctx.save();
      ctx.translate(x0, y0);
      ctx.scale(1, ry / Math.max(rx, ry));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // slope: the roof is brighter near the street edge, darker at the back
  const g = ctx.createLinearGradient(0, 0, 0, d);
  g.addColorStop(0, 'rgba(255,204,150,0.10)');
  g.addColorStop(0.2, 'rgba(160,150,190,0.03)');
  g.addColorStop(0.62, 'rgba(8,6,16,0.10)');
  g.addColorStop(1, 'rgba(6,4,12,0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, d);

  // rain water: shallow, low-contrast sheets with a dull sky reflection
  for (let i = 0; i < Math.max(1, Math.round(w / 330)); i++) {
    const x0 = rng.int(40, Math.max(44, w - 90));
    const y0 = rng.int(70, Math.max(74, d - 46));
    const rx = rng.int(18, 34), ry = rng.int(7, 12);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x0, y0, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    const pg = ctx.createLinearGradient(0, y0 - ry, 0, y0 + ry);
    pg.addColorStop(0, '#374152');
    pg.addColorStop(0.5, '#28303d');
    pg.addColorStop(1, '#1d232c');
    ctx.fillStyle = pg;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x0 - rx, y0 - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
    ctx.restore();
    // a couple of lamp glints, no hard outline
    px(ctx, x0 - Math.round(rx * 0.55), y0 - 2, Math.round(rx * 0.35), 1, 'rgba(255,206,142,0.20)');
    px(ctx, x0 + Math.round(rx * 0.1), y0 + 3, Math.round(rx * 0.3), 1, 'rgba(120,170,210,0.13)');
    for (let k = 0; k < 4; k++) {
      px(ctx, x0 + rng.int(-rx, rx - 4), y0 + rng.int(-ry, ry - 1), rng.int(3, 8), 1, 'rgba(150,164,190,0.06)');
    }
  }

  // patched sections: repairs in different tar / asphalt tones break up the tiling
  for (let i = 0; i < Math.max(1, Math.round(w / 260)); i++) {
    const pw = rng.int(34, 86), ph = rng.int(20, 44);
    const px0 = rng.int(10, Math.max(12, w - pw - 10));
    const py0 = rng.int(50, Math.max(54, d - ph - 20));
    const tone = rng.chance(0.5) ? shade(STYLES[style].base, 5) : shade(STYLES[style].base, -5);
    ctx.globalAlpha = 0.55;
    px(ctx, px0, py0, pw, ph, tone);
    ctx.globalAlpha = 1;
    px(ctx, px0, py0, pw, 1, 'rgba(10,8,14,0.22)');
    px(ctx, px0, py0 + ph - 1, pw, 1, 'rgba(90,86,110,0.08)');
    for (let k = 0; k < pw * ph / 40; k++) px(ctx, px0 + rng.int(1, pw - 2), py0 + rng.int(1, ph - 2), 1, 1, 'rgba(12,10,18,0.25)');
  }
}

// -------------------------------------------------------- parapets / gutters
// The street-facing edge of a south-block house, seen from a high, tilted camera.
// You are looking down at the top of the building, so the only bit of wall you see
// is a thin coping: bright stone top face, a sliver of brick in shade, then the
// gutter and the roof plane falling away to the back. No tall elevation here —
// that is exactly what used to make the block read as "the end of a house".
function frontWall(ctx, w, wallH, rng, opts = {}) {
  const wall = opts.wall || '#4a3a36';
  const trim = opts.trim || '#6e6a7d';
  const copingH = 9;
  const inner = Math.max(3, wallH - copingH - 2);

  // ---- brick sliver in shade (the outer face is turned away from us)
  px(ctx, 0, copingH, w, wallH - copingH, shade(wall, -16));
  const brickColors = [shade(wall, -12), shade(wall, -20), shade(wall, -7), shade(wall, -26)];
  for (let by = copingH + 2; by < wallH; by += 4) {
    const off = Math.floor(by / 4) % 2 ? 0 : -6;
    for (let bx = off; bx < w; bx += 12) {
      const x0 = Math.max(bx, 0), x1 = Math.min(bx + 11, w);
      if (x1 <= x0) continue;
      px(ctx, x0, by, x1 - x0, 3, rng.pick(brickColors));
    }
  }
  // soot streaks running down from the coping
  for (let i = 0; i < w / 18; i++) {
    const gx = rng.int(0, w - 1);
    for (let yy = copingH + 1; yy < wallH - 1; yy++) {
      if (rng.chance(0.55)) px(ctx, gx, yy, 1, 1, 'rgba(12,8,12,0.22)');
    }
  }

  // ---- coping: the bright top face of the parapet, catching the street light
  px(ctx, 0, 0, w, copingH, '#6f6a7d');
  px(ctx, 0, 0, w, 2, '#b3aec1');
  px(ctx, 0, 1, w, 1, '#9792a8');
  px(ctx, 0, copingH - 2, w, 2, '#7b7688');
  px(ctx, 0, copingH - 1, w, 1, '#4e4a5e');
  for (let x = 0; x < w; x += 34) {
    px(ctx, x, 0, 1, copingH - 2, 'rgba(48,45,60,0.45)');
    if (rng.chance(0.22)) px(ctx, x + 2, 2, 7, 3, 'rgba(32,29,40,0.3)');
  }
  // nicks, chipped corners and a little moss on the joints
  for (let i = 0; i < Math.max(2, Math.round(w / 140)); i++) {
    const nx = rng.int(4, w - 8);
    px(ctx, nx, rng.int(3, 7), rng.int(2, 5), 1, 'rgba(38,34,46,0.5)');
    if (rng.chance(0.4)) px(ctx, nx + 2, 3, 2, 1, 'rgba(78,96,66,0.5)');
  }

  // ---- the inner lip: a hard dark line where the parapet meets the roof
  if (inner > 0) px(ctx, 0, wallH - 1, w, 1, 'rgba(8,6,12,0.7)');
  return wallH;
}

// The gutter runnel behind the parapet. Standing water, leaves, scuppers and the
// hard shadow the coping throws onto the roof — this is what sells "we are above
// the building looking down".
function roofEdge(ctx, w, wallH, rng) {
  const gutterH = 8;
  px(ctx, 0, wallH, w, 2, 'rgba(8,6,13,0.62)');
  px(ctx, 0, wallH + 2, w, gutterH, '#1b1922');
  px(ctx, 0, wallH + 2, w, 1, '#100e16');
  px(ctx, 0, wallH + 2 + gutterH, w, 1, '#4a4557');
  // water: dull reflected sky and the odd warm glint from the street lamps
  for (let x = 0; x < w; x += 5) {
    if (rng.chance(0.5)) px(ctx, x, wallH + 4 + rng.int(0, 3), rng.int(2, 5), 1, 'rgba(52,62,80,0.5)');
    if (rng.chance(0.05)) px(ctx, x, wallH + 5 + rng.int(0, 2), 3, 1, 'rgba(255,206,142,0.32)');
  }
  for (let i = 0; i < w / 30; i++) {
    px(ctx, rng.int(0, w - 3), wallH + 4 + rng.int(0, 4), 2, 1, rng.pick(['#3d452c', '#4c3a26', '#2a3022']));
  }
  // scupper heads interrupting the gutter
  for (let sx = Math.round(w * 0.2); sx < w - 40; sx += 230) {
    const x = sx + rng.int(-12, 12);
    px(ctx, x - 6, wallH, 14, 12, '#2a2634');
    px(ctx, x - 6, wallH, 14, 1, '#565167');
    px(ctx, x - 4, wallH + 2, 10, 8, '#131120');
    px(ctx, x + 7, wallH + 1, 2, 10, 'rgba(126,134,158,0.22)');
  }
  const g = ctx.createLinearGradient(0, wallH + gutterH + 2, 0, wallH + gutterH + 26);
  g.addColorStop(0, 'rgba(6,4,11,0.34)');
  g.addColorStop(1, 'rgba(6,4,11,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, wallH + gutterH + 2, w, 26);
}

function sideEdges(ctx, w, d) {
  for (const sx of [0, w - 6]) {
    px(ctx, sx, 0, 6, d, '#6c6779');
    px(ctx, sx, 0, 2, d, '#8a8598');
    px(ctx, sx + 5, 0, 1, d, '#403c4d');
    for (let y = 20; y < d; y += 30) px(ctx, sx, y, 6, 1, 'rgba(45,42,55,0.5)');
  }
  // party wall shadow lines
  px(ctx, 6, 0, 3, d, 'rgba(8,6,14,0.35)');
  px(ctx, w - 9, 0, 3, d, 'rgba(8,6,14,0.3)');
}

// ------------------------------------------------------------- roof objects
function waterTower(ctx, x, y, rng, scale = 1) {
  // (x, y) is the base centre on the roof
  const tw = Math.round(66 * scale);
  const th = Math.round(44 * scale);
  const legH = Math.round(26 * scale);
  const tankTop = y - legH - th;
  const left = x - Math.round(tw / 2);
  ellipseShadow(ctx, x + 8, y + 6, Math.round(tw * 0.85), Math.round(16 * scale), 0.45);

  // legs + bracing
  const legs = [
    [left + 7, left + 3],
    [left + tw - 9, left + tw - 5],
  ];
  for (const [lx0] of legs) {
    px(ctx, lx0, tankTop + th - 2, 4, legH + 2, '#2f2b36');
    px(ctx, lx0, tankTop + th - 2, 1, legH + 2, '#4b4757');
    px(ctx, lx0 + 3, tankTop + th - 2, 1, legH + 2, '#1d1a24');
  }
  line(ctx, left + 8, tankTop + th + 2, left + tw - 10, y - 4, 'rgba(70,66,82,0.8)');
  line(ctx, left + tw - 10, tankTop + th + 2, left + 8, y - 4, 'rgba(70,66,82,0.8)');
  px(ctx, left + 6, y - 4, tw - 12, 3, '#26232e');

  // tank body: cylinder shading
  const bodyY = tankTop + 8;
  const bodyH = th - 8;
  const bg = ctx.createLinearGradient(left, 0, left + tw, 0);
  bg.addColorStop(0, '#3a2a24');
  bg.addColorStop(0.22, '#5d453a');
  bg.addColorStop(0.46, '#75574a');
  bg.addColorStop(0.72, '#4a352d');
  bg.addColorStop(1, '#2a1e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(left, bodyY, tw, bodyH);
  // wooden staves
  for (let sx = left + 3; sx < left + tw - 2; sx += 6) {
    px(ctx, sx, bodyY, 1, bodyH, 'rgba(30,20,16,0.35)');
    px(ctx, sx + 1, bodyY, 1, bodyH, 'rgba(150,118,96,0.08)');
  }
  // hoops
  for (const t of [0.18, 0.5, 0.82]) {
    const hy = Math.round(bodyY + bodyH * t);
    px(ctx, left - 1, hy, tw + 2, 3, '#2c2620');
    px(ctx, left - 1, hy, tw + 2, 1, 'rgba(180,168,140,0.35)');
    px(ctx, left - 1, hy + 3, tw + 2, 1, 'rgba(8,6,10,0.45)');
  }
  // base rim shadow + top rim
  px(ctx, left, bodyY + bodyH - 3, tw, 3, 'rgba(10,7,8,0.45)');
  // street light catching the near face of the tank, plus a cool moon rim
  px(ctx, left + 1, bodyY + 1, tw - 2, 1, 'rgba(255,208,152,0.22)');
  px(ctx, left + 1, bodyY + 2, tw - 2, 1, 'rgba(255,208,152,0.10)');
  px(ctx, left + Math.round(tw * 0.32), bodyY + 3, 2, bodyH - 6, 'rgba(255,214,168,0.07)');
  px(ctx, left, bodyY + 3, 1, bodyH - 6, 'rgba(146,170,205,0.18)');
  px(ctx, left + tw - 1, bodyY + 3, 1, bodyH - 6, 'rgba(8,6,10,0.5)');
  px(ctx, left - 1, bodyY - 1, tw + 2, 3, '#2b211c');

  // conical roof: filled bands, light on the left, dark on the right
  const roofH = Math.round(18 * scale);
  const roofBottom = bodyY - 4;
  for (let i = 0; i < roofH; i++) {
    const t = i / roofH;
    const ww = Math.round((tw + 8) * (1 - t));
    const cx = x - Math.round(ww / 2);
    const seg = 6;
    for (let sx = 0; sx < ww; sx += seg) {
      const rel = (sx + seg / 2) / ww;
      let col = rel < 0.35 ? '#484250' : rel < 0.62 ? '#3a3542' : '#2a2630';
      if (i % 3 === 2) col = shade(col, -8);
      px(ctx, cx + sx, roofBottom - roofH + i, Math.min(seg, ww - sx), 1, col);
    }
  }
  // eaves ring
  px(ctx, left - 4, roofBottom, tw + 8, 3, '#514b5a');
  px(ctx, left - 4, roofBottom, tw + 8, 1, '#6d6679');
  px(ctx, left + 1, roofBottom - 1, tw - 2, 1, 'rgba(20,17,24,0.5)');
  // ladder-style flashings down the cone
  for (const side of [-1, 1]) {
    const sx = x + side * Math.round(tw * 0.28);
    for (let i = 0; i < roofH - 2; i += 3) {
      px(ctx, sx + Math.round(side * i * 0.12), roofBottom - 2 - i, 1, 2, 'rgba(30,27,36,0.45)');
    }
  }
  // finial
  px(ctx, x - 1, bodyY - 4 - roofH - 5, 3, 6, '#57515a');
  px(ctx, x - 2, bodyY - 4 - roofH - 7, 5, 2, '#3c3742');

  // ladder on the right
  const lx = left + tw - 2;
  px(ctx, lx, bodyY - 2, 1, bodyH + legH + 2, '#3f3a46');
  px(ctx, lx + 5, bodyY - 2, 1, bodyH + legH + 2, '#3f3a46');
  for (let yy = bodyY; yy < y - 2; yy += 4) px(ctx, lx, yy, 6, 1, '#33303b');
  // safety cage hint
  px(ctx, lx + 1, bodyY + 6, 4, 1, 'rgba(120,116,132,0.25)');

  // overflow pipe down to the roof and across
  px(ctx, left + 4, bodyY + bodyH - 4, 3, legH + 4, '#3a3744');
  px(ctx, left + 4, bodyY + bodyH - 4, 1, legH + 4, '#565264');
  px(ctx, left + 4, y - 2, 40, 3, '#3a3744');
  px(ctx, left + 4, y - 2, 40, 1, '#565264');
  for (let i = 0; i < 3; i++) px(ctx, left + 14 + i * 10, y - 4, 3, 6, '#2b2833');
}

function bulkhead(ctx, x, y, w = 78, h = 54, rng, palette = {}) {
  const wall = palette.wall || '#4a3a35';
  const wallDark = palette.wallDark || '#33272a';
  const cap = palette.cap || '#4a4656';
  const capH = Math.round(h * 0.5);   // top face, seen from above
  const frontH = h - capH;            // street-facing wall
  softShadow(ctx, x, y, w, h, 7, 9, 0.45);

  // ---- top face (behind the street wall)
  px(ctx, x - 3, y - 3, w + 6, capH + 6, '#1e1d26');
  px(ctx, x, y, w, capH, mix(shade(cap, -18), '#24232d', 0.45));
  speckle(ctx, x, y, w, capH, [shade(cap, -8), shade(cap, -20), '#33313d', '#3b3947'], Math.floor(w * capH / 9), rng, 1);
  // parapet of the little roof: bright on the street side, shaded behind
  px(ctx, x - 2, y - 2, w + 4, 3, shade(cap, 18));
  px(ctx, x - 2, y - 2, w + 4, 1, shade(cap, 40));
  px(ctx, x - 2, y + capH - 1, w + 4, 3, shade(cap, 4));
  px(ctx, x - 2, y + capH + 2, w + 4, 2, 'rgba(8,6,12,0.45)');
  // roof hatch, vent stack and a fan up there
  px(ctx, x + 9, y + 7, 18, 13, '#181620');
  px(ctx, x + 10, y + 8, 16, 11, '#3a3744');
  px(ctx, x + 10, y + 8, 16, 1, '#5a5665');
  px(ctx, x + 10, y + 18, 16, 1, 'rgba(8,6,12,0.5)');
  px(ctx, x + w - 26, y + 8, 4, 11, '#33303c');
  px(ctx, x + w - 29, y + 5, 10, 4, '#4c4859');
  px(ctx, x + w - 29, y + 5, 10, 1, '#6f6a7d');
  circle(ctx, x + w - 24, y + 7, 2, '#22202a');
  // chimney pipe crossing the top face
  px(ctx, x + 32, y + capH - 6, 26, 3, '#3a3744');
  px(ctx, x + 32, y + capH - 6, 26, 1, '#565264');

  // ---- street-facing wall
  const wy = y + capH;
  px(ctx, x, wy, w, frontH, wallDark);
  for (let by = wy + 2; by < wy + frontH; by += 4) {
    for (let bx = x + (Math.floor(by / 4) % 2 ? 0 : 4); bx < x + w; bx += 8) {
      px(ctx, bx, by, 7, 3, rng.pick([shade(wall, -6), wall, shade(wall, 6), shade(wall, -12)]));
    }
  }
  // cornice under the little roof, then the ground shadow
  px(ctx, x - 2, wy - 1, w + 4, 3, shade(cap, 26));
  px(ctx, x - 2, wy + 2, w + 4, 1, 'rgba(10,8,12,0.45)');
  px(ctx, x, wy + frontH - 2, w, 2, 'rgba(10,8,12,0.55)');
  px(ctx, x, y + h, w, 3, 'rgba(8,6,12,0.35)');

  // ---- door + wall lamp on the street side
  const dx = x + Math.round(w / 2) - 8;
  px(ctx, dx, wy + 4, 16, frontH - 4, '#1a1418');
  px(ctx, dx + 1, wy + 5, 14, frontH - 6, '#3d2c28');
  px(ctx, dx + 2, wy + 6, 12, 6, 'rgba(255,196,120,0.22)');
  px(ctx, dx + 12, wy + 13, 2, 3, '#c9a55a');
  px(ctx, dx + 19, wy + 6, 3, 3, '#ffd79b');
  const lg = ctx.createRadialGradient(dx + 20, wy + 7, 0, dx + 20, wy + 7, 24);
  lg.addColorStop(0, 'rgba(255,205,140,0.28)');
  lg.addColorStop(1, 'rgba(255,205,140,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(dx - 6, wy - 16, 52, 52);
}

function chimney(ctx, x, y, rng, w = 22, h = 26) {
  softShadow(ctx, x, y, w, h, 5, 6, 0.38);
  px(ctx, x, y + 6, w, h - 6, '#3d2b28');
  for (let by = y + 7; by < y + h; by += 3) {
    for (let bx = x + (Math.floor(by / 3) % 2 ? 0 : 3); bx < x + w; bx += 6) {
      px(ctx, bx, by, 5, 2, rng.pick(['#4d3733', '#553c36', '#45302d', '#5c4139']));
    }
  }
  // cap
  px(ctx, x - 2, y + 2, w + 4, 5, '#5a5262');
  px(ctx, x - 2, y + 2, w + 4, 1, '#7a7286');
  px(ctx, x - 2, y + 7, w + 4, 2, 'rgba(10,8,12,0.5)');
  px(ctx, x + 2, y, w - 4, 3, '#413a45');
  px(ctx, x + 2, y, w - 4, 1, '#8a8298');
  // soot + smoke stain above
  px(ctx, x + 3, y - 2, w - 6, 2, 'rgba(20,16,20,0.55)');
  for (let i = 0; i < 5; i++) px(ctx, x + 4 + (i % 2) * 6, y - 4 - i, 3 + (i % 3), 1, `rgba(30,26,32,${0.3 - i * 0.05})`);
  // little pipes
  px(ctx, x + w - 3, y + 8, 3, h - 10, '#3a3644');
}

function acUnit(ctx, x, y, rng) {
  const w = 26, h = 18;
  softShadow(ctx, x, y, w, h, 5, 6, 0.35);
  px(ctx, x, y + 4, w, h - 4, '#454152');
  px(ctx, x, y + 4, w, 3, '#5b5668');
  px(ctx, x + 2, y + 7, w - 4, h - 10, '#33303c');
  circle(ctx, x + w / 2, y + 11, 5, '#26232e');
  circle(ctx, x + w / 2, y + 11, 4, '#3b3846');
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    px(ctx, x + w / 2 + Math.cos(a) * 3, y + 11 + Math.sin(a) * 3, 2, 2, '#4d4859');
  }
  px(ctx, x + w - 4, y + 8, 2, h - 10, '#2b2833');
  // refrigerant lines
  px(ctx, x - 6, y + h - 3, 8, 2, '#3f3a46');
  px(ctx, x - 6, y + h - 6, 8, 2, '#3f3a46');
}

function skylight(ctx, x, y, w = 32, h = 20, rng, lit = true) {
  softShadow(ctx, x, y, w, h, 5, 6, 0.4);
  // raised curb: light rim on the street side, dark on the far side
  px(ctx, x - 2, y - 2, w + 4, h + 4, '#2c2935');
  px(ctx, x - 2, y - 2, w + 4, 2, '#605a6c');
  px(ctx, x - 2, y + h + 1, w + 4, 2, 'rgba(8,6,12,0.5)');
  px(ctx, x, y, w, h, '#2a2833');
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (lit) {
    g.addColorStop(0, '#7d5f3c');
    g.addColorStop(0.5, '#4a3626');
    g.addColorStop(1, '#2b1f1a');
  } else {
    g.addColorStop(0, '#3a4a63');
    g.addColorStop(1, '#161d29');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  px(ctx, x + 2, y + 2, w - 4, 1, 'rgba(200,215,240,0.25)');
  for (let bx = x + Math.round(w / 2); bx < x + w - 3; bx += 12) px(ctx, bx, y + 2, 1, h - 4, '#2f2c38');
  px(ctx, x + 2, y + Math.round(h / 2), w - 4, 1, '#2f2c38');
  // rain streaks
  for (let i = 0; i < 4; i++) px(ctx, x + 3 + rng.int(0, w - 8), y + 3, 1, rng.int(2, h - 6), 'rgba(120,150,190,0.16)');
  if (lit) {
    const lg = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, w * 0.9);
    lg.addColorStop(0, 'rgba(255,190,120,0.20)');
    lg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x - w, y - h, w * 3, h * 3);
  }
}

function antenna(ctx, x, y, rng) {
  const mastH = 46;
  ellipseShadow(ctx, x + 4, y + 2, 12, 5, 0.4);
  // base plate + guy wires
  px(ctx, x - 4, y - 3, 10, 6, '#3a3746');
  px(ctx, x - 4, y - 3, 10, 1, '#565264');
  for (const [ax, ay] of [[-16, 10], [18, 12], [-6, 16]]) {
    line(ctx, x + 1, y - mastH + 8, x + 1 + ax, y + ay, 'rgba(90,86,104,0.45)');
    px(ctx, x + ax, y + ay, 2, 2, '#4a4656');
  }
  // mast
  px(ctx, x, y - mastH, 2, mastH, '#4a4656');
  px(ctx, x + 2, y - mastH, 1, mastH, '#2c2934');
  // lattice
  for (let yy = y - mastH + 4; yy < y - 6; yy += 6) {
    line(ctx, x, yy, x + 8, yy + 4, 'rgba(100,96,115,0.55)');
    line(ctx, x + 8, yy, x, yy + 4, 'rgba(100,96,115,0.55)');
    px(ctx, x + 8, yy, 1, 4, '#403c4b');
  }
  // cross arms
  for (const [ay, len] of [[y - mastH + 6, 14], [y - mastH + 15, 10]]) {
    px(ctx, x - len, ay, len * 2, 1, '#565264');
    px(ctx, x - len, ay - 1, 1, 2, '#565264');
    px(ctx, x + len, ay - 1, 1, 2, '#565264');
  }
  // blinking beacon
  circle(ctx, x + 1, y - mastH - 3, 2, '#8d2f2c');
  px(ctx, x, y - mastH - 4, 2, 1, '#ff7a5c');
  const rg = ctx.createRadialGradient(x + 1, y - mastH - 3, 0, x + 1, y - mastH - 3, 10);
  rg.addColorStop(0, 'rgba(255,90,70,0.35)');
  rg.addColorStop(1, 'rgba(255,90,70,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(x - 10, y - mastH - 14, 22, 22);
  // small dish
  ellipseShadow(ctx, x + 10, y - 12, 8, 3, 0.25);
  circle(ctx, x + 10, y - 14, 6, '#4f4b5c');
  circle(ctx, x + 10, y - 14, 4, '#6b6679');
  px(ctx, x + 9, y - 15, 2, 2, '#3c3948');
  px(ctx, x + 10, y - 9, 1, 4, '#3c3948');
}

function ventPipe(ctx, x, y) {
  ellipseShadow(ctx, x + 3, y + 2, 8, 3, 0.3);
  px(ctx, x, y - 20, 4, 20, '#3f3c49');
  px(ctx, x, y - 20, 1, 20, '#5a5668');
  px(ctx, x, y - 23, 9, 4, '#4c4859');
  px(ctx, x, y - 23, 9, 1, '#6a6679');
  px(ctx, x + 2, y - 1, 8, 3, '#2b2833');
}

function cable(ctx, x0, y0, x1, y1, sag = 12, color = 'rgba(18,16,24,0.85)') {
  const steps = Math.max(6, Math.round(Math.abs(x1 - x0) / 6));
  let py = y0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xx = x0 + (x1 - x0) * t;
    const yy = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    px(ctx, xx, yy, 1, 1, color);
    if (i % 4 === 0) px(ctx, xx, yy + 1, 1, 1, 'rgba(40,36,48,0.35)');
    py = yy;
  }
}

function roofSign(ctx, cx, baseY, text, color, scale = 2) {
  const tw = textWidth(text, scale);
  const pw = tw + 22;
  const ph = 7 * scale + 14;
  const x0 = Math.round(cx - pw / 2);
  const y0 = baseY - ph;
  // support frame + soft shadow on the roof
  const sg = ctx.createLinearGradient(0, y0 + 4, 0, y0 + ph + 16);
  sg.addColorStop(0, 'rgba(8,6,14,0.45)');
  sg.addColorStop(1, 'rgba(8,6,14,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(x0 + 12, y0 + 6, pw + 6, ph + 16);
  px(ctx, x0 + 8, y0 + ph, 4, 12, '#2a2733');
  px(ctx, x0 + pw - 12, y0 + ph, 4, 12, '#2a2733');
  px(ctx, x0 + 4, y0 + ph + 11, 8, 2, '#3a3646');
  px(ctx, x0 + pw - 16, y0 + ph + 11, 8, 2, '#3a3646');
  line(ctx, x0 + 10, y0 + ph + 2, x0 + 22, baseY + 2, 'rgba(60,56,72,0.8)');
  line(ctx, x0 + pw - 10, y0 + ph + 2, x0 + pw - 22, baseY + 2, 'rgba(60,56,72,0.8)');
  // frame
  px(ctx, x0, y0, pw, ph, '#15121a');
  px(ctx, x0 + 2, y0 + 2, pw - 4, ph - 4, '#221c26');
  px(ctx, x0, y0, pw, 1, '#4a3f48');
  px(ctx, x0, y0 + ph - 1, pw, 1, '#08060b');
  // glow behind the letters
  const g = ctx.createRadialGradient(cx, y0 + ph / 2, 2, cx, y0 + ph / 2, tw * 0.85);
  g.addColorStop(0, rgba(color, 0.22));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - tw, y0 - 20, tw * 2, ph + 40);
  drawText(ctx, text, x0 + 11, y0 + 7, '#0d0a10', scale);
  drawText(ctx, text, x0 + 10, y0 + 6, color, scale);
  // little bulbs under the panel
  for (let x = x0 + 12; x < x0 + pw - 8; x += 16) {
    px(ctx, x, y0 + ph - 5, 2, 2, '#ffd79b');
  }
}

function rooftopGarden(ctx, x, y, w, h, rng) {
  // raised stone planter with bushes, plus string lights on two posts
  softShadow(ctx, x, y, w, h, 5, 7, 0.4);
  // stone rim (light on the street side, dark behind)
  px(ctx, x - 3, y - 3, w + 6, h + 6, '#3a3745');
  px(ctx, x - 3, y - 3, w + 6, 2, '#6b6579');
  px(ctx, x - 3, y - 3, 2, h + 6, '#575166');
  px(ctx, x + w + 1, y - 3, 2, h + 6, '#2c2934');
  px(ctx, x - 3, y + h + 1, w + 6, 2, 'rgba(8,6,12,0.5)');
  // soil
  px(ctx, x, y, w, h, '#2a2620');
  speckle(ctx, x, y, w, h, ['#332d24', '#241f1a', '#3d362b'], Math.floor(w * h / 8), rng, 1);
  // bushes with volume: dark base, mid tone, moonlit rim
  const bushes = [];
  for (let i = 0; i < Math.max(3, Math.round(w / 26)); i++) {
    bushes.push({
      x: x + 10 + rng.int(0, Math.max(1, w - 20)),
      y: y + 6 + rng.int(0, Math.max(1, h - 12)),
      r: rng.int(5, 9),
    });
  }
  for (const b of bushes) {
    circle(ctx, b.x + 2, b.y + 3, b.r, 'rgba(8,6,12,0.35)');
    circle(ctx, b.x, b.y, b.r, '#22351f');
    circle(ctx, b.x - 1, b.y - 2, b.r - 2, '#2f4a29');
    circle(ctx, b.x - 2, b.y - 3, Math.max(2, b.r - 5), '#41603a');
    for (let i = 0; i < 6; i++) {
      px(ctx, b.x - b.r + rng.int(0, b.r * 2), b.y - b.r + rng.int(0, b.r * 2), 1, 1, rng.pick(['#4d7043', '#557a4a', '#35532f']));
    }
  }
  // a few red dots: tomatoes / flowers
  for (let i = 0; i < 5; i++) px(ctx, x + rng.int(4, w - 6), y + rng.int(4, h - 6), 1, 1, rng.pick(['#b0503f', '#c9a44a']));
  // posts + string lights
  px(ctx, x + 4, y - 20, 2, h + 16, '#33303b');
  px(ctx, x + w - 6, y - 20, 2, h + 16, '#33303b');
  px(ctx, x + 4, y - 20, 2, 2, '#565264');
  px(ctx, x + w - 6, y - 20, 2, 2, '#565264');
  const steps = Math.round(w / 8);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const yy = y - 18 + Math.sin(t * Math.PI) * 6;
    px(ctx, x + 5 + (w - 11) * t, yy, 1, 1, 'rgba(30,26,36,0.6)');
    if (i % 3 === 1) {
      const lx = x + 5 + (w - 11) * t;
      px(ctx, lx, yy + 1, 2, 2, '#ffd79b');
      const lg = ctx.createRadialGradient(lx + 1, yy + 2, 0, lx + 1, yy + 2, 10);
      lg.addColorStop(0, 'rgba(255,205,140,0.26)');
      lg.addColorStop(1, 'rgba(255,205,140,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 9, yy - 8, 20, 20);
    }
  }
}

function pigeons(ctx, x, y, rng) {
  for (let i = 0; i < 3; i++) {
    const bx = x + rng.int(-10, 10), by = y + rng.int(-6, 6);
    px(ctx, bx + 1, by + 2, 3, 1, 'rgba(8,6,12,0.35)');
    px(ctx, bx, by, 3, 2, '#5a5564');
    px(ctx, bx + 2, by, 1, 1, '#6f6a7c');
    px(ctx, bx + 3, by + 1, 1, 1, '#8d7a5a');
  }
}

// ---------------------------------------------------------------- assembly
export function makeRoof(opts) {
  const w = Math.round(opts.width);
  const d = Math.round(opts.depth);
  const rng = makeRng(opts.seed ?? 7);
  const style = opts.style || 'tar';
  const c = createCanvas(w, d);
  const ctx = ctx2d(c);

  const wallH = Math.round(opts.wallH ?? 26);
  surface(ctx, w, d, style, rng);
  // a touch of colour per building so the block isn't one flat grey slab
  if (opts.tint) {
    ctx.globalAlpha = 0.12;
    px(ctx, 0, 0, w, d, opts.tint);
    ctx.globalAlpha = 1;
  }
  frontWall(ctx, w, wallH, rng, { wall: opts.wallColor, trim: opts.trimColor });

  // cables first: they run over the roof and behind the objects
  if (opts.cables !== false) {
    for (let i = 0; i < 2; i++) {
      const y0 = rng.int(50, d - 60);
      cable(ctx, 0, y0, w, y0 + rng.int(-20, 20), rng.int(8, 16));
    }
  }

  const objects = [];
  const roofMinY = wallH + 18;
  for (const key of ['waterTower', 'bulkhead', 'garden', 'antenna']) {
    if (opts[key] && opts[key].y < roofMinY) opts[key].y = roofMinY + (key === 'antenna' ? 6 : 0);
  }
  for (const list of ['chimneys', 'skylights', 'acUnits', 'vents']) {
    if (opts[list]) opts[list] = opts[list].map((o) => ({ ...o, y: Math.max(o.y, roofMinY) }));
  }
  if (opts.waterTower) objects.push({ y: opts.waterTower.y + 8, draw: () => waterTower(ctx, opts.waterTower.x, opts.waterTower.y, rng, opts.waterTower.scale || 1) });
  if (opts.bulkhead) objects.push({ y: opts.bulkhead.y + 54, draw: () => bulkhead(ctx, opts.bulkhead.x, opts.bulkhead.y, opts.bulkhead.w || 78, opts.bulkhead.h || 54, rng, opts.bulkhead.palette) });
  if (opts.garden) objects.push({ y: opts.garden.y + opts.garden.h, draw: () => rooftopGarden(ctx, opts.garden.x, opts.garden.y, opts.garden.w, opts.garden.h, rng) });
  if (opts.antenna) objects.push({ y: opts.antenna.y, draw: () => antenna(ctx, opts.antenna.x, opts.antenna.y, rng) });
  for (const ch of opts.chimneys || []) objects.push({ y: ch.y + 20, draw: () => chimney(ctx, ch.x, ch.y, rng) });
  for (const sk of opts.skylights || []) objects.push({ y: sk.y + 20, draw: () => skylight(ctx, sk.x, sk.y, sk.w || 32, sk.h || 20, rng, sk.lit !== false) });
  for (const ac of opts.acUnits || []) objects.push({ y: ac.y + 18, draw: () => acUnit(ctx, ac.x, ac.y, rng) });
  for (const v of opts.vents || []) objects.push({ y: v.y, draw: () => ventPipe(ctx, v.x, v.y) });
  if (opts.pigeons) objects.push({ y: opts.pigeons.y, draw: () => pigeons(ctx, opts.pigeons.x, opts.pigeons.y, rng) });

  objects.sort((a, b) => a.y - b.y);
  // roof objects never spill over the street wall
  ctx.save();
  ctx.beginPath();
  ctx.rect(-8, wallH, w + 16, d - wallH + 2);
  ctx.clip();
  for (const o of objects) o.draw();
  ctx.restore();

  // parapet, gutter and the shadow it throws onto the roof plane
  roofEdge(ctx, w, wallH, rng);

  // side walls last so objects can't cover them
  sideEdges(ctx, w, d);

  if (opts.sign) {
    // rooftop neon: stands on the roof just behind the parapet, so the block reads
    // as a silhouette of roofs rather than a wall with shop signs.
    roofSign(ctx, opts.sign.x ?? Math.round(w / 2), wallH + 34, opts.sign.text, opts.sign.color || C.neonPink, opts.sign.scale || 2);
  }

  // bottom edge: the back of the roof with a dark parapet + silhouette of the next block
  px(ctx, 0, d - 10, w, 10, '#22202a');
  px(ctx, 0, d - 10, w, 1, '#4a4656');
  px(ctx, 0, d - 12, w, 2, 'rgba(8,6,12,0.4)');
  for (let x = 0; x < w; x += 26) px(ctx, x, d - 8, 1, 8, 'rgba(50,46,60,0.5)');

  return { canvas: c, width: w, height: d };
}
