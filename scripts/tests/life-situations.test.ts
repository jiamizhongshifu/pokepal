import {test} from 'node:test';
import assert from 'node:assert/strict';
import {togetherEvidence,togetherVoice,togetherFinishedVoice} from '../../src/lib/togetherTurn';
import {togetherSession,togetherHelpTarget} from '../../src/scene/together';
import {clearSpot} from '../../src/scene/navigation';
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
test('temporary basket stays on clear land and outside both participant footprints',()=>{
 for(const ids of [[25],[25,7],[95,143],[129],[129,118]])for(const coast of [false,true]){
  const session=togetherSession('ball',ids,coast),p=togetherHelpTarget(session);
  if(!p)continue; // no safe place means this optional action is not offered
  assert.ok(clearSpot(p,.65));
  for(const v of session.visits)assert.ok(Math.hypot(p.x-v.station.target.x,p.z-v.station.target.z)>2.4);
 }
 assert.ok(togetherHelpTarget(togetherSession('ball',[25])));
});
test('existing memory schema and saves remain compatible; no new persisted activity kind',()=>{
 const save={captures:[{id:25}]} as SaveData;
 assert.equal(rememberTogether(save,{id:'rest1',kind:'rest',partners:[25],context:'shade',at:10}),true);
 assert.ok(validLiving(save.islandLiving,new Set([25])));
 assert.equal(rememberTogether(save,{id:'bad',kind:'help' as any,partners:[25],context:'play',at:10}),false);
});
