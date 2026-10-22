import { createCanvas } from '@napi-rs/canvas';
globalThis.__createCanvas = (w,h)=>createCanvas(Math.ceil(w),Math.ceil(h));
const { buildStreet } = await import('../js/art/street.js');
const t0 = Date.now();
const w = buildStreet();
console.log('world build', Date.now()-t0, 'ms');
const { Renderer } = await import('../js/game.js');
const { Player, spawnNpcs, spawnCars } = await import('../js/entities.js');
const r = new Renderer(640, 360);
const p = new Player(760, 500);
const npcs = spawnNpcs(); const cars = spawnCars();
const out = createCanvas(640,360); const octx = out.getContext('2d');
let frames = 0; const t1 = Date.now();
const actors = [...npcs, ...cars.map(c=>({...c,type:'car'}))];
const lights = [...w.dynamicLights, ...cars.map(c=>({x:c.x,y:c.y,r:50,color:'#ffdca0'}))];
for (let i=0;i<90;i++) {
  p.update(1/60, {left:false,right:true,up:false,down:false,run:false}, w);
  npcs.forEach(n=>n.update(1/60,p)); cars.forEach(c=>c.update(1/60,p));
  r.drawWorld(w, {x: p.x-320, y: p.y-200}, actors, p, i/60);
  octx.drawImage(r.scene,0,0);
  r.drawLighting(octx, w, lights, i/60, p);
  r.drawPost(octx,640,360,i/60);
  frames++;
}
console.log('frame cost', ((Date.now()-t1)/frames).toFixed(2), 'ms/frame at 640x360');
