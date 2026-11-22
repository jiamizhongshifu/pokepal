import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit,applyStation} from '../../src/lib/learningProgress';
import {finishErrand} from '../../src/island/errands';
import {learningPath,currentNode} from '../../src/lib/learningPath';
import {placeById} from '../../src/island/world';
import {unlockedDistricts,unlockingUnit,unitDistrict,learnedPhrase,learnedHere,islandTask,visitStation} from '../../src/lib/islandPlan';
import {STORIES,storyProgressKey} from '../../src/data/stories';

const fresh=()=>({version:1,settings:{level:1},wordStats:{},energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{caught:[]},learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const unit=(id:string)=>LEARNING_UNITS.find(u=>u.id===id)!;
const finish=(s:SaveData,id:string,at=100)=>progressUnit(s,id,unitRoundCount(unit(id)),at);

test('every lesson happens at a real island place, and every area is opened by some lesson',()=>{
 for(const u of LEARNING_UNITS)assert.ok(placeById(u.station),`${u.id} at ${u.station}`);
 for(const d of ['garden','play','leisure','camp','beach'] as const)assert.ok(unlockingUnit(d),`${d} can be reached`);
});

test('a new child has only the first lesson\'s area; areas light up as the path reaches their first lesson',()=>{
 const s=fresh();
 assert.deepEqual([...unlockedDistricts(s)],[unitDistrict(LEARNING_UNITS[0])]);
 assert.equal(unlockedDistricts(s).has('play'),false,'the play area waits for its lesson');
 finish(s,'hello-island');
 assert.ok(unlockedDistricts(s).has(unitDistrict(unit('color-orchard'))),'the next lesson\'s area opens when it becomes reachable');
 assert.equal(unlockedDistricts(s).has('beach'),false);
});

test('a place speaks a sentence learned there, the same all day, and nothing before it is learned',()=>{
 const s=fresh();
 assert.equal(learnedPhrase(s,'tent'),undefined);
 finish(s,'hello-island');
 assert.equal(learnedPhrase(s,'tent')?.en,'Hello!');
 assert.deepEqual(learnedHere(s,'bed-1').map(u=>u.id),['hello-island'],'the sleeping mats are at the tent');
 s.learning!.units['tidy-together']={round:unitRoundCount(unit('tidy-together')),completedAt:200};
 const morning=new Date(2026,10,19,8).getTime(),night=new Date(2026,10,19,22).getTime();
 assert.equal(learnedPhrase(s,'tent',morning)?.en,learnedPhrase(s,'tent',night)?.en,'stable within a day');
 const days=new Set([0,1,2,3].map(d=>learnedPhrase(s,'tent',morning+d*86400000)?.en));
 assert.equal(days.size,2,'two lessons at the tent take turns by day');
});

test('the island task follows the path: its island stop first, then a lesson not yet used, then the next stop',()=>{
 const s=fresh();
 assert.equal(islandTask(s).kind,'route');
 finish(s,'hello-island',100);
 const t=islandTask(s);assert.equal(t.kind,'revisit');assert.equal(t.kind==='revisit'&&t.phrase.en,'Hello!');
 applyStation(s,'tent',120,'Hello!');
 assert.equal(islandTask(s).kind,'revisit','hearing the sentence at the place is not yet using it');
 finishErrand(s,'hello-island',undefined,150);
 assert.equal(islandTask(s).kind,'route','errand done on the island: back to the path');
 for(const id of ['color-orchard','snack-discovery','quiet-night'])finish(s,id,200);
 const book=STORIES.find(b=>b.id===learningPath(s)[0].nodes[2].storyId)!;(s.storyProgress??={})[storyProgressKey(book)]=book.pages.length+1;
 assert.equal(currentNode(learningPath(s))?.kind,'island');
 const stop=islandTask(s);assert.equal(stop.kind,'path');
 assert.equal(stop.kind==='path'&&visitStation(stop.station),'bed-0','a place family is visited at its first place');
});

test('a lesson\'s errand completes its island stop even after the next lesson was opened, and only for that lesson',()=>{
 const s=fresh();
 for(const id of ['hello-island','color-orchard','snack-discovery','quiet-night'])finish(s,id,100);
 s.learning!.activeUnit='garden-helper';
 assert.equal(finishErrand(s,'quiet-night',undefined,300),true);
 assert.equal(s.learning!.units['quiet-night'].encounteredAt,300);
 assert.equal(s.learning!.units['hello-island'].encounteredAt,undefined,'the other lesson at the tent still has its own errand');
 assert.equal(finishErrand(s,'garden-helper',undefined,300),false,'a lesson not learned has no errand to finish');
 assert.equal(s.learning!.units['garden-helper'],undefined,'lessons not learned are untouched');
});

