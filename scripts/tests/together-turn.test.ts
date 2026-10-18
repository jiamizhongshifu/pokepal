import {learningEntry} from '../../src/data/curriculum';
import {readFileSync} from 'node:fs';
const voiceManifest=JSON.parse(readFileSync('public/voice/manifest.json','utf8'));
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {togetherTurn,togetherVoice,togetherBallFraction,togetherStatus,togetherRounds,togetherChildTurn,togetherEvidence,togetherResponse} from '../../src/lib/togetherTurn';
import {automaticTogetherTurn} from '../../src/lib/homeOverlay';
test('single companion gives the child two genuine, untimed turns',()=>{
 for(let turn=0;turn<4;turn++){
  const state=togetherTurn([25],turn);
  assert.equal(state.child,turn%2===1);
  assert.equal(automaticTogetherTurn('ball',1,turn),!state.child);
  assert.equal(state.pokemonId,state.child?null:25);
  assert.equal(togetherVoice('ball',[25],turn)[0]?.[1],state.child?'Your turn!':'My turn!');
 }
});
test('two companions never label their automated turn as the child action',()=>{
 for(let turn=0;turn<4;turn++){
  const state=togetherTurn([25,7],turn);assert.equal(state.child,false);
  assert.equal(state.pokemonId,turn%2?7:25);assert.equal(state.word,'My turn!');
 }
});
test('ball stays continuous across round boundaries and keeps its final recipient',()=>{
 for(let turn=0;turn<3;turn++)assert.equal(togetherBallFraction(turn,1),togetherBallFraction(turn+1,0));
 assert.equal(togetherBallFraction(3,1),0);
 assert.equal(togetherBallFraction(3,0),1);
 assert.equal(togetherBallFraction(0,2),1);assert.equal(togetherBallFraction(1,-1),1);
});

test('play feedback separates movement, completion and watching two companions',()=>{
 assert.equal(togetherStatus('ball','acting',true),'小球滚向伙伴啦');
 assert.equal(togetherStatus('ball','acting',false),'小球向你滚来啦');
 assert.equal(togetherStatus('ball','acting',false,false,true),'小球滚向另一位伙伴啦');
 assert.equal(togetherStatus('ball','acting',true,true),'小球正在回篮子');
 assert.equal(togetherStatus('ball','done',true,true),'小球收好啦，谢谢你！');
 for(const phase of ['arriving','ready','acting','timeout'] as const)assert(!togetherStatus('ball',phase,true,true).includes('收好啦'));
 assert.equal(togetherStatus('rest','acting',false),'一起安静歇一歇');
});

test('bubble and jump rounds always belong to the child, including two companions',()=>{
 for(const kind of ['bubbles','jump'] as const)for(const partners of [[25],[25,7]]){
  assert.equal(togetherRounds(kind),3);
  for(let turn=0;turn<3;turn++){
   assert.equal(automaticTogetherTurn(kind,partners.length,turn),false);
   assert.equal(togetherChildTurn(kind,partners,turn),true);
   const cue=togetherVoice(kind,partners,turn);
   const evidence=togetherEvidence(kind,partners,turn);
   const spoken=cue.find(p=>typeof p!=='number'&&p[0]==='en') as ['en',string];
   assert.equal(learningEntry(evidence.word)?.en.toLowerCase().replace(/!/g,''),spoken[1].toLowerCase().replace(/!/g,''));assert.equal(evidence.action,true);
   assert.notEqual(evidence.station,'ball');
   for(const part of cue){if(typeof part==='number')continue;const [lang,line]=part;assert.ok(voiceManifest[`${lang}|${line}`],`missing recorded cue: ${line}`);}
  }
 }
 assert.deepEqual([0,1,2].map(n=>(togetherVoice('bubbles',[25],n).find(p=>typeof p!=='number'&&p[0]==='en') as ['en',string])[1]),['One!','Two!','Three!']);
});
test('new toys give one bounded physical reply and return to their original pose',()=>{
 for(const kind of ['bubbles','jump'] as const){
  assert.equal(togetherResponse(kind,0).lift,0);
  assert.ok(Math.abs(togetherResponse(kind,1).lift)<1e-8);
  assert.ok(Math.abs(togetherResponse(kind,1).squash)<1e-8);
  assert.deepEqual(togetherResponse(kind,-1),togetherResponse(kind,0));
  assert.deepEqual(togetherResponse(kind,2),togetherResponse(kind,1));
 }
 assert.ok(togetherResponse('jump',.5).lift>.4);
 assert.ok(togetherResponse('jump',.5,true).lift<.1);
 assert.ok(togetherResponse('bubbles',.5).squash>0);
 assert.notEqual(togetherStatus('jump','ready',true),togetherStatus('jump','done',true));
});
