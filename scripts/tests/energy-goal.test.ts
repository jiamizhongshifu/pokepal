import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {energyGoalState} from '../../src/lib/energyGoal';
import {upgradeIsland} from '../../src/lib/islandProgress';
const save=(energy=0,balls=0)=>({energy,balls:{poke:balls},islandProgress:{version:1,owned:[],nextGiftAt:120,levels:{camp:0,picnic:0,garden:0,play:0,island:0}}} as unknown as SaveData);
test('owned ball is ready even with no energy; no needless earning gate',()=>{
 const s=save(0,1),before=JSON.stringify(s);assert.equal(energyGoalState(s).ready,true);assert.equal(energyGoalState(s).hasBall,true);assert.equal(JSON.stringify(s),before);
});
test('ball goal switches at the exchange threshold, never promises a ball below it',()=>{
 for(const n of [0,4,5,6]){const g=energyGoalState(save(n));assert.equal(g.ready,n>=5);assert.equal(g.short,Math.max(0,5-n));assert.equal(g.hasBall,false);}
});
test('upgrade goal uses next level cost and respects completed facilities',()=>{
 const s=save(5);assert.equal(energyGoalState(s,'camp').ready,true);
 assert.equal(upgradeIsland(s,'camp',0),true);assert.equal(s.energy,0);
 assert.equal(energyGoalState(s,'camp').short,9);assert.equal(upgradeIsland(s,'camp',0),false);
 s.energy=9;assert.equal(upgradeIsland(s,'camp',1),true);
 assert.deepEqual([energyGoalState(s,'camp').complete,energyGoalState(s,'camp').short],[true,0]);
 assert.equal(energyGoalState(s,'island').short,10,'another facility keeps its own cost');
});
