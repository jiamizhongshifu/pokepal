import {modalIsOpen} from '../lib/modalLayer';
import {useEffect,useLayoutEffect,useRef,useState,useId,type ReactNode} from 'react';
import {GUIDES,type GuideId} from '../data/onboarding';
import {useGame} from '../store';
import {Icon} from '../icons';
import {isForegroundAudioActive,sayCancellableWhile,unlockAudio} from '../lib/speech';
import {isMicActive} from '../lib/mic';
import './feature-guide.css';

/** Contextual, non-modal help: one real action, no rewards, no focus stealing. */
export function FeatureGuide({id,enabled=true,autoVoice=true,floating=false,topics,compact=true,onVoiceStart,children}:{children?:ReactNode;id:GuideId;enabled?:boolean;autoVoice?:boolean;floating?:boolean;topics?:GuideId[];compact?:boolean;onVoiceStart?:()=>void}){
 const [topic,setTopic]=useState(id),[manual,setManual]=useState(false);
 useEffect(()=>{setTopic(id);setManual(false);},[id]);
 if(!enabled)return null;
 return <Guide key={topic} onVoiceStart={onVoiceStart} compact={compact} id={topic} autoVoice={autoVoice} floating={floating} topics={topics} manual={manual} children={children} onTopic={next=>{setManual(true);setTopic(next);}}/>;
}
function Guide({id,autoVoice,floating,topics,onTopic,manual,compact,onVoiceStart,children}:{children?:ReactNode;onVoiceStart?:()=>void;compact:boolean;id:GuideId;autoVoice:boolean;floating:boolean;manual:boolean;topics?:GuideId[];onTopic:(id:GuideId)=>void}){
 const panelId=useId();
 const guide=GUIDES[id];
 const seen=useGame(s=>!!s.save.onboarding?.seen[id]);
 const automatic=useGame(s=>s.save.onboarding?.automatic!==false);
 const mark=useGame(s=>s.markGuideSeen);
 const [open,setOpen]=useState(()=>manual||(automatic&&!seen)),[speaking,setSpeaking]=useState(false),[unavailable,setUnavailable]=useState(false),[more,setMore]=useState(false),[hasTarget,setHasTarget]=useState(false);
 const targetRef=useRef<HTMLElement|null>(null);
 const root=useRef<HTMLElement>(null),live=useRef(true),autoCancelled=useRef(false),sequence=useRef(0);
 const run=useRef<ReturnType<typeof sayCancellableWhile>|null>(null);
 const scope=useRef(useGame.getState().screen);
 useLayoutEffect(()=>{
  if(!compact||!open)return;
  const host=root.current?.closest<HTMLElement>('.topbar,.companion-toolbar,.panel-toolbar,.help-heading');
  const panel=root.current?.querySelector<HTMLElement>('.guide-content');
  if(!host||!panel)return;
  const measure=()=>host.style.setProperty('--guide-space',`${Math.ceil(panel.getBoundingClientRect().height)}px`);
  measure();const observer=new ResizeObserver(measure);observer.observe(panel);
  return()=>{observer.disconnect();host.style.removeProperty('--guide-space');};
 },[compact,open]);
 const allowed=()=>live.current&&!modalIsOpen()&&!document.hidden&&!isMicActive()&&useGame.getState().screen===scope.current&&!useGame.getState().saveIssue;
 const cancel=()=>{sequence.current++;run.current?.cancel();run.current=null;if(live.current)setSpeaking(false);};
 const hear=async(manual=false)=>{
  if(!allowed())return;
  if(manual)unlockAudio();
  onVoiceStart?.();
  cancel();const ticket=++sequence.current;setSpeaking(true);setUnavailable(false);
  const next=sayCancellableWhile(allowed,['zh',guide.voice]);run.current=next;
  const ok=await next.done;
  if(!live.current||sequence.current!==ticket)return;
  run.current=null;setSpeaking(false);
  if(manual&&!ok&&allowed()&&!isForegroundAudioActive())setUnavailable(true);
 };
 const close=()=>{autoCancelled.current=true;cancel();setOpen(false);setMore(false);};
 useEffect(()=>{
  live.current=true;
  const outside=(event:Event)=>{
   if(root.current?.contains(event.target as Node))return;
   // Keep the pressed target in place until its click lands, especially in bottom-anchored panels.
   autoCancelled.current=true;cancel();if(compact&&event.type!=='pointerdown')setOpen(false);
  };
  const hidden=()=>{if(document.hidden){autoCancelled.current=true;cancel();}};
  window.addEventListener('pointerdown',outside,true);window.addEventListener('click',outside,true);window.addEventListener('keydown',outside,true);document.addEventListener('visibilitychange',hidden);
  return()=>{live.current=false;cancel();window.removeEventListener('pointerdown',outside,true);window.removeEventListener('click',outside,true);window.removeEventListener('keydown',outside,true);document.removeEventListener('visibilitychange',hidden);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  mark(id);
  let quietSince=Date.now(),timer:ReturnType<typeof setInterval>|undefined;
  // Existing welcome / teaching narration always goes first. Any child action cancels the queued hint.
  if((autoVoice||manual)&&!autoCancelled.current){timer=setInterval(()=>{
   if(!allowed()||autoCancelled.current){clearInterval(timer);return;}
   if(isForegroundAudioActive()){quietSince=Date.now();return;}
   if(Date.now()-quietSince>=900){clearInterval(timer);void hear();}
  },200);}
  return()=>{clearInterval(timer);cancel();};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  setHasTarget(false);
  let target:HTMLElement|null=null;
  const locate=()=>{
   const next=Array.from(document.querySelectorAll<HTMLElement>(guide.target)).find(el=>el.getBoundingClientRect().width>0&&!el.closest('[aria-hidden="true"]'))??null;
   if(next===target)return;target?.classList.remove('guide-target');target=next;targetRef.current=next;setHasTarget(!!next);target?.classList.add('guide-target');
  };
  const act=(e:Event)=>{if(target?.contains(e.target as Node)&&!(target as HTMLButtonElement).disabled)close();};
  locate();const observer=new MutationObserver(locate);observer.observe(document.getElementById('root')!,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','aria-hidden','data-stage']});
  document.addEventListener('click',act,true);
  return()=>{target?.classList.remove('guide-target');targetRef.current=null;observer.disconnect();document.removeEventListener('click',act,true);};
 },[open,id]);
 return <aside ref={root} className={`feature-guide ${floating?'guide-floating':''} ${compact?'guide-compact':''} ${open?'is-open':'is-closed'}`} aria-label="操作小帮手" data-guide={id}>
  {(!open||compact)&&<button className="guide-reopen" onClick={()=>{if(open){close();return;}autoCancelled.current=true;setOpen(true);void hear(true);}} aria-label="帮助" aria-expanded={open} aria-controls={panelId}><span className="help-symbol" aria-hidden="true">?</span><span>帮助</span></button>}
  {open&&<div id={panelId} className="guide-content" onKeyDown={e=>{if(e.key==='Escape'){close();root.current?.querySelector<HTMLButtonElement>('.guide-reopen')?.focus();}}}>
   <div className="guide-main"><span className="guide-picture" aria-hidden="true"><Icon name={guide.icon} size={38}/></span><strong>{guide.title}</strong>
    <button className="guide-hear" aria-pressed={speaking} onClick={()=>{autoCancelled.current=true;if(speaking){cancel();return;}void hear(true);}} aria-label={speaking?'停止操作提示':'听操作提示'}><Icon name="speaker" size={26}/><span>{speaking?'停一下':'听一听'}</span></button>
    <button className="guide-dismiss" onClick={close} aria-label="跳过提示，自己试试"><Icon name="close" size={22}/></button>
   </div>
   {'sequence' in guide&&<div className="guide-visual-row"><div className="guide-sequence" aria-hidden="true">{guide.sequence.map((icon,i)=><span key={`${icon}-${i}`}>{i>0&&<b>›</b>}<Icon name={icon} size={32}/></span>)}</div>{hasTarget&&<button className="guide-locate" onClick={()=>{const target=targetRef.current;if(target)target.scrollIntoView({block:'center',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}} aria-label="看看要点哪里"><Icon name="search" size={24}/><span>找一找</span></button>}</div>}
   {unavailable&&<p className="guide-status" role="status">声音暂时没来，点喇叭再试试</p>}
   {children&&<div className="guide-extra">{children}</div>}
   {topics&&<><button className="guide-more" aria-expanded={more} onClick={()=>setMore(!more)}><Icon name="search" size={20}/>更多帮助</button>{more&&<nav className="guide-topics" aria-label="选择想了解的玩法">{topics.map(key=><button key={key} aria-label={GUIDES[key].title} onClick={()=>{setMore(false);if(key===id){void hear(true);}else{cancel();onTopic(key);}}}><Icon name={GUIDES[key].icon} size={28}/><span>{GUIDES[key].title}</span></button>)}</nav>}</>}
  </div>}
 </aside>;
}
