import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {ClipRecorder,type ClipEnvironment,type ClipFailure,type ClipPhase} from '../../src/lib/clipRecorder';

class FakeTrack {stopped=0;stop(){this.stopped++;}}
class FakeStream {track=new FakeTrack();getTracks(){return [this.track];}}
class FakeRecorder {
 static instances:FakeRecorder[]=[];
 static isTypeSupported=(m:string)=>m==='audio/webm';
 state:'inactive'|'recording'='inactive';
 mimeType:string;
 chunk=new Blob(['voice'],{type:'audio/webm'});
 ondataavailable?:(e:{data:Blob})=>void;onerror?:()=>void;onstop?:()=>void;
 constructor(public stream:FakeStream,options?:{mimeType?:string}){this.mimeType=options?.mimeType??'';FakeRecorder.instances.push(this);}
 start(){this.state='recording';}
 stop(){if(this.state==='inactive')return;this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:this.chunk});this.onstop?.();});}
}
const flush=()=>new Promise(r=>setImmediate(r));

function setup(env:Partial<ClipEnvironment>={},maxSeconds=45){
 FakeRecorder.instances=[];
 const stream=new FakeStream();
 const phases:ClipPhase[]=[],seconds:number[]=[],failures:ClipFailure[]=[],saved:Blob[]=[];
 const clip=new ClipRecorder(()=>({maxSeconds,onRecorded:async a=>{saved.push(a);},onFailure:k=>{failures.push(k);}}),
  {phase:p=>phases.push(p),seconds:s=>seconds.push(s)},
  {secure:true,hidden:()=>false,getUserMedia:async()=>stream as unknown as MediaStream,Recorder:FakeRecorder as unknown as typeof MediaRecorder,...env});
 return {clip,stream,phases,seconds,failures,saved};
}

test('a finished clip is delivered once, the microphone is released, and the recorder can start again',async()=>{
 const t=setup();
 assert.equal(await t.clip.start(),true);
 assert.equal(t.clip.capturing,true);
 assert.equal(FakeRecorder.instances[0].mimeType,'audio/webm');
 t.clip.stop();await flush();
 assert.equal(t.saved.length,1);assert.equal(t.saved[0].size,5);
 assert.equal(t.stream.track.stopped>0,true);
 assert.deepEqual(t.phases,['starting','recording','saving','idle']);
 assert.equal(t.clip.capturing,false);
 assert.equal(await t.clip.start(),true);
 t.clip.dispose();await flush();
});

test('recording stops by itself at the time cap',async()=>{
 mock.timers.enable({apis:['setInterval']});
 try{
  const t=setup({},3);
  await t.clip.start();
  mock.timers.tick(3000);await flush();
  assert.deepEqual(t.seconds,[0,1,2,3]);
  assert.equal(t.saved.length,1);
 }finally{mock.timers.reset();}
});

test('an interrupted or empty clip never replaces the saved answer',async()=>{
 const broken=setup();await broken.clip.start();
 FakeRecorder.instances[0].onerror?.();await flush();
 assert.deepEqual(broken.failures,['interrupted']);assert.equal(broken.saved.length,0);

 const empty=setup();await empty.clip.start();
 FakeRecorder.instances[0].chunk=new Blob([]);
 empty.clip.stop();await flush();
 assert.deepEqual(empty.failures,['empty']);assert.equal(empty.saved.length,0);
});

test('permission, unsupported and save failures are reported by kind',async()=>{
 const denied=setup({getUserMedia:async()=>{throw new DOMException('no','NotAllowedError');}});
 assert.equal(await denied.clip.start(),false);
 assert.deepEqual(denied.failures,['permission']);assert.equal(denied.phases.at(-1),'idle');

 const insecure=setup({secure:false});
 assert.equal(await insecure.clip.start(),false);
 assert.deepEqual(insecure.failures,['unsupported']);

 const t=setup();
 const failures:ClipFailure[]=[];
 const clip=new ClipRecorder(()=>({maxSeconds:45,onRecorded:async()=>{throw new Error('disk full');},onFailure:k=>{failures.push(k);}}),{phase:()=>{},seconds:()=>{}},
  {secure:true,hidden:()=>false,getUserMedia:async()=>t.stream as unknown as MediaStream,Recorder:FakeRecorder as unknown as typeof MediaRecorder});
 await clip.start();clip.stop();await flush();
 assert.deepEqual(failures,['save']);assert.equal(clip.capturing,false);
});

test('leaving during the permission prompt releases the microphone without recording',async()=>{
 let grant!:(s:MediaStream)=>void;
 const t=setup({getUserMedia:()=>new Promise(r=>{grant=r;})});
 const started=t.clip.start();
 t.clip.dispose();grant(t.stream as unknown as MediaStream);
 assert.equal(await started,false);
 assert.equal(t.stream.track.stopped,1);
 assert.equal(FakeRecorder.instances.length,0);
});

test('leaving mid-answer still saves what the child already said',async()=>{
 const t=setup();await t.clip.start();
 t.clip.dispose();await flush();
 assert.equal(t.saved.length,1);
 assert.equal(await t.clip.start(),false);
});

test('a page hidden during the permission prompt does not start recording',async()=>{
 const t=setup({hidden:()=>true});
 assert.equal(await t.clip.start(),false);
 assert.equal(t.stream.track.stopped,1);
 assert.equal(FakeRecorder.instances.length,0);
});
