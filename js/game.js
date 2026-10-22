// Core engine: low-resolution canvas, camera, sorted sprite pass, night lighting.
import { createCanvas, ctx2d, px, clamp, lerp, rgba } from './util.js';
import { C } from './palette.js';
import { CHAR, drawCharacter } from './art/characters.js';

// Pre-rendered radial sprites: blitting a cached light is far cheaper than creating
// a new gradient for every lamp every frame.
const spriteCache = new Map();

function lightSprite(size = 256) {
  const key = 'l' + size;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = createCanvas(size, size);
  const ctx = ctx2d(c);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(0,0,0,0.98)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.68)');
  g.addColorStop(0.78, 'rgba(0,0,0,0.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  spriteCache.set(key, c);
  return c;
}

function glowSprite(color, size = 256) {
  const key = 'g' + color + size;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const c = createCanvas(size, size);
  const ctx = ctx2d(c);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(0.45, rgba(color, 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  spriteCache.set(key, c);
  return c;
}

export class Renderer {
  constructor(w, h) {
    this.resize(w, h);
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this.scene = createCanvas(w, h);
    this.sctx = ctx2d(this.scene);
    this.light = createCanvas(w, h);
    this.lctx = ctx2d(this.light);
    this.camX = 0;
    this.camY = 0;
    // vignette is generated once per size instead of every frame
    this.vignette = createCanvas(w, h);
    const vctx = ctx2d(this.vignette);
    const vg = vctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(4,3,10,0.55)');
    vctx.fillStyle = vg;
    vctx.fillRect(0, 0, w, h);
  }

  // Draws world + sorted actors into this.sctx. camera is the top-left in world px.
  drawWorld(world, camera, actors, player, time) {
    const sctx = this.sctx;
    const { w, h } = this;
    const cx = Math.round(camera.x), cy = Math.round(camera.y);
    this.camX = cx;
    this.camY = cy;
    sctx.clearRect(0, 0, w, h);
    for (const t of world.tiles) {
      if (t.x > cx + w || t.x + t.canvas.width < cx) continue;
      if (t.y > cy + h || t.y + t.canvas.height < cy) continue;
      sctx.drawImage(t.canvas, t.x - cx, t.y - cy);
    }

    const items = [];
    for (const p of world.props) {
      const sp = p.sprite;
      if (!sp) continue;
      if (p.x + sp.w < cx - 4 || p.x - sp.w > cx + w + 4) continue;
      if (p.y < cy - 4 || p.y - sp.h > cy + h + 4) continue;
      items.push({ y: p.y, type: 'prop', p, sp });
    }
    for (const a of actors) {
      if (a.x < cx - 90 || a.x > cx + w + 90 || a.y < cy - 80 || a.y > cy + h + 80) continue;
      items.push({ y: a.y, type: a.type || 'npc', a });
    }
    items.push({ y: player.y, type: 'player', a: player });
    items.sort((m, n) => m.y - n.y);

    for (const it of items) {
      if (it.type === 'prop') {
        sctx.drawImage(it.sp.canvas, Math.round(it.p.x - it.sp.ax - cx), Math.round(it.p.y - it.sp.ay - cy));
      } else if (it.type === 'car') {
        const c = it.a;
        const sp = c.sprite;
        const dx = Math.round(c.x - sp.ax - cx);
        const dy = Math.round(c.y - sp.ay - cy);
        if (c.dir > 0) {
          sctx.save();
          sctx.translate(dx + sp.w, dy);
          sctx.scale(-1, 1);
          sctx.drawImage(sp.canvas, 0, 0);
          sctx.restore();
        } else {
          sctx.drawImage(sp.canvas, dx, dy);
        }
      } else if (it.type === 'npc') {
        const a = it.a;
        drawCharacter(sctx, a.sheet, a.dir, a.frame, a.x - cx, a.y - cy, 1);
      } else if (it.type === 'player') {
        const a = it.a;
        drawCharacter(sctx, a.sheet, a.dir, a.frame, a.x - cx, a.y - cy, 1);
      }
    }
  }

  // Night grading: pre-baked darkness from the static street lamps, plus dynamic
  // holes for the player, traffic and flickering neon signs.
  drawLighting(ctx, world, lights, time, player) {
    const { w, h } = this;
    const lctx = this.lctx;
    const cx = this.camX, cy = this.camY;
    lctx.globalCompositeOperation = 'source-over';
    lctx.clearRect(0, 0, w, h);
    for (const t of world.lightTiles) {
      if (t.x > cx + w || t.x + t.canvas.width < cx) continue;
      if (t.y > cy + h || t.y + t.canvas.height < cy) continue;
      lctx.drawImage(t.canvas, t.x - cx, t.y - cy);
    }

    lctx.globalCompositeOperation = 'destination-out';
    const hole = lightSprite();
    for (const l of lights) {
      const sx = l.x - cx, sy = l.y - cy;
      if (sx < -l.r || sx > w + l.r || sy < -l.r || sy > h + l.r) continue;
      const flick = l.flicker ? 0.94 + Math.sin(time * 3 + l.flicker) * 0.04 + Math.sin(time * 17 + l.flicker * 3) * 0.02 : 1;
      const r = l.r * flick;
      lctx.globalAlpha = Math.min(1, l.strength ?? 1);
      lctx.drawImage(hole, sx - r, sy - r, r * 2, r * 2);
    }
    // the player is always readable
    const px0 = player.x - cx, py0 = player.y - 12 - cy;
    lctx.globalAlpha = 0.8;
    lctx.drawImage(hole, px0 - 86, py0 - 86, 172, 172);
    lctx.globalAlpha = 1;

    ctx.drawImage(this.light, 0, 0);

    // warm bloom on top: baked static glow + dynamic sources
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of world.glowTiles) {
      if (t.x > cx + w || t.x + t.canvas.width < cx) continue;
      if (t.y > cy + h || t.y + t.canvas.height < cy) continue;
      ctx.drawImage(t.canvas, t.x - cx, t.y - cy);
    }
    for (const l of lights) {
      const sx = l.x - cx, sy = l.y - cy;
      if (sx < -l.r * 1.2 || sx > w + l.r * 1.2 || sy < -l.r * 1.2 || sy > h + l.r * 1.2) continue;
      const flick = l.flicker ? 0.94 + Math.sin(time * 3.1 + l.flicker) * 0.04 : 1;
      const r = l.r * 0.9 * flick;
      const col = l.color || C.neonAmber;
      ctx.globalAlpha = Math.min(1, (l.glow ?? 1) * 0.26);
      ctx.drawImage(glowSprite(col), sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // screen-space finishing touches
  drawPost(ctx, w, h, time) {
    ctx.drawImage(this.vignette, 0, 0);
  }
}
