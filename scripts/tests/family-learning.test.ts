import test from 'node:test';
import assert from 'node:assert/strict';
import type {SaveData} from '../../src/types';
import {familyLearning} from '../../src/lib/familyLearning';
import {todayStr} from '../../src/lib/date';
import {holdGuide,guideIsOpen,subscribeGuides} from '../../src/lib/guidePause';

test('family recap uses first-completion dates, excludes old progress and does not infer parental help',()=>{
 const now=new Date(2026,9,18,12).getTime();
 const s={settings:{level:1},daily:{date:todayStr(new Date(now)),words:['apple','apple','letter:A','unknown','banana']},learning:{version:1,activeUnit:'color-orchard',records:{},units:{'hello-island':{round:4,completedAt:now-86400000},'color-orchard':{round:4,completedAt:now-3600000},'snack-discovery':{round:4,completedAt:now}}}} as unknown as SaveData;
 const before=JSON.stringify(s),result=familyLearning(s);
 assert.deepEqual(result.completed.map(u=>u.id),['snack-discovery','color-orchard']);
 assert.deepEqual(result.words.map(w=>w.key),['apple','banana']);
 assert.equal(result.focus.id,'snack-discovery');
 assert.equal(JSON.stringify(s),before,'reading the family recap must not award or change progress');
 s.daily.date='2026-10-19';s.daily.words=[];
 assert.equal(familyLearning(s).completed.length,0);
 assert.equal(familyLearning(s).focus.id,'color-orchard','without new completion use the selected learning context');
});

test('overlapping guides retain the pause until all owners close, and cleanup is idempotent',()=>{
 const observations:boolean[]=[];const unsubscribe=subscribeGuides(()=>observations.push(guideIsOpen()));
 const a=holdGuide(),b=holdGuide();a();a();
 assert.equal(guideIsOpen(),true);
 b();assert.equal(guideIsOpen(),false);
 assert.deepEqual(observations,[true,true,true,false]);
 unsubscribe();const c=holdGuide();c();assert.equal(observations.length,4);
});
