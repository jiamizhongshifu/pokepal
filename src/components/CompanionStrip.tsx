import {useEffect,useRef} from 'react';
import {artUrl,getPokemon} from '../data/pokemon';
import {Icon} from '../icons';
import {PokeImg} from './PokeImg';
export function CompanionStrip({ids,selected,onSelect,onClose}:{ids:number[];selected:number;onSelect:(id:number)=>void;onClose:()=>void}){
 const lane=useRef<HTMLDivElement>(null);
 useEffect(()=>{const root=lane.current,button=root?.querySelector<HTMLElement>('[aria-pressed="true"]');if(!root||!button)return;const a=root.getBoundingClientRect(),b=button.getBoundingClientRect();if(b.left<a.left||b.right>a.right)root.scrollLeft+=b.left-a.left-(a.width-b.width)/2;},[selected]);
 return <nav className="companion-roster" aria-label="切换互动伙伴"><button className="camp-exit" onClick={onClose} aria-label="结束互动，回小岛"><Icon name="back" size={28}/><span>小岛</span></button><div ref={lane} className="companion-avatar-lane">{ids.map(id=><button key={id} aria-pressed={selected===id} aria-label={`和${getPokemon(id).nameZh}互动`} onClick={()=>{if(id!==selected)onSelect(id);}}><PokeImg src={artUrl(id)} alt=""/><span>{getPokemon(id).nameZh}</span></button>)}</div></nav>;
}
