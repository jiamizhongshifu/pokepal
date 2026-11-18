import {useEffect,useRef} from 'react';
import {creatureArt,getCreature} from '../data/creatures';
import {Icon} from '../icons';
import {CreatureImg} from './CreatureImg';
export function CompanionStrip({ids,selected,onSelect,onClose}:{ids:number[];selected:number;onSelect:(id:number)=>void;onClose:()=>void}){
 const lane=useRef<HTMLDivElement>(null);
 useEffect(()=>{const root=lane.current,button=root?.querySelector<HTMLElement>('[aria-pressed="true"]');if(!root||!button)return;const a=root.getBoundingClientRect(),b=button.getBoundingClientRect();if(b.left<a.left||b.right>a.right)root.scrollLeft+=b.left-a.left-(a.width-b.width)/2;},[selected]);
 return <nav className="companion-roster" aria-label="切换互动伙伴"><button className="camp-exit" onClick={onClose} aria-label="结束互动，回小岛"><Icon name="back" size={28}/><span>小岛</span></button><div ref={lane} className="companion-avatar-lane">{ids.map(id=><button key={id} aria-pressed={selected===id} aria-label={`和${getCreature(id).nameZh}互动`} onClick={()=>{if(id!==selected)onSelect(id);}}><CreatureImg src={creatureArt(id)} alt=""/><span>{getCreature(id).nameZh}</span></button>)}</div></nav>;
}
