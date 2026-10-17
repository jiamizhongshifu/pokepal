import assert from 'node:assert/strict';
import {record} from '../src/lib/mic';
let stuckResume=false,stuckStop=false,voice=false,stopped=0,closed=0;
const track=()=>({readyState:'live',stop(){this.readyState='ended';stopped++;}});
const media=()=>{const t=track();return {getTracks:()=>[t],getAudioTracks:()=>[t]};};
let getMedia:()=>Promise<any>=async()=>media();
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>getMedia()}}});
class Context {
 state='suspended';destination={};
 resume(){if(stuckResume)return new Promise<void>(()=>{});this.state='running';return Promise.resolve();}
 close(){this.state='closed';closed++;return Promise.resolve();}
 createMediaStreamSource(){return {connect(){},disconnect(){}};}
 createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
 createAnalyser(){const start=performance.now();return {fftSize:1024,connect(){},disconnect(){},getFloatTimeDomainData(a:Float32Array){a.fill(voice&&performance.now()-start<350?.01:.001);}};}
}
class Recorder {
 static isTypeSupported(){return true;}state='inactive';mimeType='audio/mp4';onstop?:()=>void;
 start(){this.state='recording';}stop(){this.state='inactive';if(!stuckStop)this.onstop?.();}
}
Object.assign(globalThis,{window:{AudioContext:Context},MediaRecorder:Recorder});
let r=await record({maxMs:120});assert.equal(r.voiced,false);assert.equal(stopped,1);assert.equal(closed,1);
voice=true;r=await record({maxMs:1800});assert.equal(r.voiced,true,'quiet immediate voice auto finishes');assert.ok(r.voicedMs>=180);voice=false;
stuckStop=true;let start=performance.now();r=await record({maxMs:80});assert.ok(performance.now()-start<1700,'missing recorder stop is bounded');stuckStop=false;
stuckResume=true;start=performance.now();r=await record({maxMs:80});assert.equal(r.error,'timeout');assert.ok(performance.now()-start<4500,'hung AudioContext resume is bounded');stuckResume=false;
let resolveMedia:(s:any)=>void=()=>{};getMedia=()=>new Promise(r=>resolveMedia=r);
const controller=new AbortController();const pending=record({signal:controller.signal});controller.abort();r=await pending;assert.equal(r.error,'cancelled');const previous=stopped;resolveMedia(media());await new Promise(r=>setTimeout(r,20));assert.equal(stopped,previous+1,'late permission result releases microphone');
getMedia=async()=>media();const abort=new AbortController();const active=record({maxMs:8000,signal:abort.signal,onState:s=>{if(s==='listening')setTimeout(()=>abort.abort(),80);}});start=performance.now();r=await active;assert.equal(r.error,'cancelled');assert.ok(performance.now()-start<500);
console.log('PASS: capture deadline without RAF, quiet voice auto-end, missing stop event, hung resume, permission cancellation, late stream cleanup, active cancellation.');
