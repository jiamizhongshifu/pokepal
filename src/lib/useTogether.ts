import {automaticTogetherTurn} from './homeOverlay';
import {useModalBlocked} from './modalLayer';
import {markInteresting} from '../scene/observationInterest';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Capture} from '../types';
import {togetherSession,togetherHelpTarget,type TogetherSession} from '../scene/together';
import type {Visit} from '../scene/islandLife';
import {useGame} from '../store';
import {islandAudioAllowed} from './islandSpeech';
import {sayCancellableWhile,unlockAudio,sfx} from './speech';
import {bi} from './bi';
import {togetherVoice,togetherFinishedVoice,togetherEvidence,togetherRounds,togetherDuration,togetherLearningStation} from './togetherTurn';
import type {TogetherKind} from './islandLiving';
/** Foreground-only play. Requests are heard BEFORE movement; child turns never time out. */
export function useTogether(active:boolean,captures:Capture[]){
 const blocked=useModalBlocked();
 const [session,setSession]=useState<TogetherSession|null>(null);
 const [phase,setPhaseState]=useState<'arriving'|'ready'|'acting'|'done'|'timeout'>('arriving');
 const [turn,setTurn]=useState(0),[arrived,setArrived]=useState(false),[speaking,setSpeaking]=useState(false);
 const progress=useRef(0),run=useRef(0),running=useRef(false),live=useRef(true);
 const voice=useRef<ReturnType<typeof sayCancellableWhile>|null>(null);
 const heard=useRef(new Set<string>()),recorded=useRef(new Set<string>());
 const current=useRef({session,phase,turn,active,blocked,arrived});current.current={session,phase,turn,active,blocked,arrived};
 const setPhase=(next:typeof phase)=>{current.current.phase=next;setPhaseState(next);};
 const stopVoice=()=>{voice.current?.cancel();voice.current=null;if(live.current)setSpeaking(false);};
 const cancel=()=>{run.current++;running.current=false;current.current.session=null;stopVoice();setSession(null);setArrived(false);progress.current=0;};
 const begin=(kind:TogetherKind,ids:number[],coast=false,help=false)=>{
  if(!active||blocked||!ids.length||ids.length>2||new Set(ids).size!==ids.length||!ids.every(id=>captures.some(c=>c.id===id)))return;
  cancel();heard.current.clear();recorded.current.clear();unlockAudio();
  setSession({...togetherSession(kind,ids,coast),...(help&&kind==='ball'?{help:true as const}:{})});setTurn(0);setPhase('arriving');
 };
 const syncArrivals=(visits:Visit[])=>{
  const ready=!!session&&session.visits.every(v=>visits.some(a=>a.key===v.key&&a.pokemonId===v.pokemonId));
  if(ready!==arrived)setArrived(ready);
 };
 const act=()=>{
  const s=current.current;
  if(!s.active||s.blocked||!s.session||s.phase!=='ready'||!s.arrived||running.current||document.hidden)return;
  running.current=true;stopVoice();progress.current=0;setPhase('acting');
  if(s.session.kind==='bubbles')sfx('pop');
 };
 const hear=async()=>{
  const s=current.current,owner=run.current;
  if(!s.session||!['ready','done'].includes(s.phase)||!s.active||s.blocked||document.hidden)return;
  const cue=s.phase==='done'?togetherFinishedVoice(s.session.kind,!!s.session.help):togetherVoice(s.session.kind,s.session.partners,s.turn,!!s.session.help);
  if(!cue.length)return;
  const key=`${s.session.id}:${s.turn}`;
  stopVoice();unlockAudio();setSpeaking(true);
  const allowed=()=>live.current&&owner===run.current&&current.current.phase===s.phase&&current.current.active&&islandAudioAllowed();
  const next=sayCancellableWhile(allowed,...bi(...cue));voice.current=next;
  // A missing/slow recording must never prevent the companion from playing.
  let timer:ReturnType<typeof setTimeout>|undefined;
  const ok=await Promise.race([next.done,new Promise<false>(resolve=>{timer=setTimeout(()=>{next.cancel();resolve(false);},12000);})]);
  clearTimeout(timer);
  if(voice.current!==next||!allowed())return;
  voice.current=null;setSpeaking(false);if(ok){if(s.phase==='ready')heard.current.add(key);else if(!recorded.current.has(key+':thanks')){recorded.current.add(key+':thanks');useGame.getState().noteStationLearning(togetherLearningStation(s.session.kind),'Thank you!',false);}}
 };
 useEffect(()=>{live.current=true;return()=>{live.current=false;run.current++;voice.current?.cancel();};},[]);
 useEffect(()=>{if(session&&phase==='arriving'&&arrived){progress.current=0;setPhase('ready');}},[arrived,session,phase]);
 useEffect(()=>{
  if(!session||phase!=='arriving')return;
  const t=setTimeout(()=>setPhase('timeout'),90000);return()=>clearTimeout(t);
 },[session,phase]);
 useEffect(()=>{const hide=()=>{if(document.hidden)cancel();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 useEffect(()=>{if(!active||session?.partners.some(id=>!captures.some(c=>c.id===id)))cancel();},[active,captures.map(c=>c.id).join(',')]);
 useEffect(()=>{
  if(!session||phase!=='ready'||!active||blocked||!arrived)return;
  let valid=true;const ticket=run.current;
  void hear().then(()=>{if(valid&&ticket===run.current&&!session.help&&automaticTogetherTurn(session.kind,session.partners.length,turn))act();});
  return()=>{valid=false;stopVoice();};
 },[session,phase,arrived,active,blocked,turn]);
 useEffect(()=>{
  if(!session||phase!=='acting')return;
  let elapsed=0,previous=performance.now();const ticket=run.current;
  const timer=setInterval(()=>{
   const now=performance.now(),dt=Math.min(500,now-previous);previous=now;
   if(ticket!==run.current||!current.current.active||current.current.blocked||document.hidden)return;
   if(!arrived){running.current=false;setPhase('arriving');progress.current=0;return;}
   elapsed+=dt;const p=Math.min(1,elapsed/togetherDuration(session.kind));progress.current=p;
   if(p>=1){clearInterval(timer);running.current=false;
    const key=`${session.id}:${turn}`;
    if(heard.current.has(key)&&!recorded.current.has(key)){
     recorded.current.add(key);
     // Watching companions is exposure, never a child action or independent answer.
     const evidence=togetherEvidence(session.kind,session.partners,turn,!!session.help);
     useGame.getState().noteStationLearning(evidence.station,evidence.word,evidence.action);
    }
    if(session.help||turn>=togetherRounds(session.kind)-1){if(!session.help)useGame.getState().rememberTogether({id:session.id,kind:session.kind,partners:session.partners,context:session.context,at:Date.now()});markInteresting(session.partners);setPhase('done');}
    else{progress.current=0;setTurn(n=>n+1);setPhase('ready');}
   }
  },80);return()=>clearInterval(timer);
 },[session,phase,active,arrived,turn]);
 useEffect(()=>{
  if(!session||phase!=='done'||!active||blocked)return;
  void hear();return()=>stopVoice();
 },[session,phase,active,blocked]);
 const canHelp=useMemo(()=>!!session&&!session.help&&session.kind==='ball'&&!!togetherHelpTarget(session),[session]);
 const askHelp=()=>{const s=current.current;if(s.session?.kind==='ball'&&s.phase==='done'&&!s.session.help&&togetherHelpTarget(s.session))begin('ball',s.session.partners,s.session.context==='coast',true);};
 const retry=()=>{const s=current.current;if(s.session&&s.phase==='timeout')begin(s.session.kind,s.session.partners,s.session.context==='coast',!!s.session.help);};
 return {session,phase,turn,progress,arrived,speaking,canHelp,begin,cancel,act,hear,askHelp,retry,syncArrivals,visits:session&&phase!=='timeout'?session.visits:[]};
}
