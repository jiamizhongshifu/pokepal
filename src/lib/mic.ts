import { VoiceActivity } from './voiceActivity';

/** Offline participation detection only; no pronunciation or speech recognition. */
let stream:MediaStream|null=null;
let cancelRecording:(()=>void)|undefined;
let micDenied=false;
export const isMicActive=()=>!!cancelRecording;
export const micSupported=()=>!!navigator.mediaDevices?.getUserMedia;
export const micWasDenied=()=>micDenied;
export function releaseMic(){cancelRecording?.();stream?.getTracks().forEach(t=>t.stop());stream=null;}
export interface RecordResult {
  voiced:boolean;voicedMs:number;peak:number;blob?:Blob;
  confirmed?:boolean;
  error?:'permission'|'unavailable'|'timeout'|'audio'|'cancelled';
}
type RecordOptions={maxMs?:number;onLevel?:(v:number)=>void;onState?:(v:'listening'|'finishing')=>void;onVoice?:(heard:boolean)=>void;signal?:AbortSignal};
function bounded<T>(promise:Promise<T>,ms:number,signal:AbortSignal):Promise<T>{
 return new Promise((resolve,reject)=>{
  const done=(fn:()=>void)=>{clearTimeout(timer);signal.removeEventListener('abort',abort);fn();};
  const abort=()=>done(()=>reject(new DOMException('Cancelled','AbortError')));
  const timer=setTimeout(()=>done(()=>reject(new Error('timeout'))),ms);
  if(signal.aborted){abort();return;}
  signal.addEventListener('abort',abort,{once:true});
  promise.then(v=>done(()=>resolve(v)),e=>done(()=>reject(e)));
 });
}
function mimeType(){
 if(typeof MediaRecorder==='undefined')return undefined;
 return ['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
}
export async function record(opts:RecordOptions={}):Promise<RecordResult>{
 cancelRecording?.();
 const control=new AbortController(),cancel=()=>control.abort();cancelRecording=cancel;
 opts.signal?.addEventListener('abort',cancel,{once:true});if(opts.signal?.aborted)cancel();
 const activity=new VoiceActivity();
 let local:MediaStream|undefined,ac:AudioContext|undefined,recorder:MediaRecorder|undefined;
 let source:MediaStreamAudioSourceNode|undefined,analyser:AnalyserNode|undefined,mute:GainNode|undefined;
 const chunks:Blob[]=[];
 let blob:Blob|undefined;
 try{
  if(control.signal.aborted)return {...activity.result(),error:'cancelled'};
  if(!micSupported())return {...activity.result(),error:'unavailable'};
  const AC=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  if(!AC)return {...activity.result(),error:'audio'};
  // Create/resume synchronously in the tap gesture. Keep capture separate from
  // narration's AudioContext; iPad can interrupt playback when the mic opens.
  ac=new AC();
  const resumed=bounded(ac.resume(),2000,control.signal);
  const requested=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(s=>{
    if(control.signal.aborted){s.getTracks().forEach(t=>t.stop());throw new DOMException('Cancelled','AbortError');}return s;
  });
  // Attach both rejection handlers immediately while the permission prompt is open.
  const results=await Promise.allSettled([resumed,bounded(requested,8000,control.signal)]);
  if(results[1].status==='rejected')throw results[1].reason;
  local=results[1].value;stream=local;micDenied=false;
  if(control.signal.aborted)throw new DOMException('Cancelled','AbortError');
  if(ac.state!=='running')await bounded(ac.resume(),2000,control.signal);
  if(ac.state!=='running')return {...activity.result(),error:'audio'};
  source=ac.createMediaStreamSource(local);analyser=ac.createAnalyser();analyser.fftSize=1024;
  mute=ac.createGain();mute.gain.value=0;source.connect(analyser);analyser.connect(mute);mute.connect(ac.destination);
  try{const mime=mimeType();recorder=new MediaRecorder(local,mime?{mimeType:mime}:undefined);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start(200);}catch{recorder=undefined;}
  opts.onState?.('listening');
  const buf=new Float32Array(analyser.fftSize);
  await new Promise<void>(resolve=>{
    let ended=false;const start=performance.now();let last=start;
    const finish=()=>{if(ended)return;ended=true;clearInterval(interval);clearTimeout(deadline);control.signal.removeEventListener('abort',finish);resolve();};
    const interval=setInterval(()=>{
      try{
        const now=performance.now();analyser!.getFloatTimeDomainData(buf);
        let sum=0;for(const v of buf)sum+=v*v;
        const result=activity.sample(Math.sqrt(sum/buf.length),now-last);last=now;
        opts.onLevel?.(result.level);opts.onVoice?.(result.voiced);
        if(result.done||now-start>=(opts.maxMs??8000)||!local!.getAudioTracks().some(t=>t.readyState==='live'))finish();
      }catch{finish();}
    },40);
    const deadline=setTimeout(finish,opts.maxMs??8000);
    control.signal.addEventListener('abort',finish,{once:true});if(control.signal.aborted)finish();
  });
  opts.onState?.('finishing');
  if(recorder&&recorder.state!=='inactive'){
    // Some iPad recorder interruptions never fire stop. Never block advancement.
    await new Promise<void>(resolve=>{
      const done=()=>{clearTimeout(timer);resolve();};
      const timer=setTimeout(done,1200);recorder!.onstop=done;recorder!.onerror=done;
      try{recorder!.stop();}catch{done();}
    });
  }
  if(chunks.some(c=>c.size))blob=new Blob(chunks,{type:recorder?.mimeType||chunks[0]?.type||'audio/mp4'});
  return {...activity.result(),blob,...(control.signal.aborted?{error:'cancelled' as const}:{})};
 }catch(error){
  const name=error instanceof Error?error.name:'';
  if(name==='NotAllowedError'||name==='SecurityError')micDenied=true;
  return {...activity.result(),error:control.signal.aborted?'cancelled':name==='NotAllowedError'||name==='SecurityError'?'permission':error instanceof Error&&error.message==='timeout'?'timeout':'audio'};
 }finally{
  control.abort();opts.signal?.removeEventListener('abort',cancel);
  if(cancelRecording===cancel)cancelRecording=undefined;
  try{if(recorder&&recorder.state!=='inactive')recorder.stop();}catch{}
  source?.disconnect();analyser?.disconnect();mute?.disconnect();local?.getTracks().forEach(t=>t.stop());
  if(stream===local)stream=null;
  if(ac&&ac.state!=='closed')void ac.close().catch(()=>{});
  opts.onLevel?.(0);
 }
}
