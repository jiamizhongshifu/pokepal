import {trackInteraction} from '../lib/interaction';
import {guideIsOpen,subscribeGuides} from '../lib/guidePause';
import {LessonPicnic} from '../components/LessonPicnic';
import {EnergyToast} from '../components/EnergyToast';
import { EnergyReturn } from '../components/EnergyReturn';
import { useRoundAdvance } from '../components/useRoundAdvance';
import { FeatureGuide } from '../components/FeatureGuide';
import { learningProfile,startsWithListening } from '../lib/learningStage';
import { lessonWords } from '../data/learning';
import { PHRASES } from '../data/words';
import type {Reward} from '../lib/participation';
import {RoundProgress} from '../components/RoundProgress';
import { useEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react';
import { useGame } from '../store';
import { learningEntry,unitById,unitUnlocked,unitSituations,unitRoundCount,type LearningEntry } from '../data/curriculum';
import { learningChoices } from '../lib/learningChoices';
import { TopBar } from '../components/TopBar';
import { LearningArt,hearEntry,learningVoice } from '../components/LearningItem';
import { PokeImg } from '../components/PokeImg';
import { artUrl,getPokemon } from '../data/pokemon';
import { Icon } from '../icons';
import { say,sayCancellableWhile,stopSpeech,isForegroundAudioActive } from '../lib/speech';
import { learningExplanation } from '../lib/learningVoice';
import { bi } from '../lib/bi';
import { useChoice } from './tasks/useChoice';
import '../learning-journey.css';

export function LearningLesson({id}:{id:string}){
 const s=useGame(v=>v.save),go=useGame(v=>v.go),advance=useGame(v=>v.advanceUnit);
 const trackedStart=useRef(false);
 useEffect(()=>{if(!trackedStart.current&&unitById(id)&&unitUnlocked(s,id)){trackedStart.current=true;trackInteraction('lesson_started');}},[]);
 const saveIssue=useGame(v=>v.saveIssue);
 const u=unitById(id);
 const [round,setRound]=useState(()=>s.learning?.units[id]?.pendingAudio?.length?s.learning.units[id].pendingAudio![0]:s.learning?.units[id]?.completedAt?0:Math.min(s.learning?.units[id]?.round??0,u?unitRoundCount(u)-1:0));
 const [resolvedRound,setResolvedRound]=useState(-1);
 const firstCompletion=useRef(!s.learning?.units[id]?.completedAt);
 const [finish,setFinish]=useState(false),[reward,setReward]=useState<Reward>(),[retry,setRetry]=useState(false);
 const advancing=useRef(false);
 if(!u||!unitUnlocked(s,id))return <div className="screen"><TopBar title="小岛英语冒险" onBack={()=>go({name:'tasks'})}/><p className="page-prompt">先去前一站和伙伴玩一玩吧。</p></div>;
 const profile=learningProfile(s.settings),total=unitRoundCount(u),wordKeys=lessonWords(u,profile.vocabulary);
 const phraseRound=round>=u.words.length;
 const situation=unitSituations(u)[Math.max(0,round-u.words.length)];
 const target=learningEntry(phraseRound?situation.phrase:wordKeys[round])!;
 const listenFirst=startsWithListening(profile,target.kind,PHRASES.find(p=>p.en===target.en)?.level);
 const buddy=getPokemon(s.captures[0]?.id??25);
 const picnicLesson=u.id==='snack-discovery';
 const packed=wordKeys.filter((_,i)=>(i<round||i===resolvedRound)&&!s.learning?.units[id]?.pendingAudio?.includes(i));
 const next=async(skipped=false)=>{
  if(advancing.current)return;
  const state=useGame.getState();if(!state.loaded||state.saveIssue||state.saveBusy){setRetry(true);return;}
  advancing.current=true;setRetry(false);
  const result=await advance(id,round+1,skipped);advancing.current=false;
  const screen=useGame.getState().screen;if(screen.name!=='lesson'||screen.id!==id)return;
  if(round+1>=total){if(!result){if(useGame.getState().save.learning?.units[id]?.pendingAudio?.length&&!useGame.getState().saveIssue){setFinish(true);return;}setRetry(true);return;}setReward(result);setFinish(true);if(result.gained+result.bonus>0)void say(['en','You did it!'],['zh',`你得到了${result.gained+result.bonus}点能量！`]);}
  else{setResolvedRound(-1);setRound(n=>n+1);}
 };
 return <div className={`screen learning-lesson ${!finish?'lesson-playing':''} ${picnicLesson?'lesson-picnic-mode':''}`}><TopBar title={u.title} onBack={()=>go({name:'tasks'})} focused progress={!finish&&<RoundProgress index={round} total={total}/>} help={<FeatureGuide compact id="lesson" autoVoice={false} autoOpen={!picnicLesson} enabled={!finish}><p><strong>身边的大人可以这样陪：</strong>{u.homePlay}</p><p>让宝宝自己选择，你来回应。不用提问考一考；打开帮助会暂停自动翻题，关闭后点“接着玩”。</p></FeatureGuide>}/><main className="lesson-wrap">
   {!picnicLesson&&<div className="lesson-breadcrumb"><span>{finish?(reward?'小冒险完成啦':'下次接着听'):phraseRound?(listenFirst?'听一句有用的话':round>u.words.length?'换个情境，用一用':'选一句有用的话'):listenFirst?'听听新的小发现':'帮伙伴找到它'}</span></div>}
   {picnicLesson?<LessonPicnic words={wordKeys} packed={packed} latest={resolvedRound>=0?wordKeys[resolvedRound]:undefined} buddy={buddy.id} finished={finish&&!!reward}/>:<div className="lesson-world buddy-strip"><PokeImg src={artUrl(buddy.id)} alt={buddy.nameZh}/><span>{buddy.nameZh}{s.captures.length?'陪你一起玩':'是这次的小向导'}</span></div>}
   {finish&&!reward?<section className="lesson-finished"><Icon name="speaker" size={48}/><h1>先把小发现留下来</h1><p>还有 {s.learning?.units[id]?.pendingAudio?.length??0} 段声音待补听。这次先不算完成，也不领取课程能量。</p><p>不着急，声音准备好了再来。</p><div className="lesson-actions"><button onClick={()=>{setRound(s.learning?.units[id]?.pendingAudio?.[0]??0);setFinish(false);}}>补听这些声音</button><button onClick={()=>go({name:'home'})}>回小岛休息</button></div></section>:finish?<section className="lesson-finished"><h1>我们一起做到了</h1>{reward&&<EnergyToast reward={reward}/>}<p>把这句小发现带上，看看下一站吧。</p><button className="lesson-phrase" onClick={()=>hearEntry(learningEntry(u.phrase)!)}><Icon name="speaker" size={28}/>{u.phrase}<small>{learningEntry(u.phrase)!.zh}</small></button>
    <div className="completion-next"><button className="journey-primary" onClick={()=>go({name:'journey',completedUnit:firstCompletion.current?u.id:undefined})}><Icon name="sign" size={32}/>看看下一站<span aria-hidden="true">›</span></button><div className="lesson-actions"><button onClick={()=>go({name:'home',station:u.station})}><Icon name={picnicLesson?'bowl':'island'} size={26}/>{picnicLesson?'去岛上分享':'回小岛玩'}</button><button onClick={()=>go({name:'story',id:u.story})}><Icon name="book" size={26}/>听配套故事</button></div></div><EnergyReturn/></section>
    :<LearningRound key={round} target={target} choices={phraseRound?[situation.phrase,situation.alternative]:wordKeys} listenFirst={listenFirst} count={profile.choices} situation={phraseRound?situation.situation:undefined} onNext={()=>next()} onSkip={()=>next(true)} source={`unit:${id}`} onReady={picnicLesson?()=>setResolvedRound(round):undefined} />}
  {retry&&<button className="journey-primary" onClick={()=>next()} disabled={!!saveIssue}>保存恢复后，领取这次的小收获</button>}
  </main>
 </div>;
}

export function LearningRound({target,choices,count,situation,listenFirst,onNext,onSkip,source,onReady}:{target:LearningEntry;choices?:string[];count?:number;situation?:string;listenFirst?:boolean;onNext:()=>void;onSkip?:()=>void;source:string;onReady?:()=>void}){
 const note=useGame(s=>s.noteWord);
 const guideOpen=useSyncExternalStore(subscribeGuides,guideIsOpen);
 const narration=useRef<ReturnType<typeof sayCancellableWhile>|null>(null);
 const speakOwned=(...parts:Parameters<typeof say>)=>{narration.current?.cancel();const run=sayCancellableWhile(()=>active.current&&!guideIsOpen(),...parts);narration.current=run;return run.done;};
 const settings=useGame(s=>s.save.settings),profile=learningProfile(settings);
 const initialListening=listenFirst??startsWithListening(profile,target.kind,PHRASES.find(p=>p.en===target.en)?.level);
 const options=useMemo(()=>learningChoices(target,choices,count??profile.choices,profile.vocabulary),[]);
 // useChoice uses identity: resolve the canonical target from this stable options array.
 const right=options.find(o=>o.key===target.key)!;
 const choice=useChoice(options,right);
 const assisted=useRef(initialListening||target.kind==='phrase'||!!situation||source.startsWith('unit:')||options.length<2),busy=useRef(false),active=useRef(true);
 const continued=useRef(false),audioRun=useRef(0),introTimer=useRef<ReturnType<typeof setTimeout>>();
 const heardTarget=useRef(false);
 const [feedback,setFeedback]=useState(''),[playing,setPlaying]=useState(true),[guided,setGuided]=useState(initialListening);
 const [explaining,setExplaining]=useState(false);
 const [audioFailed,setAudioFailed]=useState(false);
 const [heard,setHeard]=useState(false);
 const [answeredAudio,setAnsweredAudio]=useState(false);
 const playEntry=async(entry:LearningEntry,explain=false)=>{
  const speak=()=>speakOwned(...(explain?bi(...learningExplanation(entry)):learningVoice(entry)));
  if(guideIsOpen())return;
  auto.cancel();clearTimeout(introTimer.current);const ticket=++audioRun.current;setPlaying(true);setAudioFailed(false);
  let ok=await speak();
  if(!ok&&active.current&&ticket===audioRun.current&&!document.hidden&&!isForegroundAudioActive()){
   setFeedback('声音还在路上，再帮你试一次…');
   await new Promise(resolve=>setTimeout(resolve,600));
   if(!active.current||ticket!==audioRun.current)return;
   if(document.hidden||isForegroundAudioActive()){setPlaying(false);setAudioFailed(true);return;}
   ok=await speak();
  }
  // A newer tap intentionally cancels the old voice. Only the latest request
  // may report its outcome; cancellation is not a missing recording.
  if(active.current&&ticket===audioRun.current){setPlaying(false);if(ok){note(entry.key,'heard');if(entry.key===target.key){heardTarget.current=true;setHeard(true);}}else{setAudioFailed(true);setFeedback('声音暂时没准备好，可以稍后再听。');}if(busy.current)setAnsweredAudio(true);}
 };
 const hear=()=>playEntry(target,explaining);
 const hearSituation=async()=>{if(guideIsOpen())return;auto.cancel();clearTimeout(introTimer.current);const ticket=++audioRun.current;setPlaying(true);setAudioFailed(false);const ok=await speakOwned(['zh',situation!]);if(active.current&&ticket===audioRun.current){setPlaying(false);if(!ok){setAudioFailed(true);setFeedback('声音暂时没准备好，可以稍后再听。');}}};
 useEffect(()=>{active.current=true;introTimer.current=setTimeout(()=>{if(situation&&!guided)void hearSituation();else void hear();},300);return()=>{active.current=false;audioRun.current++;clearTimeout(introTimer.current);narration.current?.cancel();};},[]);
 useEffect(()=>{if(!guideOpen)return;audioRun.current++;clearTimeout(introTimer.current);narration.current?.cancel();setPlaying(false);setAudioFailed(false);},[guideOpen]);
 const tap=(entry:LearningEntry)=>{
  if(busy.current)return;const result=choice.pick(entry);if(result==='ignored')return;
  useGame.getState().noteAttempt(target.key,result==='correct',assisted.current||!heardTarget.current,source);
  if(result==='wrong'){assisted.current=true;setFeedback('没关系，我们再听听。');void hear();}
  else{busy.current=true;setFeedback('找到啦！');void playEntry(target);}
 };
 const explainTarget=()=>{if(busy.current)return;assisted.current=true;setExplaining(true);setFeedback('看看亮起来的图片，听完点一点。');void playEntry(target,true);};
 const finishListening=()=>{
  if(continued.current||!heardTarget.current||playing)return;
  continued.current=true;
  if(source==='review'||source.startsWith('unit:'))useGame.getState().restLearningWord(target.key);
  onNext();
 };
 const advance=()=>{
  if(continued.current||playing)return;
  if(guided||target.contextOnly){finishListening();return;}
  if(choice.solved){continued.current=true;onNext();}
 };
 const ready=!audioFailed&&!playing&&((guided||target.contextOnly)?heard:choice.solved&&answeredAudio);
 const onReadyRef=useRef(onReady);onReadyRef.current=onReady;
 const notified=useRef(false);
 useEffect(()=>{if(ready&&!notified.current){notified.current=true;onReadyRef.current?.();}},[ready]);
 const auto=useRoundAdvance(ready,advance,guided||target.contextOnly?2400:1400,guideOpen);
 const pacing=<button className="round-pace" disabled={guideOpen} onClick={()=>{const resume=auto.paused;auto.toggle();if(resume&&!ready&&!guideIsOpen()){if(situation&&!guided&&!choice.solved)void hearSituation();else void hear();}}} aria-pressed={auto.paused}><Icon name={auto.paused?'play':'hand'} size={26}/>{auto.paused?'接着玩':'慢一点'}</button>;
 const fallback=audioFailed&&onSkip?<button className="learning-help" onClick={()=>{if(continued.current)return;continued.current=true;auto.cancel();stopSpeech();onSkip();}}><Icon name="book" size={26}/>先看下一个，稍后再听</button>:null;
 const flow=<p className="round-flow-status" role="status">{guideOpen?'帮助打开时，伙伴会等你':audioFailed?'这段声音可以稍后补听':auto.paused?'慢慢来，伙伴等着你':playing?'先听一听…':ready?'马上去下一个小发现':'听听声音，再点图片'}</p>;
 if(guided)return <section className="learning-round learning-guided">
  <h1>和伙伴一起听</h1><p>看看图片，听听声音。不用着急回答。</p>
  <div className="lesson-actions round-toolbar"><button onClick={hear}><Icon name="speaker" size={28}/>{playing?'正在说…':'再听一次'}</button>{pacing}</div>{flow}{fallback}
  <div className="guided-example"><LearningArt entry={target}/><strong lang="en">{target.en}</strong><span>{target.zh}</span></div>
  <div className="lesson-actions"><button onClick={()=>{setGuided(false);setFeedback('我们一起找，不着急。');}}><Icon name="search" size={28}/>试着找一找</button></div>
  {feedback&&<p role="status">{feedback}</p>}
 </section>;
 if(target.contextOnly)return <section className="learning-round"><h1 lang="en">{target.en}</h1><p>{target.zh}</p><p>听听它在故事和生活里怎么用，不用答题。</p><div className="lesson-actions round-toolbar"><button onClick={hear}><Icon name="speaker" size={28}/>再听这段话</button>{pacing}</div>{flow}{fallback}{feedback&&<p role="status">{feedback}</p>}</section>;

 return <section className="learning-round"><h1>{situation??'听一听，点图片'}</h1><div className="lesson-actions round-toolbar"><button onClick={()=>situation?hearSituation():hear()}><Icon name="speaker" size={28}/>{situation?'听听发生了什么':'再听一次'}</button>{pacing}</div>{flow}{fallback}
  <div className={`learning-choices ${target.kind==='phrase'?'phrase-choices':''}`}>{options.map(o=><div key={o.key}>
   {target.kind==='phrase'&&<button className="learning-choice-audio" aria-label={`听听 ${o.en}`} onClick={()=>playEntry(o)}><Icon name="speaker" size={24}/>听这句话</button>}
   <button className={`${choice.solved&&o.key===target.key?'chosen':''} ${choice.eliminated.includes(o)?'faded':''} ${explaining&&o.key===target.key?'is-explained':''}`} aria-label={`选择${o.zh}`} disabled={choice.solved||choice.shake!==null||choice.eliminated.includes(o)} onClick={()=>tap(o)}>{target.kind==='phrase'?<><LearningArt entry={o}/><strong lang="en">{o.en}</strong><small>{o.zh}</small></>:<><LearningArt entry={o}/>{explaining&&o.key===target.key&&<span className="learning-explanation-label"><strong lang="en">{o.en}</strong><small>{o.zh}</small></span>}</>}{explaining&&o.key===target.key&&<span className="learning-explanation-pointer" aria-hidden="true"><Icon name="hand" size={28}/></span>}</button>
  </div>)}</div>
  {!choice.solved&&<button className="learning-help" onClick={explainTarget}><Icon name="hand" size={28}/>{explaining?'再讲一次':'帮我认识'}</button>}
  <p className="learning-feedback" role="status">{feedback|| (target.kind==='phrase'?'先听两句话，再选一句。':'不着急，伙伴等着你。')}</p>

 </section>;
}
