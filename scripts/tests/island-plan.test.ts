import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {progressUnit,applyStation} from '../../src/lib/learningProgress';
import {learningPath,currentNode} from '../../src/lib/learningPath';
import {STATIONS} from '../../src/scene/islandLife';
import {unlockedDistricts,unlockingUnit,unitDistrict,learnedPhrase,learnedHere,islandTask,playOpen,visitStation} from '../../src/lib/islandPlan';
import {STORIES,storyProgressKey} from '../../src/data/stories';

const fresh=()=>({version:1,settings:{level:1},wordStats:{},energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{caught:[]},learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const unit=(id:string)=>LEARNING_UNITS.find(u=>u.id===id)!;
const finish=(s:SaveData,id:string,at=100)=>progressUnit(s,id,unitRoundCount(unit(id)),at);

test('every lesson happens at a real island place, and every area is opened by some lesson',()=>{
 for(const u of LEARNING_UNITS)assert.ok(STATIONS.some(s=>u.station.endsWith('-')?s.id.startsWith(u.station):s.id===u.station),`${u.id} at ${u.station}`);
 for(const d of ['garden','play','leisure','camp','beach'] as const)assert.ok(unlockingUnit(d),`${d} can be reached`);
});

test('a new child has only the first lesson\'s area; areas light up as the path reaches their first lesson',()=>{
 const s=fresh();
 assert.deepEqual([...unlockedDistricts(s)],[unitDistrict(LEARNING_UNITS[0])]);
 assert.equal(playOpen(s,'ball'),false,'ball games wait for the play area');
 finish(s,'hello-island');
 assert.ok(unlockedDistricts(s).has(unitDistrict(unit('color-orchard'))),'the next lesson\'s area opens when it becomes reachable');
 assert.equal(unlockedDistricts(s).has('beach'),false);
});

test('a place speaks a sentence learned there, the same all day, and nothing before it is learned',()=>{
 const s=fresh();
 assert.equal(learnedPhrase(s,'tent'),undefined);
 finish(s,'hello-island');
 assert.equal(learnedPhrase(s,'tent')?.en,'Hello!');
 assert.deepEqual(learnedHere(s,'bed-1'),[],'numbered places match their family only when learned');
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
 applyStation(s,'tent',150);
 assert.equal(islandTask(s).kind,'route','used on the island: back to the path');
 for(const id of ['color-orchard','snack-discovery','quiet-night'])finish(s,id,200);
 const book=STORIES.find(b=>b.id===learningPath(s)[0].nodes[2].storyId)!;(s.storyProgress??={})[storyProgressKey(book)]=book.pages.length+1;
 assert.equal(currentNode(learningPath(s))?.kind,'island');
 const stop=islandTask(s);assert.equal(stop.kind,'path');
 assert.equal(stop.kind==='path'&&visitStation(stop.station),'bed-0','a place family is visited at its first place');
});

test('using a sentence at its place completes the island stop even after the next lesson was opened (bed- family)',()=>{
 const s=fresh();
 for(const id of ['hello-island','color-orchard','snack-discovery','quiet-night'])finish(s,id,100);
 s.learning!.activeUnit='garden-helper';
 applyStation(s,'bed-0',300);
 assert.equal(s.learning!.units['quiet-night'].encounteredAt,300);
 assert.equal(s.learning!.units['garden-helper'],undefined,'lessons not learned are untouched');
});

test('play borrows only sentences already learned, newest first',async()=>{
 const {learnedPlayLine}=await import('../../src/lib/islandPlan');
 const s=fresh();
 assert.equal(learnedPlayLine(s,'feed'),undefined);
 for(const [i,id] of ['hello-island','color-orchard','snack-discovery'].entries())finish(s,id,100+i);assert.equal(learnedPlayLine(s,'feed')?.en,'Yummy!');
 for(const id of ['quiet-night','garden-helper','our-turn','sea-discovery'])finish(s,id,150);finish(s,'polite-snack',200);assert.equal(learnedPlayLine(s,'feed')?.en,'More, please!','the newest learned line');
 assert.equal(learnedPlayLine(s,'farm')?.en,'Help, please!','the garden lesson lends its sentence to the farm');
});
