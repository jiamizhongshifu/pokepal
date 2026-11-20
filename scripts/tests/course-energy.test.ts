import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {todayStr} from '../../src/lib/date';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {rewardCourse,rewardParticipation,migrateParticipation,courseRewardAvailable,DAYS_FOR_GIFT} from '../../src/lib/participation';
import {validateSave} from '../../src/lib/saveValidation';
const fresh=():SaveData=>({version:1,trainer:null,energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{date:todayStr(),energyEarned:0,board:['listen','wordpic','repeat','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
const finish=(s:SaveData,index:number)=>{migrateParticipation(s);const u=LEARNING_UNITS[index];progressUnit(s,u.id,unitRoundCount(u));return rewardCourse(s,u.id)!;};
// Energy is gone (audit P1-7): completions only record "first time today", a counted day, and the 7-day gift.
test('each newly completed lesson is fresh once a day; different lessons are one activity kind',()=>{
 const s=fresh();assert.equal(finish(s,0).fresh,true);assert.equal(finish(s,1).fresh,true);
 assert.deepEqual(s.daily.participated,['course']);assert(!s.daily.goalDone,'different themes are one activity category');
 assert.equal(s.daily.energyEarned,0,'no energy is counted any more');
});
test('partial and locked lessons give nothing; replay is idempotent after persistence',()=>{
 const s=fresh();const u=LEARNING_UNITS[0];progressUnit(s,u.id,1);assert.equal(rewardCourse(s,u.id),undefined);
 assert.equal(rewardCourse(s,LEARNING_UNITS[1].id),undefined);finish(s,0);
 const restored=JSON.parse(JSON.stringify(s));migrateParticipation(restored);
 assert(!courseRewardAvailable(restored,u.id));assert.equal(finish(restored,0).repeated,true);
 validateSave(restored);
});
test('three kinds of activity count the day once; every seventh counted day brings one invite berry',()=>{
 const s=fresh();finish(s,0);rewardParticipation(s,'listen');const third=rewardParticipation(s,'story');
 assert.equal(third.dayCounted,true);assert.equal(s.participation!.days,1);
 assert.equal(rewardParticipation(s,'island').dayCounted,false,'a day counts once');
 for(let day=2;day<=DAYS_FOR_GIFT;day++){s.daily={...fresh().daily,date:`2026-11-${String(day).padStart(2,'0')}`};migrateParticipation(s);
  rewardParticipation(s,'listen');rewardParticipation(s,'story');const r=rewardParticipation(s,'review');
  assert.equal(r.ballGranted,day===DAYS_FOR_GIFT);}
 assert.equal(s.balls.poke,1);assert.equal(s.energy,0);
});
test('legacy course claim stays claimed, while a different theme remains eligible',()=>{
 const s=fresh(),first=LEARNING_UNITS[0],second=LEARNING_UNITS[1];progressUnit(s,first.id,unitRoundCount(first));
 s.daily.participated=['course'];
 migrateParticipation(s);assert(!courseRewardAvailable(s,first.id));assert(courseRewardAvailable(s,second.id));
 assert.equal(finish(s,0).fresh,false);assert.equal(finish(s,1).fresh,true);
});
test('a new day allows the same lesson again',()=>{
 const s=fresh();finish(s,0);s.daily={...fresh().daily};migrateParticipation(s);
 assert(courseRewardAvailable(s,LEARNING_UNITS[0].id));assert.equal(finish(s,0).fresh,true);assert.equal(finish(s,0).fresh,false);
});
test('legacy unfinished active theme is never marked as already rewarded',()=>{
 const s=fresh();progressUnit(s,LEARNING_UNITS[0].id,unitRoundCount(LEARNING_UNITS[0]));
 s.daily.participated=['course'];progressUnit(s,LEARNING_UNITS[1].id,1);
 migrateParticipation(s);assert(courseRewardAvailable(s,LEARNING_UNITS[1].id));assert.equal(finish(s,1).fresh,true);
});
test('saves that saw the retired energy and grass guides still load',()=>{
 const s=fresh() as any;s.onboarding={version:1,automatic:true,seen:{energy:true,shop:true,throw:true,noBall:false,path:true},completed:{energy:true}};
 const back=validateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(back.onboarding!.seen,{path:true});assert.deepEqual(back.onboarding!.completed,{});
});
test('saves from older versions keep their retired stories and care timers, untouched',()=>{
 const s=fresh() as any;
 s.careStory={version:1,id:'old',pokemonId:1001,phase:'garden',food:'apple',meal:'fed'};
 s.storyAdventure={episodeId:'apple-picnic',version:1,index:2,token:5,phase:'paused'};
 const back=validateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(back.careStory,s.careStory);assert.deepEqual(back.storyAdventure,s.storyAdventure);
});
