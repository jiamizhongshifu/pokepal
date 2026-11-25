import {createContext,useContext,useEffect} from 'react';
import {createPortal} from 'react-dom';
import {resetStreak,streakLabel,useStreak} from '../lib/roundStreak';
export const ProgressHost=createContext<HTMLElement|null>(null);
export function RoundProgress({index,total,unit='题'}:{index:number;total:number;unit?:string}){
 const host=useContext(ProgressHost);
 const streak=useStreak(),label=streakLabel(streak);
 // A new sitting starts its own count.
 useEffect(()=>{if(index===0)resetStreak();},[index]);
 const content=<div className={`round-progress${label?' is-streak':''}`} role="group" aria-label={`第 ${index+1} ${unit}，共 ${total} ${unit}`}>
  {label&&<small className="round-streak" role="status"><span key={streak} className="motion-tick">{label}</span><i key={`s${streak}`} className="motion-tick" aria-hidden="true">连对 {streak}</i></small>}
  <span className="progress-bar" aria-hidden="true"><i style={{width:`${Math.round(index/total*100)}%`}}/></span>
  <b aria-hidden="true"><span key={index} className="motion-tick">{index+1}</span> / {total}</b></div>;
 return host?createPortal(content,host):content;
}
