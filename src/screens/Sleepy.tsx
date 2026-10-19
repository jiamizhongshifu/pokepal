import {trackInteraction} from '../lib/interaction';
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ParentButton } from "../components/TopBar";
import { useGame } from "../store";
import { getPokemon, spriteUrl } from "../data/pokemon";
import { sayCancellableWhile, unlockAudio, type Part } from "../lib/speech";
import { modalIsOpen } from '../lib/modalLayer';
import { restPeriod, restingFriends } from '../lib/rest';
import { Icon } from "../icons";
import { PokeImg } from "../components/PokeImg";
import './sleepy.css';

const localClock=()=>new Date();
/** A gentle, finite ending. Every owned companion remains visible, including the newest. */
export function Sleepy({clock=localClock}:{clock?:()=>Date}) {
 const trackedStart=useRef(false);
 useEffect(()=>{if(!trackedStart.current){trackedStart.current=true;trackInteraction('rest_shown');}},[]);
  const captures=useGame(s=>s.save.captures),go=useGame(s=>s.go);
  const [period,setPeriod]=useState(()=>restPeriod(clock()));
  const [resting,setResting]=useState(false),[speaking,setSpeaking]=useState(false),[unavailable,setUnavailable]=useState(false);
  const [more,setMore]=useState(false);
  const gallery=useRef<HTMLUListElement>(null),live=useRef(true);
  const voice=useRef<ReturnType<typeof sayCancellableWhile>|null>(null),sequence=useRef(0);
  const ids=restingFriends(captures),night=period==='night';
  const cancel=()=>{sequence.current++;voice.current?.cancel();voice.current=null;};
  const hear=async(manual=false,closing=false)=>{
    if(manual)unlockAudio();
    cancel();setSpeaking(true);setUnavailable(false);const ticket=sequence.current;
    const parts:Part[]=closing?(night?[["en","Good night!"],["zh","晚安，明天见。"]]:[["zh","好呀，放心去休息吧。小伙伴们也会好好休息。"]]):night?[
      ['zh','宝可梦们都困了，我们一起跟它们说晚安吧。'],400,
      ['en','Good night!'],400,['zh','晚安，小伙伴们。放下屏幕，让眼睛和身体一起休息吧。'],400,['en','See you tomorrow!']
    ]:[
      ['zh','宝可梦要休息咯。你也一起休息一下吧！放下屏幕，看看远处，让小眼睛歇一歇。'],400,
      ['en','Time to rest.'],...(ids.length?([400,['zh','所有伙伴都在这里，新朋友也来啦。']] as Part[]):[])
    ];
    const run=sayCancellableWhile(()=>live.current&&!document.hidden&&!modalIsOpen(),...parts);voice.current=run;
    const ok=await run.done;
    if(!live.current||ticket!==sequence.current)return;
    setSpeaking(false);setUnavailable(!ok&&!document.hidden&&!modalIsOpen());
  };
  useEffect(()=>{
    live.current=true;
    setPeriod(restPeriod(clock()));
    const timer=setInterval(()=>setPeriod(restPeriod(clock())),60000);
    const hide=()=>{if(document.hidden){cancel();setSpeaking(false);}};
    document.addEventListener('visibilitychange',hide);
    return()=>{live.current=false;cancel();clearInterval(timer);document.removeEventListener('visibilitychange',hide);};
  },[clock]);
  useEffect(()=>{
    setResting(false);const timer=setTimeout(()=>void hear(),500);
    return()=>{clearTimeout(timer);cancel();};
  },[period]);
  const updateMore=()=>{const el=gallery.current;if(el)setMore(el.scrollHeight-el.clientHeight-el.scrollTop>8);};
  useEffect(()=>{
    const el=gallery.current;if(!el)return;
    const observer=new ResizeObserver(updateMore);observer.observe(el);updateMore();
    return()=>observer.disconnect();
  },[captures]);
  return <div className={`screen sleepy rest-${period}`}>
    <div className="sleepy-top"><ParentButton onOpen={()=>{cancel();go({name:'parent'});}}/></div>
    <header className="rest-heading"><Icon name={night?'moon':'sun'} size={68}/><div>
      <h1 className="sleepy-text">{night?'宝可梦们都困了':'宝可梦要休息咯'}</h1>
      <p>{night?'一起说晚安，让眼睛和身体都休息吧。':'你也歇一歇，让小眼睛休息一下吧。'}</p>
    </div></header>
    <section className="rest-family" aria-label="所有已拥有的宝可梦">
      <div className="rest-family-heading"><Icon name="heart" size={24}/><span>伙伴都在这里 <b>{ids.length}</b></span></div>
      {ids.length>0?<ul className={`sleepers ${ids.length<=12?"few-friends":""}`} style={{"--rest-cols":ids.length<=6?Math.max(1,ids.length):ids.length<=12?Math.ceil(ids.length/2):6} as CSSProperties} ref={gallery} onScroll={updateMore} tabIndex={0} aria-label={`全部 ${ids.length} 位伙伴，可上下滑动查看`}>
        {ids.map((id,i)=><li key={id} className="sleeper"><Icon name="zz" size={22}/><PokeImg src={spriteUrl(id)} alt={getPokemon(id).nameZh} loading={i<12?'eager':'lazy'}/><span>{getPokemon(id).nameZh}</span></li>)}
      </ul>:<p className="rest-empty">小岛也在安静休息，伙伴下次再见。</p>}
      {more&&<button className="rest-more" onClick={()=>gallery.current?.scrollBy({top:Math.max(120,gallery.current.clientHeight*.75),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}><Icon name="swipe" size={24}/>下面还有伙伴 <span aria-hidden="true">↓</span></button>}
    </section>
    <div className="rest-reminder" aria-label={night?'放下屏幕，好好休息':'放下屏幕，看看远处，歇一歇'}>
      <span><Icon name="hand" size={32}/>放下屏幕</span><span aria-hidden="true">›</span><span><Icon name={night?'moon':'eye'} size={32}/>{night?'好好休息':'看看远处'}</span>
    </div>
    <div className="rest-actions">
      <button className="btn-big rest-ready" disabled={resting} onClick={()=>{cancel();setSpeaking(false);setUnavailable(false);setResting(true);void hear(true,true);}}><Icon name={resting?'check':night?'moon':'heart'} size={34}/>{resting?(night?'晚安，明天见':'好呀，放心去休息吧'):night?'说晚安':'我也去休息'}</button>
      <button className="rest-hear" aria-label={speaking?'停止休息提醒':'再听一次休息提醒'} onClick={()=>{if(speaking){cancel();setSpeaking(false);}else void hear(true);}}><Icon name={speaking?'ear':'speaker'} size={26}/>{speaking?'正在说 · 停一下':'再听一次'}</button>
    </div>
    {unavailable&&<p className="rest-voice-status" role="status">声音暂时没来，看看小图，也可以点喇叭再听。</p>}
  </div>;
}
