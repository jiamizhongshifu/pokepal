import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {learningTrail} from '../../src/lib/learningTrail';
import {LEARNING_UNITS,selectedUnit,recommendedUnit,unitUnlocked,unitRoundCount,learningEntry} from '../../src/data/curriculum';
import {migrateLearning,progressUnit,applyStation,noteLearningStory,toggleSavedLearning,encounter,reviewKeys} from '../../src/lib/learningProgress';
import {dailyLearningPlan,lessonWords} from '../../src/data/learning';
import {WEATHER,CLEAR_NIGHT} from '../../src/lib/weather';
const fresh=()=>({version:1,settings:{level:1},wordStats:{},learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const first=LEARNING_UNITS[0],second=LEARNING_UNITS[1];
test('learning theme survives course completion until related island and story experiences',()=>{
 const s=fresh();assert.equal(learningTrail(s).phase,'lesson');
 progressUnit(s,first.id,1,100);assert.equal(learningTrail(s).phase,'lesson');
 progressUnit(s,first.id,unitRoundCount(first),200);
 assert.equal(learningTrail(s).phase,'island');assert.equal(selectedUnit(s).id,first.id);
 assert.deepEqual(dailyLearningPlan(s,false,200).words.map(w=>w.en),lessonWords(first,1));
 applyStation(s,'unrelated',300,'Look!',true);assert.equal(learningTrail(s).phase,'island');
 applyStation(s,first.station,400,'Welcome home!',true);assert.equal(learningTrail(s).phase,'story');
 noteLearningStory(s,first.story,500);assert.equal(selectedUnit(s).id,second.id);assert.equal(learningTrail(s).phase,'lesson');
 assert.equal(s.learning!.records['Hello!'],undefined,'scene visits do not invent course-phrase exposure');
});
test('optional island and story steps never lock next course, including story-first order',()=>{
 const s=fresh();progressUnit(s,first.id,unitRoundCount(first),100);
 assert(unitUnlocked(s,second.id));assert.equal(recommendedUnit(s).id,second.id);
 noteLearningStory(s,first.story,200);assert.equal(learningTrail(s).phase,'island');
 const before=structuredClone(s.learning!.units[first.id]);
 progressUnit(s,second.id,1,300);assert.equal(selectedUnit(s).id,second.id);
 assert.deepEqual(s.learning!.units[first.id],before);
});
test('bookmarking is interest only, and cannot create exposure or an automatic review obligation',()=>{
 const s=fresh();toggleSavedLearning(s,'Ball!',100);const r=s.learning!.records.ball;
 assert(r.saved);assert.equal(r.seen,0);assert.equal(r.attempts,0);assert.equal(r.independent,0);
 assert.deepEqual(reviewKeys(s,'due',10*86400000),[]);
 toggleSavedLearning(s,'ball',200);assert(!r.saved);assert.equal(r.seen,0);
 encounter(s,'ball','heard',300);assert(reviewKeys(s,'due',10*86400000).includes('ball'));
 toggleSavedLearning(s,'ball',400);assert.equal(r.seen,1);
});
test('weather expressions enter the notebook as context exposure, never automatic tests or mastery',()=>{
 const s=fresh();for(const w of [...Object.values(WEATHER),CLEAR_NIGHT]){
  const e=learningEntry(w.en)!;assert(e?.contextOnly,w.en);assert.equal(e.voiceEn,w.en);
  encounter(s,w.en,'heard',100);assert.equal(s.learning!.records[e.key].seen,1);assert.equal(s.learning!.records[e.key].independent,0);
 }
 assert.deepEqual(reviewKeys(s,'due',10*86400000),[]);
});

test('migration removes identifiable bookmark-only exposure once without erasing actual listening',()=>{
 const s=fresh();encounter(s,'ball','saved',100);encounter(s,'book','saved',100);encounter(s,'book','heard',200);
 s.learning!.records.ball.saved=true;s.learning!.records.book.saved=true;
 migrateLearning(s);assert.equal(s.learning!.records.ball.seen,0);assert.equal(s.learning!.records.book.seen,1);
 assert(s.learning!.records.ball.saved);assert.deepEqual(s.learning!.records.book.contexts,['heard']);
 const before=structuredClone(s);migrateLearning(s);assert.deepEqual(s,before);
});

test('learning home keeps the course primary after completion, without requiring island or story',async()=>{
 const {learningHome}=await import('../../src/lib/learningTrail');
 const s=fresh();assert.equal(learningHome(s).unit.id,first.id);assert(!learningHome(s).resuming);
 progressUnit(s,first.id,1,100);assert(learningHome(s).resuming);
 progressUnit(s,first.id,unitRoundCount(first),200);
 const home=learningHome(s);assert.equal(home.unit.id,second.id);assert.equal(home.extension.id,first.id);
 assert(!home.resuming);assert(!home.completed);assert(unitUnlocked(s,home.unit.id));
 assert.equal(selectedUnit(s).id,first.id,'island transfer context is preserved until the next course is opened');
 progressUnit(s,second.id,1,300);assert.equal(learningHome(s).unit.id,second.id);assert(learningHome(s).resuming);
});

test('all courses complete keeps a valid replay entry',async()=>{
 const {learningHome}=await import('../../src/lib/learningTrail');
 const s=fresh();for(const u of LEARNING_UNITS)progressUnit(s,u.id,unitRoundCount(u),100);
 const home=learningHome(s);assert(home.completed);assert(!home.resuming);assert(unitUnlocked(s,home.unit.id));
});
