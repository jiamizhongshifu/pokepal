import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homeHint,automaticTogetherTurn,type HomePanel} from '../../src/lib/homeOverlay';
const base={active:true,immersive:false,blocked:false,panel:null,farm:false,follow:false,picnic:false,care:false,observe:false,gesture:false};
const hints=['farm','follow','picnic','care','observe','gesture'] as const;
test('every combination of simultaneous events yields exactly one highest priority corner hint',()=>{
 for(let mask=0;mask<64;mask++){
  const state={...base};hints.forEach((key,i)=>state[key]=!!(mask&(1<<i)));
  assert.equal(homeHint(state),hints.find(key=>state[key])??'guide');
 }
});
test('all foreground panels, inactive island, immersive mode and modal dialog suppress every passive hint',()=>{
 const panels:HomePanel[]=['companion','finder','living','picnic','facility','area','weather','menu'];
 for(let mask=0;mask<64;mask++){
  const state={...base};hints.forEach((key,i)=>state[key]=!!(mask&(1<<i)));
  for(const panel of panels)assert.equal(homeHint({...state,panel}),null);
  for(const override of [{active:false},{immersive:true},{blocked:true}])assert.equal(homeHint({...state,...override}),null);
 }
});
test('closing a panel restores the pending request, without losing or showing it behind a result',()=>{
 const waiting={...base,care:true,farm:true};
 assert.equal(homeHint({...waiting,panel:'companion'}),null);
 assert.equal(homeHint(waiting),'farm');
 assert.equal(homeHint({...waiting,farm:false}),'care');
 assert.equal(homeHint({...waiting,farm:false,care:false}),'guide');
});
test('single companion acts first; child gets turns 1 and 3; two companions do not ask child for their turns',()=>{
 assert.deepEqual([0,1,2,3].map(n=>automaticTogetherTurn('ball',1,n)),[true,false,true,false]);
 assert.ok([0,1,2,3].every(n=>automaticTogetherTurn('ball',2,n)));
 assert.equal(automaticTogetherTurn('rest',1,0),true);
});
