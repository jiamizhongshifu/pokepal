import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount,learningEntry} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {PLAYS,ROUNDS,playAsk,playsAt,playUnlockUnit,learnedFrom,wishFor,finishPlay,wishDone} from '../../src/island/plays';
import {placeById,HOMES} from '../../src/island/world';
import {validateSave} from '../../src/lib/saveValidation';
import {CREATURES} from '../../src/data/creatures';

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
