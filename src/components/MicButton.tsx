import { useEffect,useRef,useState } from 'react';
import { record,type RecordResult,micSupported } from '../lib/mic';
import { stopSpeech } from '../lib/speech';
import { Icon } from '../icons';

/** A short listening turn with a visible, always-available manual completion. */
export function MicButton({onResult,disabled,size=140,onRecordingChange}:{onResult:(r:RecordResult)=>void;disabled?:boolean;size?:number;onRecordingChange?:(active:boolean)=>void}){
 const [state,setState]=useState<'idle'|'preparing'|'listening'|'finishing'>('idle');
 const [level,setLevel]=useState(0),[heard,setHeard]=useState(false);
 const [unavailable,setUnavailable]=useState(!micSupported()),[notice,setNotice]=useState('');
 const running=useRef(false),alive=useRef(true),delivered=useRef(false),manual=useRef(false),control=useRef<AbortController>();
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;control.current?.abort();};},[]);
 const deliver=(r:RecordResult)=>{if(!alive.current||delivered.current)return;delivered.current=true;onResult(r);};
 const start=async()=>{
  if(running.current||disabled)return;
  running.current=true;delivered.current=false;manual.current=false;control.current=new AbortController();
  stopSpeech();setState('preparing');setHeard(false);setNotice('');onRecordingChange?.(true);
  try{
    const r=await record({signal:control.current.signal,onLevel:v=>{if(alive.current)setLevel(v);},onState:v=>{if(alive.current)setState(v);},onVoice:v=>{if(alive.current)setHeard(v);}});
    if(!alive.current)return;
    setState('idle');
    if(manual.current){deliver({...r,blob:r.voiced?r.blob:undefined,confirmed:true});return;}
    if(r.error&&r.error!=='cancelled'){
      setUnavailable(r.error==='permission'||r.error==='unavailable');
      setNotice(r.error==='permission'?'麦克风暂未允许，可以请家长帮忙，也可以点“我说完啦”。':'暂时没能听清，可以再点麦克风，或者点“我说完啦”。');return;
    }
    if(r.error==='cancelled')return;
    deliver(r);
  }finally{running.current=false;if(alive.current){setState('idle');onRecordingChange?.(false);}}
 };
 const finish=()=>{
  if(disabled||manual.current)return;
  manual.current=true;
  if(running.current){setState('finishing');control.current?.abort();}
  else deliver({voiced:false,voicedMs:0,peak:0,confirmed:true});
 };
 // A completed silent attempt may be retried after the parent's encouragement.
 useEffect(()=>{if(!disabled&&!running.current){delivered.current=false;manual.current=false;}},[disabled]);
 return <div className="mic-control">
  {!unavailable&&<button className={`mic-btn ${state}`} disabled={disabled||state==='preparing'||state==='finishing'} onClick={state==='listening'?finish:start} style={{width:size,height:size,boxShadow:state==='listening'?`0 0 0 ${8+level*35}px rgba(22,120,98,.22)`:undefined}} aria-label={state==='listening'?'我在听，点一下说完':state==='preparing'?'正在打开麦克风':state==='finishing'?'正在结束录音':disabled?'先听一听':'点我开始说'}>
   <Icon name={state==='listening'?'ear':'mic'} size={size*.46} className="mic-icon"/><span className="mic-label">{state==='listening'?'我在听…':state==='preparing'?'准备中…':state==='finishing'?'听到啦…':disabled?'先听一听':'点我说'}</span>
  </button>}
  {!disabled&&<><p className="mic-status" role="status">{notice||(state==='listening'?(heard?'听到你啦，停一下就会结束。':'轻轻说就好，说完也可以点下面。'):state==='preparing'?'请允许使用麦克风。':'跟读过了，也可以自己点一下。')}</p><button className="mic-finish" disabled={state==='finishing'} onClick={finish}><Icon name="check" size={24}/>我说完啦</button></>}
 </div>;
}
