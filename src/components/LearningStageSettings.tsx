import { useEffect,useRef,useState } from 'react';
import { Icon } from '../icons';
import { useGame } from '../store';
import { LEARNING_STAGES,learningProfile,learningStageTitle,stageProfile,type LearningStageId } from '../lib/learningStage';
import './learning-stage-settings.css';

/** Three stages, one tap each. How many pictures, how many review words and which sentences are heard first follow from the stage. */
export function LearningStageSettings(){
 const settings=useGame(s=>s.save.settings),update=useGame(s=>s.setLearningProfile);
 const unavailable=useGame(s=>s.saveBusy||!!s.saveIssue);
 // A tap while the previous one is still saving is not lost: the last stage tapped is the one kept.
 const busy=useRef(false),wanted=useRef<LearningStageId|null>(null),live=useRef(true);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const profile=learningProfile(settings);
 const [message,setMessage]=useState(''),[shown,setShown]=useState<LearningStageId|null>(null);
 const choose=async(id:LearningStageId)=>{
  if(unavailable)return;
  wanted.current=id;setShown(id);
  if(busy.current)return;
  busy.current=true;
  let ok=true,saved:LearningStageId|null=null;
  while(wanted.current&&wanted.current!==saved){
   const next:LearningStageId=wanted.current;
   if(learningProfile(useGame.getState().save.settings).stage!==next)ok=await update(stageProfile(next));
   saved=next;if(!ok)break;
  }
  busy.current=false;wanted.current=null;
  if(!live.current)return;
  setShown(null);
  setMessage(ok&&saved?`已换成「${LEARNING_STAGES.find(s=>s.id===saved)!.title}」，下一组练习就用。`:'这次没有保存成功，请再点一次。');
 };
 const pressed=shown??profile.stage;
 return <section className="learning-stage-settings" aria-labelledby="learning-stage-title">
  <header><div><h3 id="learning-stage-title">宝宝的英语学习阶段</h3><p>按现在的准备程度选一个，随时可以换。</p></div><span className="stage-current">当前：{learningStageTitle(settings)}</span></header>
  {profile.stage==='custom'&&<p className="stage-legacy">现在用的是以前调过的专属节奏，会一直保留；点下面任一阶段就换成整套设置。</p>}
  <fieldset disabled={unavailable} className="stage-presets"><legend>选择一个适合宝宝的起点</legend>
   {LEARNING_STAGES.map(stage=><button type="button" key={stage.id} aria-pressed={pressed===stage.id} onClick={()=>void choose(stage.id)}>
    <Icon name={stage.icon} size={44}/><span><strong>{stage.title}</strong><span>{stage.description}</span><small>{stage.example}</small></span><span className="stage-check" aria-hidden="true">{pressed===stage.id?'✓':'○'}</span>
   </button>)}
  </fieldset>
  <p className="stage-status" role="status" aria-live="polite">{message}</p>
  <p className="stage-footnote">换阶段不会清空课程、生词和伙伴，也不会自动解锁后面的课程。阶段不是考试等级；故事共读、描字和开口始终可以自选。</p>
 </section>;
}
