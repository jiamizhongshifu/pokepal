import {useEffect,useRef,useState} from 'react';

/** Tap-to-start, tap-to-finish capture of one whole clip of the child's own voice (diary answers). */
export type ClipPhase='idle'|'starting'|'recording'|'saving';
export type ClipFailure='unsupported'|'permission'|'interrupted'|'empty'|'save'|'other';
export interface ClipCallbacks {
 maxSeconds:number;
 onRecorded:(audio:Blob)=>Promise<void>;
 onFailure:(kind:ClipFailure,error?:unknown)=>void;
}
export interface ClipEnvironment {
 secure:boolean;
 hidden:()=>boolean;
 getUserMedia?:(constraints:MediaStreamConstraints)=>Promise<MediaStream>;
 Recorder?:typeof MediaRecorder;
}
type Listener={phase:(phase:ClipPhase)=>void;seconds:(seconds:number)=>void};

export const CLIP_MIME_TYPES=['audio/mp4','audio/webm;codecs=opus','audio/webm'];

export function browserClipEnvironment():ClipEnvironment{
 return {
  secure:window.isSecureContext,
  hidden:()=>document.hidden,
  getUserMedia:navigator.mediaDevices?.getUserMedia?constraints=>navigator.mediaDevices.getUserMedia(constraints):undefined,
  Recorder:typeof MediaRecorder==='undefined'?undefined:MediaRecorder,
 };
}

export class ClipRecorder {
 private active=false;
 private disposed=false;
 private recorder?:MediaRecorder;
 private stream?:MediaStream;
 private timer?:ReturnType<typeof setInterval>;
 constructor(private callbacks:()=>ClipCallbacks,private listener:Listener,private env:ClipEnvironment){}

 /** True from the start tap until the clip is saved or discarded. */
 get capturing(){return this.active;}

 async start():Promise<boolean>{
  if(this.active||this.disposed)return false;
  this.active=true;this.listener.phase('starting');
  const {getUserMedia,Recorder}=this.env;
  try{
   if(!this.env.secure||!getUserMedia||!Recorder){this.callbacks().onFailure('unsupported');return false;}
   const media=await getUserMedia({audio:true});
   if(this.disposed||this.env.hidden()){media.getTracks().forEach(t=>t.stop());return false;}
   this.stream=media;
   const mime=CLIP_MIME_TYPES.find(m=>Recorder.isTypeSupported(m));
   const recorder=new Recorder(media,mime?{mimeType:mime}:undefined);this.recorder=recorder;
   const chunks:BlobPart[]=[];let broken=false;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onerror=()=>{broken=true;this.stop();};
   recorder.onstop=()=>{this.release();void this.deliver(new Blob(chunks,{type:recorder.mimeType}),broken);};
   recorder.start(250);
   this.listener.seconds(0);this.listener.phase('recording');
   let elapsed=0;
   this.timer=setInterval(()=>{elapsed++;this.listener.seconds(elapsed);if(elapsed>=this.callbacks().maxSeconds)this.stop();},1000);
   return true;
  }catch(error){
   this.release();
   this.callbacks().onFailure(error instanceof DOMException&&error.name==='NotAllowedError'?'permission':'other',error);
   return false;
  }finally{
   if(this.recorder?.state!=='recording'){this.recorder=undefined;this.active=false;this.listener.phase('idle');}
  }
 }

 /** Finishes the clip; the recorded audio is still delivered after dispose so a child's answer is never dropped. */
 stop(){
  if(this.recorder?.state==='recording'){this.listener.phase('saving');this.recorder.stop();}
  this.release();
 }

 dispose(){this.disposed=true;this.stop();}

 private async deliver(audio:Blob,broken:boolean){
  const {onRecorded,onFailure}=this.callbacks();
  try{
   if(broken)onFailure('interrupted');
   else if(!audio.size)onFailure('empty');
   else await onRecorded(audio);
  }catch(error){onFailure('save',error);}
  finally{this.recorder=undefined;this.active=false;this.listener.phase('idle');}
 }

 private release(){
  clearInterval(this.timer);this.timer=undefined;
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=undefined;
 }
}

export function useClipRecorder(callbacks:ClipCallbacks){
 const latest=useRef(callbacks);latest.current=callbacks;
 const [phase,setPhase]=useState<ClipPhase>('idle'),[seconds,setSeconds]=useState(0);
 const clip=useRef<ClipRecorder>();
 useEffect(()=>{
  let live=true;
  const recorder=new ClipRecorder(()=>latest.current,{phase:p=>{if(live)setPhase(p);},seconds:s=>{if(live)setSeconds(s);}},browserClipEnvironment());
  clip.current=recorder;
  const hide=()=>{if(document.hidden)recorder.stop();};
  document.addEventListener('visibilitychange',hide);
  return()=>{live=false;document.removeEventListener('visibilitychange',hide);recorder.dispose();};
 },[]);
 return {
  phase,seconds,
  recording:phase==='recording',
  busy:phase==='starting'||phase==='saving',
  start:()=>clip.current?.start()??Promise.resolve(false),
  stop:()=>clip.current?.stop(),
  isCapturing:()=>!!clip.current?.capturing,
 };
}
