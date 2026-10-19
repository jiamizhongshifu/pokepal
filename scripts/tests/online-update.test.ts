import test from 'node:test';
import assert from 'node:assert/strict';
import {checkOnlineUpdate} from '../../src/lib/onlineUpdate';
const old='2026-10-18T00:00:00.000Z',id='2026-10-19T00:00:00.000Z';
const fetcher=(async()=>({ok:true,json:async()=>({id,mode:'online'})})) as typeof fetch;
const stuck=()=>new Promise<any>(()=>{});
const run=(extra:Record<string,unknown>={})=>checkOnlineUpdate({loadedBuild:old,fetcher,timeoutMs:30,...extra});
test('update finishes even when no worker exists, without AbortSignal.timeout',async()=>{assert.deepEqual(await run(),{id,changed:true});});
test('all asynchronous stages have an overall deadline',async()=>{
 for(const extra of [
  {fetcher:stuck},
  {fetcher:async()=>({ok:true,json:stuck})},
  {workers:{getRegistration:stuck}},
  {workers:{getRegistration:async()=>({update:stuck})}},
 ])await assert.rejects(run(extra),/update-timeout/);
});
test('a late registration cannot start updating after timeout; next attempt can retry',async()=>{
 let resolve!:Function,updates=0;
 await assert.rejects(run({workers:{getRegistration:()=>new Promise(r=>{resolve=r;})}}),/update-timeout/);
 resolve({update:async()=>{updates++;}});await new Promise(r=>setTimeout(r,0));assert.equal(updates,0);
 assert.equal((await run()).changed,true);
});
class Worker extends EventTarget {state='installing';messages:string[]=[];postMessage(message:{type:string}){this.messages.push(message.type);}change(state:string){this.state=state;this.dispatchEvent(new Event('statechange'));}}
test('waits for activation and sends skip-waiting after installation',async()=>{
 const worker=new Worker();const p=run({timeoutMs:1000,workers:{getRegistration:async()=>({update:async()=>{},installing:worker})}});
 await new Promise(r=>setTimeout(r,0));worker.change('installed');assert.deepEqual(worker.messages,['SKIP_WAITING']);worker.change('activated');assert.equal((await p).changed,true);
});
test('failed or hanging worker installation never reports ready',async()=>{
 const worker=new Worker();await assert.rejects(run({workers:{getRegistration:async()=>({update:async()=>{},installing:worker})}}),/update-timeout/);
 worker.change('installed');assert.deepEqual(worker.messages,[]);
 worker.state='redundant';await assert.rejects(run({workers:{getRegistration:async()=>({update:async()=>{},installing:worker})}}),/update-failed/);
});
test('unchanged release avoids a potentially stuck worker API; cancelled and malformed requests fail',async()=>{
 assert.equal((await run({loadedBuild:id,workers:{getRegistration:stuck}})).changed,false);
 const c=new AbortController();c.abort();await assert.rejects(run({signal:c.signal}),/update-timeout/);
 await assert.rejects(run({fetcher:async()=>({ok:true,json:async()=>({id:'bad',mode:'online'})})}),/invalid-release/);
});
