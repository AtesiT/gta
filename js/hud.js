// HUD: character portrait, health / stamina bars, minimap, hints. Drawn on the
// low-res canvas so it shares the world's pixel grid.
import { createCanvas, ctx2d, px, drawText, textWidth, rgba, shade } from './util.js';

const UI = {
  panel: '#1d1a28',
  panelLight: '#2c2839',
  border: '#4f4a60',
  borderLight: '#6f697f',
  hp: '#5fbf4a',
  sp: '#4a9fe0',
  gold: '#e2c07a',
  text: '#e9e3d4',
  textDim: '#a29bb0',
};

export class Hud {
  constructor() {
    this.canvas = createCanvas(1, 1);
    this.ctx = ctx2d(this.canvas);
    this.miniMap = null;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = ctx2d(this.canvas);
  }

  buildMiniMap(world) {
    const scale = 1 / 6;
    const w = Math.ceil(world.w * scale);
    const h = Math.ceil(world.h * scale);
    const c = createCanvas(w, h);
    const ctx = ctx2d(c);
    const S = (v) => Math.round(v * scale);
    px(ctx, 0, 0, w, h, '#241f2e');
    px(ctx, 0, 0, w, S(440), '#463c58');           // north block
    px(ctx, S(180), 0, S(290), S(440), '#3a6349'); // park
    px(ctx, 0, S(440), w, S(130), '#8b8598');      // north sidewalk
    px(ctx, 0, S(570), w, S(198), '#5c5870');      // road
    px(ctx, 0, S(768), w, S(122), '#8b8598');      // south sidewalk
    px(ctx, 0, S(890), w, h - S(890), '#4c4358');  // rooftops
    px(ctx, 0, S(672), w, 1, rgba(UI.gold, 0.65)); // centre line
    for (let y = S(580); y < S(766); y += 3) px(ctx, S(1180), y, 4, 1, '#b0a9bc'); // crossing
    // parked cars / street furniture as tiny dots
    px(ctx, S(300), S(622), 6, 2, '#8d3b34');
    px(ctx, S(840), S(622), 6, 2, '#2f4f7a');
    this.miniMap = c;
    this.miniScale = scale;
    return c;
  }

  panel(ctx, x, y, w, h) {
    px(ctx, x + 1, y + 1, w - 1, h - 1, 'rgba(0,0,0,0.35)');
    px(ctx, x, y, w, h, UI.panel);
    px(ctx, x, y, w, 1, UI.borderLight);
    px(ctx, x, y, 1, h, UI.border);
    px(ctx, x, y + h - 1, w, 1, '#0d0b13');
    px(ctx, x + w - 1, y, 1, h, '#0d0b13');
    px(ctx, x + 1, y + h - 2, w - 2, 1, '#262232');
  }

  drawBar(ctx, x, y, w, h, value, max, colA, colB) {
    px(ctx, x - 1, y - 1, w + 2, h + 2, '#0b0910');
    px(ctx, x, y, w, h, '#242030');
    const ratio = Math.max(0, Math.min(1, value / max));
    const fill = Math.round((w - 2) * ratio);
    if (fill > 0) {
      px(ctx, x + 1, y + 1, fill, h - 2, colA);
      px(ctx, x + 1, y + 1, fill, Math.max(1, Math.floor((h - 2) / 2)), colB);
      px(ctx, x + 1, y + h - 2, fill, 1, shade(colA, -32));
    }
    for (let i = 1; i < 10; i++) {
      px(ctx, x + Math.round(((w - 2) * i) / 10), y + 1, 1, h - 2, 'rgba(0,0,0,0.22)');
    }
  }

  portrait(ctx, x, y, w, h, sheet) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#372c40');
    g.addColorStop(1, '#1b1926');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const rg = ctx.createRadialGradient(x + w / 2, y + h * 0.55, 2, x + w / 2, y + h * 0.55, w * 0.75);
    rg.addColorStop(0, 'rgba(255,196,122,0.20)');
    rg.addColorStop(1, 'rgba(255,196,122,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, y, w, h);
    // bust: crop the head + shoulders from the front-facing frame, integer 2x scale
    const sc = 2;
    const bw = 24 * sc, bh = 26 * sc;
    ctx.drawImage(sheet, 3, 0, 24, 26, x + Math.round((w - bw) / 2), y + Math.round((h - bh) / 2), bw, bh);
    px(ctx, x, y, w, 1, 'rgba(0,0,0,0.5)');
    px(ctx, x, y + h - 1, w, 1, 'rgba(0,0,0,0.5)');
    px(ctx, x + w - 1, y, 1, h, 'rgba(0,0,0,0.5)');
  }

  draw(ctx, state) {
    const { player, npcs, time, showHelp, fps } = state;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.imageSmoothingEnabled = false;

    // ---------------------------------------------------------- status panel
    const panelW = 226, panelH = 78;
    const x0 = 12, y0 = 12;
    this.panel(ctx, x0, y0, panelW, panelH);
    const px0 = x0 + 7, py0 = y0 + 8, pw = 52, ph = 62;
    this.portrait(ctx, px0, py0, pw, ph, state.sheet);
    drawText(ctx, 'PLAYER: KIRA', x0 + 68, y0 + 9, UI.text, 1);
    this.drawBar(ctx, x0 + 68, y0 + 25, 108, 11, player.hp, 100, UI.hp, shade(UI.hp, 24));
    drawText(ctx, 'HP', x0 + 182, y0 + 27, UI.text, 1);
    this.drawBar(ctx, x0 + 68, y0 + 45, 108, 11, player.stamina, 50, UI.sp, shade(UI.sp, 28));
    drawText(ctx, 'SP', x0 + 182, y0 + 47, UI.text, 1);
    drawText(ctx, `${Math.round(player.hp)}/100`, x0 + 68, y0 + 61, UI.textDim, 1);
    drawText(ctx, `${Math.round(player.stamina)}/50`, x0 + 130, y0 + 61, UI.textDim, 1);

    // ---------------------------------------------------------- cash / clock
    const mw = 144, mh = 34;
    const mx = 12, my = y0 + panelH + 6;
    this.panel(ctx, mx, my, mw, mh);
    drawText(ctx, 'CASH', mx + 8, my + 6, UI.textDim, 1);
    drawText(ctx, '$' + player.cash, mx + 8, my + 18, UI.hp, 1);
    drawText(ctx, state.clockString, mx + mw - 8 - textWidth(state.clockString), my + 6, UI.gold, 1);
    drawText(ctx, state.district, mx + mw - 8 - textWidth(state.district), my + 18, UI.textDim, 1);

    // ---------------------------------------------------------- minimap
    const mmSize = 118;
    const mmx = W - mmSize - 14, mmy = 14;
    const mcx = mmx + mmSize / 2, mcy = mmy + mmSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mcx, mcy, mmSize / 2, 0, Math.PI * 2);
    ctx.clip();
    px(ctx, mmx, mmy, mmSize, mmSize, '#12101a');
    const map = this.miniMap;
    if (map) {
      const zoom = 2.4;
      const viewW = mmSize / zoom, viewH = mmSize / zoom;
      const cx = player.x * this.miniScale, cy = player.y * this.miniScale;
      ctx.drawImage(map, cx - viewW / 2, cy - viewH / 2, viewW, viewH, mmx, mmy, mmSize, mmSize);
      for (const n of npcs) {
        const bx = mcx + (n.x - player.x) * this.miniScale * zoom;
        const by = mcy + (n.y - player.y) * this.miniScale * zoom;
        if ((bx - mcx) ** 2 + (by - mcy) ** 2 < (mmSize / 2 - 3) ** 2) px(ctx, bx, by, 1, 1, rgba('#ffd08a', 0.8));
      }
      // player marker: little arrow pointing the way they face
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const [dx, dy] = dirs[player.dir] || [0, 1];
      px(ctx, mcx - 4, mcy - 4, 9, 9, 'rgba(10,8,14,0.9)');
      for (let i = -1; i <= 1; i++) px(ctx, mcx + i, mcy - 1, 1, 3, '#eaf7de');
      px(ctx, mcx + dx * 2 - 1, mcy + dy * 2 - 1, 3, 3, '#7fe05a');
      px(ctx, mcx + dx * 3 - 1, mcy + dy * 3 - 1, 2, 2, '#b6ff8f');
    }
    ctx.restore();
    ctx.strokeStyle = '#0b0910';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(mcx, mcy, mmSize / 2 + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = UI.borderLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mcx, mcy, mmSize / 2 + 3, 0, Math.PI * 2);
    ctx.stroke();

    // ---------------------------------------------------------- hint
    if (state.hint) {
      const tw = textWidth(state.hint, 1);
      const hx = Math.round(W / 2 - tw / 2) - 8;
      const hy = H - 58;
      this.panel(ctx, hx, hy, tw + 16, 20);
      drawText(ctx, state.hint, hx + 8, hy + 7, UI.text, 1);
    }

    // ---------------------------------------------------------- help
    if (showHelp) {
      const lines = [
        'WASD / ARROWS - MOVE',
        'SHIFT - RUN    E - INTERACT',
        'H - HELP',
      ];
      let wMax = 0;
      for (const l of lines) wMax = Math.max(wMax, textWidth(l, 1));
      const bx = 12, by = H - 12 - (lines.length * 11 + 12);
      this.panel(ctx, bx, by, wMax + 18, lines.length * 11 + 12);
      lines.forEach((l, i) => drawText(ctx, l, bx + 9, by + 7 + i * 11, i === 0 ? UI.text : UI.textDim));
    }

    drawText(ctx, 'FPS ' + Math.round(fps), W - 54, H - 16, 'rgba(160,152,175,0.5)');
  }
}
