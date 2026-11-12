import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateSave} from '../../src/lib/saveValidation';
import {newFarm,GROW_MS} from '../../src/lib/farm';
import {startCareStory,actCareStory,gardenPlanKey} from '../../src/lib/careStory';
import type {SaveData} from '../../src/types';
const make=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));s.farm=newFarm();return s;};
const now=1800000000000;
function act(s:SaveData,action:Parameters<typeof actCareStory>[3],time=now){const r=s.careStory!;return actCareStory(s,r.id,r.phase,action,time,gardenPlanKey(s,time));}
function garden(s:SaveData){startCareStory(s,'run');act(s,'feed');act(s,'next');assert.equal(act(s,'garden'),true);act(s,'next');}
function play(s:SaveData){assert.equal(act(s,'roll'),true);assert.equal(act(s,'next'),true);}
test('real snack, planting, play and harvest preserve old progress and spend once across reload',()=>{
 let s=make();s.farm!.basket.pecha=2;const previous=structuredClone(s);startCareStory(s,'run');const id=s.careStory!.pokemonId;
 assert.equal(act(s,'feed'),true);assert.equal(actCareStory(s,'run','snack','feed',now),false);assert.equal(s.farm!.basket.pecha,1);
 s=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(s.careStory!.phase,'shared');act(s,'next');act(s,'garden');act(s,'next');play(s);
 assert.equal(s.islandLiving!.memories.filter(m=>m.id==='care:run').length,1);assert.equal(actCareStory(s,'run','play','roll',now),false);
 assert.equal(act(s,'harvest',now+GROW_MS-1),false);assert.equal(act(s,'harvest',now+GROW_MS),true);assert.equal(act(s,'harvest',now+GROW_MS),false);
 assert.equal(s.farm!.basket.oran,2);assert.equal(s.farm!.basket.pecha,1);assert.equal(s.careStory!.phase,'ending');assert.deepEqual(s.storyProgress,previous.storyProgress);assert.deepEqual(s.wordStats,previous.wordStats);assert.equal(s.energy,previous.energy);assert.deepEqual(s.captures.filter(c=>c.id!==id),previous.captures.filter(c=>c.id!==id));assert.doesNotThrow(()=>validateSave(s));
});
test('existing thirsty or growing crops keep variety and planted timestamp',()=>{
 for(const watered of [false,true]){const s=make();s.farm!.plots=[{berry:'cheri',plantedAt:now-100,...(watered?{wateredAt:now-50}:{})},{berry:'oran',plantedAt:now-200,wateredAt:now-50},{berry:'pecha',plantedAt:now-300,wateredAt:now-50}];garden(s);assert.equal(s.careStory!.plot!.plantedAt,now-100);assert.equal(s.farm!.plots[0]!.berry,'cheri');play(s);assert.equal(act(s,'harvest',now+GROW_MS),true);assert.equal(s.farm!.basket.cheri,2);assert.equal(s.farm!.plots[1]!.plantedAt,now-200);}
});
test('ripe plot is collected once and a full basket preserves the crop',()=>{
 for(const full of [false,true]){const s=make();s.farm!.plots[1]={berry:'oran',plantedAt:now-50000,wateredAt:now-50000};s.farm!.basket.oran=full?999:0;startCareStory(s,'run');act(s,'skip-snack');act(s,'next');act(s,'garden');act(s,'next');play(s);assert.equal(s.careStory!.phase,'ending');assert.equal(s.farm!.basket.oran,full?999:2);assert.equal(!!s.farm!.plots[1],full);}
});
test('replaced crop and outdated garden button cannot affect a new planting',()=>{
 const s=make();startCareStory(s,'run');act(s,'feed');act(s,'next');const stale=gardenPlanKey(s,now);s.farm!.plots[0]={berry:'cheri',plantedAt:now-1};assert.equal(actCareStory(s,'run','garden','garden',now,stale),false);act(s,'garden');act(s,'next');play(s);s.farm!.plots[0]={berry:'pecha',plantedAt:now+5,wateredAt:now+5};assert.equal(act(s,'harvest',now+GROW_MS+10),true);assert.equal(s.careStory!.harvest,'changed');assert.equal(s.farm!.plots[0]!.berry,'pecha');assert.equal(s.farm!.basket.pecha,0);
});
test('missing berries are never replaced with a silent deduction, ordinary snack uses existing care rules',()=>{
 const s=make();s.farm!.basket.cheri=1;startCareStory(s,'run');s.farm!.basket.cheri=0;assert.equal(act(s,'feed'),false);assert.equal(s.careStory!.phase,'snack');assert.equal(act(s,'skip-snack'),true);assert.equal(s.careStory!.meal,'skipped');
 const t=make();startCareStory(t,'plain');assert.equal(t.careStory!.food,'plain');const c=t.captures.find(c=>c.id===t.careStory!.pokemonId)!;const f=c.friendship;act(t,'feed');assert.equal(c.friendship,Math.min(100,f+4));assert.deepEqual(t.farm!.basket,newFarm().basket);
});
test('resume keeps consumed phase even when original partner evolves; absent optional field remains valid',()=>{
 const s=make();assert.doesNotThrow(()=>validateSave(s));startCareStory(s,'run');act(s,'feed');const old=s.careStory!.pokemonId;s.captures=s.captures.filter(c=>c.id!==old);if(!s.captures.length)s.captures.push({id:133,caughtAt:now,ball:'poke',friendship:0});startCareStory(s,'other',s.captures[0].id);assert.equal(s.careStory!.phase,'shared');assert.equal(s.careStory!.id,'run');assert.equal(s.careStory!.pokemonId,s.captures[0].id);
});
