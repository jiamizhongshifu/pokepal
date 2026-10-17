import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeDiaryBackup,decodeDiaryBackup} from '../../src/lib/diaryBackup';
import {DIARY_PROMPTS} from '../../src/data/diaryPrompts';
import {markReviewAudio,reviewKeys} from '../../src/lib/learningProgress';
import {advancePlayClock,advanceCareClock} from '../../src/lib/playClock';
import {validateSave} from '../../src/lib/saveValidation';
import type {SaveData} from '../../src/types';
import type {DiaryEntry} from '../../src/lib/diary';
const make=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8'))) as SaveData;
test('diary archive restores original bytes, text and story pages in old and guided diaries',async()=>{
 const bytes=Uint8Array.from([0,128,255,13,10]),audio=new Blob([bytes],{type:'audio/mp4'});
 const entries:DiaryEntry[]=[{id:'old',createdAt:1,transcript:'今天一起玩。',audio,pages:[{zh:'今天一起玩。',en:'Hello!',hint:'你好！'}]}, {id:'guided',createdAt:2,transcript:'',guided:true,guidedComplete:true,answers:[{question:DIARY_PROMPTS[0].id,audio,audioRevision:'r1'},{question:DIARY_PROMPTS[1].id,skipped:true}]}];
 const copy=decodeDiaryBackup(await encodeDiaryBackup(entries));
 assert.equal(copy[0].pages![0].zh,entries[0].transcript);assert.equal(copy[1].transcript,'');
 assert.deepEqual(new Uint8Array(await copy[0].audio!.arrayBuffer()),bytes);
 assert.deepEqual(new Uint8Array(await copy[1].answers![0].audio!.arrayBuffer()),bytes);
 assert.equal(copy[1].answers![0].audio!.type,'audio/mp4');assert.equal(copy[1].answers![1].skipped,true);
});
test('malformed, duplicate or unsafe diary archives fail before persistence',async()=>{
 const valid=JSON.parse(await encodeDiaryBackup([{id:'one',createdAt:1,transcript:'hello'}]));
 for(const alter of [(v:any)=>v.entries.push(v.entries[0]),(v:any)=>v.version=2,(v:any)=>v.entries[0].createdAt=-1,(v:any)=>v.entries[0].audio={mime:'text/html',base64:'abcd'},(v:any)=>v.entries[0].answers=[{question:'unknown',text:'bad'}],(v:any)=>v.entries[0].audio={mime:'audio/mp4',base64:'!bad'}]){
  const v=structuredClone(valid);alter(v);assert.throws(()=>decodeDiaryBackup(JSON.stringify(v)));
 }
});
test('deferred review survives export/import without creating attempts or mastery',()=>{
 const s=make();s.learning={version:1,records:{},units:{}};const energy=s.energy;
 markReviewAudio(s,'water',true);const copy=validateSave(JSON.parse(JSON.stringify(s)));
 assert.ok(reviewKeys(copy,'retry').includes('water'));assert.equal(copy.learning!.records.water.attempts,0);
 assert.equal(copy.learning!.records.water.independent,0);assert.equal(copy.energy,energy);
 markReviewAudio(copy,'water',false);assert.ok(!reviewKeys(copy,'retry').includes('water'));
});
test('clock updates are immutable, capped and do not copy or mutate unrelated learning history',()=>{
 const s=make();s.daily.playSeconds=30;
 const next=advancePlayClock(s,20,40);assert.equal(s.daily.playSeconds,30);assert.equal(next.daily.playSeconds,40);
 assert.equal(next.learning,s.learning);assert.equal(next.captures,s.captures);assert.equal(advancePlayClock(next,10,40),next);
 const before=JSON.stringify(s.captures),care=advanceCareClock(s,10);assert.equal(JSON.stringify(s.captures),before);assert.equal(care.learning,s.learning);assert.equal(care.daily,s.daily);
 for(let i=0;i<s.captures.length;i++)assert.notEqual(care.captures[i],s.captures[i]);
});
