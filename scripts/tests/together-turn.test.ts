import {test} from 'node:test';
import assert from 'node:assert/strict';
import {togetherTurn,togetherVoice,togetherBallFraction} from '../../src/lib/togetherTurn';
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
