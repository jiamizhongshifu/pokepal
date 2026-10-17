import { FeatureGuide } from './FeatureGuide';
import { useEffect, useMemo, useRef, useState } from 'react';
import { artUrl, getPokemon } from '../data/pokemon';
import { Icon } from '../icons';
import { PokeImg } from './PokeImg';

/** Owned companions only: recognition by portrait first, optional parent-assisted search. */
export function CompanionFinder({ids, selected, onSelect, onClose,purpose='visit'}:{purpose?:'visit'|'choose';ids:number[];selected:number|null;onSelect:(id:number)=>void;onClose:()=>void}) {
  const [query,setQuery]=useState(''),[searching,setSearching]=useState(false);
  const [page,setPage]=useState(Math.max(0,Math.floor(ids.indexOf(selected??-1)/9)));
  const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{close.current?.focus();},[]);
  const matches=useMemo(()=>ids.map(getPokemon).filter(p=>`${p.nameZh} ${p.nameEn} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase())),[ids.join(','),query]);
  const pages=Math.max(1,Math.ceil(matches.length/9)), current=Math.min(page,pages-1);
  return <section className="companion-finder" aria-label="找伙伴" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose();}}}>
    <header className="panel-toolbar"><div><strong>找伙伴</strong></div>{purpose==='visit'&&<FeatureGuide compact id="friends"/>}<button ref={close} onClick={onClose} aria-label="收起伙伴册"><Icon name="close" size={23}/></button></header>
    <button className="finder-search-toggle" aria-expanded={searching} onClick={()=>{setSearching(v=>!v);setQuery('');setPage(0);}}><Icon name="search" size={24}/>{searching?'收起搜索':'按名字找'}</button>
    {searching&&<input autoFocus type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="输入名字找一找" aria-label="按名字找伙伴（家长帮忙）"/>}
    <div className="companion-portraits">
      {matches.slice(current*9,current*9+9).map(p=><button key={p.id} aria-label={`${purpose==='choose'?'选择':'找到'}${p.nameZh}`} aria-pressed={p.id===selected} onClick={()=>onSelect(p.id)}>
        <PokeImg src={artUrl(p.id)} alt=""/><span>{p.nameZh}</span>
      </button>)}
    </div>
    {!matches.length&&<p className="companion-no-match">还没找到，试试别的名字吧</p>}
    {pages>1&&<footer><button aria-label="上一页伙伴" disabled={current===0} onClick={()=>setPage(current-1)}>‹</button><span aria-live="polite">{current+1} / {pages}</span><button aria-label="下一页伙伴" disabled={current===pages-1} onClick={()=>setPage(current+1)}>›</button></footer>}
  </section>;
}
