import {CompanionFinder} from './CompanionFinder';
import { FeatureGuide } from './FeatureGuide';
import { useState } from 'react';
import { Icon } from '../icons';
import { creatureArt, getCreature } from '../data/creatures';
import type { Capture } from '../types';
import type { PicnicSession } from '../lib/picnic';
import { CROPS, CROP_KINDS, type FarmState, type CropKind } from '../lib/farm';
import { CropBadge } from './FarmPanel';
import { CreatureImg } from './CreatureImg';
import './picnic.css';
import { IslandAskRound } from './IslandAskRound';
import type { IslandAsk } from '../lib/islandAsk';

export function PicnicPanel({captures,farm,session,initialId,ready,unreachable,message,ask,learnedFruit,onBegin,onServe,onClose,onFarm,onSnack,onFind,onStory,onNotebook,onRetry,onHear}:{
 captures:Capture[];farm:FarmState;session?:PicnicSession;initialId?:number;ready:boolean;unreachable:boolean;message:string;
 /** The friend's request once seated; the fruit a new picnic starts with (a learned fruit in the basket). */
 ask?:IslandAsk;learnedFruit?:CropKind;
 onBegin:(id:number,berry:CropKind)=>void;onServe:()=>void;onSnack:(id:number)=>void;onFind:()=>void;onClose:()=>void;onFarm:()=>void;onStory:()=>void;onNotebook:()=>void;onRetry:()=>void;onHear:()=>void;
}){
 const [selection,setChosen]=useState<number|undefined>(initialId??captures[0]?.id),[finding,setFinding]=useState(false);
 const chosen=captures.some(c=>c.id===selection)?selection:captures[0]?.id;
 const available=CROP_KINDS.filter(k=>farm.basket[k]>0);
 const p=session?getCreature(session.pokemonId):null;

 return <section className="picnic-panel" aria-label="伙伴野餐">
  <header className="panel-toolbar"><Icon name="bowl" size={30}/><div><h2>伙伴野餐</h2><p>听听好朋友想吃什么，再分给它</p></div><FeatureGuide id="picnic" autoVoice={false} enabled={!session&&!!available.length&&!!captures.length}/><button aria-label="结束野餐" onClick={onClose}><Icon name="close" size={25}/></button></header>
  {!session ? <>
   {chosen!==undefined&&<div className="picnic-selected"><CreatureImg src={creatureArt(chosen)} alt=""/><strong>和{getCreature(chosen).nameZh}分享</strong><button aria-label="换个野餐伙伴" onClick={()=>setFinding(v=>!v)}><Icon name="refresh" size={26}/><span>换伙伴</span></button></div>}
   {finding&&<div className="picnic-finder"><CompanionFinder purpose="choose" ids={captures.map(c=>c.id)} selected={chosen??null} onSelect={id=>{setChosen(id);setFinding(false);}} onClose={()=>setFinding(false)}/></div>}
   {!captures.length?<div className="picnic-empty"><Icon name="grass" size={42}/><strong>先认识一个小伙伴吧</strong><button className="farm-primary" onClick={onFind}>去找伙伴</button></div>:!available.length?<div className="picnic-empty"><Icon name="grass" size={42}/><strong>果篮还空着，点心也很好吃</strong><p>可以先分享点心，再去种水果。</p><button className="farm-primary" onClick={()=>onSnack(chosen??captures[0].id)}><Icon name="apple" size={30}/>给{getCreature(chosen??captures[0].id).nameZh}点心</button><button className="farm-share" onClick={onFarm}><Icon name="grass" size={24}/>去种水果</button></div>:<>
    {learnedFruit?<button className="farm-primary picnic-start" disabled={chosen===undefined} onClick={()=>chosen!==undefined&&onBegin(chosen,learnedFruit)}><Icon name="bowl" size={30}/>请{getCreature(chosen??captures[0].id).nameZh}来野餐</button>:<>
    <h3>分享一份水果</h3><div className="picnic-berries">{available.map(k=><button key={k} disabled={chosen===undefined} onClick={()=>chosen!==undefined&&onBegin(chosen,k)}><CropBadge kind={k}/><span>{CROPS[k].name}<small>果篮里有 {farm.basket[k]} 份</small></span></button>)}</div></>}
   </>}
  </>:<>
   <div className="picnic-guest"><CreatureImg src={creatureArt(session.pokemonId)} alt=""/><div><strong>{p!.nameZh}</strong><p>{session.servedAt?'吃到你种的水果啦！':unreachable?'这条路有点挤，换个机会再来吧':ready?(ask?'伙伴坐好啦，听听它想吃什么':'伙伴坐好啦，正在分享水果'):'正在过来，水果还在你的篮子里'}</p></div></div>
   {!session.servedAt&&ready&&!unreachable&&ask&&farm.basket[session.berry]>0?<IslandAskRound ask={ask} station="picnic" onSolved={onServe} onClose={onClose}/>:session.servedAt?<><div className="picnic-success" role="status"><Icon name="heart" size={27}/>谢谢你，我们一起分享啦！</div><div className="picnic-links"><button onClick={onHear}><Icon name="speaker" size={22}/>听听谢谢</button><button onClick={onNotebook}><Icon name="picture" size={26}/>看回忆</button><button onClick={onStory}><Icon name="book" size={26}/>一起读故事</button></div><button className="farm-primary" onClick={onClose}><Icon name="island" size={30}/>回小岛玩</button></>:<><button className="farm-primary" disabled={!ready||unreachable||!farm.basket[session.berry]} onClick={onServe}><CropBadge kind={session.berry}/>{ready?'分享一份水果':'伙伴坐好后，听听它想吃什么'}</button>{!farm.basket[session.berry]&&<p>这颗水果已经用完啦，去果园准备一点吧。</p>}{unreachable&&<button className="farm-share" onClick={onRetry}><Icon name="refresh" size={28}/>再邀请一次</button>}<small className="picnic-note">伙伴到位后使用 1 颗水果；到位前可点右上角关闭取消。</small></>}
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
