import {createContext,useContext} from 'react';
import {createPortal} from 'react-dom';
export const ProgressHost=createContext<HTMLElement|null>(null);
export function RoundProgress({index,total,unit='题'}:{index:number;total:number;unit?:string}){
 const host=useContext(ProgressHost);
 const content=<div className="round-progress" aria-label={`第 ${index+1} ${unit}，共 ${total} ${unit}`}><span className="progress-beads" aria-hidden="true">{Array.from({length:total},(_,i)=><i key={i} className={i<index?'done':i===index?'current':''}/>)}</span><b aria-hidden="true">{index+1} / {total}</b></div>;
 return host?createPortal(content,host):content;
}
