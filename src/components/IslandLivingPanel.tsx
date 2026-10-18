import type {DecorPreview} from '../lib/decorPreview';
import {CompanionFinder} from './CompanionFinder';
import {togetherTurn,togetherStatus,togetherRounds,togetherChildTurn,TOGETHER_LABELS,TOGETHER_ICONS} from '../lib/togetherTurn';
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
export function IslandLivingPanel({save,together,initialId,initialTab,initialUpgrade,onPreview,onClose,onPicnic,onBegin}:{save:SaveData;together:ReturnType<typeof useTogether>;initialId?:number;initialTab?:"play"|"build";initialUpgrade?:UpgradeId;onPreview:(p:DecorPreview|null)=>void;onClose:()=>void;onPicnic:(id?:number)=>void;onBegin:(kind:TogetherKind,ids:number[],coast:boolean)=>void}){
 const tab=initialTab??'play';
 const [selection,setSelected]=useState<number[]>(initialId?[initialId]:save.captures.slice(0,1).map(c=>c.id)),[coast,setCoast]=useState(false);
 const validSelection=selection.filter(id=>save.captures.some(c=>c.id===id));
 const selected=validSelection.length?validSelection:save.captures.slice(0,1).map(c=>c.id);
 const [finding,setFinding]=useState(false);
 const partnerTrigger=useRef<HTMLButtonElement|null>(null);
 const closeFinder=()=>{setFinding(false);requestAnimationFrame(()=>partnerTrigger.current?.focus());};
 const choose=(id:number)=>{setSelected([id]);closeFinder();};
 const session=together.session;
 const partners=session?.partners??[];
 const actor=togetherTurn(partners,together.turn);
 const childReady=!!session&&together.phase==='ready'&&togetherChildTurn(session.kind,partners,together.turn,!!session.help);
 const rounds=session?togetherRounds(session.kind):0;
 if(session&&tab==='play')return <section className="camp-play-hud" aria-label="一起玩">
  <header className="camp-play-header"><button aria-label="结束一起玩，回小岛" onClick={onClose}><Icon name="back" size={28}/><span>小岛</span></button><PokeImg src={artUrl(partners[0])} alt=""/><strong>{getPokemon(partners[0]).nameZh}<small>{TOGETHER_LABELS[session.kind]}</small></strong><button aria-label="再听一次伙伴的话" disabled={!['ready','done'].includes(together.phase)} onClick={()=>void together.hear()}><Icon name="speaker" size={28}/></button></header>
  <div className={`camp-play-status phase-${together.phase}`} role="status"><Icon name={together.phase==='done'?'heart':together.phase==='timeout'?'sign':session.help?'hand':TOGETHER_ICONS[session.kind]} size={28}/><span>{togetherStatus(session.kind,together.phase,actor.child,!!session.help,partners.length===2)}</span></div>
  {session.kind!=='rest'&&!session.help&&<div className="camp-play-rounds" aria-label={`已经完成 ${together.phase==='done'?rounds:together.turn} 轮，共 ${rounds} 轮`}>
   {Array.from({length:rounds},(_,i)=><span key={i} className={together.phase==='done'||i<together.turn?'is-done':i===together.turn?'is-current':''} aria-hidden="true"><Icon name={together.phase==='done'||i<together.turn?'check':TOGETHER_ICONS[session.kind]} size={19}/></span>)}
  </div>}
  <footer className="camp-play-tools">
   {childReady&&<button className="camp-play-primary" onClick={together.act}><Icon name={session.help?'hand':TOGETHER_ICONS[session.kind]} size={38}/>{session.help?'收好小球':session.kind==='bubbles'?'戳泡泡':session.kind==='jump'?'跳一跳':'滚给伙伴'}</button>}
   {together.phase==='timeout'&&<button onClick={together.retry}><Icon name="refresh" size={30}/>再试一次</button>}
   {together.phase==='done'&&<><button className="camp-play-primary" onClick={()=>onBegin(session.kind,partners,session.context==='coast')}><Icon name="refresh" size={34}/>再玩一次</button><button onClick={together.cancel}><Icon name="picture" size={30}/>换个玩法</button>{together.canHelp&&<button onClick={together.askHelp}><Icon name="hand" size={30}/>收好小球</button>}</>}
  </footer>
 </section>;
 return <section className={`picnic-panel living-panel ${tab==='build'?'island-dressing':session?'living-session':''} ${!session&&tab==='play'?'living-choose':''}`} aria-label={tab==='play'?'一起玩':'装扮小岛'}>
  <header className="panel-toolbar"><Icon name={tab==='play'?'heart':'island'} size={28}/><div><h2>{tab==='play'?(session?.help?'帮忙收小球':session?.kind==='ball'?'轮流玩球':session?'一起歇一歇':'一起玩'):'装扮小岛'}</h2></div><FeatureGuide compact id="play" enabled={tab==='play'&&!session&&save.captures.length>0}/><button aria-label="关闭面板" onClick={onClose}><Icon name="close" size={24}/></button></header>
  <div className="living-scroll">


  {tab==='play'?<>
   {!save.captures.length&&<h3>先认识一个新伙伴吧</h3>}
   {!!selected.length&&<div className="living-selection" aria-label="当前伙伴">{selected.map(id=><span key={id}><PokeImg src={artUrl(id)} alt=""/><strong>{getPokemon(id).nameZh}</strong></span>)}</div>}
   {finding&&<div className="living-finder"><CompanionFinder purpose="choose" ids={save.captures.map(c=>c.id)} selected={selected[0]??null} onSelect={choose} onClose={closeFinder}/></div>}
   {!save.captures.length&&<button className="farm-primary living-main-action" onClick={()=>useGame.getState().go({name:'catch'})}><Icon name="grass" size={30}/>认识新伙伴</button>}
   {!!save.captures.length&&<>
   <div className="living-play-choices" aria-label="选一个一起玩的活动">
    <button disabled={!selected.length} onClick={()=>onBegin('ball',selected,coast)}><Icon name="ball" size={58}/><strong>玩球</strong></button>
    <button onClick={()=>onBegin('bubbles',selected,coast)}><Icon name="bubbles" size={58}/><strong>戳泡泡</strong></button>
    <button onClick={()=>onBegin('jump',selected,coast)}><span className="living-jump-picture" aria-hidden="true"><PokeImg src={artUrl(selected[0])} alt=""/><span>↑</span></span><strong>一起跳</strong></button>
   </div>
   <div className="living-quiet-choices">
    <button onClick={()=>onBegin('rest',selected,coast)}><Icon name="rest" size={28}/>歇一歇</button>
    <button onClick={()=>onPicnic(selected[0])}><Icon name="apple" size={28}/>喂点心</button>
   </div>
   <div className="living-partner-tools">
    <button aria-expanded={finding} onClick={e=>{partnerTrigger.current=e.currentTarget;setFinding(true);}}><Icon name="search" size={26}/>换个伙伴</button>

   </div>
   <details className="living-place"><summary><Icon name="island" size={23}/>换个地方玩</summary><div className="living-options"><button aria-pressed={!coast} onClick={()=>setCoast(false)}><Icon name="tree" size={30}/>小岛</button><button aria-pressed={coast} onClick={()=>setCoast(true)}><Icon name="waves" size={30}/>海边</button></div></details>
   </>}

  </>:<IslandRewards onPreview={onPreview} initialUpgrade={initialUpgrade} onSeeIsland={onClose}/>}
  </div>
 </section>;
}
