import {useEffect,useState} from 'react';
import type {Reward} from '../lib/participation';
import {Icon} from '../icons';
import './energy-toast.css';

/** Only mounted after a durable reward; presentation never grants energy. */
export function EnergyToast({reward}:{reward:Reward}) {
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=setTimeout(()=>setVisible(false),5500);return()=>clearTimeout(timer);},[]);
 return <div className={`energy-receipt ${visible?'is-visible':''}`} role="status" aria-live="polite" aria-atomic="true" aria-hidden={!visible}>
  <Icon name="star" size={28}/><span>{'这次的小发现记下啦'}{reward.ballGranted&&' · 还收到一个邀请果'}</span>
 </div>;
}
