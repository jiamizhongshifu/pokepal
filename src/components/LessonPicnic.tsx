import {LearningArt} from './LearningItem';
import {useEffect,useRef,useState} from 'react';
import {isForegroundAudioActive,sayCancellableWhile,unlockAudio} from '../lib/speech';
import {PokeImg} from './PokeImg';
import {Icon} from '../icons';
import {artUrl,getPokemon} from '../data/pokemon';
import {learningEntry} from '../data/curriculum';
import './lesson-picnic.css';

/** A picture of this lesson's work, never an inventory or an extra reward. */
export function LessonPicnic({words,packed,latest,buddy,finished}:{words:string[];packed:string[];latest?:string;buddy:number;finished:boolean}){
 const [shared,setShared]=useState<string>(),[unavailable,setUnavailable]=useState(false);
 const voice=useRef<ReturnType<typeof sayCancellableWhile>|null>(null),live=useRef(true),run=useRef(0),invited=useRef(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;run.current++;voice.current?.cancel();};},[]);
 const share=async(word:string)=>{
  if(!finished||!packed.includes(word))return;
  unlockAudio();voice.current?.cancel();const ticket=++run.current;
  setShared(word);setUnavailable(false);
  // An optional pretend share. Never infer that an adult responded or grant another reward.
  const allowed=()=>live.current&&!document.hidden;
  const next=invited.current?sayCancellableWhile(allowed,['en','Thank you!']):sayCancellableWhile(allowed,['en','Thank you!'],['zh','谢谢你分享点心！也可以指给身边的大人看看，聊聊你喜欢哪一种。']);voice.current=next;
  const ok=await next.done;
  if(live.current&&ticket===run.current){if(ok)invited.current=true;setUnavailable(!ok&&!isForegroundAudioActive()&&!document.hidden);}
 };
 return <section className={`lesson-picnic ${finished?'is-shared':''}`} aria-label="一起准备点心">
  <div className="picnic-purpose"><Icon name={finished?'heart':'bowl'} size={26}/><strong>{finished?'点一份点心，和伙伴分享':'听一听，帮伙伴准备点心'}</strong><span>{packed.length} / {words.length}</span></div>
  <div className="lesson-picnic-scene">
   <div className="lesson-picnic-mat" aria-label={`已放好 ${packed.length} 样点心`}>
    {words.map((word,i)=>{const entry=learningEntry(word)!;const ready=packed.includes(word);return <div key={word} className={`picnic-place ${ready?'is-packed':''}`} aria-label={ready?`${entry.zh}已放好`:`第 ${i+1} 个空盘子`}>
     {ready?(finished?<button className={`picnic-share-food ${shared===word?'is-offered':''}`} aria-label={`分享${entry.zh}给伙伴`} aria-pressed={shared===word} onClick={()=>void share(word)}><LearningArt entry={entry}/><small lang="en">{entry.en}</small><Icon name="hand" size={20}/></button>:<span key={`${word}-${latest===word}`} className={latest===word?'picnic-food-arrives':''}><LearningArt entry={entry}/><small lang="en">{entry.en}</small></span>):<span className="picnic-empty-plate" aria-hidden="true"/>}
    </div>;})}
   </div>
   <div className={`lesson-picnic-friend ${latest||shared?'is-responding':''}`} key={shared??latest??'waiting'}><PokeImg src={artUrl(buddy)} alt={getPokemon(buddy).nameZh}/>{shared&&<span className="picnic-received" aria-hidden="true"><LearningArt entry={learningEntry(shared)!}/></span>}{(latest||shared)&&<span className="picnic-thanks" aria-hidden="true"><Icon name={shared?'heart':'check'} size={28}/></span>}</div>
  </div>
  {finished&&<div className="picnic-family-invite"><p role="status">{shared?<><strong lang="en">Thank you!</strong> 伙伴收到了你分享的{learningEntry(shared)!.zh}。</>:'也可以把喜欢的点心指给身边的大人看看。'}</p>{shared&&<p>大人可以回应：“谢谢你！你喜欢哪一种？”用中文聊聊也很好。</p>}{unavailable&&<p>声音暂时没来，点刚才的点心可以再听。</p>}<small>想分享就分享，也可以直接去下一站。下次吃点心时，再一起试试。</small></div>}
 </section>;
}
