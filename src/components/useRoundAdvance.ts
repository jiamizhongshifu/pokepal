import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {RoundAdvance,advanceAllowed} from '../lib/roundAdvance';
export function useRoundAdvance(ready:boolean,onAdvance:()=>void,delay=1800,blocked=false){
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(()=>!document.hidden);
 const gate=useRef(new RoundAdvance()),callback=useRef(onAdvance);callback.current=onAdvance;
 // Open help holds the round; closing it lets the round go on by itself. Only the child's own pause stays paused.
 useLayoutEffect(()=>{if(blocked)gate.current.cancel();},[blocked]);
 useEffect(()=>{const g=gate.current,change=()=>{g.cancel();setVisible(!document.hidden);};document.addEventListener('visibilitychange',change);return()=>{document.removeEventListener('visibilitychange',change);g.cancel();};},[]);
 useEffect(()=>{const g=gate.current;if(advanceAllowed({ready,paused,visible,helpOpen:blocked}))g.schedule(()=>callback.current(),delay);else g.cancel();return()=>g.cancel();},[ready,paused,visible,delay,blocked]);
 return {paused:paused||blocked,toggle:()=>{gate.current.cancel();if(!blocked)setPaused(p=>!p);},cancel:()=>gate.current.cancel()};
}
