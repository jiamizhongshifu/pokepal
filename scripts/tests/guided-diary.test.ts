import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diaryAnswerText,pendingDiaryAnswers,diaryPages,type DiaryAnswer} from '../../src/lib/diary';
const audio=new Blob(['fixture'],{type:'audio/wav'});
test('answers keep question order and the child wording; skipped questions add no invented story',()=>{
 const answers:DiaryAnswer[]=[{question:'tomorrow',text:'明天我想休息。'},{question:'moment',skipped:true,text:'不要出现'},{question:'feeling',text:'我今天生气了。'}];
 const text=diaryAnswerText(answers);assert.equal(text,'我今天生气了。\n明天我想休息。');assert.equal(diaryPages(text).map(p=>p.zh).join(''),text);assert.equal(diaryAnswerText([]),'');
});
test('resume transcribes only unfinished recordings; rerecording invalidates old recognition',()=>{
 const done={question:'feeling',audio,audioRevision:'v1',transcribedRevision:'v1',text:'难过'};
 const waiting={question:'moment',audio,audioRevision:'v2'};
 assert.deepEqual(pendingDiaryAnswers([done,waiting,{question:'tomorrow',audio,audioRevision:'v3',skipped:true}]),[waiting]);
 assert.equal(pendingDiaryAnswers([{...done,audioRevision:'v4'}]).length,1);
 assert.equal(pendingDiaryAnswers([{question:'feeling',text:'请妈妈写的'}]).length,0);
});
test('three capped answers fit the existing 2000-character story boundary',()=>{
 const answers=['feeling','moment','tomorrow'].map(question=>({question,text:'心'.repeat(650)}));
 const text=diaryAnswerText(answers);assert.equal(text.length,1952);assert.equal(diaryPages(text).map(p=>p.zh).join(''),text);
});
