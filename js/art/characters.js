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
  player: { hair: '#c9713a', hairDark: '#9a4f27', skin: '#f0c39c', skinDark: '#cf9a74', shirt: '#efe7d2', shirtDark: '#c4b9a2', pants: '#3f5f79', pantsDark: '#2c4557', shoe: '#2a2228', long: true },
  // ---- the street is full of different people: hair, skin, clothes, hats,
  // coats, beards and bags are all palette switches
  npc1: { hair: '#2f2a2c', hairDark: '#1b171a', skin: '#c98d63', skinDark: '#a06a47', shirt: '#4a6b4f', shirtDark: '#37503b', pants: '#2f3446', pantsDark: '#222636', shoe: '#221c22', hat: 'cap', hatColor: '#2b3a45' },
  npc2: { hair: '#8d6a3c', hairDark: '#6b4f2b', skin: '#e7b28c', skinDark: '#c08e69', shirt: '#8d3b45', shirtDark: '#6e2d35', pants: '#4b4038', pantsDark: '#382f29', shoe: '#2b2226', long: true },
  npc3: { hair: '#1b171d', hairDark: '#0f0c11', skin: '#8d5f42', skinDark: '#6d4630', shirt: '#365a72', shirtDark: '#264356', pants: '#3a3540', pantsDark: '#2a2731', shoe: '#1c1820' },
  npc4: { hair: '#d8d2c4', hairDark: '#a9a294', skin: '#e7b28c', skinDark: '#c08e69', shirt: '#6d5580', shirtDark: '#503f60', pants: '#2b3b33', pantsDark: '#1f2b25', shoe: '#2a2228', long: true },
  npc5: { hair: '#3b2a20', hairDark: '#241811', skin: '#f0c39c', skinDark: '#cf9a74', shirt: '#b8483d', shirtDark: '#8d3229', pants: '#2f3542', pantsDark: '#22262f', shoe: '#241f24', hat: 'beanie', hatColor: '#3d4657', beard: true, beardColor: '#3b2a20' },
  npc6: { hair: '#241f26', hairDark: '#141016', skin: '#dca57e', skinDark: '#b57f5c', shirt: '#3a3a46', shirtDark: '#2a2a34', pants: '#26242e', pantsDark: '#1b1a22', shoe: '#151318', coat: true, coatColor: '#2a2935' },
  npc7: { hair: '#1d1a20', hairDark: '#100e13', skin: '#b8815a', skinDark: '#936241', shirt: '#3c4a3c', shirtDark: '#2b362c', pants: '#2d3138', pantsDark: '#212429', shoe: '#1a171d', hat: 'hood', hatColor: '#3c4a3c', bag: true, bagColor: '#4a3a2c' },
  npc8: { hair: '#3a2a25', hairDark: '#241814', skin: '#f2cba6', skinDark: '#d1a37d', shirt: '#c08a3e', shirtDark: '#96682a', pants: '#33323c', pantsDark: '#25242c', shoe: '#211d23', long: true, hat: 'beanie', hatColor: '#8d5f6a' },
  npc9: { hair: '#b9b3a6', hairDark: '#8a8478', skin: '#d9a883', skinDark: '#b2815f', shirt: '#5c5346', shirtDark: '#453e34', pants: '#3d372f', pantsDark: '#2c2822', shoe: '#221e1a', beard: true, beardColor: '#b9b3a6', coat: true, coatColor: '#4a4136' },
  npc10: { hair: '#5e3a24', hairDark: '#412715', skin: '#a86f4b', skinDark: '#855434', shirt: '#2f6d6a', shirtDark: '#21514f', pants: '#3a3442', pantsDark: '#2a2531', shoe: '#1d1921', long: true, bag: true, bagColor: '#6b5340' },
  npc11: { hair: '#171319', hairDark: '#0c0a0e', skin: '#b07a52', skinDark: '#8b5c3a', shirt: '#2f4a6b', shirtDark: '#22374f', pants: '#38343c', pantsDark: '#282530', shoe: '#1a171d', hat: 'cap', hatColor: '#8a4230' },
  npc12: { hair: '#a3552c', hairDark: '#7c3d1e', skin: '#ecbb96', skinDark: '#c79372', shirt: '#456079', shirtDark: '#324757', pants: '#2f2b33', pantsDark: '#211e25', shoe: '#1c1a1f', bag: true, bagColor: '#3b3a44' },
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
  coatFront(ctx, p);
  bagFront(ctx, p);
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
  beardFront(ctx, p);
  hatFront(ctx, p);
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
  hatBack(ctx, p);
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
  coatBack(ctx, p);
  bagBack(ctx, p);
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
  coatSide(ctx, p);
  bagSide(ctx, p);

  // ---- head in profile, facing right. Rows are filled solid so the outline pass
  // never punches holes into the jaw; features are drawn on top afterwards.
  const hairHi = shade(p.hair, 20);
  const hairDk = p.hairDark;
  const sShade = shade(p.skin, -13);
  // skull: hair cap
  px(ctx, 13, hy + 0, 6, 1, p.hair);
  px(ctx, 12, hy + 1, 8, 1, p.hair);
  px(ctx, 12, hy + 2, 8, 1, p.hair);
  px(ctx, 14, hy + 0, 3, 1, hairHi);
  px(ctx, 15, hy + 1, 4, 1, hairHi);
  // face block (forehead → jaw). The nose and the lips are steps in the front
  // edge rather than separate pixels, so the outline follows a smooth profile.
  px(ctx, 14, hy + 3, 6, 1, p.skin);   // forehead    14..19
  px(ctx, 14, hy + 4, 6, 1, p.skin);   // brow        14..19
  px(ctx, 14, hy + 5, 6, 1, p.skin);   // eye         14..19
  px(ctx, 14, hy + 6, 7, 1, p.skin);   // nose bridge 14..20
  px(ctx, 14, hy + 7, 7, 1, p.skin);   // nose tip    14..20
  px(ctx, 14, hy + 8, 6, 1, p.skin);   // lips        14..19
  px(ctx, 14, hy + 9, 6, 1, p.skin);   // chin        14..19
  px(ctx, 15, hy + 10, 5, 1, p.skin);  // jaw         15..19
  // back hair: a clean lock behind the ear, tapering at the jaw
  px(ctx, 12, hy + 3, 2, 5, p.hair);
  px(ctx, 12, hy + 3, 1, 5, hairDk);
  px(ctx, 13, hy + 8, 1, 2, p.hair);
  // fringe: a strand over the temple only, forehead stays visible
  px(ctx, 18, hy + 3, 1, 1, p.hair);
  px(ctx, 13, hy + 4, 1, 4, p.hair);
  // shading down the back of the face + a lit forehead
  px(ctx, 14, hy + 3, 1, 8, sShade);
  px(ctx, 15, hy + 3, 4, 1, shade(p.skin, 9));
  // brow
  px(ctx, 16, hy + 4, 3, 1, hairDk);
  // eye (2x2 dark, no white splash; blink on one frame)
  if (blink) {
    px(ctx, 16, hy + 5, 2, 1, '#3d2d33');
  } else {
    px(ctx, 16, hy + 5, 2, 2, '#30232a');
    px(ctx, 17, hy + 5, 1, 1, shade(p.skin, 26));
  }
  // nostril, cheekbone, mouth and jaw shadow
  px(ctx, 20, hy + 6, 1, 1, shade(p.skin, 12));
  px(ctx, 19, hy + 7, 1, 1, shade(p.skin, -14));
  px(ctx, 16, hy + 7, 2, 1, shade(p.skin, -5));
  px(ctx, 18, hy + 8, 2, 1, shade(p.skin, -28));
  px(ctx, 15, hy + 8, 1, 1, rgba('#c8735f', 0.28));
  px(ctx, 15, hy + 10, 5, 1, shade(p.skin, -10));
  // ear
  px(ctx, 15, hy + 6, 1, 2, shade(p.skin, -16));
  px(ctx, 14, hy + 6, 1, 1, shade(p.skin, -24));
  if (p.long) {
    // long hair falls behind the shoulder and tapers out
    px(ctx, 11, hy + 9, 2, 5, p.hair);
    px(ctx, 10, hy + 11, 1, 5, hairDk);
    px(ctx, 12, hy + 9, 1, 6, shade(p.hair, 12));
    px(ctx, 11, hy + 14, 1, 2, p.hair);
    px(ctx, 10, hy + 14, 1, 2, hairDk);
  }
  beardSide(ctx, p, hy);
  hatSide(ctx, p, hy);
  // neck: fill the gap between chin and collar so no outline wedge appears
  px(ctx, 16, hy + 11, 2, 3, p.skinDark);
  px(ctx, 16, hy + 11, 1, 3, shade(p.skin, -26));
}

// --------------------------------------------------------------- wardrobe
// Hats, beards, coats and bags are drawn on top of the base figure, so one
// sheet generator covers a street full of very different people.
function hatFront(ctx, p) {
  if (!p.hat) return;
  const H = p.hatColor || '#2f2a36';
  const D = shade(H, -20);
  const L = shade(H, 18);
  if (p.hat === 'cap') {
    px(ctx, 10, HEAD_TOP, 10, 3, H);
    px(ctx, 10, HEAD_TOP, 10, 1, L);
    px(ctx, 14, HEAD_TOP, 2, 1, shade(H, 26));
    px(ctx, 9, HEAD_TOP + 3, 12, 2, D);
    px(ctx, 9, HEAD_TOP + 3, 12, 1, shade(H, -2));
  } else if (p.hat === 'beanie') {
    px(ctx, 10, HEAD_TOP - 1, 10, 1, H);
    px(ctx, 9, HEAD_TOP, 12, 4, H);
    px(ctx, 9, HEAD_TOP, 12, 1, L);
    for (let x = 10; x < 20; x += 3) px(ctx, x, HEAD_TOP + 1, 1, 3, shade(H, -12));
    px(ctx, 9, HEAD_TOP + 4, 12, 2, D);
    px(ctx, 9, HEAD_TOP + 4, 12, 1, shade(H, 10));
  } else if (p.hat === 'hood') {
    px(ctx, 11, HEAD_TOP, 8, 1, H);
    px(ctx, 9, HEAD_TOP + 1, 12, 3, H);
    px(ctx, 9, HEAD_TOP + 1, 12, 1, L);
    px(ctx, 8, HEAD_TOP + 4, 2, 9, D);
    px(ctx, 20, HEAD_TOP + 4, 2, 9, D);
    px(ctx, 8, HEAD_TOP + 4, 1, 9, shade(H, -8));
    px(ctx, 21, HEAD_TOP + 4, 1, 9, shade(H, -8));
    px(ctx, 10, HEAD_TOP + 4, 1, 4, shade(H, -22));
    px(ctx, 19, HEAD_TOP + 4, 1, 4, shade(H, -22));
  }
}

function hatSide(ctx, p, hy) {
  if (!p.hat) return;
  const H = p.hatColor || '#2f2a36';
  const D = shade(H, -20);
  const L = shade(H, 18);
  if (p.hat === 'cap') {
    px(ctx, 14, hy + 0, 5, 1, H);
    px(ctx, 13, hy + 1, 7, 1, H);
    px(ctx, 14, hy + 0, 3, 1, L);
    px(ctx, 18, hy + 1, 5, 1, D);        // peak, sticking out over the brow
    px(ctx, 18, hy + 2, 4, 1, shade(H, -6));
  } else if (p.hat === 'beanie') {
    px(ctx, 13, hy + 0, 6, 1, H);
    px(ctx, 12, hy + 1, 8, 2, H);
    px(ctx, 13, hy + 0, 4, 1, L);
    for (let x = 13; x < 20; x += 3) px(ctx, x, hy + 1, 1, 1, shade(H, -14));
    px(ctx, 12, hy + 3, 8, 1, D);
    px(ctx, 12, hy + 3, 3, 1, shade(H, 10));
  } else if (p.hat === 'hood') {
    px(ctx, 13, hy + 0, 6, 1, H);
    px(ctx, 12, hy + 1, 8, 2, H);
    px(ctx, 11, hy + 2, 3, 8, D);
    px(ctx, 14, hy + 3, 1, 6, shade(H, -10));
    px(ctx, 13, hy + 1, 4, 1, L);
    px(ctx, 12, hy + 3, 1, 4, shade(H, -26));
  }
}

function hatBack(ctx, p) {
  if (!p.hat) return;
  const H = p.hatColor || '#2f2a36';
  const D = shade(H, -20);
  const L = shade(H, 18);
  if (p.hat === 'cap') {
    px(ctx, 9, HEAD_TOP, 12, 4, H);
    px(ctx, 10, HEAD_TOP, 10, 1, L);
    px(ctx, 12, HEAD_TOP + 4, 6, 1, D);   // adjuster strap across the back
    px(ctx, 14, HEAD_TOP + 4, 2, 1, shade(H, 14));
  } else if (p.hat === 'beanie') {
    px(ctx, 9, HEAD_TOP, 12, 5, H);
    px(ctx, 10, HEAD_TOP - 1, 10, 1, H);
    px(ctx, 9, HEAD_TOP, 12, 1, L);
    for (let x = 10; x < 20; x += 3) px(ctx, x, HEAD_TOP + 1, 1, 4, shade(H, -12));
    px(ctx, 9, HEAD_TOP + 5, 12, 2, D);
  } else if (p.hat === 'hood') {
    px(ctx, 9, HEAD_TOP, 12, 8, H);
    px(ctx, 9, HEAD_TOP, 10, 1, L);
    px(ctx, 11, HEAD_TOP + 3, 8, 1, shade(H, -12));
    px(ctx, 11, HEAD_TOP + 7, 8, 1, shade(H, -10));
  }
}

function beardFront(ctx, p) {
  if (!p.beard) return;
  const B = p.beardColor || p.hair;
  px(ctx, 11, HEAD_TOP + 9, 8, 3, B);        // jaw + chin rows 12..14
  px(ctx, 11, HEAD_TOP + 9, 8, 1, shade(B, 10));
  px(ctx, 12, HEAD_TOP + 8, 6, 1, shade(B, -8));  // moustache row 11
  px(ctx, 14, HEAD_TOP + 10, 2, 2, shade(B, 6));  // chin tuft
}

function beardSide(ctx, p, hy) {
  if (!p.beard) return;
  const B = p.beardColor || p.hair;
  px(ctx, 15, hy + 9, 5, 2, B);
  px(ctx, 17, hy + 8, 3, 1, shade(B, -8));   // moustache
  px(ctx, 16, hy + 10, 3, 1, shade(B, 6));
  px(ctx, 15, hy + 11, 2, 1, shade(B, -10));
}

// long coat over the torso: covers the hips, keeps the arms free
function coatFront(ctx, p) {
  if (!p.coat) return;
  const K = p.coatColor || '#2b2733';
  const Kd = shade(K, -18);
  const Kl = shade(K, 14);
  px(ctx, 9, TORSO_Y + 1, 12, TORSO_B + 4 - TORSO_Y, K);
  px(ctx, 9, TORSO_Y + 1, 12, 1, Kl);
  px(ctx, 9, TORSO_Y + 1, 2, TORSO_B + 4 - TORSO_Y, Kd);
  px(ctx, 19, TORSO_Y + 1, 2, TORSO_B + 4 - TORSO_Y, Kd);
  px(ctx, 14, TORSO_Y + 2, 2, TORSO_B + 2 - TORSO_Y, shade(K, -30));  // opening
  px(ctx, 12, TORSO_Y + 1, 2, 4, shade(K, 8));                        // lapel
  px(ctx, 18, TORSO_Y + 1, 2, 4, shade(K, 8));
  for (let y = TORSO_Y + 5; y < TORSO_B + 3; y += 3) px(ctx, 15, y, 1, 1, '#cfc7b6');
}

function coatSide(ctx, p) {
  if (!p.coat) return;
  const K = p.coatColor || '#2b2733';
  const Kd = shade(K, -18);
  px(ctx, 12, TORSO_Y + 1, 8, TORSO_B + 4 - TORSO_Y, K);
  px(ctx, 12, TORSO_Y + 1, 8, 1, shade(K, 14));
  px(ctx, 12, TORSO_Y + 1, 2, TORSO_B + 4 - TORSO_Y, Kd);
  px(ctx, 18, TORSO_Y + 1, 2, TORSO_B + 2 - TORSO_Y, shade(K, -6));
  px(ctx, 19, TORSO_Y + 2, 1, 5, shade(K, 10));
}

function coatBack(ctx, p) {
  if (!p.coat) return;
  const K = p.coatColor || '#2b2733';
  const Kd = shade(K, -18);
  px(ctx, 10, TORSO_Y + 1, 10, TORSO_B + 4 - TORSO_Y, K);
  px(ctx, 10, TORSO_Y + 1, 10, 1, shade(K, 10));
  px(ctx, 10, TORSO_Y + 1, 2, TORSO_B + 4 - TORSO_Y, Kd);
  px(ctx, 18, TORSO_Y + 1, 2, TORSO_B + 4 - TORSO_Y, Kd);
  px(ctx, 14, TORSO_Y + 3, 2, TORSO_B + 1 - TORSO_Y, shade(K, -26)); // back seam
}

function bagFront(ctx, p) {
  if (!p.bag) return;
  const B = p.bagColor || '#4a3a2c';
  for (let i = 0; i < 6; i++) px(ctx, 11 + i, TORSO_Y + i, 1, 1, shade(B, -10));  // strap
  px(ctx, 16, TORSO_B - 3, 5, 5, B);
  px(ctx, 16, TORSO_B - 3, 5, 1, shade(B, 16));
  px(ctx, 18, TORSO_B - 2, 1, 2, shade(B, -24));
}

function bagSide(ctx, p) {
  if (!p.bag) return;
  const B = p.bagColor || '#4a3a2c';
  px(ctx, 17, TORSO_Y + 1, 2, 6, shade(B, -10));
  px(ctx, 16, TORSO_B - 3, 5, 5, B);
  px(ctx, 16, TORSO_B - 3, 5, 1, shade(B, 16));
  px(ctx, 16, TORSO_B + 1, 5, 1, shade(B, -24));
}

function bagBack(ctx, p) {
  if (!p.bag) return;
  const B = p.bagColor || '#4a3a2c';
  px(ctx, 17, TORSO_Y + 1, 2, TORSO_B - TORSO_Y - 2, shade(B, -10));
  px(ctx, 15, TORSO_B - 3, 5, 5, B);
  px(ctx, 15, TORSO_B - 3, 5, 1, shade(B, 16));
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
