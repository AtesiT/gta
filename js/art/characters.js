// Pixel pedestrians: drawn once into an animation sheet (4 directions x 6 frames).
import { createCanvas, ctx2d, px, shade, rgba } from '../util.js';

export const CHAR = {
  cellW: 30,
  cellH: 42,
  ax: 15,
  ay: 38,
  frames: 6,
  dirs: ['down', 'left', 'right', 'up'],
};

export const PALETTES = {
  player: { hair: '#c9713a', hairDark: '#9a4f27', skin: '#f0c39c', skinDark: '#cf9a74', shirt: '#efe7d2', shirtDark: '#c4b9a2', pants: '#3f5f79', pantsDark: '#2c4557', shoe: '#2a2228', long: true, skirt: false },
  npc1: { hair: '#2f2a2c', skin: '#c98d63', skinDark: '#a06a47', shirt: '#4a6b4f', shirtDark: '#37503b', pants: '#2f3446', pantsDark: '#222636', shoe: '#221c22', long: false },
  npc2: { hair: '#8d6a3c', skin: '#e7b28c', skinDark: '#c08e69', shirt: '#8d3b45', shirtDark: '#6e2d35', pants: '#4b4038', pantsDark: '#382f29', shoe: '#2b2226', long: true },
  npc3: { hair: '#1b171d', skin: '#8d5f42', skinDark: '#6d4630', shirt: '#365a72', shirtDark: '#264356', pants: '#3a3540', pantsDark: '#2a2731', shoe: '#1c1820', long: false },
  npc4: { hair: '#d8d2c4', skin: '#e7b28c', skinDark: '#c08e69', shirt: '#6d5580', shirtDark: '#503f60', pants: '#2b3b33', pantsDark: '#1f2b25', shoe: '#2a2228', long: true },
  npc5: { hair: '#3b3a44', skin: '#f0c39c', skinDark: '#cf9a74', shirt: '#b8483d', shirtDark: '#8d3229', pants: '#2f3542', pantsDark: '#22262f', shoe: '#241f24', long: false },
};

// walk cycle: [legLiftL, legLiftR, bodyBob]
const CYCLE = [[0, 0, 0], [1, 0, 0], [2, 0, 1], [0, 0, 0], [0, 1, 0], [0, 2, 1]];

// ---------------------------------------------------------------- outlines
function addOutline(canvas, color = '#141018') {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src.data[(y * w + x) * 4 + 3]);
  out.data.set(src.data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 8) continue;
      if (a(x - 1, y) > 8 || a(x + 1, y) > 8 || a(x, y - 1) > 8 || a(x, y + 1) > 8) {
        const i = (y * w + x) * 4;
        out.data[i] = parseInt(color.slice(1, 3), 16);
        out.data[i + 1] = parseInt(color.slice(3, 5), 16);
        out.data[i + 2] = parseInt(color.slice(5, 7), 16);
        out.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}

// ------------------------------------------------------------------ figures
// Layout (cell 30x42, centre x=15):
//   head rows 3..15, neck 16, torso 17..26, legs 27..35, shoes 33..37
const HEAD_TOP = 3;
const NECK_Y = 16;
const TORSO_Y = 17;
const TORSO_B = 26;
const LEG_Y = 26;

function shaft(ctx, x, y, w, h, col, dark) {
  px(ctx, x, y, w, h, col);
  px(ctx, x, y, 1, h, shade(col, 16));
  px(ctx, x + w - 1, y, 1, h, dark);
}

function frontLegs(ctx, p, liftL, liftR) {
  const legs = [
    { x: 11, lift: liftL },
    { x: 16, lift: liftR },
  ];
  for (const l of legs) {
    const bottom = 33 - l.lift;
    shaft(ctx, l.x, LEG_Y, 4, bottom - LEG_Y, p.pants, p.pantsDark);
    // shoe
    px(ctx, l.x - 1, bottom, 6, 3, p.shoe);
    px(ctx, l.x - 1, bottom, 6, 1, shade(p.shoe, 30));
    px(ctx, l.x - 1, bottom + 2, 6, 1, '#15111a');
  }
}

function frontTorso(ctx, p, armL, armR) {
  px(ctx, 13, NECK_Y, 4, 2, p.skinDark);
  // arms behind the torso silhouette
  for (const [ax, off] of [[6, armL], [21, armR]]) {
    shaft(ctx, ax, TORSO_Y + 1 + off, 4, 6, p.shirt, p.shirtDark);
    px(ctx, ax, TORSO_Y, 4, 1, shade(p.shirt, 6));
    // hand
    px(ctx, ax, TORSO_Y + 7 + off, 3, 3, p.skin);
    px(ctx, ax === 6 ? ax + 3 : ax, TORSO_Y + 1 + off, 1, 6, shade(p.shirt, -18));
    px(ctx, ax, TORSO_Y + 9 + off, 3, 1, p.skinDark);
  }
  // torso
  px(ctx, 10, TORSO_Y, 10, TORSO_B - TORSO_Y, p.shirt);
  px(ctx, 10, TORSO_Y, 10, 2, shade(p.shirt, 14));
  px(ctx, 10, TORSO_Y, 2, TORSO_B - TORSO_Y, shade(p.shirt, -6));
  px(ctx, 18, TORSO_Y, 2, TORSO_B - TORSO_Y, p.shirtDark);
  px(ctx, 10, TORSO_B - 1, 10, 1, shade(p.shirt, -34));
  // collar + neckline
  px(ctx, 12, TORSO_Y, 6, 2, p.skin);
  px(ctx, 12, TORSO_Y + 2, 6, 1, p.skinDark);
  px(ctx, 12, TORSO_Y, 1, 2, p.shirtDark);
  px(ctx, 17, TORSO_Y, 1, 2, p.shirtDark);
  // belt + pockets
  px(ctx, 10, TORSO_B, 10, 2, p.pants);
  px(ctx, 10, TORSO_B, 10, 1, p.pantsDark);
  px(ctx, 12, TORSO_B + 2, 1, 2, p.pantsDark);
  px(ctx, 17, TORSO_B + 2, 1, 2, p.pantsDark);
}

function frontHead(ctx, p, blink) {
  // hair mass
  px(ctx, 10, HEAD_TOP, 10, 4, p.hair);
  px(ctx, 10, HEAD_TOP, 10, 1, shade(p.hair, 22));
  px(ctx, 9, HEAD_TOP + 2, 12, 8, p.hair);
  px(ctx, 9, HEAD_TOP + 2, 1, 9, p.hairDark);
  px(ctx, 20, HEAD_TOP + 2, 1, 9, p.hairDark);
  // face
  px(ctx, 11, HEAD_TOP + 4, 8, 8, p.skin);
  px(ctx, 11, HEAD_TOP + 4, 8, 1, shade(p.skin, 10));
  px(ctx, 11, HEAD_TOP + 11, 8, 1, p.skinDark);
  // fringe over the forehead
  px(ctx, 10, HEAD_TOP + 3, 10, 2, p.hair);
  px(ctx, 10, HEAD_TOP + 3, 4, 3, p.hair);
  px(ctx, 17, HEAD_TOP + 3, 3, 2, p.hair);
  px(ctx, 10, HEAD_TOP + 3, 3, 1, shade(p.hair, 16));
  // side locks
  px(ctx, 9, HEAD_TOP + 6, 2, 7, p.hair);
  px(ctx, 19, HEAD_TOP + 6, 2, 7, p.hair);
  px(ctx, 9, HEAD_TOP + 6, 1, 7, p.hairDark);
  px(ctx, 20, HEAD_TOP + 6, 1, 7, p.hairDark);
  // brows
  px(ctx, 11, HEAD_TOP + 6, 3, 1, p.hairDark);
  px(ctx, 16, HEAD_TOP + 6, 3, 1, p.hairDark);
  // eyes
  if (blink) {
    px(ctx, 12, HEAD_TOP + 8, 2, 1, '#40302f');
    px(ctx, 16, HEAD_TOP + 8, 2, 1, '#40302f');
  } else {
    px(ctx, 12, HEAD_TOP + 7, 2, 3, '#3e2f33');
    px(ctx, 16, HEAD_TOP + 7, 2, 3, '#3e2f33');
    px(ctx, 12, HEAD_TOP + 7, 1, 1, '#f8f0e4');
    px(ctx, 16, HEAD_TOP + 7, 1, 1, '#f8f0e4');
  }
  // nose + mouth
  px(ctx, 14, HEAD_TOP + 9, 2, 1, shade(p.skin, -16));
  px(ctx, 13, HEAD_TOP + 10, 3, 1, shade(p.skin, -26));
  // blush
  px(ctx, 11, HEAD_TOP + 9, 1, 1, rgba('#c8735f', 0.45));
  px(ctx, 18, HEAD_TOP + 9, 1, 1, rgba('#c8735f', 0.45));
}

function backHead(ctx, p) {
  px(ctx, 10, HEAD_TOP, 10, 4, p.hair);
  px(ctx, 10, HEAD_TOP, 10, 1, shade(p.hair, 24));
  px(ctx, 9, HEAD_TOP + 2, 12, 10, p.hair);
  px(ctx, 9, HEAD_TOP + 2, 1, 10, p.hairDark);
  px(ctx, 20, HEAD_TOP + 2, 1, 10, p.hairDark);
  px(ctx, 11, HEAD_TOP + 11, 8, 1, p.hairDark);
  for (let i = 0; i < 4; i++) px(ctx, 11 + i * 3, HEAD_TOP + 4 + (i % 2), 1, 6, shade(p.hair, 14));
  px(ctx, 10, HEAD_TOP + 8, 10, 1, p.hairDark);
}

function backTorso(ctx, p, armL, armR) {
  px(ctx, 13, NECK_Y, 4, 2, p.skinDark);
  for (const [ax, off] of [[6, armL], [21, armR]]) {
    shaft(ctx, ax, TORSO_Y + 1 + off, 4, 6, p.shirt, p.shirtDark);
    px(ctx, ax, TORSO_Y, 4, 1, shade(p.shirt, -6));
    px(ctx, ax, TORSO_Y + 7 + off, 3, 3, p.skin);
    px(ctx, ax, TORSO_Y + 9 + off, 3, 1, p.skinDark);
  }
  px(ctx, 10, TORSO_Y, 10, TORSO_B - TORSO_Y, p.shirt);
  px(ctx, 10, TORSO_Y, 10, 1, shade(p.shirt, -8));
  px(ctx, 10, TORSO_Y, 2, TORSO_B - TORSO_Y, shade(p.shirt, -10));
  px(ctx, 18, TORSO_Y, 2, TORSO_B - TORSO_Y, p.shirtDark);
  px(ctx, 10, TORSO_B - 1, 10, 1, shade(p.shirt, -36));
  px(ctx, 10, TORSO_B, 10, 2, p.pants);
  px(ctx, 10, TORSO_B, 10, 1, p.pantsDark);
}

// Side view, facing right. Narrower silhouette than the front view: the body is
// about 8px wide, the head has a proper skull + nose profile and the hair is a
// cap with a fringe instead of a triangular blob.
function sideFigure(ctx, p, swing, blink) {
  const hy = HEAD_TOP; // 3
  // ---- legs (back leg first)
  const backLift = swing < 0 ? -swing : 0;
  const frontLift = swing > 0 ? swing : 0;
  const backBottom = 33 - backLift;
  const frontBottom = 33 - frontLift;
  shaft(ctx, 12, LEG_Y, 3, backBottom - LEG_Y, p.pantsDark, '#1a1e28');
  px(ctx, 11, backBottom, 6, 3, shade(p.shoe, -20));
  shaft(ctx, 15, LEG_Y, 4, frontBottom - LEG_Y, p.pants, p.pantsDark);
  px(ctx, 15, frontBottom, 6, 3, p.shoe);
  px(ctx, 15, frontBottom, 6, 1, shade(p.shoe, 26));
  px(ctx, 15, frontBottom + 2, 6, 1, '#15111a');

  // ---- torso (narrow, chest to the right)
  px(ctx, 13, NECK_Y, 3, 2, p.skinDark);
  px(ctx, 12, TORSO_Y, 8, TORSO_B - TORSO_Y, p.shirt);
  px(ctx, 12, TORSO_Y, 8, 2, shade(p.shirt, 14));
  px(ctx, 12, TORSO_Y, 2, TORSO_B - TORSO_Y, p.shirtDark);
  px(ctx, 18, TORSO_Y + 1, 2, TORSO_B - TORSO_Y - 2, shade(p.shirt, -6));
  px(ctx, 12, TORSO_B - 1, 8, 1, shade(p.shirt, -34));
  px(ctx, 12, TORSO_B, 8, 2, p.pants);
  px(ctx, 12, TORSO_B, 8, 1, p.pantsDark);

  // ---- near arm swinging past the torso
  const armSwing = Math.round(swing * 0.7);
  shaft(ctx, 15, TORSO_Y + 1 + armSwing, 3, 6, shade(p.shirt, 6), p.shirtDark);
  px(ctx, 15, TORSO_Y + 7 + armSwing, 3, 3, p.skin);
  px(ctx, 15, TORSO_Y + 9 + armSwing, 3, 1, p.skinDark);

  // ---- head in profile, facing right: simple, clean shapes
  // hair cap
  px(ctx, 14, hy + 0, 6, 1, p.hair);
  px(ctx, 13, hy + 1, 8, 1, p.hair);
  px(ctx, 12, hy + 2, 9, 1, p.hair);
  px(ctx, 14, hy + 0, 4, 1, shade(p.hair, 20));
  // face block
  px(ctx, 14, hy + 3, 7, 6, p.skin);
  px(ctx, 15, hy + 9, 5, 1, p.skin);
  px(ctx, 15, hy + 10, 5, 1, shade(p.skin, -12));
  px(ctx, 14, hy + 3, 7, 1, shade(p.skin, 10));
  px(ctx, 14, hy + 3, 1, 6, shade(p.skin, -14));
  // fringe + brow
  px(ctx, 15, hy + 3, 2, 1, p.hair);
  px(ctx, 17, hy + 4, 2, 1, p.hairDark);
  // eye
  if (blink) {
    px(ctx, 18, hy + 5, 2, 1, '#3d2d33');
  } else {
    px(ctx, 18, hy + 5, 2, 2, '#33252b');
  }
  // nose + cheek
  px(ctx, 21, hy + 5, 1, 2, p.skin);
  px(ctx, 21, hy + 6, 1, 1, shade(p.skin, -18));
  px(ctx, 15, hy + 7, 1, 1, rgba('#c8735f', 0.35));
  // mouth
  px(ctx, 18, hy + 7, 2, 1, shade(p.skin, -30));
  // hair at the back of the head + sideburn
  px(ctx, 11, hy + 3, 3, 7, p.hair);
  px(ctx, 11, hy + 3, 1, 7, p.hairDark);
  px(ctx, 13, hy + 3, 1, 3, shade(p.hair, -6));
  if (p.long) {
    px(ctx, 11, hy + 10, 2, 6, p.hair);
    px(ctx, 10, hy + 11, 1, 6, p.hairDark);
    px(ctx, 12, hy + 10, 1, 6, shade(p.hair, 10));
  }
  // neck: fill the gap between chin and collar so no outline wedge appears
  px(ctx, 15, hy + 11, 4, 3, p.skinDark);
  px(ctx, 14, hy + 10, 1, 1, shade(p.skin, -20));
  px(ctx, 15, hy + 11, 1, 3, shade(p.skin, -26));
}

function cellFor(dir, frame, p) {
  const c = createCanvas(CHAR.cellW, CHAR.cellH);
  const ctx = ctx2d(c);
  const [liftL, liftR] = CYCLE[frame % CYCLE.length];
  const bob = CYCLE[frame % CYCLE.length][2];
  const blink = frame === 3;
  ctx.save();
  ctx.translate(0, -bob);
  if (dir === 'down') {
    frontLegs(ctx, p, liftL, liftR);
    frontTorso(ctx, p, 0, 0);
    frontHead(ctx, p, blink);
  } else if (dir === 'up') {
    frontLegs(ctx, p, liftL, liftR);
    backTorso(ctx, p, 0, 0);
    backHead(ctx, p);
  } else if (dir === 'right') {
    const swing = [0, 2, 3, 0, -2, -3][frame % 6];
    sideFigure(ctx, p, swing, blink);
  } else {
    const t = createCanvas(CHAR.cellW, CHAR.cellH);
    const tctx = ctx2d(t);
    const swing = [0, 2, 3, 0, -2, -3][frame % 6];
    sideFigure(tctx, p, swing, blink);
    ctx.translate(CHAR.cellW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(t, 0, 0);
  }
  ctx.restore();
  addOutline(c, '#181320');
  // contact shadow baked into the cell so it follows the sprite
  const sctx = ctx2d(c);
  sctx.globalCompositeOperation = 'destination-over';
  const g = sctx.createRadialGradient(CHAR.ax, CHAR.ay - 1, 1, CHAR.ax, CHAR.ay - 1, 11);
  g.addColorStop(0, 'rgba(6,5,10,0.30)');
  g.addColorStop(0.6, 'rgba(6,5,10,0.16)');
  g.addColorStop(1, 'rgba(6,5,10,0)');
  sctx.fillStyle = g;
  sctx.beginPath();
  sctx.ellipse(CHAR.ax, CHAR.ay - 1, 10, 3.5, 0, 0, Math.PI * 2);
  sctx.fill();
  return c;
}

export function makeCharacterSheet(palette) {
  const sheet = createCanvas(CHAR.cellW * CHAR.frames, CHAR.cellH * CHAR.dirs.length);
  const sctx = ctx2d(sheet);
  CHAR.dirs.forEach((dir, row) => {
    for (let f = 0; f < CHAR.frames; f++) {
      sctx.drawImage(cellFor(dir, f, palette), f * CHAR.cellW, row * CHAR.cellH);
    }
  });
  return sheet;
}

export function drawCharacter(ctx, sheet, dir, frame, x, y, scale = 1) {
  const row = Math.max(0, CHAR.dirs.indexOf(dir));
  const col = ((frame % CHAR.frames) + CHAR.frames) % CHAR.frames;
  ctx.drawImage(
    sheet,
    col * CHAR.cellW, row * CHAR.cellH, CHAR.cellW, CHAR.cellH,
    Math.round(x - CHAR.ax * scale), Math.round(y - CHAR.ay * scale),
    CHAR.cellW * scale, CHAR.cellH * scale
  );
}
