import type {DecorPreview} from '../lib/decorPreview';
import {CompanionFinder} from './CompanionFinder';
import {togetherTurn} from '../lib/togetherTurn';
import {TrainerAvatar} from './TrainerAvatar';
import type {UpgradeId} from '../lib/islandProgress';
import { FeatureGuide } from './FeatureGuide';
import { useGame } from '../store';
import { IslandRewards } from './IslandRewards';
import { useRef,useState } from 'react';
import { Icon } from '../icons';
import { PokeImg } from './PokeImg';
import { artUrl,getPokemon } from '../data/pokemon';
import { type TogetherKind } from '../lib/islandLiving';
import type { SaveData } from '../types';
import type { useTogether } from '../lib/useTogether';
import './island-living.css';
export function IslandLivingPanel({save,together,initialId,initialTab,initialUpgrade,onPreview,onClose,onPicnic,onBegin,onStory,onNotebook,onHear}:{save:SaveData;together:ReturnType<typeof useTogether>;initialId?:number;initialTab?:"play"|"build";initialUpgrade?:UpgradeId;onPreview:(p:DecorPreview|null)=>void;onClose:()=>void;onPicnic:(id?:number)=>void;onBegin:(kind:TogetherKind,ids:number[],coast:boolean)=>void;onStory:(id:string)=>void;onNotebook:()=>void;onHear:(word:string)=>void}){
 const tab=initialTab??'play';
 const [selection,setSelected]=useState<number[]>(initialId?[initialId]:save.captures.slice(0,1).map(c=>c.id)),[coast,setCoast]=useState(false);
 const validSelection=selection.filter(id=>save.captures.some(c=>c.id===id));
 const selected=validSelection.length?validSelection:save.captures.slice(0,1).map(c=>c.id);
 const [adding,setAdding]=useState(false),[finding,setFinding]=useState(false);
 const partnerTrigger=useRef<HTMLButtonElement|null>(null);
 const closeFinder=()=>{setFinding(false);setAdding(false);requestAnimationFrame(()=>partnerTrigger.current?.focus());};
 const choose=(id:number)=>{setSelected(()=>adding&&selected[0]&&selected[0]!==id?[selected[0],id]:[id]);closeFinder();};
 const session=together.session;
 const partners=session?.partners??[];
 const actor=togetherTurn(partners,together.turn);
 const childReady=session?.kind==='ball'&&together.phase==='ready'&&(actor.child||session.help);
 return <section className={`picnic-panel living-panel ${tab==='build'?'island-dressing':session?'living-session':''} ${!session&&tab==='play'?'living-choose':''}`} aria-label={tab==='play'?'一起玩':'装扮小岛'}>
  <header className="panel-toolbar"><Icon name={tab==='play'?'heart':'island'} size={28}/><div><h2>{tab==='play'?(session?.help?'帮忙收小球':session?.kind==='ball'?'轮流玩球':session?'一起歇一歇':'一起玩'):'装扮小岛'}</h2></div><FeatureGuide compact id="play" enabled={tab==='play'&&!session&&save.captures.length>0}/><button aria-label="关闭面板" onClick={onClose}><Icon name="close" size={24}/></button></header>
  <div className="living-scroll">


  {session&&tab==='play'?<>
   <div className="living-turn-lane" aria-label="一起玩的伙伴">
    {[0,1].map(index=><div key={index} className={`living-player ${session.kind==='ball'&&(session.help?index===0:actor.index===index)&&!['arriving','done','timeout'].includes(together.phase)?'is-turn':''}`}>
     {partners[index]?<PokeImg src={artUrl(partners[index])} alt=""/>:<TrainerAvatar avatar={save.trainer?.avatar} photo={save.trainer?.avatarPhoto} size={48}/>}
     <strong>{partners[index]?getPokemon(partners[index]).nameZh:'你'}</strong>
    </div>)}
    <span className={`living-turn-ball ${actor.index===1?'toward-child':''}`} aria-hidden="true"><Icon name={session.help?'hand':session.kind==='ball'?'ball':'rest'} size={32}/></span>
   </div>
   <p className="living-turn-status" role="status">{together.phase==='arriving'?'伙伴正在过来':together.phase==='timeout'?'路有点挤，可以再试一次':together.phase==='done'?(session.help?'收好啦，谢谢你！':session.kind==='rest'?'谢谢你陪我歇一歇':'谢谢你陪我玩！'):together.phase==='acting'?session.kind==='rest'?'一起安静歇一歇':session.help?'小球进篮子啦':'小球滚过去啦':session.help?'帮我把小球收好吧':session.kind==='rest'?'我想歇一歇':actor.child?'轮到你啦！':`轮到${getPokemon(actor.pokemonId!).nameZh}啦`}</p>
   {childReady&&<div className="living-child-actions"><button className="farm-primary living-main-action" onClick={together.act}><Icon name={session.help?"hand":"ball"} size={48}/>{session.help?"收好小球":"滚给伙伴"}</button><button className="living-rehear" aria-label="再听一次伙伴的话" onClick={()=>void together.hear()}><Icon name="speaker" size={26}/></button></div>}
   {together.phase==='timeout'&&<button className="farm-primary living-main-action" onClick={together.retry}><Icon name="refresh" size={30}/>再试一次</button>}
   {session.kind==='rest'&&together.phase==='acting'&&<div className="living-rest-scene" aria-label="一起看看树叶，安静休息"><Icon name="tree" size={46}/><Icon name="rest" size={38}/><Icon name="leaf" size={32}/></div>}
   {session.help&&together.phase!=='arriving'&&<div className={`living-tidy-picture ${together.phase==='done'?'is-tidy':''}`} aria-label={together.phase==='done'?'小球已收好':'小球和收纳篮'}><Icon name="ball" size={36}/><span aria-hidden="true">→</span><Icon name="decor-basket" size={40}/></div>}
   {together.phase==='done'&&<>
    {session.kind==='ball'&&!session.help&&<div className="living-options living-next-choices">{together.canHelp&&<button onClick={together.askHelp}><Icon name="hand" size={30}/>帮忙收球</button>}<button onClick={()=>onBegin('rest',partners,session.context==='coast')}><Icon name="rest" size={30}/>一起歇歇</button></div>}
    <button className="farm-primary living-main-action" onClick={onClose}><Icon name="island" size={30}/>回小岛玩</button>
    {(session.help||session.kind==='rest')&&<button className="living-change-partner" onClick={()=>void together.hear()}><Icon name="speaker" size={24}/>听听伙伴的话</button>}
    {!session.help&&<details className="living-place"><summary><Icon name="book" size={23}/>留下的小回忆</summary><div className="living-options"><button onClick={onNotebook}>看回忆</button><button onClick={()=>onStory(session.kind==='ball'?'come-play':'sit-with-me')}>读个故事</button></div></details>}
   </>}
   {together.phase!=='done'&&<div className="living-options living-session-exits">
    <button onClick={()=>onBegin(session.kind==='ball'?'rest':'ball',partners,session.context==='coast')}><Icon name={session.kind==='ball'?'rest':'ball'} size={26}/>{session.kind==='ball'?'歇一歇':'去玩球'}</button>
    <button onClick={()=>{together.cancel();onClose();onHear('No, thank you.');}}><Icon name="island" size={26}/>先离开</button>
   </div>}
  </>:tab==='play'?<>
   {!save.captures.length&&<h3>先认识一个新伙伴吧</h3>}
   {!!selected.length&&<div className="living-selection" aria-label="当前伙伴">{selected.map(id=><span key={id}><PokeImg src={artUrl(id)} alt=""/><strong>{getPokemon(id).nameZh}</strong></span>)}</div>}
   {finding&&<div className="living-finder"><CompanionFinder purpose="choose" ids={save.captures.map(c=>c.id).filter(id=>!adding||id!==selected[0])} selected={adding?null:selected[0]??null} onSelect={choose} onClose={closeFinder}/></div>}
   {!save.captures.length&&<button className="farm-primary living-main-action" onClick={()=>useGame.getState().go({name:'catch'})}><Icon name="grass" size={30}/>认识新伙伴</button>}
   {!!save.captures.length&&<>
   <div className="living-play-choices" aria-label="选一个一起玩的活动">
    <button disabled={!selected.length} onClick={()=>onBegin('ball',selected,coast)}><Icon name="ball" size={58}/><strong>玩球</strong></button>
    <button disabled={!selected.length} onClick={()=>onBegin('rest',selected,coast)}><Icon name="rest" size={58}/><strong>歇一歇</strong></button>
    <button onClick={()=>onPicnic(selected[0])}><Icon name="apple" size={58}/><strong>喂{getPokemon(selected[0]).nameZh}</strong></button>
   </div>
   <div className="living-partner-tools">
    <button aria-expanded={finding&&!adding} onClick={e=>{partnerTrigger.current=e.currentTarget;setAdding(false);setFinding(true);}}><Icon name="search" size={26}/>换个伙伴</button>
    {save.captures.length>1&&<button aria-expanded={selected.length===2?undefined:finding&&adding} onClick={e=>{partnerTrigger.current=e.currentTarget;if(selected.length===2){setSelected([selected[0]]);setAdding(false);setFinding(false);}else{setAdding(true);setFinding(true);}}}><Icon name={selected.length===2?'back':'heart'} size={26}/>{selected.length===2?'先和一位玩':'再叫一个朋友'}</button>}
   </div>
   <details className="living-place"><summary><Icon name="island" size={23}/>换个地方玩</summary><div className="living-options"><button aria-pressed={!coast} onClick={()=>setCoast(false)}><Icon name="tree" size={30}/>小岛</button><button aria-pressed={coast} onClick={()=>setCoast(true)}><Icon name="waves" size={30}/>海边</button></div></details>
   </>}

  </>:<IslandRewards onPreview={onPreview} initialUpgrade={initialUpgrade} onSeeIsland={onClose}/>}
  </div>
 </section>;
}
