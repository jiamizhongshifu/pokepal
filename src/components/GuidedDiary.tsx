import {TopBar} from './TopBar';
import { FeatureGuide } from './FeatureGuide';
import {useEffect,useRef,useState} from 'react';
import {Icon} from '../icons';
import {PokeImg} from './PokeImg';
import {artUrl} from '../data/pokemon';
import {DIARY_PROMPTS} from '../data/diaryPrompts';
import {diaryAnswerText,pendingDiaryAnswers,toDiaryWav,type DiaryAnswer,type DiaryEntry} from '../lib/diary';
import {say,stopSpeech} from '../lib/speech';

function AnswerAudio({audio}:{audio?:Blob}){
 const [url,setUrl]=useState('');useEffect(()=>{if(!audio){setUrl('');return;}const u=URL.createObjectURL(audio);setUrl(u);return()=>URL.revokeObjectURL(u);},[audio]);
 return url?<><audio controls src={url} onPlay={stopSpeech} aria-label="听听我的回答"/><details className="diary-parent"><summary>给大人：保存这段原声</summary><a className="btn-small" href={url} download={`我的回答.${audio?.type.includes("mp4")?"m4a":audio?.type.includes("mpeg")?"mp3":audio?.type.includes("wav")?"wav":"webm"}`}>下载原声备份</a></details></>:null;
}
export function DiaryRecordings({answers}:{answers:DiaryAnswer[]}){return <div className="diary-recordings">{DIARY_PROMPTS.map(p=>{const a=answers.find(a=>a.question===p.id);return a?.audio&&!a.skipped?<div key={p.id}><p>{p.title}</p><AnswerAudio audio={a.audio}/></div>:null;})}</div>;}
export function GuidedDiary({entry,onSave,onLeave}:{entry:DiaryEntry;onSave:(entry:DiaryEntry)=>Promise<void>;onLeave:()=>void}){
 const [step,setStep]=useState(Math.min(entry.guidedStep??0,DIARY_PROMPTS.length));
 const [busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[status,setStatus]=useState(''),[speaking,setSpeaking]=useState(false);
 const current=useRef(entry);current.current=entry;
 const live=useRef(true),lock=useRef(false),recorder=useRef<MediaRecorder>(),stream=useRef<MediaStream>(),timer=useRef<ReturnType<typeof setInterval>>(),controller=useRef<AbortController>(),voiceToken=useRef(0);
 const prompt=DIARY_PROMPTS[step];const answer=entry.answers?.find(a=>a.question===prompt?.id);
 const silence=()=>{voiceToken.current++;stopSpeech();if(live.current)setSpeaking(false);};
 const stop=()=>{if(recorder.current?.state==='recording'){if(live.current)setBusy(true);recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());clearInterval(timer.current);};
 useEffect(()=>{live.current=true;const hide=()=>{if(document.hidden){silence();stop();}};document.addEventListener('visibilitychange',hide);return()=>{live.current=false;controller.current?.abort();silence();stop();document.removeEventListener('visibilitychange',hide);};},[]);
 const save=async(next:DiaryEntry)=>{current.current=next;await onSave(next);};
 const update=async(a:DiaryAnswer)=>{const base=current.current;await save({...base,answers:[...(base.answers??[]).filter(x=>x.question!==a.question),a]});};
 const fail=(e:unknown)=>{if(live.current)setError(e instanceof Error?e.message:'没有保存成功，先留在这里再试一次。');};
 const hear=async()=>{silence();document.querySelectorAll('audio').forEach(a=>a.pause());const token=voiceToken.current;setSpeaking(true);const ok=await say(['zh',prompt.voice]);if(live.current&&token===voiceToken.current){setSpeaking(false);if(!ok&&![...document.querySelectorAll('audio')].some(a=>!a.paused))setStatus('这段声音暂时没有准备好，可以请大人读给你听。');}};
 useEffect(()=>{if(!prompt)return;const t=setTimeout(()=>{if(live.current&&!lock.current&&!document.hidden&&recorder.current?.state!=='recording')void hear();},120);return()=>{clearTimeout(t);silence();};},[step]);
 const move=async(next:number,skip=false)=>{
  if(lock.current||recording)return;lock.current=true;setBusy(true);setError('');silence();
  try{const base=current.current;const answers=skip?[...(base.answers??[]).filter(a=>a.question!==prompt.id),{question:prompt.id,skipped:true}]:base.answers;await save({...base,answers,guidedStep:next});if(live.current){setStep(next);setStatus('');}}
  catch(e){fail(e);}finally{lock.current=false;if(live.current)setBusy(false);}
 };
 const start=async()=>{
  if(lock.current||recording)return;lock.current=true;setBusy(true);setError('');silence();
  try{
   document.querySelectorAll('audio').forEach(a=>a.pause());
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('请大人打开受信任的 HTTPS 并允许麦克风，也可以用下面的文字框记录。');
   const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!live.current||document.hidden){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
   const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));const r=new MediaRecorder(media,mime?{mimeType:mime}:undefined);recorder.current=r;
   const chunks:BlobPart[]=[];const question=prompt.id;let broken=false;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onerror=()=>{broken=true;stop();if(live.current)setError('这次录音被打断了，原来的回答还在。请重新试试。');};
   r.onstop=()=>{media.getTracks().forEach(t=>t.stop());clearInterval(timer.current);const audio=new Blob(chunks,{type:r.mimeType});void (async()=>{
    try{if(broken||!audio.size)throw new Error('这次没有录好，原来的回答还在，请再试一次。');await update({question,audio,audioRevision:crypto.randomUUID()});if(live.current)setStatus('谢谢你愿意分享。声音已经留在这里啦。');}
    catch(e){fail(e);}finally{lock.current=false;if(live.current){setBusy(false);setRecording(false);}}
   })();};
   r.start(250);setRecording(true);setBusy(false);setSeconds(0);setStatus('我在听，慢慢说。说完就点一下。');let elapsed=0;timer.current=setInterval(()=>{elapsed++;if(live.current)setSeconds(elapsed);if(elapsed>=45)stop();},1000);
  }catch(e){stream.current?.getTracks().forEach(t=>t.stop());fail(e instanceof DOMException&&e.name==='NotAllowedError'?new Error('麦克风还没有打开，请大人在系统设置里允许。也可以先用文字记录。'):e);lock.current=false;}
  finally{if(recorder.current?.state!=='recording'){lock.current=false;if(live.current)setBusy(false);}}
 };
 const finish=async(transcribe=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');silence();const abort=new AbortController();controller.current=abort;
  try{
   const pending=!transcribe||import.meta.env.VITE_ONLINE ? [] : pendingDiaryAnswers(current.current.answers??[]);
   for(let i=0;i<pending.length;i++){
    if(!live.current||abort.signal.aborted)return;setStatus(`正在把声音变成文字 · ${i+1} / ${pending.length}`);const a=pending[i];const timeout=setTimeout(()=>abort.abort(),60000);
    try{const wav=await toDiaryWav(a.audio!);if(abort.signal.aborted)throw new Error('转写已暂停，录音还在。');const response=await fetch('/__ipad/diary-asr',{method:'POST',headers:{'Content-Type':'audio/wav','X-Diary-Request':a.audioRevision!},body:wav,signal:abort.signal});const result=await response.json();
     if(!response.ok||result.error||!result.text?.trim())throw new Error(result.error==='no-speech'?'有一段没有听清。可以回到那个问题重新录，或请大人补写。':result.error==='rate'?'语音服务需要休息一分钟，录音已经保存，稍后再试。':'这次转写没有完成。请检查 Wi-Fi 和 Mac 服务后重试，已经转好的回答会保留。');
     await update({...a,text:String(result.text).slice(0,650),transcribedRevision:a.audioRevision});
    }finally{clearTimeout(timeout);}
   }
   const base=current.current;await save({...base,transcript:diaryAnswerText(base.answers??[]),guidedComplete:true});
  }catch(e){if(live.current){setStatus('录音和已转好的文字都还在，可以稍后接着来。');fail(e instanceof TypeError||e instanceof Error&&e.name==='AbortError'?new Error('没有连上转写服务，录音已经保存。请联网后重试。'):e);}}
  finally{lock.current=false;if(live.current)setBusy(false);}
 };
 const hasAnswers=(entry.answers??[]).some(a=>!a.skipped&&(a.audio||a.text?.trim()));
 return <><TopBar title="我的小日记" onBack={onLeave} focused
  help={<FeatureGuide id="diary" compact enabled={!recording&&!busy&&!!prompt} autoVoice={false} onVoiceStart={silence}/>}
  progress={<span className="diary-question-count" aria-label={prompt?`第 ${step+1} 个问题，共 ${DIARY_PROMPTS.length} 个`:'分享完成'}>{Math.min(step+1,DIARY_PROMPTS.length)} / {DIARY_PROMPTS.length}</span>}/>
 <main className="guided-diary child-page" aria-label="陪我聊聊今天">
  <div className="diary-welcome"><span className="diary-friend">{entry.companion?<PokeImg src={artUrl(entry.companion)} alt="伙伴陪你记日记"/>:<Icon name="heart" size={48}/>}</span><p>你的一天，我想听听</p></div>
  {prompt?<article className="diary-question" key={prompt.id}><div className="diary-question-heading"><span className="diary-question-icon"><Icon name={prompt.icon} size={58}/></span><button className="diary-hear" disabled={busy||recording} onClick={hear} aria-label="听听这个问题"><Icon name="speaker" size={22}/>{speaking?'正在读…':'听一听'}</button></div><h2>{prompt.title}</h2><p>{prompt.hint}</p>
   <button className="diary-record" disabled={busy} aria-pressed={recording} onClick={recording?stop:start}><Icon name={recording?'check':'mic'} size={44}/><span>{recording?`说完啦 · ${seconds} 秒`:answer?.audio?'再录一次':'我来说一说'}</span></button>
   <p className="diary-guide-note">{recording?'最多 45 秒，到了会帮你保存。':'每次说一点点就好。也可以跳过这个问题。'}</p>
   <AnswerAudio audio={answer?.audio}/>
   <details className="diary-parent"><summary>请大人帮我写下来</summary><p>录好就能保存声音日记。文字和小故事可以以后和大人一起做。</p><label htmlFor="guided-words">保留孩子自己的话</label><textarea id="guided-words" maxLength={650} disabled={busy||recording} value={answer?.text??''} onChange={e=>{const a={...answer,question:prompt.id,text:e.target.value,skipped:false,transcribedRevision:answer?.audioRevision};const next={...current.current,answers:[...(current.current.answers??[]).filter(a=>a.question!==prompt.id),a]};current.current=next;void onSave(next).catch(fail);}} placeholder="把孩子想分享的话写在这里……"/></details>
   <div className="diary-guide-actions"><button disabled={busy||recording||step===0} onClick={()=>move(step-1)}><Icon name="back" size={24}/>上一个</button><button className="farm-primary" disabled={busy||recording} onClick={()=>move(step+1,!answer?.audio&&!answer?.text?.trim())}>{answer?.audio||answer?.text?.trim()?step===2?'分享完啦':'下一个':'先跳过'}</button></div>
  </article>:<article className="diary-question diary-wrapup"><Icon name="heart" size={42}/><h2>{hasAnswers?'谢谢你，让我走进你的一天':'今天安静待一会儿，也很好'}</h2><p>{hasAnswers?'我们把刚才的声音珍藏起来，想听的时候就来这里。':'不用一定说点什么。等你想分享了，再来找伙伴。'}</p><div className="diary-answer-list">{DIARY_PROMPTS.map((p,i)=>{const a=entry.answers?.find(a=>a.question===p.id);return <div key={p.id}><div><strong>{p.title}</strong><small>{a?.skipped||!a?'这次先不说':a.audio?'声音已保存':'文字已保存'}</small></div><button disabled={busy} onClick={()=>move(i)}>回去看看</button></div>;})}</div>
   {hasAnswers?<button className="farm-primary" disabled={busy} onClick={()=>finish()}>{busy?'正在整理…':'保存我的日记'}</button>:<button className="farm-primary" onClick={onLeave}>回小岛，和伙伴待一会儿</button>}
   {hasAnswers&&!import.meta.env.VITE_ONLINE&&pendingDiaryAnswers(entry.answers??[]).length>0&&<details className="diary-parent"><summary>和大人一起转成文字（可选）</summary><p>把本次录音上传到火山转写，需要联网。</p><button disabled={busy} onClick={()=>finish(true)}>上传录音，转成文字</button></details>}
   {hasAnswers&&<p className="diary-caption">{import.meta.env.VITE_ONLINE?"网页版暂不提供云端转写。录音留在本机，可以回到问题请大人补写，也可以用键盘听写。":"点‘转成文字’才会上传录音到火山。需要联网；请和大人一起检查文字，再保存故事。"}</p>}
  </article>}
  <p role="status" className="diary-guide-status">{status}</p>{error&&<p role="alert" className="diary-error">{error}</p>}
  <p className="diary-caption">没有标准答案，也没有分数。想停下来，随时可以返回。回答只保存在这台设备上。</p>
 </main></>;
}
