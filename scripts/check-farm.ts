import assert from 'node:assert/strict';
import { plantCrop,waterCrop,harvestCrop,feedBerry,newFarm,validFarm,cropStage,GROW_MS,BASKET_CAP } from '../src/lib/farm';
import { validateSave } from '../src/lib/saveValidation';
import { stationById } from '../src/scene/islandLife';
import { FARM_ENTRY, FARM_PLOTS, OBSTACLES, obstacleDist } from '../src/scene/layout';
import { planWalk } from '../src/scene/navigation';
import type { SaveData } from '../src/types';
const s:SaveData={version:1,trainer:null,energy:5,balls:{poke:1,great:0,ultra:0,master:0},captures:[{id:25,caughtAt:1,ball:'poke',friendship:95}],daily:{date:'2026-10-16',energyEarned:0,board:['listen','repeat','wordpic','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[],speechRate:1},history:[]};
assert.deepEqual(validateSave(s),s,'old saves need no destructive migration');
assert.equal(plantCrop(s,9,'oran',1000),false);assert.equal(s.farm,undefined);
assert.equal(plantCrop(s,0,'oran',1000),true);assert.equal(plantCrop(s,0,'pecha',1001),false);
assert.equal(harvestCrop(s,0,1000000),false,'dry crops never auto-reward');
assert.equal(waterCrop(s,0,1000,1,2000),false,'unowned helper rejected');
assert.equal(waterCrop(s,0,999,25,2000),false,'stale crop identity rejected');
assert.equal(waterCrop(s,0,1000,25,2000),true);assert.equal(waterCrop(s,0,1000,25,3000),false);
assert.equal(cropStage(s.farm!.plots[0],1500),'growing','clock rollback never ripens a crop');
assert.equal(harvestCrop(s,0,2000+GROW_MS-1),false);
const restored=validateSave(JSON.parse(JSON.stringify(s)));
assert.equal(harvestCrop(restored,0,2000+GROW_MS),true,'growth survives a restart');
assert.equal(harvestCrop(restored,0,2000+GROW_MS),false,'double harvest rejected');
assert.equal(restored.farm!.basket.oran,2);
assert.equal(feedBerry(restored,1,'oran'),false,'unowned feeding never consumes inventory');
assert.equal(feedBerry(restored,25,'pecha'),false);
assert.equal(feedBerry(restored,25,'oran'),true);assert.equal(restored.captures[0].friendship,100);
assert.equal(feedBerry(restored,25,'oran'),true);assert.equal(feedBerry(restored,25,'oran'),false);assert.equal(restored.farm!.basket.oran,0);
assert.equal(restored.energy,5);assert.equal(restored.balls.poke,1);
assert.equal(plantCrop(restored,0,'pecha',100000),true);assert.equal(waterCrop(restored,0,1000,25,100001),false,'late arrival cannot water new cycle');
restored.farm!.plots[0]={berry:'pecha',plantedAt:1,wateredAt:2};restored.farm!.basket.pecha=BASKET_CAP;
assert.equal(harvestCrop(restored,0,100000),false,'full basket keeps crop intact');assert.ok(restored.farm!.plots[0]);
for(const bad of [{...newFarm(),plots:[]},{...newFarm(),basket:{oran:-1,pecha:0,cheri:0}},{...newFarm(),plots:[{berry:'__proto__',plantedAt:1},null,null]},{...newFarm(),plots:[{berry:'oran',plantedAt:NaN},null,null]}]){assert.equal(validFarm(bad),false);assert.throws(()=>validateSave({...s,farm:bad}));}
for(let i=0;i<3;i++){const p=FARM_PLOTS[i],t=stationById(`farm-${i}`).target;assert.ok(Math.hypot(t.x-p.x,t.z-(p.z+1.9))<.8,`plot ${i} approach reachable`);}
const target=stationById('farm').target;
assert.ok(Math.hypot(target.x-FARM_ENTRY.x,target.z-FARM_ENTRY.z)<1,'helper reaches the front lane');
for(const start of [{x:0,z:4},{x:-8,z:0},{x:-4,z:-4}]){const path=planWalk(start,target);assert.ok(path.length>1);const end=path.at(-1)!;assert.ok(Math.hypot(end.x-target.x,end.z-target.z)<.7);for(const p of path)assert.ok(!OBSTACLES.some(o=>obstacleDist(o,p.x,p.z)<o.r),'paths avoid beds and fences');}
for(let i=1;i<FARM_PLOTS.length;i++)assert.ok(FARM_PLOTS[i].x-FARM_PLOTS[i-1].x>1.85,'raised beds do not overlap');
console.log('PASS: legacy imports, crop lifecycle, restart growth, replay/stale actions, inventory/ownership/friendship limits, malformed saves and reachable farm approach.');

// Retired flower-care saves still load; lessons now apply to actual crop watering.
const legacy={...s,garden:{bloomed:true}};
assert.equal(validateSave(legacy).garden?.bloomed,true);
console.log('PASS: retired flower-care saves remain importable.');

const {LEARNING_UNITS}=await import('../src/data/curriculum');
const {applyStation}=await import('../src/lib/learningProgress');
for(const id of ['garden-helper','keep-our-promise','sorry-and-repair']){
 const unit=LEARNING_UNITS.find(u=>u.id===id)!;
 assert.ok(stationById(unit.station),'lesson destination exists');
 const lessonSave=validateSave(JSON.parse(JSON.stringify(s)));
 lessonSave.learning={version:1,activeUnit:id,records:{},units:{[id]:{round:4,completedAt:123}}};
 applyStation(lessonSave,'farm',456);
 assert.equal(lessonSave.learning.units[id].encounteredAt,456,'crop care records a visit only');
 assert.deepEqual(lessonSave.learning.records,{},'watering must not infer the lesson phrase');
 assert.equal(lessonSave.learning.units[id].completedAt,123,'lesson progress preserved');
}
console.log('PASS: former flower-care lessons route to crop care and retain completed progress.');
