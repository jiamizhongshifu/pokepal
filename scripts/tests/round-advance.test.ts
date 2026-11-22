import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RoundAdvance,advanceAllowed} from '../../src/lib/roundAdvance';
test('replaying invalidates the previous deadline; one round advances once',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const gate=new RoundAdvance();let n=0;
 gate.schedule(()=>n++,1400);t.mock.timers.tick(1000);gate.schedule(()=>n++,1400);t.mock.timers.tick(500);assert.equal(n,0);t.mock.timers.tick(900);assert.equal(n,1);t.mock.timers.tick(10000);assert.equal(n,1);
});
test('pause, hidden page and unmount cancel pending advancement; resume gets full dwell time',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const gate=new RoundAdvance();let n=0;
 gate.schedule(()=>n++,2400);t.mock.timers.tick(2000);gate.cancel();t.mock.timers.tick(10000);assert.equal(n,0);
 gate.schedule(()=>n++,2400);t.mock.timers.tick(2399);assert.equal(n,0);t.mock.timers.tick(1);assert.equal(n,1);
 gate.schedule(()=>n++,1400);gate.cancel();t.mock.timers.tick(5000);assert.equal(n,1);
});

test('open help holds a finished round and closing it lets the round go on; only the child\'s own pause lasts',()=>{
 const base={ready:true,paused:false,visible:true,helpOpen:false};
 assert.equal(advanceAllowed(base),true);
 assert.equal(advanceAllowed({...base,helpOpen:true}),false,'held while help is open');
 assert.equal(advanceAllowed({...base,helpOpen:false}),true,'goes on once help is closed, no extra tap');
 assert.equal(advanceAllowed({...base,paused:true}),false,'the child paused it');
 assert.equal(advanceAllowed({...base,ready:false}),false);assert.equal(advanceAllowed({...base,visible:false}),false);
});
