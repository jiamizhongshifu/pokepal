import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginPicnic, servePicnic, endPicnic } from '../../src/lib/picnic';
import { newFarm, plantCrop, waterCrop, harvestCrop, GROW_MS } from '../../src/lib/farm';
import { validateSave } from '../../src/lib/saveValidation';
import type { SaveData } from '../../src/types';
import { IdleDirector, IDLE_DELAY, OBSERVE_SHOT } from '../../src/scene/idleDirector';
function fixture():SaveData{return {version:1,trainer:null,energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[{id:25,ball:'poke',caughtAt:1,friendship:20}],daily:{date:'2026-10-16',energyEarned:0,board:['listen','repeat','wordpic','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[],speechRate:1},history:[],farm:newFarm()};}
test('one owned companion completes growing, harvest and picnic without a water species',()=>{
 const s=fixture();assert.ok(plantCrop(s,0,'oran',100));assert.ok(waterCrop(s,0,100,25,200));
 assert.equal(harvestCrop(s,0,200),false);assert.ok(harvestCrop(s,0,200+GROW_MS));
 assert.ok(beginPicnic(s,25,'oran','meal',50000));assert.equal(s.farm!.basket.oran,2);
 assert.ok(servePicnic(s,'meal',51000));assert.equal(s.farm!.basket.oran,1);assert.equal(s.captures[0].friendship,28);
 assert.equal(s.picnic!.memories.length,1);assert.equal(s.learning,undefined);validateSave(s);
});
test('repeated taps and a persisted served session never consume twice',()=>{
 const s=fixture();s.farm!.basket.oran=3;assert.ok(beginPicnic(s,25,'oran','meal',100));assert.ok(servePicnic(s,'meal',200));
 const resumed=validateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(servePicnic(resumed,'meal',300),false);assert.equal(resumed.farm!.basket.oran,2);assert.equal(resumed.captures[0].friendship,28);
 assert.ok(endPicnic(resumed,'meal'));assert.equal(beginPicnic(resumed,25,'oran','meal',400),false);
});
test('cancel, stale session, empty inventory and unowned companion have no side effects',()=>{
 const s=fixture();assert.equal(beginPicnic(s,25,'oran','empty',100),false);s.farm!.basket.oran=1;
 assert.equal(beginPicnic(s,7,'oran','unowned',100),false);assert.ok(beginPicnic(s,25,'oran','cancel',100));
 assert.equal(servePicnic(s,'stale',200),false);assert.ok(endPicnic(s,'cancel'));assert.equal(s.farm!.basket.oran,1);assert.equal(s.captures[0].friendship,20);
 assert.ok(beginPicnic(s,25,'oran','new',300));s.farm!.basket.oran=0;assert.equal(servePicnic(s,'new',400),false);assert.equal(s.picnic!.memories.length,0);
});
test('old saves remain valid; memory list bounded; full friendship still consumes one chosen fruit',()=>{
 const s=fixture();delete s.farm;validateSave(s);s.farm=newFarm();s.farm.basket.oran=20;s.captures[0].friendship=100;
 for(let i=0;i<15;i++){assert.ok(beginPicnic(s,25,'oran',`meal-${i}`,100+i));assert.ok(servePicnic(s,`meal-${i}`,200+i));endPicnic(s,`meal-${i}`);}
 assert.equal(s.picnic!.memories.length,12);assert.equal(s.farm.basket.oran,5);assert.equal(s.captures[0].friendship,100);validateSave(s);
});
test('corrupt picnic memory is rejected before a renderer reads the Pokemon',()=>{
 const s=fixture();s.picnic={version:1,memories:[{id:'bad',pokemonId:999999,berry:'oran',at:100}]};
 assert.throws(()=>validateSave(s),/野餐回忆/);
});
test('idle director waits, rotates fairly, yields immediately and requires a fresh delay after blocking',()=>{
 const d=new IdleDirector(0),c=[{id:25,activity:'eat',moving:false},{id:7,activity:'explore',moving:true}];
 assert.equal(d.tick(IDLE_DELAY-1,true,c),null);assert.equal(d.tick(IDLE_DELAY,true,c),25);
 assert.equal(d.tick(IDLE_DELAY+OBSERVE_SHOT,true,c),7);d.interrupt(70000);assert.equal(d.subject,null);
 assert.equal(d.tick(80000,true,c),null);assert.equal(d.tick(130000,false,c),null);
 assert.equal(d.tick(130001,true,c),null);assert.notEqual(d.tick(130000+IDLE_DELAY,true,c),null);
 assert.equal(d.tick(200000,true,[]),null);
});
