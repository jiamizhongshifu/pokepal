import {useEffect,useRef} from 'react';
import {getAudioContext,isForegroundAudioActive,unlockAudio} from './speech';
import {isMicActive} from './mic';
import {skyFor} from './routine';
import {weatherAt,soundscape,type NatureLevel,type WeatherMode} from './weather';
const DURATIONS={waves:24,leaves:20,rain:16,crickets:12,'bird-a':3,'bird-b':3};
type Track=keyof typeof DURATIONS;
interface Config {screen:string;level:NatureLevel;mode:WeatherMode;blocked:boolean;}
interface Voice {source:AudioBufferSourceNode;gain:GainNode;target:number;}
/** Isolated from narration and music; three continuous layers and at most one short bird call. */
class EnvironmentPlayer {
 config:Config={screen:'welcome',level:'soft',mode:'auto',blocked:true};
 ac:AudioContext|null=null;voices=new Map<Track,Voice>();buffers=new Map<Track,AudioBuffer>();loading=new Map<Track,AbortController>();retry=new Map<Track,number>();
 timer:ReturnType<typeof setInterval>;disposed=false;hidden=false;nextBird=0;birdNo=0;lastProfile:ReturnType<typeof soundscape>|null=null;
 constructor(){window.addEventListener('pointerdown',this.unlock,true);window.addEventListener('keydown',this.unlock,true);document.addEventListener('visibilitychange',this.visibility);window.addEventListener('pagehide',this.hide);window.addEventListener('pageshow',this.show);this.timer=setInterval(this.tick,150);}
 configure(config:Config){this.config=config;this.tick();}
 unlock=()=>{if(this.config.blocked||this.disposed)return;try{unlockAudio();this.ac=getAudioContext();this.tick();}catch{/* No sound does not block play. */}};
 visibility=()=>document.hidden?this.hide():this.show();
 hide=()=>{this.hidden=true;this.clear();this.debug();};show=()=>{this.hidden=false;this.tick();};
 allowed=()=>!this.disposed&&!this.hidden&&!document.hidden&&!this.config.blocked&&this.config.screen==='home'&&this.config.level!=='off'&&!isMicActive();
 stop(track:Track){const v=this.voices.get(track);if(!v)return;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();this.voices.delete(track);}
 clear(){this.loading.forEach(c=>c.abort());this.loading.clear();for(const key of this.voices.keys())this.stop(key);this.nextBird=0;}
 tick=()=>{
  if(!this.allowed()){this.clear();this.debug();return;}
  if(this.ac?.state!=='running'){this.debug();return;}
  const profile=this.lastProfile=soundscape(weatherAt(Date.now(),this.config.mode),skyFor(),this.config.level,isForegroundAudioActive());
  for(const track of ['waves','leaves','rain','crickets'] as const){
   const target=profile[track],voice=this.voices.get(track);
   if(target>.001){
    if(!voice&&!this.loading.has(track)&&Date.now()>(this.retry.get(track)??0))void this.load(track);
    if(voice&&Math.abs(voice.target-target)>.001){voice.gain.gain.setTargetAtTime(target,this.ac.currentTime,target<voice.target?.09:1.4);voice.target=target;}
   }else{
    this.loading.get(track)?.abort();
    if(voice){voice.gain.gain.setTargetAtTime(0,this.ac.currentTime,.25);voice.target=0;if(voice.gain.gain.value<.0005)this.stop(track);}
   }
  }
  if(!profile.birds){this.stop('bird-a');this.stop('bird-b');for(const k of ['bird-a','bird-b'] as const)this.loading.get(k)?.abort();this.nextBird=0;}
  else if(!this.nextBird)this.nextBird=Date.now()+8000+Math.random()*12000;
  else if(Date.now()>this.nextBird){this.nextBird=Date.now()+(profile.birdGap+Math.random()*25)*1000;void this.load(this.birdNo++%2?'bird-b':'bird-a');}
  this.debug();
 };
 async load(track:Track){
  const controller=new AbortController();this.loading.set(track,controller);const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   let buffer=this.buffers.get(track);
   if(!buffer){const r=await fetch(`/environment/${track}-v1.m4a`,{signal:controller.signal});if(!r.ok||r.headers.get('content-type')?.includes('html'))throw Error('environment audio');buffer=await this.ac!.decodeAudioData(await r.arrayBuffer());}
   if(controller.signal.aborted||!this.allowed()||this.ac?.state!=='running')return;
   const bird=track.startsWith('bird');if(bird&&!this.lastProfile?.birds)return;
   const target=bird?(this.config.level==='normal'?.2:.12):this.lastProfile?.[track as 'waves']??0;
   if(target<=.001)return;
   this.buffers.delete(track);this.buffers.set(track,buffer);
   while(this.buffers.size>4){const unused=[...this.buffers.keys()].find(k=>k!==track&&!this.voices.has(k));this.buffers.delete(unused??this.buffers.keys().next().value!);}
   if(this.voices.has(track))return;
   const source=this.ac.createBufferSource(),gain=this.ac.createGain();source.buffer=buffer;source.loop=!bird;source.loopEnd=Math.min(buffer.duration,DURATIONS[track]);source.connect(gain);gain.connect(this.ac.destination);
   gain.gain.value=0;gain.gain.setTargetAtTime(target,this.ac.currentTime,bird?.04:1.6);
   this.voices.set(track,{source,gain,target});source.onended=()=>{source.disconnect();gain.disconnect();if(this.voices.get(track)?.source===source)this.voices.delete(track);};source.start(0,bird?0:(this.ac.currentTime%source.loopEnd));
  }catch{this.retry.set(track,Date.now()+30_000);}finally{clearTimeout(timeout);if(this.loading.get(track)===controller)this.loading.delete(track);this.debug();}
 }
 debug(){if(import.meta.env.DEV)(window as unknown as {__environment:unknown}).__environment={allowed:this.allowed(),weather:weatherAt(Date.now(),this.config.mode).kind,playing:[...this.voices].map(([track,v])=>({track,gain:v.target})),pending:[...this.loading.keys()],cached:this.buffers.size,profile:this.lastProfile,nextBird:this.nextBird,context:this.ac?.state??'locked'};}
 dispose(){this.disposed=true;clearInterval(this.timer);this.clear();this.buffers.clear();window.removeEventListener('pointerdown',this.unlock,true);window.removeEventListener('keydown',this.unlock,true);document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.hide);window.removeEventListener('pageshow',this.show);}
}
export function useEnvironmentAudio(config:Config){const player=useRef<EnvironmentPlayer|null>(null);useEffect(()=>{player.current=new EnvironmentPlayer();return()=>player.current?.dispose();},[]);useEffect(()=>player.current?.configure(config),[config.screen,config.level,config.mode,config.blocked]);}
