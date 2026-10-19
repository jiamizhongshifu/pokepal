import {CompanionFinder} from './CompanionFinder';
import { FeatureGuide } from './FeatureGuide';
import { useState } from 'react';
import { Icon } from '../icons';
import { artUrl, getPokemon } from '../data/pokemon';
import type { Capture } from '../types';
import type { PicnicSession } from '../lib/picnic';
import { BERRIES, BERRY_KINDS, type FarmState, type BerryKind } from '../lib/farm';
import { BerryBadge } from './FarmPanel';
import { PokeImg } from './PokeImg';
import './picnic.css';

export function PicnicPanel({captures,farm,session,initialId,ready,unreachable,message,onBegin,onServe,onClose,onFarm,onSnack,onFind,onStory,onNotebook,onRetry,onHear}:{
 captures:Capture[];farm:FarmState;session?:PicnicSession;initialId?:number;ready:boolean;unreachable:boolean;message:string;
 onBegin:(id:number,berry:BerryKind)=>void;onServe:()=>void;onSnack:(id:number)=>void;onFind:()=>void;onClose:()=>void;onFarm:()=>void;onStory:()=>void;onNotebook:()=>void;onRetry:()=>void;onHear:()=>void;
}){
 const [selection,setChosen]=useState<number|undefined>(initialId??captures[0]?.id),[finding,setFinding]=useState(false);
 const chosen=captures.some(c=>c.id===selection)?selection:captures[0]?.id;
 const available=BERRY_KINDS.filter(k=>farm.basket[k]>0);
 const p=session?getPokemon(session.pokemonId):null;

 return <section className="picnic-panel" aria-label="伙伴野餐">
  <header className="panel-toolbar"><Icon name="bowl" size={30}/><div><h2>伙伴野餐</h2><p>把自己种的树果，分给好朋友</p></div><FeatureGuide id="picnic" autoVoice={false} enabled={!session&&!!available.length&&!!captures.length}/><button aria-label="结束野餐" onClick={onClose}><Icon name="close" size={25}/></button></header>
  {!session ? <>
   {chosen!==undefined&&<div className="picnic-selected"><PokeImg src={artUrl(chosen)} alt=""/><strong>和{getPokemon(chosen).nameZh}分享</strong><button aria-label="换个野餐伙伴" onClick={()=>setFinding(v=>!v)}><Icon name="refresh" size={26}/><span>换伙伴</span></button></div>}
   {finding&&<div className="picnic-finder"><CompanionFinder purpose="choose" ids={captures.map(c=>c.id)} selected={chosen??null} onSelect={id=>{setChosen(id);setFinding(false);}} onClose={()=>setFinding(false)}/></div>}
   {!captures.length?<div className="picnic-empty"><Icon name="grass" size={42}/><strong>先认识一个小伙伴吧</strong><button className="farm-primary" onClick={onFind}>去找伙伴</button></div>:!available.length?<div className="picnic-empty"><Icon name="grass" size={42}/><strong>果篮还空着，点心也很好吃</strong><p>可以先分享点心，再去种树果。</p><button className="farm-primary" onClick={()=>onSnack(chosen??captures[0].id)}><Icon name="apple" size={30}/>给{getPokemon(chosen??captures[0].id).nameZh}点心</button><button className="farm-share" onClick={onFarm}><Icon name="grass" size={24}/>去种树果</button></div>:<>
    <h3>分享一颗树果</h3><div className="picnic-berries">{available.map(k=><button key={k} disabled={chosen===undefined} onClick={()=>chosen!==undefined&&onBegin(chosen,k)}><BerryBadge kind={k}/><span>{BERRIES[k].name}<small>果篮里有 {farm.basket[k]} 颗</small></span></button>)}</div>
   </>}
  </>:<>
   <div className="picnic-guest"><PokeImg src={artUrl(session.pokemonId)} alt=""/><div><strong>{p!.nameZh}</strong><p>{session.servedAt?'吃到你种的树果啦！':unreachable?'这条路有点挤，换个机会再来吧':ready?'伙伴坐好啦，正在分享树果':'正在过来，树果还在你的篮子里'}</p></div></div>
   {session.servedAt?<><div className="picnic-success" role="status"><Icon name="heart" size={27}/>谢谢你，我们一起分享啦！</div><div className="picnic-links"><button onClick={onHear}><Icon name="speaker" size={22}/>听听谢谢</button><button onClick={onNotebook}><Icon name="picture" size={26}/>看回忆</button><button onClick={onStory}><Icon name="book" size={26}/>一起读故事</button></div><button className="farm-primary" onClick={onClose}><Icon name="island" size={30}/>回小岛玩</button></>:<><button className="farm-primary" disabled={!ready||unreachable||!farm.basket[session.berry]} onClick={onServe}><BerryBadge kind={session.berry}/>{ready?'分享一颗树果':'伙伴到位后自动分享'}</button>{!farm.basket[session.berry]&&<p>这颗树果已经用完啦，去果园准备一点吧。</p>}{unreachable&&<button className="farm-share" onClick={onRetry}><Icon name="refresh" size={28}/>再邀请一次</button>}<small className="picnic-note">伙伴到位后使用 1 颗树果；到位前可点右上角关闭取消。</small></>}
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
