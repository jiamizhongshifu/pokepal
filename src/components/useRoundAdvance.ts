import {useEffect,useRef,useState} from 'react';
import {RoundAdvance} from '../lib/roundAdvance';
export function useRoundAdvance(ready:boolean,onAdvance:()=>void,delay=1800){
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(()=>!document.hidden);
 const gate=useRef(new RoundAdvance()),callback=useRef(onAdvance);callback.current=onAdvance;
 useEffect(()=>{const change=()=>{gate.current.cancel();setVisible(!document.hidden);};document.addEventListener('visibilitychange',change);return()=>{document.removeEventListener('visibilitychange',change);gate.current.cancel();};},[]);
 useEffect(()=>{if(ready&&!paused&&visible)gate.current.schedule(()=>callback.current(),delay);else gate.current.cancel();return()=>gate.current.cancel();},[ready,paused,visible,delay]);
 return {paused,toggle:()=>{gate.current.cancel();setPaused(p=>!p);},cancel:()=>gate.current.cancel()};
}
