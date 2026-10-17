import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Story, StoryPage, StoryLine } from '../data/stories';
import { STORY_SCENES, type SceneItem } from '../data/storyScenes';
import { artUrl } from '../data/pokemon';
import { Icon } from '../icons';
import { PokeImg } from './PokeImg';
import './story-stage.css';

const places:Record<Story['scene'],string>={orchard:'苹果树下',playground:'小小游乐场',beach:'柔软的沙滩',meadow:'花儿小路',garden:'朋友的小花园'};
function Prop({item,castle,pot}:{item:SceneItem;castle?:string;pot?:string}){
 const asset=item.kind==='castle'?`castle-${castle??'tall'}`:item.kind==='pot'?`pot-${pot??'upright'}`:item.kind;
 return <img className="theatre-painted-prop" src={`/story-art/painted-v1/props/${asset}.png`} alt="" draggable={false}/>;
}

/** Generated scenery and transparent props, composed with existing character art. */
export function StoryStage({story,page,cover=false,onWord}:{story:Story;page:StoryPage;cover?:boolean;onWord?:(line:StoryLine)=>void}){
 const index=story.pages.indexOf(page);
 const scene=STORY_SCENES[story.id]?.[index];
 const [replay,setReplay]=useState(0);
 const [visible,setVisible]=useState(true);
 const [active,setActive]=useState(document.visibilityState!=='hidden');
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const element=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(media.matches);media.addEventListener('change',update);
  return()=>media.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  const update=()=>setActive(document.visibilityState!=='hidden');
  document.addEventListener('visibilitychange',update);
  return()=>document.removeEventListener('visibilitychange',update);
 },[]);
 useEffect(()=>{
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0});
  if(element.current)observer.observe(element.current);
  return()=>observer.disconnect();
 },[]);
 if(!scene)return null;
 const wordItem=page.pictureWord&&scene.items.find(i=>i.kind===page.pictureWord!.kind);
 const hasMotion=scene.items.some(i=>i.motion&&i.motion!=='none')||scene.actors.some(a=>a.motion&&a.motion!=='none');
 const background=story.scene==='garden'?(story.id==='tell-truth'?'garden-path':'garden-flowers'):story.scene;
 return <div ref={element} className={`story-stage story-theatre scene-${story.scene} mood-${scene.mood??'day'} ${cover?'cover-scene':''} ${visible&&active?'':'scene-offscreen'}`} data-story={story.id} data-page={index+1}>
  <div key={`${index}-${replay}`} className="theatre-picture" role="img" aria-label={scene.description}>
   <div className="theatre-backdrop" aria-hidden="true">
    <img className="theatre-painted-background" src={`/story-art/painted-v1/backgrounds/${background}.png`} alt="" draggable={false}/>
   </div>
   {scene.actors.map((actor,i)=><div key={i} className="theatre-actor" aria-hidden="true" style={{left:`${actor.x}%`,bottom:`${actor.y}%`,width:`${actor.size}%`,'--from-x':`${((actor.fromX??actor.x)-actor.x)/actor.size*100}%`,'--lean':`${actor.lean??0}deg`} as CSSProperties}>
    <span className="actor-shadow"/>
    <div className={`theatre-actor-art move-${actor.motion??'none'}`}><PokeImg src={artUrl(story.cast[i])} alt=""/></div>
   </div>)}
   {scene.items.map((item,i)=><div key={i} className={`theatre-item item-${item.kind}`} aria-hidden="true" style={{left:`${item.x}%`,bottom:`${item.y}%`,width:`${item.size}%`,'--from-x':`${((item.fromX??item.x)-item.x)/item.size*100}%`,'--prop-turn':`${item.rotate??0}deg`} as CSSProperties}><div className={`theatre-item-art move-${item.motion??'none'}`}><Prop item={item} castle={scene.castle} pot={scene.pot}/></div></div>)}
  </div>
  {!cover&&onWord&&wordItem&&page.pictureWord&&<button className="theatre-word" style={{"--word-anchor-x":`${Math.min(84,Math.max(16,wordItem.x))}%`,bottom:`${Math.min(70,Math.max(18,wordItem.y+wordItem.size))}%`} as React.CSSProperties} aria-label={`听听 ${page.pictureWord.en}`} onClick={()=>onWord(page.pictureWord!)}><Icon name="speaker" size={24}/><span>{page.pictureWord.en}</span></button>}
  {!cover&&<span className="theatre-place">{places[story.scene]}</span>}
  {!cover&&hasMotion&&!reduced&&<button className="theatre-replay" onClick={()=>setReplay(n=>n+1)} aria-label="再看这一页的动作"><Icon name="refresh" size={18}/>再看动作</button>}
 </div>;
}
