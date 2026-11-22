import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount,learningEntry,unitSituations} from '../../src/data/curriculum';
import {progressUnit,attempt} from '../../src/lib/learningProgress';
import {ERRANDS,errandFor,errandAt,errandSteps,finishErrand,shownTraces,validTraces,TRACE_DAYS} from '../../src/island/errands';
import {placeById} from '../../src/island/world';
import {islandTask} from '../../src/lib/islandPlan';
import {learningPath,currentNode} from '../../src/lib/learningPath';
import {validateSave} from '../../src/lib/saveValidation';
import {stageProfile} from '../../src/lib/learningStage';
import {PHRASE_PICTURES} from '../../src/data/phrasePictures';

const DAY=86400000,NOW=Date.UTC(2026,10,22,10);
const fixture=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};delete s.islandTraces;return s;};
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};

test('every lesson has an errand at its own place, built only from the lesson\'s situation, sentences and words',()=>{
 assert.equal(ERRANDS.length,LEARNING_UNITS.length);
 const s=fixture();learn(s,LEARNING_UNITS.length);
 for(const e of ERRANDS){
  assert.equal(e.place.id,placeById(e.unit.station)!.id,e.unit.id);
  if(e.act==='sort')assert.ok(e.unit.words.every(w=>learningEntry(w)!.css),`${e.unit.id}: colours to choose`);
  const steps=errandSteps(s,e,'t',NOW);
  assert.equal(steps.length,3,e.unit.id);
  assert.equal(steps[0].kind,'say');assert.equal(steps[0].ask.situation,e.unit.situation);assert.equal(steps[0].ask.answer,e.unit.phrase);
  assert.deepEqual(steps[0].ask.options.map(o=>o.id).sort(),[e.unit.phrase,e.unit.alternative].sort());
  assert.equal(steps[1].kind,e.act);assert.ok(e.unit.words.includes(steps[1].ask.answer));
  const taught=new Set([...e.unit.words,...unitSituations(e.unit).flatMap(x=>[x.phrase,x.alternative])]);
  for(const st of steps){assert.ok(st.ask.options.some(o=>o.id===st.ask.answer));for(const o of st.ask.options)assert.ok(taught.has(o.id),`${e.unit.id}: ${o.id}`);}
  if(e.unit.practice?.[0])assert.equal(steps[2].ask.situation,e.unit.practice[0].situation);
  else{assert.equal(steps[2].kind,e.act);assert.notEqual(steps[2].ask.answer,steps[1].ask.answer,'a second word, not the same again');}
  // A sentence to choose is shown as a picture, so a child who cannot read can still choose.
  for(const st of steps.filter(x=>x.kind==='say'))for(const o of st.ask.options)assert.ok(PHRASE_PICTURES[o.entry!.en],`picture for ${o.entry!.en}`);
 }
});

test('a word due for review is the one the errand acts on; a listening child hears the sentence as a model',()=>{
 const s=fixture();learn(s,1);const e=errandFor(LEARNING_UNITS[0])!;
 for(const w of ['ball','book','hat'])attempt(s,w,true,false,'lesson',NOW);
 s.learning!.records['book'].nextReview=NOW-DAY;
 assert.equal(errandSteps(s,e,'a',NOW)[1].ask.answer,'book');assert.equal(errandSteps(s,e,'b',NOW)[1].ask.answer,'book');
 s.settings.learningProfile=stageProfile('express');assert.equal(errandSteps(s,e,'a',NOW)[0].ask.model,false);
 s.settings.learningProfile=stageProfile('listen');assert.equal(errandSteps(s,e,'a',NOW)[0].ask.model,true);
});

test('an errand waits at its place once the lesson is learned, and finishing it is what completes the island stop',()=>{
 const s=fixture();
 assert.equal(errandAt(s,'tent'),undefined,'nothing learned yet');
 learn(s,1);
 assert.equal(errandAt(s,'tent')!.unit.id,'hello-island');assert.equal(errandAt(s,'fire'),undefined);
 const partner=s.captures[0],before={f:partner.friendship,p:partner.played??Math.floor(partner.friendship/16)};
 assert.equal(finishErrand(s,'hello-island',partner.id,NOW),true);
 assert.equal(s.learning!.units['hello-island'].encounteredAt,NOW);
 assert.equal(errandAt(s,'tent'),undefined,'done');
 assert.equal(partner.friendship,Math.min(100,before.f+2));assert.equal(partner.played,before.p+1);
 assert.equal(finishErrand(s,'color-orchard',partner.id,NOW),false,'a lesson not learned has no errand');
 // Two lessons share the tent: the one the island task points to comes first, the other stays open.
 learn(s,4);
 assert.equal(currentNode(learningPath(s))?.kind==='island'?islandTask(s).kind:'path','path');
 assert.equal(errandAt(s,'tent')!.unit.id,'quiet-night');
 finishErrand(s,'quiet-night',partner.id,NOW+1);
 assert.equal(errandAt(s,'tent'),undefined);
});

test('what an errand left stays beside its place for a few days, is valid save data, and survives a reload',()=>{
 const s=fixture();learn(s,4);
 finishErrand(s,'hello-island',undefined,NOW);finishErrand(s,'quiet-night',undefined,NOW+1000);
 const shown=shownTraces(s,NOW+2000);
 assert.deepEqual(shown.map(t=>t.id),['hello-island','quiet-night']);
 assert.notDeepEqual(shown[0].spot,shown[1].spot,'two traces at the tent do not cover each other');
 for(const t of shown){assert.ok(t.spot[0]>0&&t.spot[0]<100&&t.spot[1]>0&&t.spot[1]<100);assert.ok(t.label);}
 assert.equal(shownTraces(s,NOW+TRACE_DAYS*DAY+2000).length,0,'gone after a few days');
 assert.equal(shownTraces(s,NOW-DAY).length,0,'a clock set back shows nothing rather than something from the future');
 const again=validateSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(again.islandTraces,s.islandTraces);
 assert.equal(validTraces({'no-such-lesson':1}),false);assert.equal(validTraces({'hello-island':'x'}),false);assert.equal(validTraces([]),false);
});
