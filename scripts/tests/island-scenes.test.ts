import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit} from '../../src/lib/learningProgress';
import {unitDistrict,unlockedDistricts} from '../../src/lib/islandPlan';
import {validateSave} from '../../src/lib/saveValidation';
import {finishErrand} from '../../src/island/errands';
import {learnedKeys} from '../../src/island/plays';
import {SCENES,SCENE_ORDER,THINGS_SHOWN,INVITES_SHOWN,sceneThings,scenePlays,islandInvites,inviteKey,type Standing} from '../../src/island/scenes';
import {DISTRICTS,placeById} from '../../src/island/world';
import {existsSync} from 'node:fs';

const NOW=Date.UTC(2026,10,22,10);
const fixture=()=>{const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));for(const u of Object.keys(s.learning!.units))delete s.learning!.units[u];s.learning!.records={};delete s.islandTraces;delete s.islandParties;delete s.islandWishes;return s;};
const learn=(s:SaveData,n:number)=>{for(const u of LEARNING_UNITS.slice(0,n))progressUnit(s,u.id,unitRoundCount(u),100);};
const friends:Standing[]=[{id:1001,species:'bubbo',place:'tent'},{id:1041,species:'berry',place:'tree'}];

test('every area of the island is a scene with its own picture',()=>{
 assert.deepEqual([...SCENE_ORDER].sort(),DISTRICTS.map(d=>d.id).sort());
 for(const d of SCENE_ORDER)assert.ok(existsSync(`public/scenes/flat-v1/story-bg/${SCENES[d].background}.svg`),d);
});

test('a scene shows the words of its own lessons: learned ones to touch, the next ones as shadows',()=>{
 const s=fixture();
 for(const d of SCENE_ORDER){const t=sceneThings(s,d);assert.ok(t.length<=3&&t.every(x=>!x.learned),`${d}: nothing learned, a few shadows`);}
 learn(s,LEARNING_UNITS.length);
 const known=learnedKeys(s);
 for(const d of SCENE_ORDER){
  const t=sceneThings(s,d);
  assert.ok(t.length>0&&t.length<=THINGS_SHOWN,d);
  assert.ok(t.every(x=>x.learned&&known.has(x.entry.key)),d);
  assert.equal(new Set(t.map(x=>x.entry.key)).size,t.length,`${d}: no thing twice`);
  const own=new Set(LEARNING_UNITS.filter(u=>unitDistrict(u)===d).flatMap(u=>u.words));
  assert.ok(t.every(x=>own.has(x.entry.key)||own.has(x.entry.en)),`${d}: only this scene's words`);
 }
});

test('invites: a few clear things to do, one per scene, the lesson\'s errand among them and marked as the lesson\'s',()=>{
 const s=fixture();
 assert.deepEqual(islandInvites(s,[],'2026-11-22',NOW),[],'nobody on the island, nothing to invite to');
 learn(s,3);
 const open=unlockedDistricts(s),invites=islandInvites(s,friends,'2026-11-22',NOW);
 assert.ok(invites.length>0&&invites.length<=INVITES_SHOWN);
 assert.equal(new Set(invites.map(i=>i.district)).size,invites.length);
 assert.equal(new Set(invites.map(inviteKey)).size,invites.length);
 for(const i of invites){
  assert.ok(open.has(i.district));assert.equal(placeById(i.place)!.district,i.district);
  assert.ok(friends.some(f=>f.id===i.partner));assert.ok(i.icon);
  assert.equal(i.lesson,i.kind!=='play');
 }
 const errand=invites.find(i=>i.kind==='errand');
 assert.ok(errand&&errand.kind==='errand'&&LEARNING_UNITS.slice(0,3).some(u=>u.id===errand.errand.unit.id));
 // Done errands leave; what remains are the friends' wishes and due words.
 for(const u of LEARNING_UNITS.slice(0,3))finishErrand(s,u.id,1001,NOW);
 assert.ok(islandInvites(s,friends,'2026-11-22',NOW).every(i=>i.kind==='play'));
});

test('a scene offers only activities of its own places whose words are learned',()=>{
 const s=fixture();
 assert.ok(SCENE_ORDER.every(d=>scenePlays(s,d).length===0));
 learn(s,LEARNING_UNITS.length);
 for(const d of SCENE_ORDER)for(const p of scenePlays(s,d))assert.equal(placeById(p.place)!.district,d,p.id);
 assert.ok(SCENE_ORDER.every(d=>scenePlays(s,d).length>0));
});

import {PLAYS,playLine,taughtPhrases,mealWaiting,playOrder} from '../../src/island/plays';
import {learningEntry,unitSituations} from '../../src/data/curriculum';
import {newFarm} from '../../src/lib/farm';

test('what a friend says around an activity is a sentence of the path, and only once the path has taught it',()=>{
 const all=new Set(LEARNING_UNITS.flatMap(unitSituations).flatMap(x=>[x.phrase,x.alternative]));
 const spoken=PLAYS.flatMap(p=>Object.values(p.lines??{}));
 assert.ok(spoken.length>0);
 for(const line of spoken){assert.equal(learningEntry(line)?.kind,'phrase',line);assert.ok(all.has(line),`${line} is taught somewhere on the path`);}
 const s=fixture(),meal=PLAYS.find(p=>p.eats)!;
 assert.equal(taughtPhrases(s).size,0);
 for(const at of ['start','each','end'] as const)assert.equal(playLine(s,meal,at),undefined);
 learn(s,LEARNING_UNITS.length);
 for(const at of ['start','each','end'] as const)assert.equal(playLine(s,meal,at)?.en,meal.lines![at]);
});

test('fruit picked in the garden is what a hungry friend asks for first, and brings the invite to eat',()=>{
 const s=fixture();learn(s,LEARNING_UNITS.length);
 for(const u of LEARNING_UNITS)finishErrand(s,u.id,1001,NOW);
 const meal=PLAYS.find(p=>p.eats)!;
 s.farm=newFarm();
 assert.equal(mealWaiting(s),undefined,'an empty basket: nobody asks to eat');
 s.farm.basket.strawberry=2;
 assert.equal(mealWaiting(s)?.id,meal.id);
 assert.equal(playOrder(s,meal,'t',NOW)[0],'strawberry');
 assert.deepEqual([...playOrder(s,meal,'t',NOW)].sort(),[...playOrder({...s,farm:newFarm()},meal,'t',NOW)].sort(),'the same things, only their order changes');
 assert.ok(islandInvites(s,friends,'2026-11-22',NOW).some(i=>i.kind==='play'&&i.play.id===meal.id));
});

import {rhythmPlay} from '../../src/island/plays';
import {ISLAND_DAY,islandDone,dayDone,noteIslandDone} from '../../src/island/scenes';

test('the time of day brings a meal at mealtimes and bedtime in the evening, once their words are learned',()=>{
 const s=fixture();
 assert.equal(rhythmPlay(s,12),undefined,'nothing learned, nothing asked');
 learn(s,LEARNING_UNITS.length);
 for(const h of [7,12,18.5])assert.ok(rhythmPlay(s,h)?.eats,`${h}: a meal`);
 for(const h of [20,23,3])assert.ok(rhythmPlay(s,h)?.sleeps,`${h}: bedtime`);
 for(const h of [9,15,17])assert.equal(rhythmPlay(s,h),undefined,`${h}: free time`);
 for(const u of LEARNING_UNITS)finishErrand(s,u.id,1001,NOW);
 assert.ok(islandInvites(s,friends,'2026-11-22',NOW,20).some(i=>i.kind==='play'&&i.play.sleeps));
});

test('three things make the island\'s day: after that the friends stop asking, but the path\'s errand is still shown',()=>{
 const s=fixture();learn(s,3);
 assert.equal(islandDone(s),0);assert.equal(dayDone(s),false);
 for(let i=0;i<ISLAND_DAY+2;i++)noteIslandDone(s);
 assert.equal(islandDone(s),ISLAND_DAY);assert.ok(dayDone(s));
 assert.doesNotThrow(()=>validateSave(JSON.parse(JSON.stringify(s))));
 const left=islandInvites(s,friends,'2026-11-22',NOW,12);
 assert.ok(left.length>0&&left.every(i=>i.lesson),'only what the path waits for');
 for(const u of LEARNING_UNITS.slice(0,3))finishErrand(s,u.id,1001,NOW);
 assert.deepEqual(islandInvites(s,friends,'2026-11-22',NOW,12),[]);
});
