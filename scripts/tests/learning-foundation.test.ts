import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { encounter,attempt,reviewKeys,recommendedReviewKeys,restAfterListening,reviewGroupSize,progressUnit } from '../../src/lib/learningProgress';
import { LEARNING_UNITS,unitRoundCount,learningEntry } from '../../src/data/curriculum';
import { learningChoices } from '../../src/lib/learningChoices';
import { lessonWords,dailyLearningPlan } from '../../src/data/learning';
import { PIC_WORDS,PHRASES } from '../../src/data/words';
import { PHRASE_PICTURES } from '../../src/data/phrasePictures';
import { ICON_ASSETS } from '../../src/icons/generated';
import type { SaveData } from '../../src/types';
const now=Date.parse('2026-10-16T04:00:00Z'),DAY=86400000;
const fresh=()=>({version:1,settings:{level:1},wordStats:{},learning:{version:1,records:{},units:{}}} as unknown as SaveData);

test('all course slots respect beginner readiness without changing completion or save positions',()=>{
 const s=fresh();
 for(const unit of LEARNING_UNITS){
  const words=lessonWords(unit,1);
  assert.equal(words.length,3,unit.id);assert.equal(new Set(words).size,3);
  assert(words.every(key=>PIC_WORDS.some(w=>w.en===key&&w.level===1)),unit.id);
  assert.deepEqual(lessonWords(unit,2),unit.words);
  const category=PIC_WORDS.find(w=>w.en===unit.words[0])!.theme;
  if(unit.words.every(key=>PIC_WORDS.some(w=>w.en===key&&w.theme===category)))assert(words.every(key=>PIC_WORDS.some(w=>w.en===key&&w.theme===category)),`${unit.id}: do not mix flowers into food lessons`);
  s.learning!.activeUnit=unit.id;
  assert.deepEqual(dailyLearningPlan(s).words.map(w=>w.en),words,'the course and routine share their new-word pool');
  const total=unitRoundCount(unit);
  progressUnit(s,unit.id,total-1,now);assert(!s.learning!.units[unit.id].completedAt);
  progressUnit(s,unit.id,total,now);assert(s.learning!.units[unit.id].completedAt);
 }
 assert.equal(Object.keys(s.learning!.units).length,24);
});
test('automatic review excludes advanced and name items but manual notebooks retain them',()=>{
 const s=fresh();
 for(const key of ['apple','Pikachu','rainbow','count:4','count:2','big','Hello!','Can I have an apple, please?','Look at the tree.'])encounter(s,key,'story',now-DAY);
 assert.deepEqual(new Set(recommendedReviewKeys(s,now)),new Set(['apple','count:2','big','Hello!']));
 assert(reviewKeys(s,'due',now).includes('Pikachu'));
 assert(reviewKeys(s,'due',now).includes('Can I have an apple, please?'));
 assert.equal(reviewGroupSize(s),2);
 s.settings.level=2;
 assert(recommendedReviewKeys(s,now).includes('rainbow'));
 assert(recommendedReviewKeys(s,now).includes('count:4'));
 assert(!recommendedReviewKeys(s,now).includes('Pikachu'));
 assert.equal(reviewGroupSize(s),3);
});
test('supported repair rests for a day without erasing the need for later independent review',()=>{
 const s=fresh();attempt(s,'apple',false,false,'review',now);
 attempt(s,'apple',true,true,'review',now+1000);
 const r=s.learning!.records.apple;
 assert.equal(r.independent,0);assert.equal(r.supported,1);assert.equal(r.needsPractice,true);assert.equal(r.streak,0);
 assert(!recommendedReviewKeys(s,now+2000).includes('apple'));
 assert(reviewKeys(s,'retry',now+2000).includes('apple'));
 assert(recommendedReviewKeys(s,now+DAY+1000).includes('apple'));
});
test('automatic distractors respect readiness while an explicit manual target remains available',()=>{
 for(const key of ['apple','Hello!','count:1','rainbow']){
  const entries=learningChoices(learningEntry(key)!,undefined,100,1);
  assert.equal(entries.filter(e=>e.key===key).length,1);
  for(const e of entries.filter(e=>e.key!==key)){
   if(e.kind==='concept')assert(Number(e.key.slice(6))<=3);
   else assert.equal([...PIC_WORDS,...PHRASES].find(w=>w.en===e.key)?.level,1,e.key);
  }
 }
});
test('listen-only review is not a scored attempt and does not reduce a longer interval',()=>{
 const s=fresh();attempt(s,'ball',false,false,'review',now);
 const before=structuredClone(s.learning!.records.ball);
 restAfterListening(s,'ball',now+1000);
 const r=s.learning!.records.ball;
 assert.deepEqual({...r,nextReview:before.nextReview},before);
 assert.equal(r.nextReview,now+DAY+1000);
 r.nextReview=now+7*DAY;restAfterListening(s,'ball',now+2000);assert.equal(r.nextReview,now+7*DAY);
 restAfterListening(s,'not-a-word',now);assert.equal(Object.keys(s.learning!.records).length,1);
});
test('every core phrase has real visual assets and existing Volcengine audio',()=>{
 const manifest=JSON.parse(readFileSync('public/voice/manifest.json','utf8'));
 for(const phrase of PHRASES){
  assert(PHRASE_PICTURES[phrase.en]?.length,phrase.en);
  for(const icon of PHRASE_PICTURES[phrase.en])assert(ICON_ASSETS[icon]&&existsSync(`public${ICON_ASSETS[icon]}`),icon);
  assert(manifest[`en|${phrase.en}`],phrase.en);
 }
 for(const unit of LEARNING_UNITS)for(const key of lessonWords(unit,1))assert(manifest[`en|${key}`]);
 assert.notDeepEqual(PHRASE_PICTURES['My turn!'],PHRASE_PICTURES['Your turn!']);
});
