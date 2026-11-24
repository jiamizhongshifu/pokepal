import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { useGame } from '../store';
import { getAudioContext, onVoicePlayback, sayCancellableWhile, stopSpeech } from '../lib/speech';
import { alignTiming, storyTokens, storyWordEntry, storyWordGloss, storyWordVoice, wordAt } from '../lib/storyWords';
import { useClipRecorder, type ClipFailure } from '../lib/clipRecorder';
import './story-read-along.css';

/** Index of the word currently being spoken in this sentence, following the recording's own timings; -1 otherwise. */
export function useSpokenWord(en:string){
 const [active,setActive]=useState(-1);
 useEffect(()=>{
  let frame=0;
  const off=onVoicePlayback(playback=>{
   cancelAnimationFrame(frame);
   const timing=playback&&playback.lang==='en'&&playback.text===en?alignTiming(playback.timing,en):undefined;
   if(!playback||!timing){setActive(-1);return;}
   const clock=getAudioContext();
   const tick=()=>{setActive(wordAt(timing,(clock.currentTime-playback.startedAt)*playback.rate));frame=requestAnimationFrame(tick);};
   tick();
  });
  return()=>{off();cancelAnimationFrame(frame);};
 },[en]);
 return active;
}

/** The page sentence as tappable words; the lit word follows the narration, the keyword keeps its underline. */
export function ReadAlongText({en,keyword,active,selected,disabled,onWord}:{en:string;keyword:string;active:number;selected?:number;disabled?:boolean;onWord:(word:string,index:number)=>void}){
 const start=en.toLowerCase().indexOf(keyword.toLowerCase()),end=start+keyword.length;
 let offset=0;
 return <p className="story-text-en read-along" lang="en">{storyTokens(en).map((token,i)=>{
  const from=offset;offset+=token.text.length;
  if(!token.word)return <span key={i}>{token.text}</span>;
  const isKeyword=start>=0&&from<end&&from+token.text.length>start;
  return <button key={i} type="button" className="story-word" data-keyword={isKeyword||undefined} aria-current={active===token.index?'true':undefined} aria-pressed={selected===token.index} disabled={disabled} onClick={()=>onWord(token.word!,token.index!)}>{token.text}</button>;
 })}</p>;
}

export function WordCard({word,onHear,onClose}:{word:string;onHear:()=>void;onClose:()=>void}){
 const gloss=storyWordGloss(word),entry=storyWordEntry(word);
 const saved=useGame(s=>entry?!!s.save.learning?.records?.[entry.key]?.saved:false);
 return <div className="story-word-card" role="status">
  <button className="story-word-card-hear" onClick={onHear} aria-label={`再听一次 ${storyWordVoice(word)}`}><Icon name="speaker" size={26}/><b lang="en">{storyWordVoice(word)}</b></button>
  {gloss&&<span className="story-word-card-zh" lang="zh-CN">{gloss}</span>}
  {entry&&<button className="story-word-card-save" aria-pressed={saved} onClick={()=>useGame.getState().saveLearningWord(entry.key)}><Icon name="heart" size={20}/>{saved?'已收藏':'收藏'}</button>}
  <button className="story-word-card-close" aria-label="收起这个词" onClick={onClose}><Icon name="close" size={20}/></button>
 </div>;
}

const ECHO_FAILURES:Record<ClipFailure,string>={
 unsupported:'这台设备暂时不能录音。跟着小声说一说也很好。',
 permission:'需要麦克风才能听到自己的声音。可以请大人允许麦克风，或者跟着小声说一说。',
 interrupted:'这次没有录到声音，再试一次吧。',empty:'这次没有录到声音，再试一次吧。',save:'这次没有录好，再试一次吧。',other:'麦克风暂时打不开。跟着小声说一说也很好。',
};

/** Listen, say it yourself, hear yourself. No score; the clip lives only on this page and is never saved. */
export function EchoPractice({en,onStart}:{en:string;onStart:()=>void}){
 const [phase,setPhase]=useState<'idle'|'model'|'turn'|'mine'|'done'>('idle'),[note,setNote]=useState('');
 const live=useRef(true),clip=useRef(''),player=useRef<HTMLAudioElement|null>(null),run=useRef(0);
 // The example this button started, so stopping it cancels only that; and the end of my own playback, so stopping it early ends it the same way.
 const model=useRef<{cancel:()=>void}|null>(null),mineDone=useRef<(()=>void)|null>(null);
 const playMine=()=>new Promise<void>(resolve=>{
  stopSpeech();player.current?.pause();
  const audio=new Audio(clip.current);player.current=audio;
  const end=()=>{if(mineDone.current===end)mineDone.current=null;resolve();};mineDone.current=end;
  audio.onended=end;audio.onerror=end;audio.play().catch(end);
 });
 const rec=useClipRecorder({maxSeconds:8,
  onRecorded:async audio=>{
   if(!live.current)return;
   if(clip.current)URL.revokeObjectURL(clip.current);
   clip.current=URL.createObjectURL(audio);
   setPhase('mine');await playMine();if(live.current)setPhase('done');
  },
  onFailure:kind=>{if(live.current){setPhase('idle');setNote(ECHO_FAILURES[kind]);}}});
 useEffect(()=>{live.current=true;return()=>{live.current=false;player.current?.pause();if(clip.current){URL.revokeObjectURL(clip.current);clip.current='';}};},[]);
 const begin=async()=>{
  onStart();setNote('');player.current?.pause();setPhase('model');const ticket=++run.current;
  const example=sayCancellableWhile(()=>true,['en',en]);model.current=example;
  const ok=await example.done;
  if(model.current===example)model.current=null;
  if(!live.current||ticket!==run.current)return;
  if(!ok){setPhase('idle');setNote('这句声音暂时没准备好，可以先请大人读一遍。');return;}
  setPhase('turn');
  if(!await rec.start()&&live.current)setPhase(p=>p==='turn'?'idle':p);
 };
 const hearMine=async()=>{setPhase('mine');await playMine();if(live.current)setPhase('done');};
 // Tapping again while the model or my own voice plays stops it: the example goes back to the start, my voice to "done".
 const stopModel=()=>{run.current++;model.current?.cancel();model.current=null;setPhase('idle');};
 const stopMine=()=>{player.current?.pause();mineDone.current?.();setPhase('done');};
 const label=phase==='model'?'先听一听…':rec.recording?`说完啦 · ${rec.seconds} 秒`:phase==='turn'?'正在打开麦克风…':phase==='mine'?'听听我的声音…':phase==='done'?'再说一次':'我来说一说';
 return <section className="story-echo" aria-label="跟着说一说">
  <button className="story-echo-main" data-phase={rec.recording?'recording':phase} aria-pressed={rec.recording} disabled={phase==='turn'&&!rec.recording} onClick={rec.recording?rec.stop:phase==='model'?stopModel:phase==='mine'?stopMine:begin}>
   <Icon name={rec.recording?'check':phase==='model'||phase==='mine'?'ear':'mic'} size={30}/><span>{label}<small>{rec.recording?'轮到你说啦，说完点一下':phase==='model'||phase==='mine'?'再点一下就停下':phase==='done'?'像故事里一样，再说一遍':'先听这一句，再自己说'}</small></span>
  </button>
  {phase==='done'&&<button className="story-echo-mine" onClick={hearMine}><Icon name="play" size={24}/>听我的声音</button>}
  {rec.recording&&<span className="story-echo-meter" aria-hidden="true"><span style={{width:`${Math.min(100,rec.seconds/8*100)}%`}}/></span>}
  {note&&<p className="story-echo-note" role="status">{note}</p>}
  <small className="story-echo-privacy">录音只在这一页播放，不打分，也不会保存。</small>
 </section>;
}
