import {useEffect,useState} from 'react';
import type {Reward} from '../lib/participation';
import {Icon} from '../icons';
import './energy-toast.css';

/** Only mounted after a durable reward; presentation never grants energy. */
export function EnergyToast({reward}:{reward:Reward}) {
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),5500);return()=>clearTimeout(timer);},[]);
 const amount=reward.gained+reward.bonus;
 return <div className={`energy-receipt ${visible?'is-visible':''}`} role="status" aria-live="polite" aria-atomic="true">
  {visible&&<><Icon name={amount?'bolt':'heart'} size={28}/><span>{amount?`+${amount} 能量，放进口袋啦` : reward.capped?'今天的能量收集好啦':'这次的小发现也记下啦'}{reward.ballGranted&&' · 还收到一个精灵球'}</span></>}
 </div>;
}
