import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STICKERS,shownStickers,toggleSticker,stickerEarned} from '../../src/island/stickers';
import {grantNextIslandUpgrade,ensureIslandProgress,UPGRADE_ORDER} from '../../src/lib/islandProgress';
import {validateSave} from '../../src/lib/saveValidation';
import {GROW_AT,playedTogether,readyToGrow,notePlayedTogether} from '../../src/island/plays';

const fixture=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));
test('each island stop earns the next sticker in order; all ten fit on the illustration',()=>{
 assert.equal(STICKERS.length,UPGRADE_ORDER.length);
 for(const [i,o] of UPGRADE_ORDER.entries())assert.deepEqual([STICKERS[i].area,STICKERS[i].level],[o.id,o.level+1]);
 for(const k of STICKERS)assert.ok(k.spot[0]>0&&k.spot[0]<100&&k.spot[1]>0&&k.spot[1]<100&&k.size>0,k.id);
 const s=fixture();ensureIslandProgress(s).levels={camp:0,picnic:0,garden:0,play:0,island:0};
 assert.equal(shownStickers(s).length,0);
 grantNextIslandUpgrade(s);grantNextIslandUpgrade(s);
 assert.deepEqual(shownStickers(s).map(k=>k.id),['deco-camp-bunting','deco-picnic-basket']);
});
test('an earned sticker can be put away and brought back, survives a reload; an unearned one cannot be toggled',()=>{
 const s=fixture();ensureIslandProgress(s).levels={camp:1,picnic:0,garden:0,play:0,island:0};
 assert.equal(toggleSticker(s,'deco-camp-bunting'),true);assert.equal(shownStickers(s).length,0);
 const back=validateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(back.islandProgress!.hidden,['deco-camp-bunting']);
 toggleSticker(back,'deco-camp-bunting');assert.equal(shownStickers(back).length,1);
 assert.equal(toggleSticker(back,'deco-beach-starfish'),false);assert.equal(stickerEarned(back,STICKERS[9]),false);
 const bad=JSON.parse(JSON.stringify(s));bad.islandProgress.hidden=[1];assert.throws(()=>validateSave(bad));
});
test('growing up follows activities done together; older saves start from friendship',()=>{
 const c={friendship:80} as {friendship:number;played?:number};
 assert.equal(playedTogether(c),5,'friendship 80 counts as five activities');assert.equal(readyToGrow(c,1),true);
 const fresh={friendship:10,played:0};assert.equal(readyToGrow(fresh,1),false);
 for(let i=0;i<GROW_AT[1];i++)notePlayedTogether(fresh);assert.equal(readyToGrow(fresh,1),true);assert.equal(readyToGrow(fresh,2),false);
 assert.equal(readyToGrow({friendship:100,played:99},3),false,'the last stage does not grow further');
});
