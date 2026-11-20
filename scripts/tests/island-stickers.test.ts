import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STICKERS,shownStickers,toggleSticker,stickerEarned} from '../../src/island/stickers';
import {ensureIslandProgress} from '../../src/lib/islandProgress';
import {unitRoundCount} from '../../src/data/curriculum';
import {STORIES,storyProgressKey} from '../../src/data/stories';
import {progressUnit,applyStation} from '../../src/lib/learningProgress';
import {learningPath,currentNode,claimChapterFriend,openChapterDiary} from '../../src/lib/learningPath';
import {invitePartner} from '../../src/lib/invites';
import {BABY_CREATURES} from '../../src/data/creatures';
import {stickersEarnedCount} from '../../src/island/stickers';
import {validateSave} from '../../src/lib/saveValidation';
import {GROW_AT,playedTogether,readyToGrow,notePlayedTogether} from '../../src/island/plays';

const fixture=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
/** Walk the whole learning path the way a child does, stop by stop. */
function walk(s:any,stops=Infinity){
 for(let k=0;k<stops;k++){const n=currentNode(learningPath(s));if(!n)return;
  if(n.kind==='lesson')progressUnit(s,n.unit!.id,unitRoundCount(n.unit!),1000+k);
  else if(n.kind==='story'){const b=STORIES.find(x=>x.id===n.storyId)!;(s.storyProgress??={})[storyProgressKey(b)]=b.pages.length+1;}
  else if(n.kind==='island')applyStation(s,n.station!,2000+k);
  else if(n.kind==='friend'){claimChapterFriend(s,n.chapter);invitePartner(s,BABY_CREATURES.find(b=>!s.captures.some((c:any)=>c.id===b.id))!.id);}
  else openChapterDiary(s,n.chapter);
 }
}
const blank=()=>{const s=fixture();s.learning={version:1,records:{},units:{}};s.storyProgress={};delete s.path;s.captures=[];return s;};
// Audit P0-3: every sticker can be earned — two per chapter, all twelve by the end of the path.
test('each chapter earns two stickers, in order, and the whole path earns all of them',()=>{
 assert.equal(STICKERS.length,12);assert.equal(new Set(STICKERS.map(k=>k.id)).size,12);
 for(const k of STICKERS)assert.ok(k.spot[0]>0&&k.spot[0]<100&&k.spot[1]>0&&k.spot[1]<100&&k.size>0,k.id);
 const s=blank();assert.equal(stickersEarnedCount(s),0);
 walk(s,6);assert.equal(stickersEarnedCount(s),1,'the first island stop');assert.deepEqual(shownStickers(s).map(k=>k.id),['deco-camp-bunting']);
 walk(s,2);assert.equal(stickersEarnedCount(s),2,'the first chapter talk');
 walk(s);assert.equal(currentNode(learningPath(s)),undefined,'the path is finished');
 assert.equal(shownStickers(s).length,STICKERS.length,'every sticker is earned');
});
test('an earned sticker can be put away and brought back, survives a reload; an unearned one cannot be toggled',()=>{
 const s=blank();walk(s,6);ensureIslandProgress(s);
 assert.equal(toggleSticker(s,'deco-camp-bunting'),true);assert.equal(shownStickers(s).length,0);
 const back=validateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(back.islandProgress!.hidden,['deco-camp-bunting']);
 toggleSticker(back,'deco-camp-bunting');assert.equal(shownStickers(back).length,1);
 assert.equal(toggleSticker(back,'deco-beach-starfish'),false);assert.equal(stickerEarned(back,STICKERS[11]),false);
 const bad=JSON.parse(JSON.stringify(s));bad.islandProgress.hidden=[1];assert.throws(()=>validateSave(bad));
});
test('growing up follows activities done together; older saves start from friendship',()=>{
 const c={friendship:80} as {friendship:number;played?:number};
 assert.equal(playedTogether(c),5,'friendship 80 counts as five activities');assert.equal(readyToGrow(c,1),true);
 const fresh={friendship:10,played:0};assert.equal(readyToGrow(fresh,1),false);
 for(let i=0;i<GROW_AT[1];i++)notePlayedTogether(fresh);assert.equal(readyToGrow(fresh,1),true);assert.equal(readyToGrow(fresh,2),false);
 assert.equal(readyToGrow({friendship:100,played:99},3),false,'the last stage does not grow further');
});
