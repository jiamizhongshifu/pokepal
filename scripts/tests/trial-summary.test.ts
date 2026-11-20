import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {trialSummary,trialSummaryText} from '../../src/lib/trialSummary';

const DAY=86400000;
test('two-week trial recap counts only the last 14 local days and carries nothing identifying',()=>{
 const now=new Date(2026,10,20,12).getTime();
 const o=(at:number,source:string,kind:string,gapDays?:number)=>({v:1,at,source,key:'apple',kind,tries:1,replays:0,gapDays});
 const s={settings:{level:1,dailyMinutes:15},trainer:{name:'小明'},daily:{date:'2026-11-20',heard:3,tasksCompleted:1,playSeconds:600,words:[],spoken:0},
  history:[{date:'2026-11-01',heard:9,tasksCompleted:2,playMinutes:30},{date:'2026-11-10',heard:4,tasksCompleted:1,playMinutes:8},{date:'2026-11-12',heard:0,tasksCompleted:0,playMinutes:0},{date:'2026-11-20',heard:1,tasksCompleted:0,playMinutes:1}],
  learning:{version:1,records:{},units:{'hello-island':{round:4,completedAt:now-20*DAY,homeTriedAt:now-20*DAY},'color-orchard':{round:4,completedAt:now-2*DAY,homeTriedAt:now-DAY}},
   opportunities:[o(now-DAY,'unit:color-orchard','independent'),o(now-DAY,'unit:color-orchard','after-hint'),o(now-30*DAY,'unit:hello-island','independent'),o(now-DAY,'review','independent',2),o(now-DAY,'island:picnic','independent')]}} as unknown as SaveData;
 const before=JSON.stringify(s);
 const t=trialSummary(s,now);
 assert.equal(t.from,'2026-11-07');assert.equal(t.to,'2026-11-20');
 assert.equal(t.activeDays,2,'today counts once from the live day; empty days and days before the window do not count');
 assert.equal(t.minutes,18);
 assert.equal(t.lessons.length,1);
 assert.equal(t.lesson.decidable,2);assert.equal(t.lesson.independent,1);
 assert.equal(t.review.decidable,1);assert.equal(t.island.decidable,1);
 assert.equal(t.homeTried,1);
 const text=trialSummaryText(t);
 assert.ok(!text.includes('小明'),'the child\'s name never goes into the copyable text');
 assert.match(text,/记录不足（2 次）/);
 assert.equal(JSON.stringify(s),before,'reading the recap must not change the save');
});
