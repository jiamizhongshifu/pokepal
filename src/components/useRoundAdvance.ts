import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {RoundAdvance} from '../lib/roundAdvance';
export function useRoundAdvance(ready:boolean,onAdvance:()=>void,delay=1800,blocked=false){
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(()=>!document.hidden);
 const gate=useRef(new RoundAdvance()),callback=useRef(onAdvance);callback.current=onAdvance;
 // Help closes without silently taking the child to the next question.
 useLayoutEffect(()=>{if(blocked){gate.current.cancel();setPaused(true);}},[blocked]);
 useEffect(()=>{const change=()=>{gate.current.cancel();setVisible(!document.hidden);};document.addEventListener('visibilitychange',change);return()=>{document.removeEventListener('visibilitychange',change);gate.current.cancel();};},[]);
 useEffect(()=>{if(ready&&!paused&&visible&&!blocked)gate.current.schedule(()=>callback.current(),delay);else gate.current.cancel();return()=>gate.current.cancel();},[ready,paused,visible,delay,blocked]);
 return {paused:paused||blocked,toggle:()=>{gate.current.cancel();if(!blocked)setPaused(p=>!p);},cancel:()=>gate.current.cancel()};
}
