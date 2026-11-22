import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount,learningEntry} from '../../src/data/curriculum';
import {progressUnit,attempt} from '../../src/lib/learningProgress';
import {stageProfile} from '../../src/lib/learningStage';
import {islandTask} from '../../src/lib/islandPlan';
import {PLAYS,ROUNDS,playAsk,playsAt,playUnlockUnit,learnedFrom,wishFor,finishPlay,wishDone,playOrder,playChoices,duePlay,islandToday,playById,ownPlay,OWN_SPECIES,freeItems,isFreePlay} from '../../src/island/plays';
import {placeById,HOMES} from '../../src/island/world';
import {validateSave} from '../../src/lib/saveValidation';
import {CREATURES,SPECIES} from '../../src/data/creatures';
import {unlockedDistricts} from '../../src/lib/islandPlan';

const fixture=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};

test('every activity is at a real place, uses words with pictures and voice entries, and some lesson opens it',()=>{
 assert.equal(new Set(PLAYS.map(p=>p.id)).size,PLAYS.length);
 for(const p of PLAYS){
  assert.ok(placeById(p.place),p.place);
  for(const k of p.pool)assert.ok(learningEntry(k),`${p.id}: ${k}`);
  assert.ok(playUnlockUnit(p),`${p.id} is opened by a lesson`);
 }
});

test('an activity appears only with two learned items and asks only for learned items',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];
 assert.deepEqual(playsAt(s,'tent'),[]);
 learn(s,4);
 const ids=playsAt(s,'tent').map(p=>p.id);
 assert.ok(ids.includes('tidy'),'ball/book/hat from the first lesson');assert.ok(ids.includes('goodnight'),'sun/moon/star');
 for(const p of PLAYS.filter(p=>learnedFrom(s,p).length>=2))for(let r=0;r<ROUNDS;r++){
  const a=playAsk(s,p,'session-1',r)!;const learned=new Set(learnedFrom(s,p));
  assert.ok(learned.has(a.answer));assert.ok(a.options.every(o=>learned.has(o.id)),`${p.id} options are learned`);
  assert.ok(a.options.some(o=>o.id===a.answer));
 }
 const tidy=PLAYS.find(p=>p.id==='tidy')!;
 assert.equal(new Set([0,1,2].map(r=>playAsk(s,tidy,'x',r)!.answer)).size,3,'three rounds, three different things');
});

test('every companion\'s wish is an activity at its favourite place or home, once learned',()=>{
 const s=fixture();learn(s,24);
 for(const species of new Set(CREATURES.map(c=>c.species))){
  const w=wishFor(s,species);
  if(w)assert.ok([HOMES[species].favorite,HOMES[species].home].includes(w.place),species);
 }
 assert.ok(wishFor(s,'nutty'),'the acorn chipmunk wishes to dig in the sand');
});

test('finishing the wished activity completes today\'s wish once; another activity only adds friendship',()=>{
 const s=fixture();learn(s,24);const c=s.captures[0];const species=CREATURES.find(x=>x.id===c.id)!.species;
 const wish=wishFor(s,species)!,other=PLAYS.find(p=>p.id!==wish.id)!;
 const f0=c.friendship;
 finishPlay(s,other,c.id,'2026-11-19',wish);assert.equal(wishDone(s,'2026-11-19',c.id),false);
 finishPlay(s,wish,c.id,'2026-11-19',wish);finishPlay(s,wish,c.id,'2026-11-19',wish);
 assert.equal(wishDone(s,'2026-11-19',c.id),true);assert.deepEqual(s.islandWishes!.done,[c.id]);
 assert.equal(wishDone(s,'2026-11-20',c.id),false,'a new day, a new wish');
 assert.equal(c.friendship,Math.min(100,f0+6));
 assert.deepEqual(validateSave(JSON.parse(JSON.stringify(s))).islandWishes,s.islandWishes);
 const bad=JSON.parse(JSON.stringify(s));bad.islandWishes.done='x';assert.throws(()=>validateSave(bad));
});

// Audit P0-2: a wish never leads into an area the learning path has not opened.
test('activities and wishes only appear in areas the learning path has opened',async()=>{
 const {unlockedDistricts}=await import('../../src/lib/islandPlan');
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];
 for(let n=1;n<=LEARNING_UNITS.length;n++){
  learn(s,n);const open=unlockedDistricts(s);
  for(const species of new Set(CREATURES.map(c=>c.species))){const w=wishFor(s,species);if(w)assert.ok(open.has(placeById(w.place)!.district),`${species} wishes for ${w.place} after lesson ${n}`);}
  for(const p of PLAYS)for(const shown of playsAt(s,p.place))assert.ok(open.has(placeById(shown.place)!.district));
 }
 const first=fixture();for(const u of Object.keys(first.learning!.units))delete first.learning!.units[u];learn(first,1);
 assert.deepEqual(playsAt(first,'ball'),[],'the ball field waits for the play area even after ball/hat are learned');
});

// Audit P1-8: every place has something to do, and every companion has a wish once the path is walked.
test('every one of the fourteen places has an activity, and every companion can have a wish',async()=>{
 const {PLACES}=await import('../../src/island/world');
 const special=new Set(['picnic']); // the picnic has its own flow
 for(const p of PLACES)if(!special.has(p.id))assert.ok(PLAYS.some(x=>x.place===p.id),`${p.id} has an activity`);
 const s=fixture();learn(s,24);
 for(const species of new Set(CREATURES.map(c=>c.species)))assert.ok(wishFor(s,species),`${species} has a wish`);
});

// Audit P2-15: mini-games practise what the learning path has taught.
test('extra practice uses learned words and phrases once three are learned; the regular set follows the current lesson',async()=>{
 const {dailyLearningPlan,practiceWordPool,pathLearned}=await import('../../src/data/learning');
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];
 assert.ok(practiceWordPool(s).length>3,'nothing learned yet: the stage words');
 learn(s,2);const words=new Set(pathLearned(s).words.map(w=>w.en));
 assert.ok(dailyLearningPlan(s,true).words.every(w=>words.has(w.en)),'extra practice: learned words only');
 assert.ok(practiceWordPool(s).every(w=>words.has(w.en)),'pictures to choose from: learned words only');
 learn(s,3);const phrases=new Set(pathLearned(s).phrases.map(p=>p.en));
 assert.equal(phrases.size,3);assert.ok(dailyLearningPlan(s,true).phrases.every(p=>phrases.has(p.en)));
});

const DAY=86400000,NOW=Date.UTC(2026,10,22,10);
/** Every learned item was met and answered at `at`, so nothing is due until a day later. */
const meet=(s:SaveData,keys:string[],at:number)=>{for(const k of keys)attempt(s,k,true,false,'lesson',at);};

test('the same words are met through different actions: hand over, find, choose a colour, recognise a sentence',()=>{
 const kinds=new Set(PLAYS.map(p=>p.kind));
 for(const k of ['do','find','sort','say','toy'] as const)assert.ok(kinds.has(k),k);
 for(const p of PLAYS.filter(p=>p.kind==='sort'||p.kind==='toy')){assert.ok(p.slots,p.id);for(const k of p.pool)assert.ok(learningEntry(k)!.css,`${p.id}: ${k} is a colour`);}
 for(const p of PLAYS.filter(p=>p.kind==='say'))for(const k of p.pool)assert.equal(learningEntry(k)!.kind,'phrase',`${p.id}: ${k}`);
});

test('a session asks first for what is due for review, keeps its order, and never repeats within three rounds',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};
 learn(s,4);const tidy=playById('tidy')!;
 meet(s,['ball','book','hat'],NOW);
 s.learning!.records['hat'].nextReview=NOW-DAY;
 assert.equal(playOrder(s,tidy,'a',NOW)[0],'hat');assert.equal(playOrder(s,tidy,'b',NOW)[0],'hat');
 const order=playOrder(s,tidy,'a',NOW);
 assert.deepEqual([...order].sort(),['ball','book','hat']);
 // Answering the due item must not reshuffle the session: the stored order is what the rounds follow.
 attempt(s,'hat',true,false,'island:tidy',NOW);
 const asked=[0,1,2].map(r=>playAsk(s,tidy,'a',r,order)!.prompt.key);
 assert.deepEqual(asked,order);assert.equal(new Set(asked).size,3);
});

test('a child who is mostly listening sees fewer things; a scene to search holds more',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];learn(s,24);
 const tidy=playById('tidy')!,sky=playById('sky')!;
 s.settings.learningProfile=stageProfile('express');
 assert.equal(playChoices(s,tidy),3);assert.equal(playChoices(s,sky),5);
 assert.equal(playAsk(s,sky,'x',0)!.options.length,5);
 s.settings.learningProfile=stageProfile('listen');
 assert.equal(playAsk(s,tidy,'x',0)!.options.length,2);assert.equal(playAsk(s,sky,'x',0)!.options.length,3);
 for(const a of [playAsk(s,tidy,'x',0)!,playAsk(s,sky,'x',0)!])assert.ok(a.options.some(o=>o.id===a.answer));
});

test('the island invites the child to the place where learned words are due, after the path stop and before a revisit',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};
 learn(s,4);
 const learned=LEARNING_UNITS.slice(0,4).flatMap(u=>[...u.words,u.phrase]);
 meet(s,learned,NOW);
 assert.equal(duePlay(s,NOW),undefined,'nothing is due on the day it was answered');
 assert.deepEqual(islandToday(s,NOW),islandTask(s));
 for(const k of ['sun','moon'])s.learning!.records[k].nextReview=NOW-DAY;
 const due=duePlay(s,NOW)!;
 assert.equal(due.play.id,'goodnight');assert.deepEqual([...due.keys].sort(),['moon','sun']);
 const today=islandToday(s,NOW);
 if(islandTask(s).kind==='path')assert.equal(today.kind,'path');
 else{assert.equal(today.kind,'due');if(today.kind==='due'){assert.equal(today.station,'tent');assert.equal(today.play,'goodnight');assert.ok(['sun','moon'].includes(today.phrase.key));}}
 // A place whose area the path has not opened yet is never suggested.
 for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];
 assert.equal(duePlay(s,NOW),undefined);
});

test('every companion has its own little wish, built from learnable words, and each way of playing has several companions',()=>{
 assert.deepEqual([...OWN_SPECIES].sort(),SPECIES.map(x=>x.id).sort());
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];learn(s,24);
 const count:Record<string,number>={};
 for(const species of OWN_SPECIES){
  const p=ownPlay(s,species)!;assert.ok(p,species);
  assert.equal(p.owner,species);assert.equal(p.id,`own-${species}`);
  assert.ok([HOMES[species].favorite,HOMES[species].home].includes(p.place),species);
  for(const k of p.pool)assert.ok(learningEntry(k),`${species}: ${k}`);
  assert.ok(playUnlockUnit(p),`${species}: some lesson opens it`);
  assert.equal(new Set(p.pool).size,p.pool.length,`${species}: no repeats`);
  if(p.kind==='sort'||p.kind==='toy'){assert.ok(p.slots,species);for(const k of p.pool)assert.ok(learningEntry(k)!.css,`${species}: ${k} is a colour`);}
  if(p.kind==='say')for(const k of p.pool)assert.equal(learningEntry(k)!.kind,'phrase',`${species}: ${k}`);
  if(p.kind==='do'||p.kind==='find'||p.kind==='echo')for(const k of p.pool)assert.equal(learningEntry(k)!.kind,'word',`${species}: ${k}`);
  assert.equal(wishFor(s,species)!.id,p.id,`${species}: with everything learned the wish is its own`);
  assert.deepEqual(playById(p.id,s),p);
  count[p.kind]=(count[p.kind]??0)+1;
 }
 for(const k of ['do','find','say','echo','toy'])assert.ok(count[k]>=3,`${k}: ${count[k]}`);
});

test('a companion\'s own wish waits for its words and for an open place; until then its place\'s activity stands in',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];
 learn(s,1);
 // Only the camp is open: a companion living elsewhere has no place for its own wish yet.
 const open=unlockedDistricts(s);
 for(const species of OWN_SPECIES){
  const p=ownPlay(s,species);
  if(p)assert.ok(open.has(placeById(p.place)!.district),species);
  const w=wishFor(s,species);
  if(w?.owner)assert.ok(learnedFrom(s,w).length>=2,species);
 }
 // Sayo repeats what the child taps: its wish is its own once two of its words are learned, and doing it is the wish.
 learn(s,7);
 const own=ownPlay(s,'sayo')!;assert.equal(own.kind,'echo');assert.ok(learnedFrom(s,own).length>=2);
 assert.equal(wishFor(s,'sayo')!.id,'own-sayo');
 const sayo=CREATURES.find(c=>c.species==='sayo'&&c.stage===1)!;
 s.captures.push({...s.captures[0],id:sayo.id,friendship:10,played:0});
 assert.equal(finishPlay(s,own,sayo.id,'2026-11-22',wishFor(s,'sayo')),true);
 assert.equal(wishDone(s,'2026-11-22',sayo.id),true);
});

test('free play offers only learned things, has no questions, and is never what the island calls due',()=>{
 const s=fixture();for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};learn(s,24);
 for(const p of [...PLAYS,...OWN_SPECIES.map(x=>ownPlay(s,x)!)].filter(isFreePlay)){
  const items=freeItems(s,p,'x',NOW);
  assert.ok(items.length>=2&&items.length<=7,p.id);
  for(const k of items)assert.ok(p.pool.includes(k));
 }
 for(const k of ['red','blue'])attempt(s,k,true,false,'lesson',NOW-3*DAY);
 const due=duePlay(s,NOW);
 assert.ok(due&&!isFreePlay(due.play),'colours due lead to an activity that asks, not to a toy');
});
