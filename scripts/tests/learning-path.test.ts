import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {LEARNING_CHAPTERS,LEARNING_UNITS,unitRoundCount} from '../../src/data/curriculum';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {progressUnit} from '../../src/lib/learningProgress';
import {finishErrand} from '../../src/island/errands';
import {learningPath,guidedPath,pathStars,currentNode,pathNodes,claimChapterFriend,markPathSeen,migratePathEconomy,openChapterDiary,notePathReview,REVIEW_THRESHOLD,chapterProgress,PATH_CONTENT_VERSION} from '../../src/lib/learningPath';
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
  else if(node.kind==='island'){s.learning!.activeUnit=node.unit!.id;finishErrand(s,node.unit!.id,undefined,200);}
  else if(node.kind==='friend'){claimChapterFriend(s,c);invitePartner(s,BABY_CREATURES.find(b=>!s.captures.some(x=>x.id===b.id))!.id);}
  else openChapterDiary(s,c);
 }
};

test('each chapter walks two lessons, its book, two lessons, the island, a new friend and a chat about the chapter',()=>{
 const path=learningPath(fresh());
 assert.equal(path.length,LEARNING_CHAPTERS.length);
 for(const chapter of path)assert.deepEqual(chapter.nodes.map(n=>n.kind),['lesson','lesson','story','lesson','lesson','island','friend','diary']);
 assert.equal(pathNodes(path).length,LEARNING_CHAPTERS.length*8);
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
 assert.equal(chapterProgress(path[0]).done,8);assert.ok(s.path!.friends['0']);assert.equal(s.balls.poke,0);
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

test('every lesson happens at one of the island\'s places',async()=>{
 const {placeById}=await import('../../src/island/world');
 for(const u of LEARNING_UNITS)assert.ok(placeById(u.station),u.station);
});

test('due review waits as one stop just before the current stop, and earns a star when done',()=>{
 const s=fresh();finishLesson(s,LEARNING_UNITS[0]);
 const route=learningPath(s);
 assert.equal(guidedPath(s,route,0),route,'nothing due yet');
 const keys=['ball','book','hat','Hello!'];
 for(const k of keys)s.learning!.records[k]={seen:1,spoken:0,attempts:1,misses:0,independent:1,streak:1,lastSeen:1,nextReview:1,needsPractice:false,actions:0,contexts:[]} as never;
 const woven=pathNodes(guidedPath(s,route,10_000));
 const at=woven.findIndex(n=>n.kind==='review');
 assert.ok(at>0);assert.equal(woven[at].state,'current');assert.ok(woven[at].reviewKeys!.length>=REVIEW_THRESHOLD);
 assert.equal(woven.filter(n=>n.state==='current').length,1);assert.equal(woven[at+1].unit?.id,LEARNING_UNITS[1].id);
 assert.equal(woven[at+1].state,'open','review is optional: the next lesson stays reachable (T07)');
 s.balls.poke=1;
 const simultaneous=pathNodes(guidedPath(s,route,10_000)).slice(at,at+3);
 assert.deepEqual(simultaneous.map(n=>[n.kind,n.state]),[['welcome','current'],['review','locked'],['lesson','open']]);
 notePathReview(s);assert.equal(pathStars(learningPath(s),s),2);
});

test('opening the chapter diary completes it once, without asking for any content',()=>{
 const s=fresh();openChapterDiary(s,0);const first=s.path!.diaries!['0'];openChapterDiary(s,0);
 assert.equal(s.path!.diaries!['0'],first);
 assert.equal(learningPath(s)[0].nodes.find(n=>n.kind==='diary')!.state,'done');
 assert.throws(()=>validateSave({...JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')),path:{version:1,friends:{},seen:[],reviews:-1}}));
});

// T02: one denominator, whatever screen shows it. Samples mirror the counts seen in the 2026-11-19 walkthrough.
test('chapter counts come from one rule: 0/8 fresh, 2/8 after two lessons, unchanged by a woven-in review or a replay',()=>{
 assert.equal(PATH_CONTENT_VERSION,3);
 const s=fresh();
 assert.deepEqual(chapterProgress(learningPath(s)[0]),{done:0,total:8});
 const [a,b]=lessonsOf(0);finishLesson(s,a);finishLesson(s,b);
 assert.deepEqual(chapterProgress(learningPath(s)[0]),{done:2,total:8});
 for(const k of ['ball','book','hat'])s.learning!.records[k]={seen:1,spoken:0,attempts:1,misses:0,independent:1,streak:1,lastSeen:1,nextReview:1,needsPractice:false,actions:0,contexts:[]} as never;
 const woven=guidedPath(s,learningPath(s),10_000)[0];
 assert.ok(woven.nodes.some(n=>n.kind==='review'));
 assert.deepEqual(chapterProgress(woven),{done:2,total:8},'a review stop never changes the denominator');
 finishLesson(s,a);assert.deepEqual(chapterProgress(learningPath(s)[0]),{done:2,total:8},'replaying a finished lesson does not count twice');
 assert.equal(pathStars(learningPath(s)),chapterProgress(learningPath(s)[0]).done);
});

test('a save from the seven-stop route (version 2) keeps every finished stop and gains the chat stop as next',()=>{
 const s=fresh();walkChapter(s,0);delete s.path!.diaries;
 const first=learningPath(s)[0];
 assert.deepEqual(chapterProgress(first),{done:7,total:8});
 assert.equal(currentNode(learningPath(s))?.kind,'diary');
 assert.equal(s.path!.friends['0']!==undefined,true,'the chapter friend is kept');
});

// T03: one next step for a new child — the welcome voice, the empty island and the path all point to meeting a first friend.
test('with the welcome berry and no friend yet, the path first meets a friend, without changing any count',()=>{
 const s=fresh();s.balls.poke=1;
 const woven=guidedPath(s);
 assert.equal(currentNode(woven)?.kind,'welcome');
 assert.equal(woven[0].nodes[1].state,'locked','the first lesson waits behind it');
 assert.deepEqual(chapterProgress(woven[0]),{done:0,total:8});
 invitePartner(s,BABY_CREATURES[0].id);
 assert.equal(currentNode(guidedPath(s))?.kind,'lesson','gone once a friend is met');
 const none=fresh();assert.equal(currentNode(guidedPath(none))?.kind,'lesson','no berry, no detour');
});
