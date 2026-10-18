import {useState} from 'react';
import {FeatureGuide} from '../components/FeatureGuide';
import {LEARNING_CHAPTERS,LEARNING_UNITS,recommendedUnit,unitUnlocked,type LearningUnit} from '../data/curriculum';
import {useGame} from '../store';
import {TopBar} from '../components/TopBar';
import {Icon} from '../icons';
import {PokeImg} from '../components/PokeImg';
import {artUrl} from '../data/pokemon';
import {lessonWords} from '../data/learning';
import {learningProfile} from '../lib/learningStage';
import '../learning-journey.css';
import '../learning-next.css';

const landmarks:Record<LearningUnit['theme'],string>={garden:'tree',play:'ball',leisure:'moon',camp:'tent',beach:'waves'};
function StopPicture({unit}:{unit:LearningUnit}){
 return <span className={`map-stop-picture map-${unit.theme}`} aria-hidden="true"><Icon name={landmarks[unit.theme]} size={76}/><Icon name={unit.theme==='beach'?'decor-shells':unit.theme==='leisure'?'star':'flower'} size={28}/></span>;
}
export function LearningJourney(){
 const s=useGame(v=>v.save),go=useGame(v=>v.go),start=useGame(v=>v.startUnit);
 const [tab,setTab]=useState<'forward'|'review'>('forward');
 const current=recommendedUnit(s),profile=learningProfile(s.settings);
 const completed=LEARNING_UNITS.filter(u=>s.learning?.units[u.id]?.completedAt);
 const allDone=completed.length===LEARNING_UNITS.length;
 const following=allDone?undefined:LEARNING_UNITS[LEARNING_UNITS.indexOf(current)+1];
 return <div className="screen learning-journey route-focused"><TopBar title="学习小路" onBack={()=>go({name:'tasks'})} focused help={<FeatureGuide id="journey" compact/>}/>
  <main className="journey-wrap illustrated-journey">
   <nav className="journey-tabs" aria-label="选择学习路线"><button aria-pressed={tab==='forward'} onClick={()=>setTab('forward')}><Icon name="sign" size={28}/>往前走</button><button aria-pressed={tab==='review'} onClick={()=>setTab('review')}><Icon name="book" size={28}/>再回顾</button></nav>
   {tab==='forward'?<section aria-label="当前和下一站" className="journey-map-section">
    <header className="map-heading"><span>第 {current.chapter+1} 段小路</span><h1>{allDone?'每一站都一起玩过啦':LEARNING_CHAPTERS[current.chapter].title}</h1><p>{allDone?'可以去「再回顾」找喜欢的小发现。':LEARNING_CHAPTERS[current.chapter].goal}</p></header>
    <div className="journey-map">
     <svg className="journey-map-land" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true"><path d="M40 230C-20 100 130 15 295 45S625-25 748 100S750 320 570 325S120 360 40 230Z" fill="var(--map-sand)"/><path d="M62 225C5 115 141 37 296 67S620 0 723 112S727 296 560 300S140 338 62 225Z" fill="var(--map-grass)"/><path d="M210 228C320 300 350 101 594 154" fill="none" stroke="var(--map-sand)" strokeWidth="34" strokeLinecap="round"/><path d="M210 228C320 300 350 101 594 154" fill="none" stroke="#c5a86d" strokeWidth="3" strokeDasharray="3 13" strokeLinecap="round"/></svg>
     <span className="map-sun" aria-hidden="true"><Icon name="sun" size={48}/></span><span className="map-tree" aria-hidden="true"><Icon name="tree" size={50}/></span>
     <div className="map-current"><span className="map-you"><PokeImg src={artUrl(s.captures[0]?.id??25)} alt=""/>我们在这里</span><button className="map-stop current-stop" onClick={()=>start(current.id)} aria-label={`${allDone?'再玩':'开始'}${current.title}`}><StopPicture unit={current}/><strong>{current.title}</strong><span className="map-go"><Icon name="play" size={22}/>{allDone?'再玩一次':'从这里出发'}</span></button></div>
     {following?<div className="map-upcoming"><span className="map-next-label">下一站{following.chapter!==current.chapter?` · 第 ${following.chapter+1} 段`:''}</span><div className="map-stop upcoming-stop"><StopPicture unit={following}/><strong>{following.title}</strong><small>走过这一站，就能来啦</small></div></div>:<div className="map-upcoming map-finish"><Icon name="star" size={60}/><strong>{allDone?'小发现都留下啦':'这段旅程的最后一站'}</strong></div>}
    </div>
   </section>:<section className="journey-review" aria-label="走过的小路"><h1>再遇见熟悉的小发现</h1>{completed.length?<div className="journey-review-grid">{completed.map(u=><button key={u.id} disabled={!unitUnlocked(s,u.id)} onClick={()=>start(u.id)}><StopPicture unit={u}/><span><strong>{u.title}</strong><small>{lessonWords(u,profile.vocabulary).join(' · ')}</small></span><Icon name="refresh" size={24}/></button>)}</div>:<div className="journey-review-empty"><Icon name="book" size={64}/><p>走过一站，小发现就会留在这里。</p><button className="journey-primary" onClick={()=>setTab('forward')}>去小路看看</button></div>}</section>}
  </main>
 </div>;
}
