// Actors: the player, wandering pedestrians and passing traffic.
import { CHAR, makeCharacterSheet, PALETTES } from './art/characters.js';
import { getProp } from './art/props.js';
import { WORLD } from './art/buildings.js';
import { clamp } from './util.js';

let sheetCache = new Map();
export function sheetFor(name) {
  if (!sheetCache.has(name)) sheetCache.set(name, makeCharacterSheet(PALETTES[name] || PALETTES.player));
  return sheetCache.get(name);
}

const SIDEWALK_N = WORLD.top + 12;
const SIDEWALK_N_END = WORLD.sidewalkN - 14;
const SIDEWALK_S_BEGIN = WORLD.laneS + 14;
const SIDEWALK_S_END = WORLD.sidewalkS - 12;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dir = 'down';
    this.frame = 0;
    this.animTime = 0;
    this.speedWalk = 46;
    this.speedRun = 82;
    this.hp = 100;
    this.stamina = 50;
    this.cash = 1250;
    this.sheet = sheetFor('player');
    this.moving = false;
    this.bumpCooldown = 0;
  }

  update(dt, input, world) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    const wantRun = input.run && this.moving && this.stamina > 2;
    const speed = wantRun ? this.speedRun : this.speedWalk;

    if (this.moving) {
      dx /= len; dy /= len;
      // face the dominant axis
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? 'right' : 'left';
      else this.dir = dy > 0 ? 'down' : 'up';
      this.moveWithCollision(dx * speed * dt, dy * speed * dt, world);
      this.animTime += dt * (wantRun ? 11 : 7.5);
      this.frame = Math.floor(this.animTime) % CHAR.frames;
    } else {
      this.animTime += dt * 1.6;
      this.frame = 0;
    }

    // stamina drain / regen
    if (wantRun) this.stamina = Math.max(0, this.stamina - dt * 9);
    else this.stamina = Math.min(50, this.stamina + dt * (this.moving ? 4 : 7));

    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    if (this.hp < 100) this.hp = Math.min(100, this.hp + dt * 1.5);
  }

  rectAt(x, y) {
    return { x: x - 5, y: y - 6, w: 10, h: 8 };
  }

  collides(x, y, world) {
    const r = this.rectAt(x, y);
    for (const s of world.solids) {
      if (r.x + r.w <= s.x || r.x >= s.x + s.w || r.y + r.h <= s.y || r.y >= s.y + s.h) continue;
      return true;
    }
    return false;
  }

  moveWithCollision(dx, dy, world) {
    const nx = clamp(this.x + dx, 14, WORLD.w - 14);
    if (!this.collides(nx, this.y, world)) this.x = nx;
    const ny = clamp(this.y + dy, 26, WORLD.h - 16);
    if (!this.collides(this.x, ny, world)) this.y = ny;
  }

  damage(n, fromX, fromY) {
    this.hp = Math.max(0, this.hp - n);
    this.bumpCooldown = 0.6;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.x = clamp(this.x + Math.cos(a) * 12, 14, WORLD.w - 14);
    this.y = clamp(this.y + Math.sin(a) * 12, 26, WORLD.h - 16);
  }
}

const NPC_NAMES = ['npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6', 'npc7', 'npc8', 'npc9', 'npc10', 'npc11', 'npc12'];
const IDLE_SPOTS = [
  [760, 470, 'down'], [980, 300, 'down'], [1380, 486, 'left'], [1700, 452, 'down'],
  [2140, 320, 'right'], [520, 400, 'down'], [430, 520, 'left'], [1900, 540, 'up'],
];

export class Npc {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.homeY = y;
    this.dir = opts.dir || 'down';
    this.frame = 0;
    this.animTime = Math.random() * 4;
    this.speed = opts.speed ?? 15 + Math.random() * 12;
    this.sheet = sheetFor(NPC_NAMES[(Math.random() * NPC_NAMES.length) | 0]);
    this.state = opts.state || 'walk';
    this.timer = 1 + Math.random() * 3;
    this.targetX = x;
    this.targetY = y;
    this.zone = opts.zone; // {x0,x1,y0,y1}
    this.moving = true;
    this.pickTarget();
  }

  pickTarget() {
    const z = this.zone;
    this.targetX = z.x0 + Math.random() * (z.x1 - z.x0);
    this.targetY = z.y0 + Math.random() * (z.y1 - z.y0);
    this.timer = 2 + Math.random() * 5;
  }

  update(dt, player) {
    this.timer -= dt;
    if (this.timer <= 0 && this.state === 'walk') {
      this.state = 'idle';
      this.timer = 1 + Math.random() * 3;
      this.moving = false;
    } else if (this.timer <= 0 && this.state === 'idle') {
      this.state = 'walk';
      this.pickTarget();
      this.moving = true;
    }
    if (this.state === 'walk') {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        this.moving = false;
      } else {
        const vx = (dx / d) * this.speed * dt;
        const vy = (dy / d) * this.speed * dt;
        this.x += vx;
        this.y += vy;
        this.moving = true;
        if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'right' : 'left';
        else this.dir = vy > 0 ? 'down' : 'up';
      }
    }
    // give the player some personal space
    const pdx = this.x - player.x, pdy = this.y - player.y;
    const pd = Math.hypot(pdx, pdy);
    if (pd < 12 && pd > 0.01) {
      this.x += (pdx / pd) * (12 - pd) * 0.6;
      this.y += (pdy / pd) * (12 - pd) * 0.6;
    }
    if (this.moving) {
      this.animTime += dt * 6;
      this.frame = Math.floor(this.animTime) % CHAR.frames;
    } else {
      this.frame = 0;
    }
  }
}

export function spawnNpcs() {
  const npcs = [];
  const lanes = [
    { x0: 40, x1: WORLD.w - 40, y0: SIDEWALK_N + 12, y1: SIDEWALK_N_END },
    { x0: 40, x1: WORLD.w - 40, y0: SIDEWALK_S_BEGIN, y1: SIDEWALK_S_END },
  ];
  for (let i = 0; i < 16; i++) {
    const z = lanes[i % 2];
    const x = z.x0 + 40 + Math.random() * (z.x1 - z.x0 - 80);
    npcs.push(new Npc(x, z.y0 + Math.random() * (z.y1 - z.y0), { zone: z }));
  }
  // a couple of people in the park
  const parkZone = { x0: 210, x1: 445, y0: 300, y1: 425 };
  npcs.push(new Npc(300, 360, { zone: parkZone, state: 'idle' }));
  npcs.push(new Npc(400, 320, { zone: parkZone }));
  return npcs;
}

function clampSpeed(v, max) {
  return Math.max(-max, Math.min(max, v));
}

export class Car {
  constructor(dir, lane, speed, seed, kind, color) {
    this.dir = dir; // 1 east, -1 west
    this.lane = lane;
    this.speed = speed;
    this.sprite = getProp(kind, seed, color);
    this.kind = kind;
    this.x = dir > 0 ? -120 - Math.random() * 400 : WORLD.w + 120 + Math.random() * 400;
    this.y = lane;
    this.seed = seed;
  }

  update(dt, player) {
    // brake for the player standing in the lane ahead
    let target = this.speed;
    if (player) {
      const ahead = (player.x - this.x) * this.dir;
      if (ahead > 0 && ahead < 150 && Math.abs(player.y - this.y) < 26) {
        target = ahead < 46 ? 0 : this.speed * 0.25;
      }
    }
    this.speedNow = this.speedNow === undefined ? this.speed : this.speedNow;
    this.speedNow += clampSpeed(target - this.speedNow, 190 * dt);
    this.x += this.dir * this.speedNow * dt;
    this.braking = this.speedNow < this.speed * 0.85;
    if (this.dir > 0 && this.x > WORLD.w + 140) this.x = -140;
    if (this.dir < 0 && this.x < -140) this.x = WORLD.w + 140;
  }
}

export function spawnCars() {
  const cars = [];
  const eastLane = WORLD.laneN + 34;
  const westLane = WORLD.roadS - 34;
  const palette = ['#8d3b34', '#2f4f7a', '#5a5f6b', '#38614d', '#7a6a3a', '#43414f', '#8d8a90'];
  for (let i = 0; i < 4; i++) {
    const kind = Math.random() < 0.2 ? 'van' : 'car';
    cars.push(new Car(1, eastLane + (Math.random() * 6 - 3), 62 + Math.random() * 40, 100 + i, kind, palette[(Math.random() * palette.length) | 0]));
  }
  for (let i = 0; i < 4; i++) {
    const kind = Math.random() < 0.2 ? 'van' : 'car';
    cars.push(new Car(-1, westLane + (Math.random() * 6 - 3), 58 + Math.random() * 44, 200 + i, kind, palette[(Math.random() * palette.length) | 0]));
  }
  return cars;
}
