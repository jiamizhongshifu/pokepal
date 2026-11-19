import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_CHAPTERS,LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {progressUnit,applyStation} from '../../src/lib/learningProgress';
import {learningPath,pathStars,currentNode,pathNodes,claimChapterFriend,markPathSeen,migratePathEconomy} from '../../src/lib/learningPath';
import {invitePartner} from '../../src/lib/invites';
import {validateSave} from '../../src/lib/saveValidation';
import {BABY_CREATURES} from '../../src/data/creatures';

const fresh=()=>({version:1,settings:{level:1},wordStats:{},energy:0,balls:{poke:0,great:0,ultra:0,master:0},captures:[],daily:{caught:[]},learning:{version:1,records:{},units:{}}} as unknown as SaveData);
const lessonsOf=(c:number)=>LEARNING_UNITS.filter(u=>u.chapter===c);
const finishLesson=(s:SaveData,u=LEARNING_UNITS[0])=>progressUnit(s,u.id,unitRoundCount(u),100);
const readStory=(s:SaveData,id:string)=>{const story=STORIES.find(x=>x.id===id)!;(s.storyProgress??={})[storyProgressKey(story)]=story.pages.length+1;};
const walkChapter=(s:SaveData,c:number)=>{
 for(const node of learningPath(s)[c].nodes){
  if(node.kind==='lesson')finishLesson(s,node.unit!);
  else if(node.kind==='story')readStory(s,node.storyId!);
  else if(node.kind==='island'){s.learning!.activeUnit=node.unit!.id;applyStation(s,node.station!,200);}
  else{claimChapterFriend(s,c);invitePartner(s,BABY_CREATURES.find(b=>!s.captures.some(x=>x.id===b.id))!.id);}
 }
};

test('each chapter walks two lessons, its book, two lessons, the island and a new friend',()=>{
 const path=learningPath(fresh());
 assert.equal(path.length,LEARNING_CHAPTERS.length);
 for(const chapter of path)assert.deepEqual(chapter.nodes.map(n=>n.kind),['lesson','lesson','story','lesson','lesson','island','friend']);
 assert.equal(pathNodes(path).length,LEARNING_CHAPTERS.length*7);
 assert.equal(new Set(path.map(c=>c.nodes[2].storyId)).size,path.length,'every chapter has its own picture book');
});

test('a new child starts at the first lesson with every later stop locked',()=>{
 const nodes=pathNodes(learningPath(fresh()));
 assert.equal(nodes[0].state,'current');assert.ok(nodes.slice(1).every(n=>n.state==='locked'));
 assert.equal(pathStars(learningPath(fresh())),0);
});

test('finishing stops in order moves the single current stop and earns one star each',()=>{
 const s=fresh(),[a,b]=lessonsOf(0);
 finishLesson(s,a);finishLesson(s,b);
 let path=learningPath(s);
 assert.equal(currentNode(path)?.kind,'story');assert.equal(pathStars(path),2);
 readStory(s,path[0].nodes[2].storyId!);
 path=learningPath(s);
 assert.equal(currentNode(path)?.unit?.id,lessonsOf(0)[2].id);assert.equal(pathStars(path),3);
 assert.equal(pathNodes(path).filter(n=>n.state==='current').length,1);
});

test('a whole chapter ends with the chapter friend recorded and the next chapter current',()=>{
 const s=fresh();walkChapter(s,0);
 const path=learningPath(s);
 assert.equal(path[0].done,7);assert.ok(s.path!.friends['0']);assert.equal(s.balls.poke,0);
 assert.equal(currentNode(path)?.unit?.id,lessonsOf(1)[0].id);
});

test('the friend stop gives exactly one berry however often it is tapped',()=>{
 const s=fresh();assert.equal(claimChapterFriend(s,0),true);assert.equal(claimChapterFriend(s,0),true);assert.equal(s.balls.poke,1);
});

test('stops are celebrated once',()=>{
 const s=fresh();assert.deepEqual(markPathSeen(s,['lesson:a','story:b']),['lesson:a','story:b']);assert.deepEqual(markPathSeen(s,['lesson:a','island:0']),['island:0']);
});

test('saved energy becomes invite berries once and survives a reload',()=>{
 const s=validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
 assert.equal(s.energy,0);assert.equal(s.path?.energyMigrated,true);
 const raw=JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8'));raw.energy=12;raw.balls={poke:1,great:0,ultra:0,master:0};delete raw.path;
 const migrated=validateSave(raw);assert.equal(migrated.balls.poke,3);assert.equal(migrated.energy,0);
 migratePathEconomy(migrated);assert.equal(migrated.balls.poke,3,'never converts twice');
 assert.throws(()=>validateSave({...raw,path:{version:1,friends:{x:1},seen:[]}}));
});

test('every island place a lesson or the island uses has a spot on the 2D island',async()=>{
 const {stationSpot}=await import('../../src/island/spots');
 const {STATIONS}=await import('../../src/scene/islandLife');
 for(const u of LEARNING_UNITS)assert.ok(stationSpot(u.station),u.station);
 for(const s of STATIONS)assert.ok(stationSpot(s.id),s.id);
});
