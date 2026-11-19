import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {classifyResponse,recordOpportunity,OPPORTUNITY_LIMIT,summarizeOpportunities,summarizeDelayed,localDayGap,EVIDENCE_MIN_SAMPLE,markHomeTried,type RoundTrace,type Opportunity} from '../../src/lib/learningProgress';
import {validateSave} from '../../src/lib/saveValidation';
import {LEARNING_UNITS,reviewSituation,unitSituations,unitById} from '../../src/data/curriculum';

const base:RoundTrace={firstAnswer:'correct',replays:0,modelShown:false,heardBeforeAnswer:true,outcome:'solved'};
const fixture=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));

// T06 synthetic cases: one per situation the optimisation plan lists.
test('a direct first correct answer after hearing the word is the only independent case',()=>{
 assert.equal(classifyResponse(base),'independent');
 assert.equal(classifyResponse({...base,replays:2}),'after-replay','replays are their own category');
});

test('a wrong first try stays a wrong first try even when corrected afterwards',()=>{
 assert.equal(classifyResponse({...base,firstAnswer:'wrong'}),'after-hint');
});

test('seeing the answer first (help or listen-first) is a demonstration, whatever happened next',()=>{
 assert.equal(classifyResponse({...base,modelShown:true}),'after-model');
 assert.equal(classifyResponse({...base,firstAnswer:'wrong',modelShown:true}),'after-model');
 assert.equal(classifyResponse({...base,firstAnswer:null,modelShown:true}),'after-model');
});

test('unconfirmed audio is unknown rather than independent; skipping and leaving are kept apart',()=>{
 assert.equal(classifyResponse({...base,heardBeforeAnswer:false}),'unknown');
 assert.equal(classifyResponse({...base,outcome:'skipped',modelShown:true}),'skipped');
 assert.equal(classifyResponse({...base,firstAnswer:null,outcome:'left'}),'left');
});

test('opportunities are bounded, survive a reload and corrupt entries are rejected',()=>{
 const s=fixture() as SaveData;
 for(let i=0;i<OPPORTUNITY_LIMIT+5;i++)recordOpportunity(s,{at:i,source:'unit:hello-island',key:'ball',kind:'independent',tries:1,replays:0});
 assert.equal(s.learning!.opportunities!.length,OPPORTUNITY_LIMIT);
 assert.equal(s.learning!.opportunities![0].at,5,'oldest dropped first');
 const back=validateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(back.learning!.opportunities!.length,OPPORTUNITY_LIMIT);
 const bad=JSON.parse(JSON.stringify(s));bad.learning.opportunities[0].kind='mastered';
 assert.throws(()=>validateSave(bad));
 const old=fixture();delete old.learning!.opportunities;assert.doesNotThrow(()=>validateSave(old),'older saves without records still load');
});

// T09: the parent summary never counts helped answers as independent and says when there is too little to tell.
test('the parent summary keeps every kind apart and only offers a share with enough decidable answers',()=>{
 const o=(kind:Opportunity['kind'],at=10):Opportunity=>({v:1,at,source:'unit:x',key:'ball',kind,tries:1,replays:0});
 const few=summarizeOpportunities([o('independent'),o('after-hint'),o('unknown'),o('left')],0);
 assert.equal(few.decidable,2);assert.equal(few.enough,false);assert.equal(few.count.unknown,1);
 const list=[o('independent'),o('independent'),o('after-replay'),o('after-hint'),o('after-model'),o('skipped'),o('unknown'),o('independent',1)];
 const week=summarizeOpportunities(list,5);
 assert.equal(week.total,7,'older than the window is left out');
 assert.equal(week.independent,2);assert.equal(week.decidable,6);assert.equal(week.enough,week.decidable>=EVIDENCE_MIN_SAMPLE);
});

// T08: the parent's "tried at home" note is separate from answers and can be undone.
test('marking the take-home phrase as tried touches nothing else and survives a reload',()=>{
 const s=fixture() as SaveData;
 const id='hello-island';s.learning!.units[id]??={round:0};
 const before=JSON.stringify({r:s.learning!.records,o:s.learning!.opportunities,c:s.learning!.units[id].completedAt});
 markHomeTried(s,id,true,123);markHomeTried(s,id,true,456);
 assert.equal(s.learning!.units[id].homeTriedAt,123,'first note kept');
 assert.equal(JSON.stringify({r:s.learning!.records,o:s.learning!.opportunities,c:s.learning!.units[id].completedAt}),before);
 assert.equal(validateSave(JSON.parse(JSON.stringify(s))).learning!.units[id].homeTriedAt,123);
 markHomeTried(s,id,false);assert.equal(s.learning!.units[id].homeTriedAt,undefined);
 markHomeTried(s,'not-started',true);assert.equal(s.learning!.units['not-started'],undefined,'no record for lessons never opened');
});

// T07: delayed review is measured in local days, same-day repeats never count, and clock changes cannot break it.
test('local day gaps ignore same-day repeats and clocks set backwards',()=>{
 const noon=new Date(2026,10,19,12).getTime();
 assert.equal(localDayGap(undefined,noon),undefined,'first meeting has no gap');
 assert.equal(localDayGap(new Date(2026,10,19,8).getTime(),noon),0);
 assert.equal(localDayGap(new Date(2026,10,18,23).getTime(),noon),1,'calendar days, not 24-hour blocks');
 assert.equal(localDayGap(new Date(2026,10,25).getTime(),noon),0,'clock moved back reads as same day');
});

test('only review answers met again on a later day count as delayed, and the content version is kept',()=>{
 const o=(gapDays:number|undefined,source='review',kind:Opportunity['kind']='independent'):Opportunity=>({v:1,at:10,source,key:'ball',kind,tries:1,replays:0,gapDays,cv:1});
 const later=summarizeDelayed([o(0),o(undefined),o(1),o(3,'review','after-hint'),o(2,'unit:x')],0);
 assert.equal(later.total,2);assert.equal(later.independent,1);
 const s=fixture() as SaveData;recordOpportunity(s,o(2));
 assert.equal(validateSave(JSON.parse(JSON.stringify(s))).learning!.opportunities!.at(-1)!.cv,1);
 const bad=JSON.parse(JSON.stringify(s));bad.learning.opportunities.at(-1).gapDays=-1;assert.throws(()=>validateSave(bad));
});

test('review prefers a scene from a lesson the phrase was not met in, and falls back to the familiar one',()=>{
 const multi=LEARNING_UNITS.flatMap(u=>unitSituations(u).map(s=>[u.id,s.phrase] as const));
 const byPhrase=new Map<string,string[]>();for(const [id,p] of multi)byPhrase.set(p,[...(byPhrase.get(p)??[]),id]);
 for(const [phrase,ids] of byPhrase){
  const scene=reviewSituation(phrase,[`unit:${ids[0]}`])!;
  assert.equal(scene.phrase,phrase);
  if(new Set(ids).size>1)assert.ok(!unitSituations(unitById(ids[0])!).includes(scene),`${phrase} moves to a new lesson scene`);
 }
});
