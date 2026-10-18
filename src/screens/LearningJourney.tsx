import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {FeatureGuide} from '../components/FeatureGuide';
import {LEARNING_CHAPTERS,LEARNING_UNITS,recommendedUnit,unitUnlocked,learningEntry,unitById,type LearningUnit} from '../data/curriculum';
import {useGame} from '../store';
import {TopBar} from '../components/TopBar';
import {Icon} from '../icons';
import {PokeImg} from '../components/PokeImg';
import {artUrl} from '../data/pokemon';
import {lessonWords} from '../data/learning';
import {learningProfile} from '../lib/learningStage';
import {LearningArt,hearEntry} from '../components/LearningItem';
import {say,stopSpeech} from '../lib/speech';
import {todayStr} from '../lib/date';
import '../learning-journey.css';
import '../learning-next.css';
import '../learning-map.css';

const landmarks:Record<LearningUnit['theme'],string>={garden:'tree',play:'ball',leisure:'moon',camp:'tent',beach:'waves'};
const destinationIcon=(unit:LearningUnit)=>/^(berry|bowl|picnic)/.test(unit.station)?'bowl':landmarks[unit.theme];
const badges=['发现','照顾','表达','自主','心情','友爱'];
const positions=[{x:18,y:63},{x:40,y:32},{x:65,y:62},{x:83,y:34}];
function StopPicture({unit}:{unit:LearningUnit}){
 return <span className={`map-stop-picture map-${unit.theme}`} aria-hidden="true"><Icon name={landmarks[unit.theme]} size={76}/><Icon name={unit.theme==='beach'?'decor-shells':unit.theme==='leisure'?'star':'flower'} size={28}/></span>;
}
export function LearningJourney(){
 const s=useGame(v=>v.save),go=useGame(v=>v.go),start=useGame(v=>v.startUnit);
 const current=recommendedUnit(s),profile=learningProfile(s.settings);
 const [arrival]=useState(()=>{const route=useGame.getState().screen;const unit=route.name==='journey'?unitById(route.completedUnit):undefined;return unit&&s.learning?.units[unit.id]?.completedAt?unit:undefined;});
 const [celebrating,setCelebrating]=useState(!!arrival);
 const [showDetails,setShowDetails]=useState(false);
 const [tab,setTab]=useState<'forward'|'review'>('forward');
 const [chapter,setChapter]=useState(arrival?.chapter??current.chapter),[selectedId,setSelectedId]=useState(arrival?.id??current.id);
 const viewport=useRef<HTMLDivElement>(null);
 const completed=LEARNING_UNITS.filter(u=>s.learning?.units[u.id]?.completedAt);
 const allDone=completed.length===LEARNING_UNITS.length;
 const units=LEARNING_UNITS.filter(u=>u.chapter===chapter),selected=units.find(u=>u.id===selectedId)??units[0];
 const finished=units.filter(u=>s.learning?.units[u.id]?.completedAt).length;
 const stageDone=finished===units.length,selectedDone=!!s.learning?.units[selected.id]?.completedAt;
 const unlocked=unitUnlocked(s,selected.id),isCurrent=selected.id===current.id&&!allDone;
 const todayDone=completed.some(u=>todayStr(new Date(s.learning!.units[u.id].completedAt!))===todayStr());
 const changeChapter=(n:number)=>{stopSpeech();setCelebrating(false);setShowDetails(false);setChapter(n);setSelectedId(n===current.chapter?current.id:LEARNING_UNITS.find(u=>u.chapter===n)!.id);};
 const backToCurrent=()=>{setTab('forward');changeChapter(current.chapter);};
 useEffect(()=>()=>stopSpeech(),[]);
 useEffect(()=>{if(!arrival)return;go({name:'journey'});const timer=setTimeout(()=>setCelebrating(false),3200);return()=>clearTimeout(timer);},[]);
 useEffect(()=>{
  // On narrow screens pan only the illustrated viewport, never the whole page.
  const el=viewport.current;if(!el)return;
  const center=()=>{const node=el.querySelector<HTMLElement>('[aria-pressed="true"]');if(node)el.scrollTo({left:Math.max(0,el.scrollLeft+node.getBoundingClientRect().left-el.getBoundingClientRect().left+node.offsetWidth/2-el.clientWidth/2),behavior:'instant'});};
  center();const observer=new ResizeObserver(center);observer.observe(el);return ()=>observer.disconnect();
 },[chapter,tab,selectedId]);
 const select=(u:LearningUnit)=>{
  setCelebrating(false);
  if(u.id===current.id&&!allDone){stopSpeech();start(u.id);return;}
  setSelectedId(u.id);setShowDetails(true);void say(['zh',u.mission]);
 };
 return <div className={`screen learning-journey adventure-journey ${tab==='forward'?'is-map':'is-review'}`}><TopBar title="学习小路" onBack={()=>go({name:'tasks'})} focused progress={<nav className="journey-tabs" aria-label="选择学习路线"><button aria-pressed={tab==='forward'} onClick={()=>{stopSpeech();setTab('forward');}}><Icon name="sign" size={26}/>冒险地图</button><button aria-pressed={tab==='review'} onClick={()=>{stopSpeech();setShowDetails(false);setTab('review');}}><Icon name="book" size={26}/>再回顾</button></nav>} help={<FeatureGuide id="journey" compact autoVoice={!arrival} autoOpen={!arrival}/>}/>
  <main className="adventure-wrap">

   {tab==='forward'?<section className="adventure-region" aria-label="本阶段完整学习地图">
    <header className="region-heading">
     <button className="region-arrow" aria-label="查看上一阶段" disabled={chapter===0} onClick={()=>changeChapter(chapter-1)}><Icon name="back" size={28}/></button>
     <div className="region-title"><span>第 {chapter+1} / {LEARNING_CHAPTERS.length} 段冒险{chapter===current.chapter&&!allDone?' · 正在探索':''}</span><h1>{LEARNING_CHAPTERS[chapter].title}</h1><p role={celebrating?'status':undefined}>{celebrating?`${arrival!.title}，点亮啦！`:LEARNING_CHAPTERS[chapter].goal}</p></div>
     <div className="region-progress" aria-label={`本阶段已完成 ${finished} 关，共 ${units.length} 关`}><div aria-hidden="true">{units.map(u=><span className="region-progress-dot" key={u.id}>{s.learning?.units[u.id]?.completedAt?<Icon name="pokeball" size={22}/>:null}</span>)}</div><span>{finished} / {units.length} 关</span></div>
     <button className="region-arrow" aria-label="查看下一阶段" disabled={chapter===LEARNING_CHAPTERS.length-1} onClick={()=>changeChapter(chapter+1)}><Icon name="back" className="point-forward" size={28}/></button>
    </header>
    <div className="adventure-map-shell">
     <div ref={viewport} className="adventure-map-viewport" tabIndex={0} role="region" aria-label="岛屿关卡地图，可左右滑动" aria-describedby="map-pan-hint">
      <div className="adventure-map-canvas">
       <img className="adventure-map-art" src="/art/world/learning-adventure-v2.webp" alt="" draggable={false}/>

       <ol className="adventure-stops" aria-label="本阶段全部关卡">{units.map((u,i)=>{
        const done=!!s.learning?.units[u.id]?.completedAt,now=u.id===current.id&&!allDone;
        return <li key={u.id} style={{'--stop-x':`${positions[i].x}%`,'--stop-y':`${positions[i].y}%`} as CSSProperties}>
         {now&&<span className="adventure-companion"><PokeImg src={artUrl(s.captures[0]?.id??25)} alt=""/><span>我们在这里</span></span>}
         <button className={`adventure-stop ${done?'is-done':now?'is-current':'is-future'} ${celebrating&&u.id===arrival?.id?'just-lit':''}`} aria-pressed={selected.id===u.id} aria-label={`第${i+1}关，${u.title}，${done?'已完成，可回顾':now?'开始冒险':'尚未解锁，可以预览'}`} onClick={()=>select(u)}>
          <span className="adventure-stop-pin"><Icon name={done?'pokeball':destinationIcon(u)} size={48}/><b>{i+1}</b><span className={`pin-state ${done?'pin-complete':now?'pin-play':'pin-locked'}`} aria-hidden="true"><Icon name={done?'check':now?'play':'lock'} size={done?22:25}/></span></span>
          <strong>{u.title}</strong><span className="adventure-stop-status">{done?'已点亮':now?'点这里出发':'未点亮'}</span>
         </button>
        </li>;
       })}</ol>
       <button onClick={()=>{if(stageDone){if(chapter<LEARNING_CHAPTERS.length-1)changeChapter(chapter+1);else setTab('review');}else{setSelectedId(units[units.length-1].id);setShowDetails(true);void say(['zh',units[units.length-1].mission]);}}} className={`adventure-finish ${stageDone?'is-earned':''}`} aria-label={`${badges[chapter]}徽章，${stageDone?'本阶段已完成':`完成本阶段 ${units.length} 关后点亮`}`}><span><Icon name={stageDone?'trophy':'lock'} size={34}/></span><div><strong>{badges[chapter]}徽章</strong><small>{stageDone?'点这里，继续探索':`${units.length} 关的终点`}</small></div></button>
      </div>
     </div>
     <div className="map-caption"><span id="map-pan-hint"><Icon name="hand" size={20}/><span className="map-pan-mobile">左右滑动看全图 · </span>点地点，看看会学什么</span>{chapter!==current.chapter&&<button onClick={backToCurrent}><Icon name="search" size={20}/>找到我</button>}<span className="adventure-rhythm"><Icon name={todayDone?'check':'sun'} size={20}/>{todayDone?'今天已走过一关，休息也很棒':'一天一小关，慢慢去发现'}</span></div>
    </div>
    {showDetails&&<section className="adventure-brief" aria-label="这关的小发现"><button className="adventure-detail-close" aria-label="收起关卡介绍" onClick={()=>{stopSpeech();setShowDetails(false);}}><Icon name="close" size={25}/></button>
     <div className="adventure-brief-copy"><span>{isCurrent?(todayDone?'下一次的小冒险':'今天的小冒险'):selectedDone?'熟悉的小发现':'即将遇见'}</span><h2>{selected.title}</h2><button className="adventure-mission" onClick={()=>say(['zh',selected.mission])} aria-label={`听听${selected.title}会学什么`}><Icon name="speaker" size={22}/><span>{selected.mission}</span></button></div>
     <div className="adventure-vocabulary" aria-label="这关会认识的词">{lessonWords(selected,profile.vocabulary).map(key=>{const entry=learningEntry(key)!;return <button key={key} onClick={()=>hearEntry(entry)} aria-label={`听听 ${entry.en}`}><LearningArt entry={entry}/><span lang="en">{entry.en}</span></button>;})}</div>
     {unlocked?<button className="adventure-start journey-primary" onClick={()=>{stopSpeech();start(selected.id);}}><Icon name={selectedDone?'refresh':'play'} size={28}/>{selectedDone?'再玩这一关':s.learning?.units[selected.id]?.round?'接着探索':'出发吧'}<span aria-hidden="true">›</span></button>:<button className="adventure-return" onClick={backToCurrent}><Icon name="sign" size={25}/>先走亮着的一关</button>}
    </section>}

   </section>:<section className="journey-review" aria-label="走过的小路"><h1>再遇见熟悉的小发现</h1>{completed.length?<div className="journey-review-grid">{completed.map(u=><button key={u.id} disabled={!unitUnlocked(s,u.id)} onClick={()=>start(u.id)}><StopPicture unit={u}/><span><strong>{u.title}</strong><small>{lessonWords(u,profile.vocabulary).join(' · ')}</small></span><Icon name="refresh" size={24}/></button>)}</div>:<div className="journey-review-empty"><Icon name="book" size={64}/><p>走过一站，小发现就会留在这里。</p><button className="journey-primary" onClick={()=>setTab('forward')}>去小路看看</button></div>}</section>}
  </main>
 </div>;
}
