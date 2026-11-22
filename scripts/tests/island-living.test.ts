import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migratePersonalities,preference,rememberTogether,setFurniture,furnitureAffinity,storyTrail,validLiving } from '../../src/lib/islandLiving';
import type { SaveData } from '../../src/types';
import { togetherSession } from '../../src/island/together';
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
test('new play memories survive serialization and cannot claim unrelated story completion',()=>{
 const s=make();
 for(const kind of ['bubbles','jump'] as const){
  const memory={id:kind,kind,partners:[25],context:'play' as const,at:100};
  assert.equal(rememberTogether(s,memory),true);assert.equal(rememberTogether(s,memory),false);
  assert.equal(validLiving(JSON.parse(JSON.stringify(s.islandLiving)),new Set([25,7])),true);
  assert.equal(togetherSession(kind,[25]).visits[0].station.activity,'play');
 }
 assert.equal(s.islandLiving!.memories.length,2);assert.equal(s.energy,undefined);assert.equal(s.learning,undefined);
 assert.equal(storyTrail(s,'ball').played,false);assert.equal(storyTrail(s,'rest').played,false);
});
