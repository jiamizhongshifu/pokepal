import test from 'node:test';
import assert from 'node:assert/strict';
import {settleUnitRound} from '../../src/lib/learningProgress';
import {previewLevels} from '../../src/lib/decorPreview';
import {LEARNING_UNITS,unitRoundCount,unitUnlocked} from '../../src/data/curriculum';
import {rewardCourse} from '../../src/lib/participation';
import {todayStr} from '../../src/lib/date';
import type {SaveData} from '../../src/types';
const fresh=()=>({version:1,trainer:null,energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],settings:{level:1},daily:{date:todayStr(),energyEarned:0,board:[],boardDone:[],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},wordStats:{},streak:{lastDate:"",count:0},history:[]} as unknown as SaveData);
test('failed audio can be deferred without evidence, unlocking, or reward; survives resume',()=>{
 let s=fresh();const u=LEARNING_UNITS[0],total=unitRoundCount(u);
 for(let round=1;round<=total;round++)settleUnitRound(s,u.id,round,round===2);
 assert.deepEqual(s.learning!.units[u.id].pendingAudio,[1]);assert.equal(s.learning!.units[u.id].round,1);
 assert(!s.learning!.units[u.id].completedAt);assert(!unitUnlocked(s,LEARNING_UNITS[1].id));assert.equal(rewardCourse(s,u.id),undefined);assert.deepEqual(s.learning!.records,{});assert.equal(s.energy,0);
 s=JSON.parse(JSON.stringify(s));for(let round=2;round<=total;round++)settleUnitRound(s,u.id,round);
 assert.deepEqual(s.learning!.units[u.id].pendingAudio,[]);assert(s.learning!.units[u.id].completedAt);assert(unitUnlocked(s,LEARNING_UNITS[1].id));assert.equal(rewardCourse(s,u.id)?.gained,2);
});
test('multiple skipped rounds remain pending until each is revisited',()=>{
 const s=fresh(),u=LEARNING_UNITS[0];settleUnitRound(s,u.id,1,true);settleUnitRound(s,u.id,2,true);settleUnitRound(s,u.id,1);
 assert.deepEqual(s.learning!.units[u.id].pendingAudio,[1]);assert(!settleUnitRound(s,u.id,unitRoundCount(u)));assert(!s.learning!.units[u.id].completedAt);
});
test('real-scene preview never mutates saved levels; before, cancel and purchased use actual state',()=>{
 const levels={camp:0,picnic:1,garden:0,play:2,island:0},snapshot=structuredClone(levels);
 const after=previewLevels(levels,{kind:'upgrade',id:'island',level:0,after:true});assert.equal(after.island,1);assert.deepEqual(levels,snapshot);
 assert.equal(previewLevels(levels,{kind:'upgrade',id:'island',level:0,after:false}),levels);
 assert.equal(previewLevels(levels,null),levels);
 assert.equal(previewLevels(levels,{kind:'upgrade',id:'island',level:0,after:true,purchased:true}),levels);
});
