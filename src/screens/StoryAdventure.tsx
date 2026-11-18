import {useEffect,useRef,useState} from 'react';
import {useGame} from '../store';
import {PICNIC_ADVENTURE as adventure,PICNIC_BOOK as book} from '../lib/storyAdventure';
import {beginStory,type StoryEvent} from '../lib/storyPlayer';
import {say,stopSpeech} from '../lib/speech';
import {StoryStage} from '../components/StoryStage';
import {TopBar} from '../components/TopBar';
import './story-adventure.css';
export function StoryAdventure(){
 const save=useGame(s=>s.save),busy=useGame(s=>s.saveBusy),go=useGame(s=>s.go);
 const [ready,setReady]=useState(false),[audioFailed,setAudioFailed]=useState(false),[assetFailed,setAssetFailed]=useState(false);
 const lock=useRef(false),autostarted=useRef(false);
 const state=save.storyAdventure??beginStory(adventure),page=book.pages[state.index];
 const active=['playing','invitation','reacting'].includes(state.phase);
 const send=async(event:StoryEvent)=>{
  if(lock.current)return;
  lock.current=true;
  try{await useGame.getState().advanceAdventure(event);}finally{lock.current=false;}
 };
 useEffect(()=>{useGame.getState().restoreAdventure();setReady(true);return()=>stopSpeech();},[]);
 useEffect(()=>{const screen=useGame.getState().screen;if(ready&&screen.name==='adventure'&&screen.autoplay&&!autostarted.current){autostarted.current=true;void send({type:state.phase==='paused'?'resume':'start'});}},[ready]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden){stopSpeech();void send({type:'pause'});}};
  document.addEventListener('visibilitychange',hide);
  return()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>{
  if(!ready||!active||assetFailed||document.hidden)return;
  let cancelled=false;
  const token=state.token,phase=state.phase;
  let timer:ReturnType<typeof setTimeout>|undefined;
  if(phase==='playing'){
   setAudioFailed(false);
   // Only completed existing recordings advance the story. No silent reward timer.
   void say(['zh',page.zh],450,['en',page.en]).then(ok=>{
    if(cancelled)return;
    if(ok)void send({type:'media-ended',token});
    else {setAudioFailed(true);void send({type:'pause'});}
   });
  }else timer=setTimeout(()=>void send({type:phase==='invitation'?'invitation-ended':'reaction-ended',token}),phase==='invitation'?6000:2000);
  return()=>{cancelled=true;clearTimeout(timer);stopSpeech();};
 },[ready,state.token,state.phase,assetFailed]);
 const resume=()=>{setAudioFailed(false);void send({type:state.phase==='ready'?'start':'resume'});};
 const buy=async()=>{if(lock.current)return;lock.current=true;try{if(await useGame.getState().buyBall())go({name:'catch'});}finally{lock.current=false;}};
 return <div className="screen story-adventure">
  <TopBar title="苹果野餐" onBack={()=>{stopSpeech();go({name:'stories'});}} focused/>
  <main>
   <header><p>和啵啵、莓莓一起 · {state.index+1} / {book.pages.length}</p><h1>{state.phase==='ready'?book.title:page.beat}</h1></header>
   <div onErrorCapture={()=>{setAssetFailed(true);stopSpeech();void send({type:'pause'});}} className={`adventure-picture ${active?'':'is-paused'}`}>
    <StoryStage story={book} page={page}/>
    {state.phase==='invitation'&&<button className="adventure-invite" disabled={busy} onClick={()=>void send({type:'participate',token:state.token})}>一起扶住篮子<small>也可以看朋友来做</small></button>}
    {state.phase==='reacting'&&<p className="adventure-response">一起帮忙，苹果洗干净啦。</p>}
   </div>
   <section className="adventure-words"><p>{page.zh}</p><p lang="en">{page.en}</p></section>
   {assetFailed?<p role="alert">画面还没加载好，请返回故事屋后重试。进度已经留在这里。</p>:state.phase!=='completed'&&<div className="adventure-controls">
    {audioFailed&&<p role="alert">声音暂时没准备好。故事已暂停，请联网后重试。</p>}
    <button disabled={busy||!ready} onClick={()=>active?void send({type:'pause'}):resume()}>{active?'暂停一下':state.phase==='ready'?'一起听故事':audioFailed?'重试声音':'接着听'}</button>
    <small>听完自动往下走，不用答题，也不用每页点一下。</small>
   </div>}
   {state.phase==='completed'&&<section className="adventure-reward" aria-live="polite">
    <h2>谢谢你，一起度过这个小故事。</h2>
    <p>{save.daily.adventureReward!==undefined?(save.daily.adventureReward>0?`今天的故事已存好，获得 ${save.daily.adventureReward} 能量。`:'今天的故事已存好。今天的能量已收集过或已满。'):'这段故事已经听完，可以再听一次。'} 现在有 {save.energy} 能量、{save.balls.poke} 个邀请果。</p>
    {save.balls.poke>0?<button disabled={busy} onClick={()=>go({name:'catch'})}>带上邀请果，认识新伙伴</button>:save.energy>=5?<button disabled={busy} onClick={()=>void buy()}>用 5 能量换邀请果，去找伙伴</button>:<button onClick={()=>go({name:'home'})}>回小岛，陪陪伙伴</button>}
    <div className="adventure-secondary"><button disabled={busy} onClick={()=>void send({type:'restart'})}>再听一次</button><button onClick={()=>go({name:'home'})}>回小岛</button></div>
    <small>故事每天共 5 能量，与旧版共读合并计算；所有活动每天最多 15 能量。重听不会重复领取。</small>
   </section>}
  </main>
 </div>;
}
