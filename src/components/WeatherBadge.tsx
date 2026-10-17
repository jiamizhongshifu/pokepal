import {skyFor} from '../lib/routine';
import {useEffect,useRef,useState} from 'react';
import {WEATHER,CLEAR_NIGHT,type IslandWeather,type WeatherKind} from '../lib/weather';
import {useGame} from '../store';
import {Icon} from '../icons';
import {sayCancellableWhile,stopSpeech,unlockAudio} from '../lib/speech';
import './weather.css';
export function WeatherBadge({weather,open,onOpen}:{weather:IslandWeather;open:boolean;onOpen:(v:boolean)=>void}){
 const night=skyFor()==='night';
 const info=weather.kind==='sunny'&&night?CLEAR_NIGHT:WEATHER[weather.kind],root=useRef<HTMLDivElement>(null),run=useRef<ReturnType<typeof sayCancellableWhile>>(),live=useRef(true);
 const [talking,setTalking]=useState(false);const enabled=useGame(s=>s.save.settings.environmentSound!=='off');
 const close=()=>{run.current?.cancel();setTalking(false);onOpen(false);};
 useEffect(()=>{live.current=true;return()=>{live.current=false;run.current?.cancel();onOpen(false);};},[]);
 useEffect(()=>{run.current?.cancel();setTalking(false);},[weather.kind]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close();};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('pointerdown',outside,true);window.addEventListener('keydown',key);return()=>{window.removeEventListener('pointerdown',outside,true);window.removeEventListener('keydown',key);};},[open]);
 const hear=async()=>{unlockAudio();run.current?.cancel();setTalking(true);const r=sayCancellableWhile(()=>live.current&&useGame.getState().screen.name==='home'&&!document.hidden,['en',info.en],['zh',info.voice]);run.current=r;const heard=await r.done;if(live.current&&run.current===r){setTalking(false);if(heard&&useGame.getState().screen.name==='home')useGame.getState().noteWord(info.en,'heard');}};
 return <div className="island-weather" ref={root}>
  <button className="weather-badge" aria-label={`小岛天气：${info.name}，听听天气`} aria-expanded={open} onClick={()=>{if(open)close();else{stopSpeech();onOpen(true);}}}><Icon name={weather.kind==='sunny'&&night?'moon':info.icon} size={28}/><span>{weather.kind==='sunny'&&night?'晴夜':info.name}</span></button>
  {open&&<section className="weather-panel" aria-label="小岛的天气"><header><Icon name={weather.kind==='sunny'&&night?'moon':info.icon} size={42}/><strong>{weather.kind==='sunny'&&night?'晴朗的夜晚':info.name}</strong><button aria-label="收起天气" onClick={close}><Icon name="close" size={24}/></button></header>
   <p>{info.voice}</p><button className="weather-hear" onClick={hear}><Icon name="speaker" size={26}/>{talking?'在说啦':'听听天气'}<span lang="en">{info.en}</span></button>
   <button className="weather-sound" aria-pressed={enabled} onClick={()=>useGame.getState().updateSettings({environmentSound:enabled?'off':'soft'})}><Icon name={enabled?'ear':'speaker'} size={26}/>{enabled?'自然声音：开':'自然声音：关'}</button><small>小岛自己的天气，慢慢变化。</small>
  </section>}
 </div>;
}
export function WeatherSettings(){const settings=useGame(s=>s.save.settings),update=useGame(s=>s.updateSettings);return <section className="guide-settings"><h3>小岛天气与自然声音</h3><p>默认按小岛的时间自动变化，每段约 20 分钟，过渡约 30 秒。不使用定位，也不是当地天气预报。固定一种天气可用于一起观察；选“自动”恢复变化。</p><div className="weather-settings-options"><button aria-pressed={(settings.islandWeather??'auto')==='auto'} onClick={()=>update({islandWeather:'auto'})}>自动变化</button>{(Object.keys(WEATHER) as WeatherKind[]).map(kind=><button key={kind} aria-pressed={settings.islandWeather===kind} onClick={()=>update({islandWeather:kind})}><Icon name={WEATHER[kind].icon} size={26}/>{WEATHER[kind].name}</button>)}</div><p>自然声音独立于背景音乐。只在岛屿播放；教学语音响起时压低，录音、离开小岛和切到后台时暂停。</p><div className="weather-settings-options">{(['off','soft','normal'] as const).map((v,i)=><button key={v} aria-pressed={(settings.environmentSound??'soft')===v} onClick={()=>update({environmentSound:v})}>{['关闭','轻轻播放','标准音量'][i]}</button>)}</div></section>;}
