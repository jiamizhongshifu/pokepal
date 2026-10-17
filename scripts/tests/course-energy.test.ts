import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {todayStr} from '../../src/lib/date';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {rewardCourse,rewardParticipation,migrateParticipation,courseRewardAvailable,DAILY_CAP} from '../../src/lib/participation';
import {validateSave} from '../../src/lib/saveValidation';
const fresh=():SaveData=>({version:1,trainer:null,energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{date:todayStr(),energyEarned:0,board:['listen','wordpic','repeat','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
const finish=(s:SaveData,index:number)=>{migrateParticipation(s);const u=LEARNING_UNITS[index];progressUnit(s,u.id,unitRoundCount(u));return rewardCourse(s,u.id)!;};
test('each newly completed theme gives energy without switching to mini-games',()=>{
 const s=fresh();assert.equal(finish(s,0).gained,2);assert.equal(finish(s,1).gained,2);assert.equal(s.energy,4);
 assert.deepEqual(s.daily.participated,['course']);assert(!s.daily.goalDone,'different themes are one activity category');
});
test('partial and locked themes cannot grant energy; replay is idempotent after persistence',()=>{
 const s=fresh();const u=LEARNING_UNITS[0];progressUnit(s,u.id,1);assert.equal(rewardCourse(s,u.id),undefined);
 assert.equal(rewardCourse(s,LEARNING_UNITS[1].id),undefined);finish(s,0);
 const restored=JSON.parse(JSON.stringify(s));migrateParticipation(restored);
 assert(!courseRewardAvailable(restored,u.id));assert.equal(finish(restored,0).gained,0);assert.equal(restored.energy,2);
 validateSave(restored);
});
test('course rewards share the daily cap and cross-activity bonus, without overflow',()=>{
 const s=fresh();finish(s,0);rewardParticipation(s,'listen');const third=rewardParticipation(s,'story');
 assert.equal(third.bonus,1);assert.equal(s.energy,7);
 for(let i=1;i<8;i++)finish(s,i);
 assert.equal(s.energy,DAILY_CAP);assert.equal(s.daily.energyEarned,DAILY_CAP);
 assert.equal(finish(s,8).gained,0);assert.equal(rewardParticipation(s,'island').bonus,0);
});
test('legacy course claim stays claimed, while a different theme remains eligible',()=>{
 const s=fresh(),first=LEARNING_UNITS[0],second=LEARNING_UNITS[1];progressUnit(s,first.id,unitRoundCount(first));
 s.daily.participated=['course'];s.daily.energyEarned=2;s.energy=2;
 migrateParticipation(s);assert(!courseRewardAvailable(s,first.id));assert(courseRewardAvailable(s,second.id));
 assert.equal(finish(s,0).gained,0);assert.equal(finish(s,1).gained,2);assert.equal(s.energy,4);
});
test('new day allows the same theme; a capped final point is shown exactly',()=>{
 const s=fresh();finish(s,0);s.daily={...fresh().daily};migrateParticipation(s);
 assert(courseRewardAvailable(s,LEARNING_UNITS[0].id));s.daily.energyEarned=14;
 assert.equal(finish(s,0).gained,1);assert.equal(s.daily.energyEarned,15);
 assert.equal(finish(s,0).gained,0);
});

test('legacy unfinished active theme is never marked as already rewarded',()=>{
 const s=fresh();progressUnit(s,LEARNING_UNITS[0].id,unitRoundCount(LEARNING_UNITS[0]));
 s.daily.participated=['course'];progressUnit(s,LEARNING_UNITS[1].id,1);
 migrateParticipation(s);assert(courseRewardAvailable(s,LEARNING_UNITS[1].id));assert.equal(finish(s,1).gained,2);
});
