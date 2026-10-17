import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RoundAdvance} from '../../src/lib/roundAdvance';
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
