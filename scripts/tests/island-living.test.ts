import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migratePersonalities,preference,rememberTogether,setFurniture,furnitureAffinity,storyTrail,validLiving } from '../../src/lib/islandLiving';
import type { SaveData } from '../../src/types';
import { togetherSession } from '../../src/scene/together';
import { IdleDirector,IDLE_DELAY,OBSERVE_SHOT } from '../../src/scene/idleDirector';
const make=()=>({captures:[{id:25,caughtAt:1234000,ball:'poke',friendship:20},{id:7,caughtAt:1234001,ball:'poke',friendship:20}]} as SaveData);
test('old captures get stable individual preferences, retained through evolution',()=>{
 const s=make();const before=s.captures.map(preference);migratePersonalities(s);assert.deepEqual(s.captures.map(preference),before);
 const copy=structuredClone(s);copy.captures[0].id=26;migratePersonalities(copy);assert.equal(preference(copy.captures[0]),before[0]);
});
test('furniture is reversible and alters automatic station ranking',()=>{
 const s=make();s.captures[0].personality={version:1,preference:'ball'};
 const before=furnitureAffinity(s.captures[0],'ball',[]);setFurniture(s,'track',true);setFurniture(s,'track',true);
 assert.equal(s.islandLiving!.furniture.length,1);assert.ok(furnitureAffinity(s.captures[0],'ball',s.islandLiving!.furniture)>before);
 setFurniture(s,'track',false);assert.equal(furnitureAffinity(s.captures[0],'ball',s.islandLiving!.furniture),before);
});
test('cooperative completion rejects strangers and duplicates, caps memories, never grants mastery or currency',()=>{
 const s=make();const m={id:'one',kind:'ball' as const,partners:[25,7],context:'play' as const,at:100};
 assert.equal(rememberTogether(s,{...m,partners:[25,999999]}),false);assert.equal(rememberTogether(s,{...m,partners:[25,25]}),false);
 assert.equal(rememberTogether(s,m),true);assert.equal(rememberTogether(s,m),false);
 for(let i=0;i<30;i++)rememberTogether(s,{...m,id:`event${i}`});
 assert.equal(s.islandLiving!.memories.length,18);assert.equal(s.learning,undefined);assert.equal(s.energy,undefined);
 assert.equal(validLiving(s.islandLiving,new Set([25,7])),true);s.islandLiving!.furniture=['bad' as any];assert.equal(validLiving(s.islandLiving,new Set([25,7])),false);
});
test('life story distinguishes doing, reading and a changed context',()=>{
 const s=make();rememberTogether(s,{id:'one',kind:'rest',partners:[25],context:'shade',at:100});
 assert.deepEqual(storyTrail(s,'rest'),{played:true,read:false,revisited:false});
 rememberTogether(s,{id:'two',kind:'rest',partners:[25],context:'shade',at:101});assert.equal(storyTrail(s,'rest').revisited,false);
 rememberTogether(s,{id:'three',kind:'rest',partners:[25],context:'coast',at:102});s.storyProgress={'little-storm:edition-2':9};
 assert.deepEqual(storyTrail(s,'rest'),{played:true,read:true,revisited:true});
});
test('two residents have separate endpoints, including mixed water-land and large partners',()=>{
 for(const ids of [[25,7],[95,143],[129,25],[129,118]])for(const kind of ['ball','rest'] as const){
  const s=togetherSession(kind,ids);const [a,b]=s.visits.map(v=>v.station.target);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>2.5,`${ids} ${kind}: overlapping spots`);
  assert.notEqual(s.visits[0].key,s.visits[1].key);
  for(const {station} of s.visits)assert.ok(Math.hypot(station.x-station.target.x,station.z-station.target.z)<.01,"arrival uses the actual temporary play spot, not the old facility center");
  if(ids[0]===129)assert.equal(s.visits[0].station.water,true);
 }
});
test('recent events get one priority shot, then ordinary partners remain visible; input still owns timing',()=>{
 const d=new IdleDirector(0),c=[{id:1,activity:'explore',moving:true},{id:25,activity:'play',moving:false,eventAt:5},{id:7,activity:'play',moving:false,eventAt:5}];
 assert.equal(d.tick(IDLE_DELAY,true,c),7);assert.equal(d.tick(IDLE_DELAY+OBSERVE_SHOT,true,c),25);assert.equal(d.tick(IDLE_DELAY+OBSERVE_SHOT*2,true,c),1);
 d.interrupt(100000);assert.equal(d.tick(100001,true,c),null);
});
