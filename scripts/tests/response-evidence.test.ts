import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {SaveData} from '../../src/types';
import {classifyResponse,recordOpportunity,OPPORTUNITY_LIMIT,type RoundTrace} from '../../src/lib/learningProgress';
import {validateSave} from '../../src/lib/saveValidation';

const base:RoundTrace={firstAnswer:'correct',replays:0,modelShown:false,heardBeforeAnswer:true,outcome:'solved'};
const fixture=()=>validateSave(JSON.parse(readFileSync('scripts/tests/fixtures/save.json','utf8')));

// T06 synthetic cases: one per situation the optimisation plan lists.
test('a direct first correct answer after hearing the word is the only independent case',()=>{
 assert.equal(classifyResponse(base),'independent');
 assert.equal(classifyResponse({...base,replays:2}),'after-replay','replays are their own category');
});

test('a wrong first try stays a wrong first try even when corrected afterwards',()=>{
 assert.equal(classifyResponse({...base,firstAnswer:'wrong'}),'after-hint');
});

test('seeing the answer first (help or listen-first) is a demonstration, whatever happened next',()=>{
 assert.equal(classifyResponse({...base,modelShown:true}),'after-model');
 assert.equal(classifyResponse({...base,firstAnswer:'wrong',modelShown:true}),'after-model');
 assert.equal(classifyResponse({...base,firstAnswer:null,modelShown:true}),'after-model');
});

test('unconfirmed audio is unknown rather than independent; skipping and leaving are kept apart',()=>{
 assert.equal(classifyResponse({...base,heardBeforeAnswer:false}),'unknown');
 assert.equal(classifyResponse({...base,outcome:'skipped',modelShown:true}),'skipped');
 assert.equal(classifyResponse({...base,firstAnswer:null,outcome:'left'}),'left');
});

test('opportunities are bounded, survive a reload and corrupt entries are rejected',()=>{
 const s=fixture() as SaveData;
 for(let i=0;i<OPPORTUNITY_LIMIT+5;i++)recordOpportunity(s,{at:i,source:'unit:hello-island',key:'ball',kind:'independent',tries:1,replays:0});
 assert.equal(s.learning!.opportunities!.length,OPPORTUNITY_LIMIT);
 assert.equal(s.learning!.opportunities![0].at,5,'oldest dropped first');
 const back=validateSave(JSON.parse(JSON.stringify(s)));
 assert.equal(back.learning!.opportunities!.length,OPPORTUNITY_LIMIT);
 const bad=JSON.parse(JSON.stringify(s));bad.learning.opportunities[0].kind='mastered';
 assert.throws(()=>validateSave(bad));
 const old=fixture();delete old.learning!.opportunities;assert.doesNotThrow(()=>validateSave(old),'older saves without records still load');
});
