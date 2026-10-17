import assert from 'node:assert/strict';
import {crowdStep,separateOverlap,occupiedDestination,angleDelta,type CrowdBody,type Avoidance} from '../src/scene/crowdMotion';
import {planWalk} from '../src/scene/navigation';
import {IdleDirector,IDLE_DELAY,OBSERVE_SHOT} from '../src/scene/idleDirector';
const body=(x:number,z:number):CrowdBody=>({x,z,r:.5,layer:'ground',moving:false,vx:0,vz:0});
for(const fps of [20,30,60])for(const count of [2,4,8]){
 const bodies=new Map<number,CrowdBody>(),goals=new Map<number,{x:number;z:number}>(),memory=new Map<number,Avoidance>();
 for(let id=1;id<=count;id++){const a=(id-1)*2*Math.PI/count;bodies.set(id,body(Math.cos(a)*5,Math.sin(a)*5));goals.set(id,{x:-Math.cos(a)*5,z:-Math.sin(a)*5});memory.set(id,{blocker:null,side:1});}
 let min=Infinity,lateTravel=0;
 for(let frame=0;frame<fps*30;frame++)for(const[id,b]of bodies){
  const target=goals.get(id)!,done=Math.hypot(b.x-target.x,b.z-target.z)<.06;
  const next=done?{x:b.x,z:b.z}:crowdStep(id,b,target,.5,'ground',1.2,1/fps,bodies,memory.get(id)!);
  separateOverlap(id,next,.5,'ground',1/fps,bodies);
  const vx=(next.x-b.x)*fps,vz=(next.z-b.z)*fps;
  if(frame>fps*25)lateTravel+=Math.hypot(next.x-b.x,next.z-b.z);
  bodies.set(id,{...b,...next,vx,vz,moving:Math.hypot(vx,vz)>.001});
  for(const[o,c]of bodies)if(o!==id)min=Math.min(min,Math.hypot(next.x-c.x,next.z-c.z));
 }
 assert.ok(min>=1.079,`${fps}fps/${count}: no penetrations (${min})`);
 assert.ok(lateTravel<.01,`${fps}fps/${count}: no persistent oscillation`);
 for(const[id,b]of bodies){const t=goals.get(id)!;assert.ok(Math.hypot(b.x-t.x,b.z-t.z)<.061,`${fps}fps/${count}: reach destinations`);}
}
// Identical spawn coordinates recover without forcing the lower-priority body back.
const overlaps=new Map([[1,body(0,0)],[2,body(0,0)],[3,body(0,0)]]);
for(let f=0;f<300;f++)for(const[id,b]of overlaps)separateOverlap(id,b,.5,'ground',1/60,overlaps);
for(const[id,b]of overlaps)for(const[o,c]of overlaps)if(o!==id)assert.ok(Math.hypot(b.x-c.x,b.z-c.z)>1.075);
const settled=JSON.stringify([...overlaps]);for(let f=0;f<120;f++)for(const[id,b]of overlaps)separateOverlap(id,b,.5,'ground',1/60,overlaps);assert.equal(JSON.stringify([...overlaps]),settled);
assert.equal(occupiedDestination(2,{x:0,z:0},.5,'ground',overlaps),true);
assert.equal(occupiedDestination(2,{x:0,z:0},.5,'air',overlaps),false);
assert.ok(Math.abs(angleDelta(Math.PI-.02,-Math.PI+.02)-.04)<1e-8);
// A stationary neighbour must alter this path without poisoning the cached static grid.
const from={x:0,z:4},to={x:1,z:2},original=planWalk(from,to);
const occupied=[{...original.at(-1)!,r:.6}],detour=planWalk(from,to,.82,occupied);
assert.ok(detour.every(p=>Math.hypot(p.x-occupied[0].x,p.z-occupied[0].z)>=1.54));
assert.deepEqual(planWalk(from,to),original);
const director=new IdleDirector(0),actors=[{id:25,activity:'eat',moving:false},{id:133,activity:'explore',moving:true},{id:1,activity:'play',moving:false}];
assert.equal(director.tick(IDLE_DELAY-1,true,actors),null);
const first=director.tick(IDLE_DELAY,true,actors);assert.notEqual(first,null);
assert.equal(director.tick(IDLE_DELAY+OBSERVE_SHOT-1,true,actors),first);
const second=director.tick(IDLE_DELAY+OBSERVE_SHOT,true,actors);assert.notEqual(first,second);
const third=director.tick(IDLE_DELAY+OBSERVE_SHOT*2,true,actors);assert.equal(new Set([first,second,third]).size,3);
director.interrupt(90_000);assert.equal(director.tick(90_001,true,actors),null);
assert.equal(director.tick(140_000,false,actors),null);assert.equal(director.tick(140_001,true,actors),null);
assert.notEqual(director.tick(185_000,true,actors),null);
assert.equal(director.tick(185_001,true,[]),null);
assert.equal(director.tick(230_002,true,[actors[1]]),133);
assert.equal(director.tick(230_003,true,[actors[0]]),25,'removed subject is replaced');
console.log('PASS: 20/30/60fps head-on and 4/8-way crowds, overlap recovery, settled stability, layer separation, occupied path cache, angle wrap, idle delay, fair coverage, interrupts, disabled/empty/removed subjects.');

