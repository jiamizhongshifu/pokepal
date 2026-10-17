import { useEffect, useRef } from 'react';
import { getAudioContext, isForegroundAudioActive, unlockAudio } from './speech';
import { skyFor } from './routine';
import { musicGain, musicLoopSeconds, sceneMusic, type MusicLevel, type MusicTrack } from './musicPolicy';

interface Voice { track:MusicTrack; source:AudioBufferSourceNode; gain:GainNode; started:number; offset:number; }
interface Config { screen:string; level:MusicLevel; blocked:boolean; }

/** One player for the application, independent of the persistent hidden island. */
class SceneMusicPlayer {
  private config:Config={screen:'welcome',level:'soft',blocked:true};
  private ac:AudioContext|null=null;
  private master:GainNode|null=null;
  private voices:Voice[]=[];
  private buffers=new Map<MusicTrack,AudioBuffer>();
  private positions=new Map<MusicTrack,number>();
  private request:AbortController|null=null;
  private pending:MusicTrack|null=null;
  private desired:MusicTrack|null=null;
  private retryAt=0;
  private disposed=false;
  private pageHidden=false;
  private lastGain=-1;
  private timer:ReturnType<typeof setInterval>;
  constructor(){
    window.addEventListener('pointerdown',this.unlock,{capture:true,passive:true});
    window.addEventListener('keydown',this.unlock,true);
    document.addEventListener('visibilitychange',this.visibility);
    window.addEventListener('pagehide',this.hide);
    window.addEventListener('pageshow',this.show);
    this.timer=setInterval(this.tick,100);
  }
  configure(config:Config){this.config=config;this.tick();}
  private unlock=()=>{
    if(this.disposed || this.config.blocked)return;
    // Use the same context as teaching voices, resumed synchronously inside the gesture.
    try{unlockAudio();this.ac=getAudioContext();this.tick();}catch{/* Audio unavailable: gameplay remains usable. */}
  };
  private visibility=()=>{if(document.hidden)this.hide();else this.show();};
  private hide=()=>{this.pageHidden=true;this.cancelLoad();this.silence();this.debug();};
  private show=()=>{this.pageHidden=false;this.tick();};
  private cancelLoad(){this.request?.abort();this.request=null;this.pending=null;}
  private silence(){
    if(this.master&&this.ac){this.master.gain.cancelScheduledValues(this.ac.currentTime);this.master.gain.setValueAtTime(0,this.ac.currentTime);}
    this.lastGain=-1;
    this.voices.forEach(v=>this.stop(v));this.voices=[];
  }
  private stop(v:Voice){
    if(this.ac&&v.source.buffer)this.positions.set(v.track,(v.offset+Math.max(0,this.ac.currentTime-v.started))%v.source.loopEnd);
    try{v.source.stop();}catch{/* already ended */}
    v.source.disconnect();v.gain.disconnect();
  }
  private tick=()=>{
    if(this.disposed)return;
    const wanted=sceneMusic(this.config.screen,skyFor(),this.config.blocked||document.hidden||this.pageHidden||this.config.level==='off');
    if(wanted!==this.desired){this.desired=wanted;this.cancelLoad();this.retryAt=0;}
    if(!wanted){if(this.voices.length||this.pending){this.cancelLoad();this.silence();}this.debug();return;}
    if(!this.ac||this.ac.state!=='running'){this.debug();return;}
    if(!this.master){this.master=this.ac.createGain();this.master.gain.value=0;this.master.connect(this.ac.destination);}
    const target=musicGain(this.config.level,isForegroundAudioActive());
    if(target!==this.lastGain){
      this.master.gain.cancelScheduledValues(this.ac.currentTime);
      this.master.gain.setTargetAtTime(target,this.ac.currentTime,target<this.lastGain?.06:.5);
      this.lastGain=target;
    }
    if(this.voices[this.voices.length-1]?.track!==wanted&&this.pending!==wanted&&Date.now()>=this.retryAt)void this.load(wanted);
    this.debug();
  };
  private async load(track:MusicTrack){
    const controller=new AbortController();this.request=controller;this.pending=track;
    const timeout=setTimeout(()=>controller.abort(),20000);
    try{
      let buffer=this.buffers.get(track);
      if(!buffer){
        const response=await fetch(`/music/${track}-v1.m4a`,{signal:controller.signal});
        if(!response.ok||response.headers.get('content-type')?.includes('text/html'))throw new Error('Music unavailable');
        buffer=await this.ac!.decodeAudioData(await response.arrayBuffer());
      }
      if(this.disposed||controller.signal.aborted||this.desired!==track||document.hidden||this.ac?.state!=='running')return;
      // LRU: only two decoded files stay cached. No full music-pack preload.
      this.buffers.delete(track);this.buffers.set(track,buffer);
      while(this.buffers.size>2)this.buffers.delete(this.buffers.keys().next().value!);
      this.start(track,buffer);
    }catch{if(!this.disposed&&this.desired===track)this.retryAt=Date.now()+30000;}
    finally{clearTimeout(timeout);if(this.request===controller){this.request=null;this.pending=null;}this.debug();}
  }
  private start(track:MusicTrack,buffer:AudioBuffer){
    const ac=this.ac!,now=ac.currentTime;
    // Rapid navigation never stacks more than two sources.
    while(this.voices.length>1)this.stop(this.voices.shift()!);
    const old=this.voices[0];
    if(old){
      old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(old.gain.gain.value,now);
      old.gain.gain.linearRampToValueAtTime(0,now+2.4);
      this.positions.set(old.track,(old.offset+now-old.started)%old.source.loopEnd);
      old.source.stop(now+2.5);
    }
    const source=ac.createBufferSource(),gain=ac.createGain();
    source.buffer=buffer;source.loop=true;source.loopEnd=Math.min(buffer.duration,musicLoopSeconds(track));source.connect(gain);gain.connect(this.master!);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+2.4);
    const offset=(this.positions.get(track)??0)%source.loopEnd;
    const voice={track,source,gain,started:now,offset};
    source.onended=()=>{source.disconnect();gain.disconnect();this.voices=this.voices.filter(v=>v!==voice);};
    source.start(now,offset);this.voices.push(voice);
  }
  private debug(){
    if(import.meta.env.DEV)(window as unknown as {__music:unknown}).__music={desired:this.desired,playing:this.voices.map(v=>v.track),pending:this.pending,level:this.config.level,gain:this.lastGain,effectiveGain:this.master?.gain.value??0,context:this.ac?.state??'locked',cached:this.buffers.size};
  }
  dispose(){
    this.disposed=true;clearInterval(this.timer);this.cancelLoad();this.silence();this.buffers.clear();this.master?.disconnect();
    window.removeEventListener('pointerdown',this.unlock,true);window.removeEventListener('keydown',this.unlock,true);
    document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('pagehide',this.hide);window.removeEventListener('pageshow',this.show);
  }
}

export function useSceneMusic(config:Config){
  const player=useRef<SceneMusicPlayer|null>(null);
  useEffect(()=>{player.current=new SceneMusicPlayer();return()=>{player.current?.dispose();player.current=null;};},[]);
  useEffect(()=>{player.current?.configure(config);},[config.screen,config.level,config.blocked]);
}
