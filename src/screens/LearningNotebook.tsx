import {RoundProgress} from '../components/RoundProgress';
import { FeatureGuide } from '../components/FeatureGuide';
import '../components/island-living.css';
import { ParticipationNote } from '../components/ParticipationNote';
import { artUrl,getPokemon } from '../data/pokemon';
import { BERRIES } from '../lib/farm';
import { PokeImg } from '../components/PokeImg';
import '../components/picnic.css';
import { useMemo,useState,useRef } from 'react';
import { useGame } from '../store';
import { learningEntry,reviewSituation,recommendedUnit } from '../data/curriculum';
import { reviewKeys,recommendedReviewKeys,reviewGroupSize } from '../lib/learningProgress';
import { LearningArt,hearEntry } from '../components/LearningItem';
import { LearningRound } from './LearningLesson';
import { TopBar } from '../components/TopBar';
import { Icon } from '../icons';
import '../learning-journey.css';

export function LearningNotebook({mode='all',returnTo}:{mode?:'all'|'saved'|'retry';returnTo?:'energy'|'tasks'|'parent'}){
 const s=useGame(v=>v.save),go=useGame(v=>v.go),toggle=useGame(v=>v.saveLearningWord);
 const [filter,setFilter]=useState(mode),[query,setQuery]=useState('');
 const [limit,setLimit]=useState(24),[searching,setSearching]=useState(false);
 const header=useRef<HTMLElement>(null);
 const records=s.learning?.records??{};
 const keys=Object.keys(records).filter(k=>learningEntry(k)).filter(k=>filter==='all'||(filter==='saved'?records[k].saved:(records[k].needsPractice||records[k].pendingAudio))).filter(k=>{const e=learningEntry(k)!;return `${e.en} ${e.zh}`.toLowerCase().includes(query.trim().toLowerCase());}).sort((a,b)=>records[b].lastSeen-records[a].lastSeen);
 const due=(filter==='retry'?reviewKeys(s,'retry'):recommendedReviewKeys(s)).filter(k=>keys.includes(k)).slice(0,reviewGroupSize(s));
 return <div className="screen learning-notebook"><TopBar title={filter==='retry'?'再试试':'发现手册'} onBack={()=>go({name:returnTo??'journey'})} focused help={<FeatureGuide compact id="notebook" autoVoice={false}/>}/><main className="journey-wrap">
  <header ref={header} className="notebook-header">
   <div className="notebook-toolbar"><nav className="notebook-tabs" aria-label="手册分类">{([['all','全部发现'],['saved','我的收藏']] as const).map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setLimit(24);}}><Icon name={id==='all'?'book':'heart'} size={30}/><span>{label}</span></button>)}</nav>
    <button className="notebook-search-toggle" aria-label={searching?'收起找词':'按名字找一个词'} aria-expanded={searching} onClick={()=>{setSearching(v=>!v);setQuery('');setLimit(24);}}><Icon name={searching?'close':'search'} size={26}/><span>{searching?'收起':'找词'}</span></button>
   </div>
   {searching&&<label className="notebook-search">找一个词<input autoFocus value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}} placeholder="中文或英文" type="search"/></label>}
   <p>{filter==='retry'?'上次需要帮助的词，陪你再找找。':'点图片听一听，点爱心收藏。'}</p>
  </header>
  {due.length>0&&<button className="notebook-review journey-primary" onClick={()=>go({name:'review',keys:due,returnTo})}><Icon name="refresh" size={27}/>陪我再找 {due.length} 个</button>}
  {!keys.length?<section className="learning-empty"><Icon name={filter==='retry'?'heart':'book'} size={70}/><h2>{query?'换个词找找看':filter==='retry'?'没有需要再试的小发现':filter==='saved'?'把喜欢的词放进来':'手册等着你的第一个发现'}</h2><p>{query?"可以试试中文，也可以看看已经发现的词。":filter==='saved'?"去全部发现，点一下词卡上的爱心。":filter==='retry'?"可以听听熟悉的词，也可以回小岛玩。":"和伙伴玩一站，听见的词就会来到这里。"}</p>{query||filter!=='all'?<button className="journey-primary" onClick={()=>{setQuery('');setFilter('all');setLimit(24);}}><Icon name="book" size={32}/>看看我的发现</button>:<button className="journey-primary" onClick={()=>useGame.getState().startUnit(recommendedUnit(s).id)}><Icon name="island" size={36}/>去小岛冒险</button>}</section>:<div className="notebook-entries">{keys.slice(0,limit).map(key=>{const e=learningEntry(key)!,r=records[key];return <article key={key} className="notebook-entry">
   <button className="notebook-listen-card" aria-label={`听${e.en}`} onClick={async()=>{if(await hearEntry(e))useGame.getState().noteWord(key,'heard');}}><span className="notebook-art"><LearningArt entry={e}/></span><span className="notebook-definition"><strong lang="en">{e.en}</strong><span>{e.zh}</span></span><Icon name="speaker" size={28}/></button>
   <button className="notebook-bookmark" aria-label={`${r.saved?'取消收藏':'收藏'}${e.en}`} aria-pressed={r.saved} onClick={()=>toggle(key)}><Icon name={r.saved?'heart':'heart-empty'} size={26}/></button>
   <details className="notebook-word-more"><summary>再玩这个词</summary><button className="btn-small" onClick={()=>go({name:'review',keys:[key],returnTo})}><Icon name="refresh" size={26}/>陪我找一找</button></details>
  </article>;})}</div>}
  {keys.length>limit&&<div className="lesson-actions"><button onClick={()=>setLimit(n=>n+24)}><Icon name="search" size={30}/>再看一些发现（{limit} / {keys.length}）</button></div>}
  {filter==='all'&&!query&&((s.picnic?.memories.length??0)+(s.islandLiving?.memories.length??0)>0)&&<details className="notebook-memories"><summary>我们在小岛的回忆</summary>
  {filter==='all'&&!query&&!!s.picnic?.memories.length&&<section className="picnic-memories" aria-label="野餐回忆"><h2>我们一起分享过</h2><p>这是小岛上的共同经历，不代表已经学会英语。</p>{s.picnic.memories.slice(0,3).map(m=><div className="picnic-memory" key={m.id}><PokeImg src={artUrl(m.pokemonId)} alt=""/><div>和{getPokemon(m.pokemonId).nameZh}分享了{BERRIES[m.berry].name}<small>{new Date(m.at).toLocaleDateString('zh-CN')} · 伙伴吃得很开心</small></div></div>)}</section>}
  {filter==='all'&&!query&&!!s.islandLiving?.memories.length&&<section className="picnic-memories" aria-label="小岛生活回忆"><h2>一起生活的小发现</h2>{(s.islandLiving?.memories??[]).slice(0,6).map(m=><div className="picnic-memory" key={m.id}><div className="living-memory-images">{m.partners.map(id=><PokeImg key={id} src={artUrl(id)} alt={getPokemon(id).nameZh}/>)}</div><div>和{m.partners.map(id=>getPokemon(id).nameZh).join('、')}{m.kind==='ball'?'轮流玩了球':'安静坐了一会儿'}<small>{m.context==='coast'?'海岸':m.context==='play'?'游乐区':'树荫下'} · {new Date(m.at).toLocaleDateString('zh-CN')}</small></div></div>)}<p>共同经历不等于听懂。应用记录接触和操作，无法判断家长是否帮忙。</p><button className="living-memory-link" onClick={()=>go({name:'diary'})}><Icon name="mic" size={30}/>把今天的事，记进小日记</button></section>}
  </details>}
  <details className="quiet-disclosure notebook-parent"><summary>给家长 · 需要帮助的小发现</summary><p>重听不算答对；有无应用内提示分别记录，不代表识别了家长的帮助。</p><button className="btn-small" onClick={()=>{setFilter(filter==='retry'?'all':'retry');setQuery('');setLimit(24);requestAnimationFrame(()=>header.current?.scrollIntoView({block:'start'}));}}>{filter==='retry'?'返回全部发现':'看看需要再试的词'}</button>{filter==='retry'&&<p role="status">当前只显示需要帮助的小发现。</p>}</details>
 </main></div>;
}

export function LearningReview({keys,returnTo}:{keys:string[];returnTo?:'energy'|'tasks'|'parent'}){
 const go=useGame(s=>s.go),records=useGame(s=>s.save.learning?.records);
 const groupSize=useGame(s=>reviewGroupSize(s.save));
 const entries=useMemo(()=>[...new Set(keys)].map(learningEntry).filter((e):e is NonNullable<typeof e>=>!!e).slice(0,groupSize),[]);
 const [idx,setIdx]=useState(0);
 const deferred=useRef<string[]>([]);
 const next=(skip=false)=>{if(skip)deferred.current.push(e.key);useGame.getState().markReviewAudio(e.key,skip);if(idx+1===entries.length&&!deferred.current.length)useGame.getState().finishReview();setIdx(i=>i+1);};
 const e=entries[idx],unit=e?reviewSituation(e.key,records?.[e.key]?.contexts):undefined;
 return <div className="screen learning-review"><TopBar title="和老朋友见面" onBack={()=>go(returnTo?{name:returnTo}:{name:'notebook',mode:'retry'})} focused progress={e&&<RoundProgress index={idx} total={entries.length}/>} help={<FeatureGuide compact id="review" autoVoice={false} enabled={!!e}/>}/><main className="lesson-wrap">
  {!e?<section className="learning-empty"><Icon name="heart" size={80}/><h1>{deferred.current.length?'声音准备好后，再一起听':entries.length?'又多认识了一点':'现在可以自由玩耍啦'}</h1><p>{deferred.current.length?"已经帮你记好啦，联网后可以回来继续。":"今天先到这里。过几天，我们再和这些词见面。"}</p>{entries.length>0&&!deferred.current.length&&<ParticipationNote kind="review"/>}{deferred.current.length>0&&<p>有 {deferred.current.length} 个小发现留在手册里，补听前不会算作完成。</p>}<div className="lesson-actions">{deferred.current.length>0&&<button onClick={()=>go({name:'notebook',mode:'retry',returnTo})}>看看待补听的小发现</button>}<button className="journey-primary" onClick={()=>go({name:returnTo??'journey'})}>{returnTo==='tasks'?'回到学英语':returnTo==='energy'?'回能量小口袋':returnTo==='parent'?'回家长中心':'回到冒险路线'}</button><button onClick={()=>go({name:'home'})}>回小岛玩</button></div></section>:<><div className="lesson-breadcrumb"><span>陪伙伴找一找</span></div><LearningRound key={idx} target={e} situation={unit?.situation} choices={unit?[unit.phrase,unit.alternative]:undefined} onNext={()=>next()} onSkip={()=>next(true)} source="review"/></>}
 </main></div>;
}
