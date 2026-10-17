import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
const source=readFileSync('public/voice-cache-sw.js','utf8');
const scope='https://test.local/';
const pack=body=>({file:createHash('sha256').update(body).digest('hex').slice(0,24)+'.bin',bytes:body.length,body});
const a=pack(Buffer.from('a'.repeat(25))),b=pack(Buffer.from('b'.repeat(31))),old=pack(Buffer.from('old')),obsolete=pack(Buffer.from('obsolete'));
function harness({fail=false,hang=false}={}){
 const cachesMap=new Map(),listeners={},counts=new Map();let failing=fail,hanging=hang,active=0,maxActive=0,keyScans=0;
 const cache={async match(k){const v=cachesMap.get(typeof k==='string'?k:k.url);return v?.clone();},async put(k,v){cachesMap.set(typeof k==='string'?k:k.url,v.clone());},async keys(){keyScans++;return [...cachesMap.keys()].map(url=>({url}));},async delete(k){return cachesMap.delete(typeof k==='string'?k:k.url);}};
 const index={packs:[a,b].map(({file,bytes})=>({file,bytes})),files:{}};
 const sandbox={URL,Response,Map,Set,Promise,Uint8Array,Date,JSON,crypto:webcrypto,AbortController,AbortSignal,console,
  setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,15)),clearTimeout,
  caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},
  self:{registration:{scope},POKE_RELEASE:{id:'new',assets:[]},clients:{matchAll:async()=>[]},addEventListener:(event,fn)=>listeners[event]=fn},
  fetch:async(url,opts)=>{url=String(url);if(url.endsWith('update-report'))return new Response(null,{status:204});if(url.endsWith('pack-index.json'))return Response.json(index);
   const p=[a,b].find(p=>url.endsWith(p.file));assert(p,url);counts.set(p.file,(counts.get(p.file)||0)+1);active++;maxActive=Math.max(maxActive,active);
   try{if(hanging)await new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError')),{once:true}));if(failing&&p===b)return new Response(null,{status:503});return new Response(p.body);}finally{active--;}
  }};
 vm.runInNewContext(source,sandbox);
 const run=async(type,data)=>{let task;listeners[type]({data,ports:[],waitUntil:p=>task=p});await task;};
 return {cache,counts,run,fix(){failing=false;hanging=false;},get maxActive(){return maxActive;},get keyScans(){return keyScans;},async status(){let result,task;listeners.message({data:{type:'POKE_OFFLINE_STATUS'},ports:[{postMessage:r=>result=r}],waitUntil:p=>task=p});await task;return result;}};
}
const h=harness({fail:true});
await h.cache.put(scope+'voice/pack-index.json',Response.json({packs:[old],files:{}}));
for(const p of [old,obsolete])await h.cache.put(scope+'voice/packs/'+p.file,new Response(p.body));
await assert.rejects(h.run('install'),/503/);
assert(await h.cache.match(scope+'voice/packs/'+a.file),'successful pack retained after failure');
assert(await h.cache.match(scope+'voice/packs/'+old.file),'installed release preserved');
assert.equal(await h.cache.match(scope+'voice/packs/'+obsolete.file),undefined,'obsolete downloadable cache pruned');
assert.equal((await(await h.cache.match(scope+'voice/pack-index.json')).json()).packs[0].file,old.file,'failed update cannot publish partial index');
h.fix();await h.run('message',{type:'POKE_OFFLINE_RETRY'});assert.equal(h.counts.get(a.file),1,'retry reuses completed pack');assert.equal((await h.status()).voice.done,2);assert.equal(h.maxActive<=2,true);
// Simulate a lost cache entry without changing the installed service-worker script.
await h.cache.delete(scope+'voice/packs/'+a.file);await h.run('message',{type:'POKE_OFFLINE_RETRY'});assert.equal(h.counts.get(a.file),2,'retry repairs missing pack with unchanged version');assert.equal((await h.status()).voice.done,2);
const scans=h.keyScans;await h.status();await h.status();assert.equal(h.keyScans,scans,'polls reuse recent snapshot');
const hung=harness({hang:true});await assert.rejects(hung.run('install'),/AbortError/);hung.fix();await hung.run('message',{type:'POKE_OFFLINE_RETRY'});assert.equal((await hung.status()).voice.done,2);
console.log('PASS: partial failure, resume, same-version cache repair, obsolete-cache cleanup, old-release preservation, bounded concurrency, snapshot coalescing and hung-download timeout.');
