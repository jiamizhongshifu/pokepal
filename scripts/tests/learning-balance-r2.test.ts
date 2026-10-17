import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyLearningPlan } from '../../src/data/learning';
import { LEARNING_UNITS, learningEntry } from '../../src/data/curriculum';
import { attempt, encounter, reviewKeys, applyStation } from '../../src/lib/learningProgress';
import type { SaveData } from '../../src/types';
const now=Date.parse('2026-10-16T04:00:00Z');
const fresh=():SaveData=>({version:1,trainer:null,energy:0,balls:{poke:1,great:0,ultra:0,master:0},captures:[],daily:{date:'2026-10-16',energyEarned:0,board:['listen','wordpic','repeat','trace'],boardDone:[false,false,false,false],bonusGiven:false,tasksCompleted:0,heard:0,spoken:0,words:[],caught:[],playSeconds:0,extraSeconds:0},streak:{lastDate:'',count:0},wordStats:{},settings:{dailyMinutes:15,tasksPerDay:4,level:1,favorites:[25],speechRate:1},history:[]});
test('all 24 daily themes respect parent readiness, including imported advanced due items',()=>{
 for(const unit of LEARNING_UNITS){
  const s=fresh();s.learning={version:1,activeUnit:unit.id,records:{},units:{}};
  for(const key of ['rainbow','Can I have an apple, please?'])attempt(s,key,false,false,'test',now-100);
  for(const extra of [false,true]){
   const p=dailyLearningPlan(s,extra,now);
   assert.equal(p.words.length>=3,true,unit.id);assert.equal(p.phrases.length>=1,true,unit.id);
   for(const e of [...p.words,...p.phrases])assert(e.level<=s.settings.level,`${unit.id}: ${e.en}`);
  }
 }
});
test('extra play extends with familiar material rather than unrelated unseen vocabulary',()=>{
 for(const level of [1,2] as const)for(const unit of LEARNING_UNITS){
  const s=fresh();s.settings.level=level;s.learning={version:1,activeUnit:unit.id,records:{},units:{}};
  encounter(s,'car','story',now);encounter(s,'Good morning!','story',now);
  const normal=dailyLearningPlan(s,false,now),extra=dailyLearningPlan(s,true,now);
  const allowed=new Set([...normal.words,...normal.phrases].map(e=>e.en).concat(['car','Good morning!']));
  for(const e of [...extra.words,...extra.phrases])assert(allowed.has(e.en),`${unit.id}: unrelated new ${e.en}`);
  assert(extra.words.length<=6&&extra.phrases.length<=5);
 }
});
test('first exposure waits until tomorrow; same-day successful repair respects its next review',()=>{
 const s=fresh();encounter(s,'apple','story',now);
 assert.deepEqual(reviewKeys(s,'due',now+1000),[]);
 assert(reviewKeys(s,'due',now+86400000).includes('apple'));
 attempt(s,'apple',false,false,'wordpic',now+1000);
 assert(reviewKeys(s,'due',now+1000).includes('apple'));
 attempt(s,'apple',true,false,'review',now+2000);
 assert(s.learning!.records.apple.needsPractice);
 assert(!reviewKeys(s,'due',now+3000).includes('apple'));
 assert(!dailyLearningPlan(s,false,now+3000).words.some(w=>w.en==='apple'));
 assert(reviewKeys(s,'retry',now+3000).includes('apple'),'explicit retry remains available');
});
test('story context expressions remain in notebook without becoming automatic quizzes',()=>{
 const s=fresh();const key='Look at the tree.';
 assert(learningEntry(key)?.contextOnly);encounter(s,key,'story',now);
 assert(s.learning!.records[learningEntry(key)!.key]);
 assert.deepEqual(reviewKeys(s,'due',now+10*86400000),[]);
});
test('listening to a station and acting there remain different evidence',()=>{
 const s=fresh();applyStation(s,'picnic',now,'Thank you!',false);
 const r=s.learning!.records['Thank you!'];assert.equal(r.seen,1);assert.equal(r.actions,0);
 applyStation(s,'picnic',now+100,'Thank you!',true);
 assert.equal(r.seen,2);assert.equal(r.actions,1);assert.equal(r.independent,0);
});
