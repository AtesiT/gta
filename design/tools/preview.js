// Dev-only raster preview of design/styles.html — no browser available in this sandbox.
// Implements a tiny subset of the Canvas2D API so the exact same drawing code can be
// rendered to PNG for inspection. Not part of the game.
const fs = require('fs');
const zlib = require('zlib');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(ROOT, 'design/styles.html'), 'utf8');
const script = html.split('<script>')[1].split('//__ART_END__')[0];

function parseColor(s) {
  if (typeof s !== 'string') return [0, 0, 0, 0];
  s = s.trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map(v => parseFloat(v.trim()));
    const a = p.length > 3 ? (p[3] <= 1 ? p[3] * 255 : p[3]) : 255;
    return [p[0], p[1], p[2], a];
  }
  return [255, 0, 255, 255];
}

class Grad {
  constructor(kind, args, stops) { this.kind = kind; this.args = args; this.stops = []; }
  addColorStop(t, c) { this.stops.push([t, parseColor(c)]); this.stops.sort((a, b) => a[0] - b[0]); }
  at(x, y) {
    let t;
    if (this.kind === 'radial') {
      const [x0, y0, r0, x1, y1, r1] = this.args;
      const d = Math.hypot(x - x0, y - y0);
      t = (d - r0) / Math.max(0.0001, r1 - r0);
    } else {
      const [x0, y0, x1, y1] = this.args;
      const dx = x1 - x0, dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      t = ((x - x0) * dx + (y - y0) * dy) / len2;
    }
    t = Math.max(0, Math.min(1, t));
    if (!this.stops.length) return [0, 0, 0, 0];
    if (t <= this.stops[0][0]) return this.stops[0][1].slice();
    for (let i = 0; i < this.stops.length - 1; i++) {
      const a = this.stops[i], b = this.stops[i + 1];
      if (t >= a[0] && t <= b[0]) {
        const k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k,
                a[1][2] + (b[1][2] - a[1][2]) * k, a[1][3] + (b[1][3] - a[1][3]) * k];
      }
    }
    return this.stops[this.stops.length - 1][1].slice();
  }
}

class Ctx {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Float32Array(w * h * 3);
    this.fillStyle = '#000000';
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.stack = [];
  }
  save() { this.stack.push({ a: this.globalAlpha, c: this.globalCompositeOperation }); }
  restore() { const s = this.stack.pop(); if (s) { this.globalAlpha = s.a; this.globalCompositeOperation = s.c; } }
  drawImage(img, dx, dy, dw, dh) {
    dw = dw === undefined ? img.width : dw;
    dh = dh === undefined ? img.height : dh;
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const sx = Math.min(img.width - 1, Math.floor(x * img.width / dw));
        const sy = Math.min(img.height - 1, Math.floor(y * img.height / dh));
        const c = img.colorAt(sx, sy);
        this._px(Math.round(dx) + x, Math.round(dy) + y, c[0], c[1], c[2], c[3] / 255 * this.globalAlpha);
      }
    }
  }
  colorAt(x, y) {
    x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, y | 0));
    const i = (y * this.w + x) * 3;
    return [this.data[i], this.data[i + 1], this.data[i + 2], 255];
  }
  _px(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const i = (y * this.w + x) * 3;
    if (this.globalCompositeOperation === 'lighter') {
      this.data[i] += r * a; this.data[i + 1] += g * a; this.data[i + 2] += b * a;
    } else {
      const k = Math.min(1, a);
      this.data[i] = this.data[i] * (1 - k) + r * k;
      this.data[i + 1] = this.data[i + 1] * (1 - k) + g * k;
      this.data[i + 2] = this.data[i + 2] * (1 - k) + b * k;
    }
  }
  fillRect(x, y, w, h) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const grad = this.fillStyle instanceof Grad ? this.fillStyle : null;
    const col = grad ? null : parseColor(this.fillStyle);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        let c = grad ? grad.at(xx + 0.5, yy + 0.5) : col;
        this._px(xx, yy, c[0], c[1], c[2], (c[3] / 255) * this.globalAlpha);
      }
    }
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Grad('radial', [x0, y0, r0, x1, y1, r1]); }
  createLinearGradient(x0, y0, x1, y1) { return new Grad('linear', [x0, y0, x1, y1]); }
}

function makeCanvas(w, h) {
  const ctx = new Ctx(w, h);
  const canvas = { width: w, height: h, getContext: () => ctx, _ctx: ctx,
    colorAt: (x, y) => ctx.colorAt(x, y) };
  return canvas;
}

const sandbox = { console, Math, document: { createElement: t => makeCanvas(1, 1) } };
vm.createContext(sandbox);
vm.runInContext(script + '\n;globalThis.__STYLES = STYLES;', sandbox);
const STYLES = sandbox.__STYLES;

function renderStyle(style) {
  const S = style.S;
  const src = makeCanvas(S, S);
  const a = sandbox.makeEnv(src.getContext('2d'), S, style.seed);
  style.draw(a);
  let out = src;
  if (style.block && style.block > 1) {
    const bs = Math.floor(S / style.block);
    const half = makeCanvas(bs, bs);
    half.getContext('2d').drawImage(src, 0, 0, bs, bs);
    out = half;
  }
  const disp = makeCanvas(200, 200);
  disp.getContext('2d').drawImage(out, 0, 0, 200, 200);
  return disp;
}

module.exports = { Ctx, makeCanvas, makeEnv: sandbox.makeEnv, STYLES, renderStyle };

const tiles = STYLES.map(renderStyle);

// contact sheet
const COLS = 5, GAP = 10, PAD = 0, CELL = 200;
const W = COLS * CELL + (COLS + 1) * GAP;
const ROWS = Math.ceil(tiles.length / COLS);
const H = ROWS * CELL + (ROWS + 1) * GAP;
const sheet = makeCanvas(W, H);
sheet.getContext('2d').fillStyle = '#101014';
sheet.getContext('2d').fillRect(0, 0, W, H);
tiles.forEach((t, i) => {
  const cx = GAP + (i % COLS) * (CELL + GAP);
  const cy = GAP + Math.floor(i / COLS) * (CELL + GAP);
  sheet.getContext('2d').drawImage(t, cx, cy, CELL, CELL);
});

// PNG encode
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(canvas, file) {
  const { width: w, height: h } = canvas;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c = canvas.getContext('2d').colorAt(x, y);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      const fix = v => Math.max(0, Math.min(255, isFinite(v) ? v : 0));
      raw[o] = fix(c[0]);
      raw[o + 1] = fix(c[1]);
      raw[o + 2] = fix(c[2]);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}

const outDir = path.join(ROOT, 'design/preview');
fs.mkdirSync(outDir, { recursive: true });
writePNG(sheet, path.join(outDir, 'contact-sheet.png'));
tiles.forEach((t, i) => {
  writePNG(t, path.join(outDir, String(i + 1).padStart(2, '0') + '-' + STYLES[i].id + '.png'));
});
console.log('rendered', tiles.length, 'styles ->', outDir, 'sheet', W + 'x' + H);
