import {useEffect,useReducer,useState} from 'react';
import {APPLE_PICNIC as story} from '../data/adventures/applePicnic';
import {beginStory,restoreStory,storyPlayback,type StoryEvent,type StoryPlayback} from '../lib/storyPlayer';
import './story-adventure-preview.css';
const KEY='pokepal:dev:apple-picnic:v1';
const titles=['今天，一起去野餐','苹果上有一点泥','水壶有点重','哗啦，水来了','认真擦干这一颗','这里，也有你的座位','谢谢你，朋友','把温柔留在今天'];
function initial(){try{return restoreStory(story,JSON.parse(sessionStorage.getItem(KEY)??'null'));}catch{return beginStory(story);}}
export function StoryAdventurePreview(){
 const [state,dispatch]=useReducer((s:StoryPlayback,e:StoryEvent)=>storyPlayback(story,s,e),undefined,initial);
 const [entered,setEntered]=useState(false);
 const [storageFailed,setStorageFailed]=useState(false);
 const [assetFailed,setAssetFailed]=useState(false);
 const beat=story.beats[state.index];
 const invitation='invitation' in beat?beat.invitation:undefined;
 const active=state.phase==='playing'||state.phase==='invitation'||state.phase==='reacting';
 useEffect(()=>{try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch{setStorageFailed(true);}},[state]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)dispatch({type:'pause'});};
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',hide);};
 },[]);
 useEffect(()=>{
  if(!entered||!active||assetFailed||document.hidden)return;
  const phase=state.phase;
  const delay=phase==='invitation'?(invitation?.waitMs??7000):phase==='reacting'?2200:4500;
  const timer=setTimeout(()=>dispatch({type:phase==='invitation'?'invitation-ended':phase==='reacting'?'reaction-ended':'media-ended',token:state.token}),delay);
  return()=>clearTimeout(timer);
 },[entered,active,assetFailed,state.phase,state.token,invitation]);
 const start=()=>{setEntered(true);dispatch({type:state.phase==='paused'?'resume':'start'});};
 const leave=()=>{dispatch({type:'pause'});setEntered(false);};
 const restart=()=>{dispatch({type:'restart'});setEntered(false);};
 const reacting=state.phase==='reacting';
 return <div className="adventure-preview">
  <aside className="preview-notice">开发预览 · 现有素材排演 · 无配音 · 不发积分、不改小岛存档</aside>
  <header><a href="/">Bubbly Isle</a><span>小岛故事 / 01</span>{entered&&<button onClick={leave}>退出故事</button>}</header>
  {storageFailed&&<p role="status">浏览器暂时无法保存预览位置，关闭页面后可能需要重新开始。</p>}
  {!entered?<main className="adventure-lobby">
   <p>今天，和朋友一起</p><h1>{story.title}</h1><p>有一颗认真洗净的苹果，特意留给你。</p>
   <div className="preview-friends">{story.cast.map(id=><img key={id} src={`/pokemon/art/${id}.png`} alt={id===25?'啵啵':'莓莓'}/>)}</div>
   {state.phase==='completed'?<><p>今天的野餐已经结束啦。</p><button className="main-action" onClick={restart}>再看这个故事</button></>:<button className="main-action" onClick={start}>{state.phase==='paused'?'接着上次的故事':'一起出发'}</button>}
   <small>这是供大人审阅流程的静音排演，正式动画与旁白尚未接入。</small>
  </main>:<main className="adventure-reader" data-phase={state.phase} data-beat={beat.id}>
   <div className="adventure-heading"><div><p>{state.index+1} / {story.beats.length}</p><h1>{titles[state.index]}</h1></div>
    {state.phase!=='completed'&&<button onClick={()=>dispatch({type:active?'pause':'resume'})}>{active?'暂停':'继续'}</button>}
   </div>
   <div className={`adventure-stage beat-${beat.id} ${reacting?'is-reacting':''}`}>
    <img className="adventure-background" src="/story-art/painted-v1/backgrounds/orchard.png" alt="安静的苹果园" onError={()=>{setAssetFailed(true);dispatch({type:'pause'});}}/>
    {story.cast.map((id,i)=><img key={id} className={`adventure-actor actor-${i}`} src={`/pokemon/art/${id}.png`} alt={id===25?'啵啵':'莓莓'} onError={()=>{setAssetFailed(true);dispatch({type:'pause'});}}/>)}
    <img className="adventure-basket" src="/story-art/painted-v1/props/basket-apples.png" alt="装着苹果的篮子"/>
    {['help','wash'].includes(beat.id)&&<div className="pouring-prop"><img src="/story-art/painted-v1/props/watering-can.png" alt="水壶"/><span className="water-stream"/></div>}
    {['help','wash'].includes(beat.id)&&<img className="wash-bowl" src="/story-art/painted-v1/props/bowl.png" alt="接水的盆"/>}
    {['dry','for-you','thanks'].includes(beat.id)&&<img className="offered-apple" src="/story-art/painted-v1/props/apple.png" alt="留给你的苹果"/>}
    {state.phase==='invitation'&&<button className={`scene-invitation target-${invitation?.target}`} onClick={()=>dispatch({type:'participate',token:state.token})}>{invitation?.target==='watering-can'?'帮忙倒一点水':'帮忙擦干苹果'}<small>也可以看朋友来做</small></button>}
    {reacting&&<span className="action-response" role="status">{beat.id==='help'?'水慢慢倒进盆里……':'苹果擦干净啦。'}</span>}
    {state.phase==='paused'&&<div className="pause-curtain"><p>故事在这里等你</p><button onClick={()=>dispatch({type:'resume'})}>继续</button></div>}
   </div>
   {assetFailed?<p role="alert">场景素材未能加载，故事已暂停。请检查网络后重新打开预览。</p>:<div className="adventure-caption"><p>{beat.zh}</p>{beat.en&&<p lang="en">{beat.en}</p>}</div>}
   {state.phase==='completed'&&<section className="adventure-ending"><h2>今天的野餐真好。</h2><p>故事到这里就结束啦，可以安心休息。</p><button className="main-action" onClick={leave}>回到故事封面</button><p className="preview-result">流程记录：{state.completed.length} 个段落 · {state.participated.length} 次主动参与。此预览不结算奖励。</p></section>}
  </main>}
 </div>;
}
