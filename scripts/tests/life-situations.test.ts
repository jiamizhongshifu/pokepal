import {test} from 'node:test';
import assert from 'node:assert/strict';
import {togetherEvidence,togetherVoice,togetherFinishedVoice} from '../../src/lib/togetherTurn';
import {togetherSession,togetherHelpTarget} from '../../src/island/together';
import {rememberTogether,validLiving} from '../../src/lib/islandLiving';
import type {SaveData} from '../../src/types';
test('help invitation and acknowledgement match the actual request, not a turn-taking word',()=>{
 assert.deepEqual(togetherEvidence('ball',[25,7],0,true),{station:'ball',word:'Help, please!',action:true});
 assert.deepEqual(togetherVoice('ball',[25],0,true)[0],['en','Help, please!']);
 assert.deepEqual(togetherFinishedVoice('ball',true)[0],['en','Thank you!']);
 assert.deepEqual(togetherFinishedVoice('ball'),[]);
});
test('rest is an explicit companion action, never an independent answer',()=>{
 assert.deepEqual(togetherEvidence('rest',[25],0),{station:'parasol',word:'I need a rest.',action:true});
 assert.deepEqual(togetherVoice('rest',[25],0)[0],['en','I need a rest.']);
 assert.deepEqual(togetherFinishedVoice('rest')[0],['en','Thank you!']);
 assert.equal('independent' in togetherEvidence('rest',[25],0),false);
});
test('the tidy-up basket is at the place where the game was played',()=>{
 for(const ids of [[25],[25,7],[129,118]])for(const coast of [false,true]){
  const session=togetherSession('ball',ids,coast);
  assert.equal(togetherHelpTarget(session)?.id,coast?'shells':'ball');
 }
});
test('existing memory schema and saves remain compatible; no new persisted activity kind',()=>{
 const save={captures:[{id:25}]} as SaveData;
 assert.equal(rememberTogether(save,{id:'rest1',kind:'rest',partners:[25],context:'shade',at:10}),true);
 assert.ok(validLiving(save.islandLiving,new Set([25])));
 assert.equal(rememberTogether(save,{id:'bad',kind:'help' as any,partners:[25],context:'play',at:10}),false);
});
