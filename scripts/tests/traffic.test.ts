import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest,type CounterDatabase} from '../../functions/api/traffic';
import {parsePageCounts,trafficEnabled,trafficAvailable} from '../../src/lib/trafficPolicy';
import {interactionEvent,INTERACTION_EVENTS} from '../../src/lib/interactionPolicy';
import {connectInteractions,trackInteraction,trackLearningCompletion} from '../../src/lib/interaction';

const origin='https://pokepal-online.pages.dev';
function request(body:unknown,headers:Record<string,string>={},method='POST'){
 return new Request(origin+'/api/traffic',{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
function database(fail=false){
 const statements:{sql:string;values:(string|number)[]}[]=[];
 let batches=0;
 const db:CounterDatabase={prepare(sql){const stmt={sql,values:[] as (string|number)[],bind(...values:(string|number)[]){stmt.values=values;return stmt;}};return stmt;},async batch(s){batches++;if(fail)throw Error('private DB failure');statements.push(...s as unknown as typeof statements);}};
 return {db,statements,get batches(){return batches;}};
}
test('daily counter rejects identifying fields and malformed or unbounded input',()=>{
 const good={pages:[{page:'home',count:2}]};assert.deepEqual(parsePageCounts(good),good.pages);
 for(const bad of [null,[],{}, {pages:[]},{...good,child:'secret'},{pages:[{page:'home',count:1,session:'secret'}]}, {pages:[{page:'__proto__',count:1}]},{pages:[{page:'home?name=baby',count:1}]},{pages:[{page:'home',count:1.5}]},{pages:[{page:'home',count:21}]},{pages:[{page:'home',count:0}]},{pages:[{page:'home',count:1},{page:'home',count:1}]}])assert.equal(parsePageCounts(bad),null);
});
test('default counter respects opt-out, unavailable storage, DNT/GPC and production scope',()=>{
 assert.equal(trafficEnabled({getItem:()=>null},{}),true);
 assert.equal(trafficEnabled({getItem:()=>null},{doNotTrack:'1'}),false);
 assert.equal(trafficEnabled({getItem:()=>null},{globalPrivacyControl:true}),false);
 assert.equal(trafficEnabled({getItem:()=>'1'},{}),false);
 assert.equal(trafficEnabled({getItem:()=>{throw Error();}},{}),false);
 assert.equal(trafficAvailable(true,'pokepal-online.pages.dev'),true);
 for(const host of ['localhost','other.example','preview.pokepal-online.pages.dev'])assert.equal(trafficAvailable(true,host),false);
 assert.equal(trafficAvailable(false,'pokepal-online.pages.dev'),false);
});
test('counter stores only daily totals in one atomic batch and never exposes data',async()=>{
 const state=database();const r=await onRequest({request:request({pages:[{page:'home',count:2},{page:'story',count:1}]}),env:{TRAFFIC_DB:state.db}});
 assert.equal(r.status,204);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(await r.text(),'');
 assert.equal(state.batches,1);assert.match(state.statements[0].sql,/DELETE/);assert.equal(state.statements.length,3);
 assert.deepEqual(state.statements[1].values,[new Date().toISOString().slice(0,10),'home',2]);
 assert.match(state.statements[1].sql,/ON CONFLICT.*views=views\+excluded.views/);
 assert.equal((await onRequest({request:request(null,{},'GET'),env:{TRAFFIC_DB:state.db}})).status,405);
 assert.equal(state.batches,1);
});
test('cross-site, oversized, unknown fields and privacy signals cannot write counters',async()=>{
 const state=database(),env={TRAFFIC_DB:state.db},body={pages:[{page:'home',count:1}]};
 for(const [req,status] of [[request(body,{Origin:'https://evil.example'}),403],[request(body,{'Sec-Fetch-Site':'cross-site'}),403],[request(body,{'Content-Type':'text/plain'}),415],[request({pages:[],name:'private'}),400],[request('x'.repeat(2100)),413],[request(body,{DNT:'1'}),204],[request(body,{'Sec-GPC':'1'}),204]] as const){assert.equal((await onRequest({request:req,env})).status,status);}
 assert.equal(state.batches,0);
});
test('storage failures do not return success or leak internal errors',async()=>{
 const req=()=>request({pages:[{page:'home',count:1}]});
 assert.equal((await onRequest({request:req(),env:{}})).status,503);
 const r=await onRequest({request:req(),env:{TRAFFIC_DB:database(true).db}});assert.equal(r.status,503);assert.equal(await r.text(),'');
});
test('interaction vocabulary cannot carry private input; completion precedes energy and failures never count',()=>{
 for(const value of ['__proto__','baby-name','lesson_123','catch_25',{},null])assert.equal(interactionEvent(value),null);
 for(const value of INTERACTION_EVENTS)assert.equal(interactionEvent(value),value);
 const events:string[]=[];trackInteraction('help_opened'); // no backlog before a sink exists
 const disconnect=connectInteractions(e=>events.push(e));
 assert.deepEqual(events,[]);
 trackLearningCompletion('lesson_completed',undefined);assert.deepEqual(events,[]);
 trackLearningCompletion('lesson_completed',{gained:2,bonus:0});assert.deepEqual(events,['lesson_completed','energy_earned']);
 trackLearningCompletion('practice_completed',{gained:0,bonus:0});assert.deepEqual(events,['lesson_completed','energy_earned','practice_completed']);
 trackInteraction('private' as never);assert.equal(events.length,3);disconnect();trackInteraction('help_opened');assert.equal(events.length,3);
 const broken=connectInteractions(()=>{throw Error();});assert.doesNotThrow(()=>trackInteraction('help_opened'));broken();
});
